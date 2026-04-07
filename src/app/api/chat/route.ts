import { streamText, generateText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import { getCompanyContext } from '@/lib/context';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env'; // validate required env vars on cold start

// Route-aware format contracts — injected into system prompt at call time.
// Edit here to adjust format constraints across all members at once.
// NOTE: 'thread' is a placeholder. Rewrite from scratch when multi-member orchestration ships.
const ROUTE_CONTEXT = {
  dm: 'You are in a direct message conversation. Keep responses under 150 words. One main point. One question maximum. Provide depth only when explicitly requested.',
  inbox:
    'You are composing an async inbox message. Be self-contained: 150–300 words. Include context, your observation, and a clear ask or next step.',
  thread:
    'You are contributing to a group thread. Reference prior contributions explicitly. Build on or directly challenge what others have said.',
  task: 'You are completing an assigned task. Produce a structured deliverable. Include finding, reasoning, and recommendation. Length appropriate to the task scope.',
} as const;

const surfaceSchema = z.enum(['dm', 'inbox', 'thread', 'task']).optional();

const log = createRouteLogger('chat');

const FALLBACK_SYSTEM = 'You are a helpful AI advisor inside Modryn Studio.';

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { messages, memberId, conversationId } = body;
    const surface = surfaceSchema.parse(body.surface);

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

    const memberSystemPrompt: string = memberRows[0]?.system_prompt ?? FALLBACK_SYSTEM;

    const companyContext = getCompanyContext();

    const memorySegments =
      memoryRows.length > 0
        ? [...memoryRows]
            .reverse()
            .map((r: Record<string, string>) => r.summary)
            .join('\n\n---\n\n')
        : null;

    const formatInstruction = surface ? ROUTE_CONTEXT[surface] : null;

    const systemPrompt = [
      formatInstruction && `## Format Instructions\n\n${formatInstruction}`,
      memberSystemPrompt,
      companyContext && `## Company Context\n\n${companyContext}`,
      memorySegments &&
        `## Session Memory (previous conversations, oldest first)\n\n${memorySegments}`,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

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
      async onFinish({ text, usage }) {
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
            log.err(ctx, e);
          }
        }

        // Memory write — only when conversation clears the threshold.
        // messages is the incoming array from req.json() (closure) — all turns
        // the client sent, which includes the full accumulated history.
        const userTurns = messages.filter((m: { role: string }) => m.role === 'user').length;
        const totalTokens = usage?.totalTokens ?? 0;
        const meetsThreshold = userTurns >= 5 || totalTokens >= 500;

        if (conversationId && memberId && text && meetsThreshold) {
          try {
            // Build a plain transcript for the summarizer (incoming history + this response)
            const transcript = [
              ...messages.map(
                (m: {
                  role: string;
                  parts?: { type: string; text: string }[];
                  content?: string;
                }) => {
                  const content =
                    m.parts
                      ?.filter((p) => p.type === 'text')
                      .map((p) => p.text)
                      .join('') ?? (typeof m.content === 'string' ? m.content : '');
                  return `${m.role === 'user' ? 'Luke' : 'AI'}: ${content}`;
                }
              ),
              `AI: ${text}`,
            ].join('\n\n');

            const { text: summary } = await generateText({
              model: anthropic('claude-haiku-4-5'),
              messages: [
                {
                  role: 'user',
                  content: `Summarize this conversation in 3–5 bullet points for future context. Focus on: decisions made, tasks assigned, observations flagged, open questions. Be specific. Use plain bullets, no headers.\n\n${transcript}`,
                },
              ],
              maxOutputTokens: 600,
              temperature: 0.3,
            });

            // Upsert — one summary per conversation, updated as it grows.
            // Prevents accumulating near-identical rows and injecting redundant context.
            const existingMemory = await sql`
              SELECT id FROM member_memory WHERE conversation_id = ${conversationId} LIMIT 1
            `;
            if (existingMemory.length > 0) {
              await sql`
                UPDATE member_memory
                SET summary = ${summary}, created_at = now()
                WHERE id = ${existingMemory[0].id}
              `;
            } else {
              await sql`
                INSERT INTO member_memory (member_id, conversation_id, summary)
                VALUES (${memberId}, ${conversationId}, ${summary})
              `;
            }

            log.info(ctx.reqId, 'Memory written', {
              memberId,
              conversationId,
              userTurns,
              totalTokens,
            });
          } catch (e) {
            // Summarization failure must not surface to the user — response is already streamed
            log.err(ctx, e);
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
