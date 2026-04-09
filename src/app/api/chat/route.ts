import { streamText, generateText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import { getCompanyContext, getOrgMemory, extractAndStoreOrgFacts } from '@/lib/context';
import { assembleContext } from '@/lib/tokens';
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
    const { message, memberId, conversationId, isRetry } = body;
    const surface = surfaceSchema.parse(body.surface);

    if (!message || !memberId) {
      return log.end(
        ctx,
        Response.json({ error: 'message and memberId are required' }, { status: 400 })
      );
    }

    // Pull member system prompt, recent memory, and conversation history in parallel.
    const [memberRows, episodicRows, semanticRows, orgMemory, historyRows] = await Promise.all([
      sql`SELECT system_prompt FROM members WHERE id = ${memberId} LIMIT 1`,
      sql`
        SELECT summary FROM member_memory
        WHERE member_id = ${memberId} AND memory_type = 'episodic'
        ORDER BY created_at DESC
        LIMIT 5
      `,
      sql`
        SELECT summary FROM member_memory
        WHERE member_id = ${memberId} AND memory_type = 'semantic'
        ORDER BY created_at DESC
        LIMIT 3
      `,
      getOrgMemory(),
      conversationId
        ? sql`
            SELECT id, role, content, created_at FROM messages
            WHERE conversation_id = ${conversationId}
            ORDER BY created_at DESC
            LIMIT 40
          `
        : Promise.resolve([]),
    ]);

    const memberSystemPrompt: string = memberRows[0]?.system_prompt ?? FALLBACK_SYSTEM;

    const companyContext = getCompanyContext();

    const episodicSegments =
      episodicRows.length > 0
        ? [...episodicRows]
            .reverse()
            .map((r: Record<string, string>) => r.summary)
            .join('\n\n---\n\n')
        : null;

    const semanticSegments =
      semanticRows.length > 0
        ? [...semanticRows]
            .reverse()
            .map((r: Record<string, string>) => r.summary)
            .join('\n\n---\n\n')
        : null;

    const formatInstruction = surface ? ROUTE_CONTEXT[surface] : null;

    // Priority order per plan Phase 3:
    // 1=format, 2=system prompt, 3=company context, 4=semantic, 5=org memory, 6=episodic
    const systemPrompt = assembleContext([
      ...(formatInstruction
        ? [
            {
              label: 'format',
              content: `## Format Instructions\n\n${formatInstruction}`,
              priority: 1,
            },
          ]
        : []),
      { label: 'system', content: memberSystemPrompt, priority: 2 },
      ...(companyContext
        ? [{ label: 'company', content: `## Company Context\n\n${companyContext}`, priority: 3 }]
        : []),
      ...(semanticSegments
        ? [
            {
              label: 'semantic',
              content: `## Member Observations (behavioural patterns, oldest first)\n\n${semanticSegments}`,
              priority: 4,
              prunable: true,
            },
          ]
        : []),
      ...(orgMemory ? [{ label: 'org', content: orgMemory, priority: 5, prunable: true }] : []),
      ...(episodicSegments
        ? [
            {
              label: 'episodic',
              content: `## Session Memory (previous conversations, oldest first)\n\n${episodicSegments}`,
              priority: 6,
              prunable: true,
            },
          ]
        : []),
    ]);

    // Build allMessages: DB history (last 40, reversed to chronological) + the new incoming message.
    // The server owns history — the client only sends the last message.
    // Strip the <sources> block appended by onFinish — it's for UI only, not model context
    const stripSources = (content: string) =>
      content.replace(/\n\n<sources>[\s\S]+?<\/sources>$/, '');

    const dbMessages = (
      historyRows as { id: string; role: string; content: string; created_at: string }[]
    )
      .reverse()
      .map((row) => ({
        id: row.id,
        role: row.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: stripSources(row.content) }],
        createdAt: new Date(row.created_at),
      }));
    const allMessages = [...dbMessages, message];

    log.info(ctx.reqId, 'Chat request', {
      memberId,
      conversationId,
      messageCount: allMessages.length,
    });

    // Save the incoming user message to DB. Skip on retry — it already exists.
    if (conversationId && message?.role === 'user' && !isRetry) {
      const text =
        message.parts
          ?.filter((p: { type: string }) => p.type === 'text')
          .map((p: { text: string }) => p.text)
          .join('') ??
        message.content ??
        '';
      if (text) {
        await sql`
          INSERT INTO messages (conversation_id, sender_id, role, content)
          VALUES (${conversationId}, 'founder', 'user', ${text})
        `;
      }
    }

    // 20-message sliding window — only the last 20 messages are sent to the model.
    // Full allMessages is retained in scope for the episodic memory transcript below.
    const windowedMessages = allMessages.slice(-20);

    // Server-side web search for Michelle only — Anthropic executes searches within one LLM call, no maxSteps needed
    const tools =
      memberId === 'michelle-lim'
        ? { web_search: anthropic.tools.webSearch_20260209({ maxUses: 3 }) }
        : undefined;

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: await convertToModelMessages(windowedMessages),
      maxOutputTokens: 800,
      temperature: 0.7,
      ...(tools && { tools }),
      async onFinish({ text, usage, sources }) {
        log.info(ctx.reqId, `[chat] tokens: in=${usage?.inputTokens} out=${usage?.outputTokens}`);
        // Save the AI response to DB. Append <sources> block for Michelle's web-search responses
        // so citations survive page reload. Stripped from model context in dbMessages above.
        const urlSources = sources?.filter(
          (s): s is Extract<typeof s, { sourceType: 'url' }> => s.sourceType === 'url'
        );
        const sourcesBlock = urlSources?.length
          ? `\n\n<sources>${JSON.stringify(
              urlSources.map((s) => ({ url: s.url, title: s.title }))
            )}</sources>`
          : '';
        const contentToSave = text + sourcesBlock;
        if (conversationId && text) {
          try {
            await sql`
              INSERT INTO messages (conversation_id, sender_id, role, content)
              VALUES (${conversationId}, ${memberId}, 'assistant', ${contentToSave})
            `;
            await sql`
              UPDATE conversations SET updated_at = now() WHERE id = ${conversationId}
            `;
          } catch (e) {
            log.err(ctx, e);
          }
        }

        // Memory write — only after 5 user turns. Token count alone is not a reliable
        // signal at this scale; turn count ensures the conversation has real substance.
        const userTurns = allMessages.filter((m: { role: string }) => m.role === 'user').length;
        const meetsThreshold = userTurns >= 5;

        if (conversationId && memberId && text && meetsThreshold) {
          try {
            // Build a plain transcript for the summarizer (incoming history + this response)
            const transcript = [
              ...allMessages.map(
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
              model: anthropic('claude-haiku-4-5-20251001'),
              messages: [
                {
                  role: 'user',
                  content: `Summarize this conversation in 3–5 bullet points for future context. Focus on: decisions made, tasks assigned, observations flagged, open questions. Be specific. Use plain bullets, no headers.\n\n${transcript}`,
                },
              ],
              maxOutputTokens: 600,
              temperature: 0.3,
            });

            // Upsert — one episodic summary per conversation, updated as it grows.
            // Prevents accumulating near-identical rows and injecting redundant context.
            const existingMemory = await sql`
              SELECT id FROM member_memory
              WHERE conversation_id = ${conversationId} AND memory_type = 'episodic'
              LIMIT 1
            `;
            if (existingMemory.length > 0) {
              await sql`
                UPDATE member_memory
                SET summary = ${summary}, created_at = now()
                WHERE id = ${existingMemory[0].id}
              `;
            } else {
              await sql`
                INSERT INTO member_memory (member_id, conversation_id, summary, memory_type)
                VALUES (${memberId}, ${conversationId}, ${summary}, 'episodic')
              `;
            }

            log.info(ctx.reqId, 'Memory written', {
              memberId,
              conversationId,
              userTurns,
              totalTokens: usage.totalTokens,
            });

            // Every 5th episodic entry for this member: generate a semantic summary
            // capturing recurring patterns, working style, decision tendencies.
            const episodicCount = await sql`
              SELECT COUNT(*) AS count FROM member_memory
              WHERE member_id = ${memberId} AND memory_type = 'episodic'
            `;
            const count = Number(episodicCount[0]?.count ?? 0);
            if (count > 0 && count % 5 === 0) {
              const allEpisodic = await sql`
                SELECT summary FROM member_memory
                WHERE member_id = ${memberId} AND memory_type = 'episodic'
                ORDER BY created_at ASC
              `;
              const episodicCorpus = allEpisodic
                .map((r: Record<string, string>) => r.summary)
                .join('\n\n---\n\n');
              const { text: semanticSummary } = await generateText({
                model: anthropic('claude-haiku-4-5-20251001'),
                messages: [
                  {
                    role: 'user',
                    content: `Based on the following conversation summaries between ${memberId} and Luke (founder), identify recurring patterns in how Luke thinks and works. Focus on: decision-making tendencies, recurring priorities, working style preferences, themes that keep surfacing. Write 3–5 plain bullet points. Be specific and observational, not evaluative.\n\n${episodicCorpus}`,
                  },
                ],
                maxOutputTokens: 400,
                temperature: 0.3,
              });
              await sql`
                INSERT INTO member_memory (member_id, conversation_id, summary, memory_type)
                VALUES (${memberId}, NULL, ${semanticSummary}, 'semantic')
              `;
              log.info(ctx.reqId, 'Semantic memory written', { memberId, episodicCount: count });
            }

            // Extract team-relevant facts from the summary for shared org context.
            // On retry: clear previous extraction for this conversation first — the same
            // exchange would otherwise produce duplicate rows. isRetry is reliable here
            // because handleRetry() is the only callsite that triggers regenerate().
            if (isRetry && conversationId) {
              await sql`DELETE FROM org_memory WHERE source_conversation_id = ${conversationId}`;
            }
            await extractAndStoreOrgFacts(summary, conversationId, memberId);
          } catch (e) {
            // Summarization failure must not surface to the user — response is already streamed
            log.err(ctx, e);
          }
        }
      },
    });

    // Consume the stream so onFinish fires even if the client disconnects mid-response.
    // Without this, closing the browser tab mid-stream aborts the LLM call and the
    // message is never saved to DB, leaving the conversation in a broken state.
    result.consumeStream(); // no await

    return log.end(ctx, result.toUIMessageStreamResponse({ sendSources: true }), { memberId });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
