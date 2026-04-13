import { z } from 'zod';
import { generateText, Output, NoObjectGeneratedError } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('threads/[threadId]/decisions-draft');

// Schema for the structured output from Haiku
const draftOutputSchema = z.object({
  decisions: z
    .array(
      z.object({
        title: z.string().min(1).describe('Short decision title, ≤80 chars'),
        description: z.string().describe('One sentence explaining the decision and its rationale'),
      })
    )
    .describe(
      'Choices the company made or committed to in this round. Empty if nothing was resolved.'
    ),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).describe('Short action title, ≤80 chars'),
        description: z
          .string()
          .describe('One sentence describing the work and what done looks like'),
        assigned_to: z
          .string()
          .describe(
            'Member ID of the owner — must be one of: charlie-munger, dieter-rams, marc-lou, michelle-lim, steve-jobs, founder'
          ),
      })
    )
    .describe(
      'Specific next actions named in this round, each with a clear owner. Empty if no concrete actions were assigned.'
    ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { threadId } = await params;

    // Fetch all messages in this thread ordered chronologically
    const allMessages = await sql`
      SELECT msg.sender_id, msg.content, m.name AS sender_name, m.role AS sender_role
      FROM messages msg
      LEFT JOIN members m ON m.id = msg.sender_id
      WHERE msg.conversation_id = ${threadId}
      ORDER BY msg.created_at ASC
    `;

    if (allMessages.length === 0) {
      return log.end(ctx, Response.json({ decisions: [], tasks: [] }));
    }

    const msgs = allMessages as Array<{
      sender_id: string;
      content: string;
      sender_name: string | null;
      sender_role: string | null;
    }>;

    // Scope to the current round only: messages since the last founder message.
    // This prevents re-proposing decisions from earlier rounds on every reply.
    let lastFounderIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender_id === 'founder') {
        lastFounderIdx = i;
        break;
      }
    }

    const roundMessages = msgs.slice(lastFounderIdx + 1);

    if (roundMessages.length === 0) {
      return log.end(ctx, Response.json({ decisions: [], tasks: [] }));
    }

    const transcript = roundMessages
      .map((msg) => {
        const label = `${msg.sender_name ?? msg.sender_id} (${msg.sender_role ?? 'member'})`;
        return `${label}:\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    const { output } = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      output: Output.object({ schema: draftOutputSchema }),
      system: `You extract decisions and tasks from a team discussion round.

DECISIONS — a decision is a choice the company made or a commitment stated. Not individual opinions, not debate, not open questions. Examples: "Use TraderSync over Tradovate WebSocket", "Ship broker connection layer before inference engine". One sentence each.

TASKS — a task is a specific next action with a clear owner. Assign based on role ownership, not who proposed the work. Michelle Lim (michelle-lim) owns implementation — any task requiring building, coding, or technical research belongs to her regardless of who raised it. Marc Lou (marc-lou) owns timeline and scope decisions, not implementation. Steve Jobs (steve-jobs) owns product identity and narrative. Charlie Munger (charlie-munger) owns risk assessment and strategic challenge. Dieter Rams (dieter-rams) owns visual execution, interaction honesty, form coherence, and register accuracy — if a task involves how something looks, feels, or communicates, it belongs to him. Founder owns tasks requiring Luke's direct judgment or external action. Valid assigned_to values: charlie-munger, dieter-rams, marc-lou, michelle-lim, steve-jobs, founder. One sentence describing what done looks like.

Return empty arrays if nothing qualifies. Do not fabricate decisions or tasks that were not resolved in the discussion.`,
      prompt: transcript,
      maxOutputTokens: 600,
      temperature: 0.1,
    });

    const decisions = output?.decisions ?? [];
    const tasks = output?.tasks ?? [];

    log.info(ctx.reqId, 'Draft generated', {
      threadId,
      decisions: decisions.length,
      tasks: tasks.length,
    });

    return log.end(ctx, Response.json({ decisions, tasks }));
  } catch (error) {
    if (error instanceof NoObjectGeneratedError) {
      // Haiku couldn't produce a valid object — return empty, non-critical
      return log.end(ctx, Response.json({ decisions: [], tasks: [] }));
    }
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
