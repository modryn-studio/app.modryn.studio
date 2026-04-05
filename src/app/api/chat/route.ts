import { streamText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env'; // validate required env vars on cold start

const log = createRouteLogger('chat');

const FALLBACK_SYSTEM = 'You are a helpful AI advisor inside Modryn Studio.';

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { messages, memberId, conversationId } = await req.json();

    log.info(ctx.reqId, 'Chat request', {
      memberId,
      conversationId,
      messageCount: messages?.length,
    });

    // Pull member system prompt + recent memory summaries from DB.
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
      const memorySections = [...memoryRows]
        .reverse()
        .map((r: Record<string, string>) => r.summary)
        .join('\n\n---\n\n');
      systemPrompt = `${systemPrompt}\n\n## Session Memory (previous conversations, oldest first)\n\n${memorySections}`;
    }

    // Save the user's new message to DB (last message in the array)
    if (conversationId && messages?.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'user') {
        // Extract text from parts or content
        const text =
          lastMsg.parts
            ?.filter((p: { type: string }) => p.type === 'text')
            .map((p: { text: string }) => p.text)
            .join('') ??
          lastMsg.content ??
          '';
        if (text) {
          await sql`
            INSERT INTO messages (conversation_id, sender_id, role, content)
            VALUES (${conversationId}, 'founder', 'user', ${text})
          `;
        }
      }
    }

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 800,
      temperature: 0.7,
      async onFinish({ text }) {
        // Save the AI response to DB
        if (conversationId && text) {
          try {
            await sql`
              INSERT INTO messages (conversation_id, sender_id, role, content)
              VALUES (${conversationId}, ${memberId}, 'assistant', ${text})
            `;
            await sql`
              UPDATE conversations SET updated_at = now() WHERE id = ${conversationId}
            `;
          } catch (e) {
            console.error('[chat] Failed to persist AI response:', e);
          }
        }
      },
    });

    return log.end(ctx, result.toUIMessageStreamResponse(), { memberId });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
