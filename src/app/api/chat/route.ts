import { streamText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import '@/lib/env'; // validate required env vars on cold start

const log = createRouteLogger('chat');

const FALLBACK_SYSTEM = 'You are a helpful AI advisor inside Modryn Studio.';

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    const { messages, memberId } = await req.json();

    log.info(ctx.reqId, 'Chat request', { memberId, messageCount: messages?.length });

    // Pull member system prompt + recent memory summaries from DB.
    // Falls back to a generic prompt if the member isn't found.
    const [memberRows, memoryRows] = await Promise.all([
      sql`SELECT system_prompt FROM members WHERE id = ${memberId} LIMIT 1`,
      sql`
        SELECT summary FROM member_memory
        WHERE member_id = ${memberId}
        ORDER BY created_at DESC
        LIMIT 5
      `,
    ]);

    let systemPrompt: string = memberRows[0]?.system_prompt ?? FALLBACK_SYSTEM;

    if (memoryRows.length > 0) {
      // Prepend oldest-first so the model reads context chronologically
      const memorySections = [...memoryRows]
        .reverse()
        .map((r: { summary: string }) => r.summary)
        .join('\n\n---\n\n');
      systemPrompt = `${systemPrompt}\n\n## Session Memory (previous conversations, oldest first)\n\n${memorySections}`;
    }

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 800,
      temperature: 0.7,
    });

    return log.end(ctx, result.toUIMessageStreamResponse(), { memberId });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
