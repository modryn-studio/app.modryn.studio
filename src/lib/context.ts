import fs from 'fs';
import path from 'path';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import sql from '@/lib/db';

// Returns the contents of the founding document as a string.
// This is injected into every chat session between the member system prompt
// and member_memory. If the file is missing, returns an empty string so the
// API route degrades gracefully rather than throwing.
// To switch to DB-backed context (Option B), replace this function only.
export function getCompanyContext(): string {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'modryn-studio-founding-document.md');
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

// Returns project name + context as formatted markdown, or null if not found / empty.
// The <project-context> tags mark user-supplied content as data, not instructions —
// mitigates accidental prompt injection from pasted content in the context field.
export async function getProjectContext(projectId: string): Promise<string | null> {
  try {
    const [row] = await sql`
      SELECT name, context FROM projects WHERE id = ${projectId} LIMIT 1
    `;
    if (!row) return null;
    const parts = [`## Project: ${row.name}`];
    if (row.context) {
      parts.push(`\n<project-context>\n${row.context}\n</project-context>`);
    }
    return parts.join('\n');
  } catch {
    return null;
  }
}

// Returns org-level facts scoped to a project as a formatted string, or null if empty.
// Merges decisions + org_memory for the given project via UNION.
export async function getOrgMemory(projectId: string): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT content
      FROM (
        SELECT title || COALESCE(': ' || description, '') AS content, created_at
        FROM decisions
        WHERE project_id = ${projectId}
        UNION ALL
        SELECT content, created_at
        FROM org_memory
        WHERE project_id = ${projectId}
      ) combined
      ORDER BY created_at DESC
      LIMIT 20
    `;
    if (rows.length === 0) return null;
    const items = rows.map((r) => `- ${r.content}`).join('\n');
    return `## Organizational Memory\n\nFacts known across the team:\n${items}`;
  } catch {
    // Org memory is non-critical — degrade gracefully
    return null;
  }
}

// Returns a member's full task awareness: active queue + recently completed titles (no output).
// Injected into DM system prompt so members know what they're working on and what they've shipped.
// Done tasks are titles only — output injection is too expensive and goes stale. Capped at 5 active + 3 done (~150 tokens max).
export async function getMemberTasks(memberId: string, projectId?: string): Promise<string | null> {
  try {
    const [activeRows, doneRows] = await Promise.all([
      projectId
        ? sql`
            SELECT title, status FROM tasks
            WHERE assigned_to = ${memberId}
              AND project_id = ${projectId}
              AND status IN ('pending', 'in_progress', 'blocked')
            ORDER BY created_at ASC
            LIMIT 5
          `
        : sql`
            SELECT title, status FROM tasks
            WHERE assigned_to = ${memberId}
              AND status IN ('pending', 'in_progress', 'blocked')
            ORDER BY created_at ASC
            LIMIT 5
          `,
      projectId
        ? sql`
            SELECT title FROM tasks
            WHERE assigned_to = ${memberId}
              AND project_id = ${projectId}
              AND status = 'done'
            ORDER BY updated_at DESC
            LIMIT 3
          `
        : sql`
            SELECT title FROM tasks
            WHERE assigned_to = ${memberId}
              AND status = 'done'
            ORDER BY updated_at DESC
            LIMIT 3
          `,
    ]);

    if (activeRows.length === 0 && doneRows.length === 0) return null;

    const parts: string[] = ['## Your Work Queue'];

    if (activeRows.length > 0) {
      const active = activeRows.map((r) => `- ${r.title} (${r.status})`).join('\n');
      parts.push(`Tasks currently assigned to you:\n${active}`);
    } else {
      parts.push('No active tasks.');
    }

    if (doneRows.length > 0) {
      const done = doneRows.map((r) => `- ${r.title}`).join('\n');
      parts.push(`Recently completed:\n${done}`);
    }

    return parts.join('\n\n');
  } catch {
    // Non-critical — degrade gracefully
    return null;
  }
}

// Extracts team-relevant facts from text using Haiku, inserts non-empty results into org_memory.
// Uses Output.object() for schema-enforced structured output — no manual JSON parsing needed.
// Called after member_memory writes (DMs) and after full respond sequence completes (threads).
export async function extractAndStoreOrgFacts(
  text: string,
  conversationId: string,
  memberId: string,
  projectId?: string
): Promise<number> {
  try {
    const { output } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      output: Output.object({
        schema: z.object({
          facts: z
            .array(z.string().min(11))
            .describe(
              'Company-level facts only: decisions made, commitments stated, constraints identified, open questions. Each string is one fact. Empty array if nothing qualifies.'
            ),
        }),
      }),
      system:
        'Extract only company-level facts: decisions made, commitments stated, constraints named, open questions that affect company direction. Do not extract individual member positions, opinions, or arguments. A member advocating for an approach in a discussion is not a company decision. Only extract what the company has decided or committed to, not what individuals proposed. Return facts as neutral statements without attributing them to specific team members. Write "The team identified X" or "An open question exists around Y" — never "[Name] proposed..." or "[Name] argued..." Return an empty facts array if nothing qualifies.',
      prompt: text,
      maxOutputTokens: 400,
      temperature: 0.2,
    });

    const facts = output?.facts ?? [];
    if (facts.length === 0) return 0;

    for (const content of facts) {
      await sql`
        INSERT INTO org_memory (content, source_conversation_id, source_member_id, extraction_type, project_id)
        VALUES (${content}, ${conversationId}, ${memberId}, 'auto', ${projectId ?? null})
      `;
    }
    return facts.length;
  } catch (err) {
    if (err instanceof NoObjectGeneratedError) {
      // Extraction failed to produce a valid object — degrade gracefully, don't surface to user
      return 0;
    }
    throw err;
  }
}
