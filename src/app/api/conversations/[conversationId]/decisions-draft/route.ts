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
          .describe('One sentence describing the work and what done looks like'),
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

    // Verify it's a DM conversation
    const [conv] = await sql`
      SELECT id FROM conversations WHERE id = ${conversationId} AND type = 'dm'
    `;
    if (!conv) {
      return log.end(ctx, Response.json({ error: 'Conversation not found' }, { status: 404 }));
    }

    // Fetch all messages in the DM, ordered chronologically
    const allMessages = await sql`
      SELECT msg.sender_id, msg.content, m.name AS sender_name, m.role AS sender_role
      FROM messages msg
      LEFT JOIN members m ON m.id = msg.sender_id
      WHERE msg.conversation_id = ${conversationId}
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

Return empty arrays if nothing qualifies. Do not fabricate decisions or tasks not explicitly resolved in the conversation.`,
      prompt: transcript,
      maxOutputTokens: 600,
      temperature: 0.1,
    });

    const decisions = output?.decisions ?? [];
    const tasks = output?.tasks ?? [];

    log.info(ctx.reqId, 'DM draft generated', {
      conversationId,
      decisions: decisions.length,
      tasks: tasks.length,
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
