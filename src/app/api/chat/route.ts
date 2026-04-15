import { streamText, generateText, convertToModelMessages } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import {
  getCompanyContext,
  getProjectContext,
  getOrgMemory,
  getMemberTasks,
  extractAndStoreOrgFacts,
} from '@/lib/context';
import { assembleContext, estimateTokens } from '@/lib/tokens';
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
    const { message, memberId, conversationId, isRetry, projectId } = body;
    const surface = surfaceSchema.parse(body.surface);

    if (!message || !memberId) {
      return log.end(
        ctx,
        Response.json({ error: 'message and memberId are required' }, { status: 400 })
      );
    }

    // Pull member system prompt, recent memory, and conversation history in parallel.
    const [
      memberRows,
      episodicRows,
      semanticRows,
      orgMemory,
      memberTasks,
      projectContext,
      historyRows,
    ] = await Promise.all([
      sql`SELECT system_prompt FROM members WHERE id = ${memberId} LIMIT 1`,
      // Episodic memory is project-scoped — only surface conversations from this project.
      projectId
        ? sql`
            SELECT summary FROM member_memory
            WHERE member_id = ${memberId}
              AND memory_type = 'episodic'
              AND project_id = ${projectId}
            ORDER BY created_at DESC
            LIMIT 5
          `
        : Promise.resolve([]),
      // Semantic memory is intentionally cross-project (project_id IS NULL on these rows).
      sql`
        SELECT summary FROM member_memory
        WHERE member_id = ${memberId} AND memory_type = 'semantic'
        ORDER BY created_at DESC
        LIMIT 3
      `,
      projectId ? getOrgMemory(projectId) : Promise.resolve(null),
      // Tasks are project-scoped — same pattern as getOrgMemory. Never show tasks from other projects.
      projectId ? getMemberTasks(memberId, projectId) : Promise.resolve(null),
      projectId ? getProjectContext(projectId) : Promise.resolve(null),
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

    // Priority order: 1=format, 2=system prompt, 3=company context, 4=project context,
    // 5=member tasks, 6=semantic, 7=org memory, 8=episodic
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
      ...(projectContext ? [{ label: 'project', content: projectContext, priority: 4 }] : []),
      ...(memberTasks
        ? [{ label: 'tasks', content: memberTasks, priority: 5, prunable: true }]
        : []),
      ...(semanticSegments
        ? [
            {
              label: 'semantic',
              content: `## Member Observations (behavioural patterns, oldest first)\n\n${semanticSegments}`,
              priority: 6,
              prunable: true,
            },
          ]
        : []),
      ...(orgMemory ? [{ label: 'org', content: orgMemory, priority: 7, prunable: true }] : []),
      ...(episodicSegments
        ? [
            {
              label: 'episodic',
              content: `## Session Memory (previous conversations, oldest first)\n\n${episodicSegments}`,
              priority: 8,
              prunable: true,
            },
          ]
        : []),
    ]);

    log.info(ctx.reqId, 'Context layers (estimated tokens)', {
      ...(formatInstruction ? { format: estimateTokens(formatInstruction) } : {}),
      system_prompt: estimateTokens(memberSystemPrompt),
      company_context: companyContext ? estimateTokens(companyContext) : 0,
      project_context: projectContext ? estimateTokens(projectContext) : 0,
      tasks: memberTasks ? estimateTokens(memberTasks) : 0,
      semantic: semanticSegments ? estimateTokens(semanticSegments) : 0,
      org_memory: orgMemory ? estimateTokens(orgMemory) : 0,
      episodic: episodicSegments ? estimateTokens(episodicSegments) : 0,
      assembled_tokens_est: estimateTokens(systemPrompt),
    });

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

    // Server-side web search for Michelle only — one targeted search per DM turn.
    // 3 uses could compound to ~$0.66/message; one search at $0.22 is the right cost
    // for a technical validation question where accuracy matters.
    const tools =
      memberId === 'michelle-lim'
        ? { web_search: anthropic.tools.webSearch_20260209({ maxUses: 1 }) }
        : undefined;

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: await convertToModelMessages(windowedMessages),
      maxOutputTokens: 800,
      temperature: 0.7,
      ...(tools && { tools }),
      async onFinish({ text, usage, sources }) {
        const inputCost = ((usage?.inputTokens ?? 0) / 1_000_000) * 3;
        const outputCost = ((usage?.outputTokens ?? 0) / 1_000_000) * 15;
        log.info(ctx.reqId, 'Stream complete', {
          input_tokens: usage?.inputTokens,
          output_tokens: usage?.outputTokens,
          input_cost_usd: inputCost.toFixed(5),
          output_cost_usd: outputCost.toFixed(5),
          total_cost_usd: (inputCost + outputCost).toFixed(5),
        });
        // Save the AI response to DB. Append <sources> block for Michelle's web-search responses
        // so citations survive page reload. Stripped from model context in dbMessages above.
        const urlSources = sources
          ?.filter((s): s is Extract<typeof s, { sourceType: 'url' }> => s.sourceType === 'url')
          .filter((s, i, arr) => arr.findIndex((x) => x.url === s.url) === i);
        const sourcesBlock = urlSources?.length
          ? `\n\n<sources>${JSON.stringify(
              urlSources.map((s) => ({ url: s.url, title: s.title }))
            )}</sources>`
          : '';
        const contentToSave = text + sourcesBlock;
        if (conversationId && text) {
          try {
            // RETURNING id so we can identify and delete the stale response on retry.
            const [newMsg] = await sql`
              INSERT INTO messages (conversation_id, sender_id, role, content)
              VALUES (${conversationId}, ${memberId}, 'assistant', ${contentToSave})
              RETURNING id
            `;
            // On retry: new response is confirmed written — now delete the previous
            // assistant message. Subquery targets the index (conversation_id, created_at).
            // Postgres doesn't support DELETE ... ORDER BY ... LIMIT directly.
            if (isRetry && newMsg?.id) {
              await sql`
                DELETE FROM messages WHERE id = (
                  SELECT id FROM messages
                  WHERE conversation_id = ${conversationId}
                    AND role = 'assistant'
                    AND id != ${newMsg.id}
                  ORDER BY created_at DESC
                  LIMIT 1
                )
              `;
            }
            await sql`
              UPDATE conversations SET updated_at = now() WHERE id = ${conversationId}
            `;
          } catch (e) {
            log.err(ctx, e);
          }
        }

        // Build a plain transcript covering the full conversation + this response.
        // Built unconditionally — used by both the episodic summarizer and org extraction.
        const transcript =
          conversationId && memberId && text
            ? [
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
              ].join('\n\n')
            : null;

        // Org memory extraction — runs on every turn, not gated by turn count.
        // DELETE + full-transcript re-extract ensures org_memory always reflects the
        // complete conversation. Handles retry and edit cleanly (prior facts replaced).
        // extractAndStoreOrgFacts returns 0 and writes nothing when no facts qualify —
        // the facts:[] return path is the density filter.
        if (transcript && conversationId && memberId) {
          try {
            await sql`DELETE FROM org_memory WHERE source_conversation_id = ${conversationId}`;
            await extractAndStoreOrgFacts(transcript, conversationId, memberId, projectId);
          } catch (e) {
            log.err(ctx, e);
          }
        }

        // Episodic memory — only after 2 user turns. A single-message exchange is too
        // thin to produce a useful summary; 2 turns guarantees at least one back-and-forth.
        const userTurns = allMessages.filter((m: { role: string }) => m.role === 'user').length;
        const meetsThreshold = userTurns >= 2;

        if (transcript && conversationId && memberId && text && meetsThreshold) {
          try {
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
                INSERT INTO member_memory (member_id, conversation_id, summary, memory_type, project_id)
                VALUES (${memberId}, ${conversationId}, ${summary}, 'episodic', ${projectId ?? null})
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
