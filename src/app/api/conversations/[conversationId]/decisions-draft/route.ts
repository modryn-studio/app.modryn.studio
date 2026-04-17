import { z } from 'zod';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('conversations/[conversationId]/decisions-draft');

const draftOutputSchema = z.object({
  decisions: z
    .array(
      z.object({
        title: z.string().min(1).describe('Short decision title, ≤80 chars'),
        description: z.string().describe('One sentence explaining the decision and its rationale'),
      })
    )
    .describe('Choices made or committed to in this conversation. Empty if nothing was resolved.'),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).describe('Short action title, ≤80 chars'),
        description: z
          .string()
          .describe(
            'Execution-ready brief (3–5 sentences). Cover: (1) what triggered this task and why it matters, (2) decisions already made in this conversation that constrain the output — be specific, name the choices, (3) exact deliverable: what format, what files or artifacts, what done looks like. The assignee will execute from this description alone with no access to the conversation.'
          ),
        assigned_to: z
          .string()
          .describe(
            'Member ID of the owner — must be one of: charlie-munger, dieter-rams, marc-lou, michelle-lim, steve-jobs, founder'
          ),
      })
    )
    .describe(
      'Specific next actions surfaced in this conversation, each with a clear owner. Empty if none.'
    ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { conversationId } = await params;

    // Verify it's a DM conversation and fetch the watermark in one query
    const [conv] = await sql`
      SELECT id, last_synthesized_at FROM conversations WHERE id = ${conversationId} AND type = 'dm'
    `;
    if (!conv) {
      return log.end(ctx, Response.json({ error: 'Conversation not found' }, { status: 404 }));
    }

    const watermark: Date | null = conv.last_synthesized_at ?? null;

    // Fetch only messages after the watermark — on first synthesis (watermark = null) read everything.
    const allMessages = watermark
      ? await sql`
          SELECT msg.sender_id, msg.content, msg.created_at, m.name AS sender_name, m.role AS sender_role
          FROM messages msg
          LEFT JOIN members m ON m.id = msg.sender_id
          WHERE msg.conversation_id = ${conversationId}
            AND msg.created_at > ${watermark}
          ORDER BY msg.created_at ASC
        `
      : await sql`
          SELECT msg.sender_id, msg.content, msg.created_at, m.name AS sender_name, m.role AS sender_role
          FROM messages msg
          LEFT JOIN members m ON m.id = msg.sender_id
          WHERE msg.conversation_id = ${conversationId}
          ORDER BY msg.created_at ASC
        `;

    if (allMessages.length === 0) {
      // Nothing new since last synthesis — no-op
      log.info(ctx.reqId, 'No new messages since last synthesis', { conversationId, watermark });
      return log.end(ctx, Response.json({ decisions: [], tasks: [] }));
    }

    const msgs = allMessages as Array<{
      sender_id: string;
      content: string;
      created_at: Date;
      sender_name: string | null;
      sender_role: string | null;
    }>;

    // DMs use the full conversation — no round scoping (there's no respond sequence)
    const transcript = msgs
      .map((msg) => {
        const label =
          msg.sender_id === 'founder'
            ? 'Luke (Founder)'
            : `${msg.sender_name ?? msg.sender_id} (${msg.sender_role ?? 'member'})`;
        return `${label}:\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    const { output } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      output: Output.object({ schema: draftOutputSchema }),
      system: `You extract decisions and tasks from a 1:1 conversation between a founder and an AI advisor.

DECISIONS — a decision is a choice the company made or a commitment stated by either party. Not opinions, not debate, not open questions. Examples: "Ship onboarding flow before proposal logic", "Start Reddit recruiting in Week 2". One sentence each.

TASKS — a task is a specific next action with a clear owner surfaced in the conversation. Assign based on role ownership. Michelle Lim (michelle-lim) owns implementation and technical work. Marc Lou (marc-lou) owns timeline and scope. Steve Jobs (steve-jobs) owns product identity and narrative. Charlie Munger (charlie-munger) owns risk assessment. Dieter Rams (dieter-rams) owns visual execution and form. Founder owns tasks requiring Luke's direct judgment or external action (writing copy, recruiting, decisions only Luke can make). Valid assigned_to values: charlie-munger, dieter-rams, marc-lou, michelle-lim, steve-jobs, founder.

For each task description, write an execution-ready brief — not a summary sentence. The assignee will execute the task with no access to this conversation. Include: what triggered this task, every decision made in the conversation that constrains the output (name them specifically), and the exact deliverable (files, formats, what done looks like). 3–5 sentences minimum.

Return empty arrays if nothing qualifies. Do not fabricate decisions or tasks not explicitly resolved in the conversation.`,
      prompt: transcript,
      maxOutputTokens: 1200,
      temperature: 0.1,
    });

    const decisions = output?.decisions ?? [];
    const tasks = output?.tasks ?? [];

    // Advance the watermark to the last message's created_at — not now() — so messages
    // that arrive during synthesis don't get silently skipped on the next call.
    const lastMessageAt = msgs[msgs.length - 1].created_at;
    await sql`
      UPDATE conversations
      SET last_synthesized_at = ${lastMessageAt}
      WHERE id = ${conversationId}
    `;

    log.info(ctx.reqId, 'DM draft generated', {
      conversationId,
      decisions: decisions.length,
      tasks: tasks.length,
      watermarkAdvancedTo: lastMessageAt,
    });

    return log.end(ctx, Response.json({ decisions, tasks }));
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      return log.end(ctx, Response.json({ decisions: [], tasks: [] }));
    }
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
