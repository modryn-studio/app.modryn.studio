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

// Returns a merged view of decisions + org_memory as a formatted string, or null if empty.
// Lazy merge — no dual-write. Decisions are always reflected in org context via UNION.
export async function getOrgMemory(): Promise<string | null> {
  try {
    const rows = await sql`
      SELECT content
      FROM (
        SELECT title || COALESCE(': ' || description, '') AS content, created_at
        FROM decisions
        UNION ALL
        SELECT content, created_at
        FROM org_memory
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

// Extracts team-relevant facts from text using Haiku, inserts non-empty results into org_memory.
// Uses Output.object() for schema-enforced structured output — no manual JSON parsing needed.
// Called after member_memory writes (DMs) and after full respond sequence completes (threads).
export async function extractAndStoreOrgFacts(
  text: string,
  conversationId: string,
  memberId: string
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
        INSERT INTO org_memory (content, source_conversation_id, source_member_id, extraction_type)
        VALUES (${content}, ${conversationId}, ${memberId}, 'auto')
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
