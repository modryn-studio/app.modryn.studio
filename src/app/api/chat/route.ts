import { streamText, generateText } from 'ai';
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
    const typedImageUrls = (
      (body.imageUrls ?? []) as { url: string; contentType: string }[]
    ).filter((u) => u.url && u.contentType);
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
            LIMIT 60
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

    // Build allMessages: DB history (newest-first, token-budget-limited) + the new incoming message.
    // The server owns history — the client only sends the last message.
    // Strip the <sources> block appended by onFinish — it's for UI only, not model context
    const stripSources = (content: string) =>
      content.replace(/\n\n<sources>[\s\S]+?<\/sources>$/, '');

    // Token-aware history window: accumulate rows newest-first until HISTORY_TOKEN_BUDGET is
    // exhausted, then reverse to chronological. Prevents a single long message (e.g. pasted docs)
    // from silently consuming the entire conversation context budget.
    const HISTORY_TOKEN_BUDGET = 8000;
    const rawRows = historyRows as {
      id: string;
      role: string;
      content: string;
      created_at: string;
    }[];
    const selectedRows: typeof rawRows = [];
    let historyTokensUsed = 0;
    for (let i = 0; i < rawRows.length; i++) {
      // rows arrive newest-first from the ORDER BY DESC query
      const row = rawRows[i];
      const tokens = estimateTokens(stripSources(row.content));
      // Always include the most recent message (i===0) regardless of size — it's the most
      // relevant context and excluding it would leave the model with no prior turn at all.
      // For subsequent messages stop when budget is exhausted to keep a contiguous window.
      if (i > 0 && historyTokensUsed + tokens > HISTORY_TOKEN_BUDGET) break;
      selectedRows.push(row);
      historyTokensUsed += tokens;
    }
    const dbMessages = selectedRows
      .reverse() // back to chronological
      .map((row) => {
        // User messages containing images are stored as a JSON parts array.
        // Parse it; fall back to plain text for all other messages.
        let parts: { type: string; text?: string; image?: URL; mediaType?: string }[] = [
          { type: 'text' as const, text: stripSources(row.content) },
        ];
        if (row.role === 'user') {
          try {
            const parsed = JSON.parse(row.content);
            if (Array.isArray(parsed)) {
              parts = parsed
                .map((p: { type: string; text?: string; url?: string; contentType?: string }) =>
                  p.type === 'image' && p.url
                    ? { type: 'image' as const, image: new URL(p.url), mediaType: p.contentType }
                    : { type: 'text' as const, text: p.text ?? '' }
                )
                // Filter empty text parts so Anthropic never receives blank text blocks in history.
                .filter(
                  (p: { type: string; text?: string }) => !(p.type === 'text' && !p.text?.trim())
                );
            }
          } catch {
            /* plain text — keep default */
          }
        }
        return {
          id: row.id,
          role: row.role as 'user' | 'assistant',
          parts,
          createdAt: new Date(row.created_at),
        };
      });

    const textFromIncoming =
      (message.parts ?? [])
        .filter((p: { type: string; text?: string }) => p.type === 'text' && p.text?.trim())
        .map((p: { text?: string }) => p.text ?? '')
        .join('') || (typeof message.content === 'string' ? message.content.trim() : '');

    // Guard against accidental empty sends (e.g. upload failed and no text entered).
    if (message?.role === 'user' && typedImageUrls.length === 0 && !textFromIncoming) {
      return log.end(
        ctx,
        Response.json({ error: 'Message must include text or an uploaded image' }, { status: 400 })
      );
    }

    // Inject image parts into the incoming user message so Claude receives them.
    // imageUrls contains { url, contentType } pairs uploaded to Vercel Blob.
    // Filter out empty text parts — Anthropic rejects content arrays that contain blank text blocks.
    const incomingMessage =
      typedImageUrls.length > 0
        ? {
            ...message,
            parts: [
              ...typedImageUrls.map(({ url, contentType }) => ({
                type: 'image' as const,
                image: new URL(url),
                mediaType: contentType,
              })),
              ...(message.parts ?? []).filter(
                (p: { type: string; text?: string }) => !(p.type === 'text' && !p.text?.trim())
              ),
            ],
          }
        : message;
    const allMessages = [...dbMessages, incomingMessage];

    log.info(ctx.reqId, 'Chat request', {
      memberId,
      conversationId,
      messageCount: allMessages.length,
    });

    // Save the incoming user message to DB. Skip on retry — it already exists.

    // Save the incoming user message to DB. Skip on retry — it already exists.
    if (conversationId && message?.role === 'user' && !isRetry) {
      const text = textFromIncoming;
      // When images are attached, store as a JSON parts array for history reconstruction.
      const contentToStore =
        typedImageUrls.length > 0
          ? JSON.stringify([
              ...typedImageUrls.map(({ url, contentType }) => ({
                type: 'image',
                url,
                contentType,
              })),
              ...(text ? [{ type: 'text', text }] : []),
            ])
          : text;
      if (contentToStore) {
        await sql`
          INSERT INTO messages (conversation_id, sender_id, role, content)
          VALUES (${conversationId}, 'founder', 'user', ${contentToStore})
        `;
      }
    }

    // Build CoreMessages directly for the Anthropic API call.
    // We cannot pass allMessages through convertToModelMessages because that function
    // expects UIMessage UI-layer parts (type 'file', 'text', etc.), but our dbMessages and
    // incomingMessage contain model-layer image parts (type 'image'). The SDK drops unknown
    // UI part types silently, producing empty content and a 400 from Anthropic.
    // Building CoreMessages directly gives us full control over what the model receives.
    const incomingImageParts = typedImageUrls.map(({ url, contentType }) => ({
      type: 'image' as const,
      image: new URL(url),
      mediaType: contentType,
    }));
    const incomingTextParts = textFromIncoming
      ? [{ type: 'text' as const, text: textFromIncoming }]
      : [];
    const incomingContent = [...incomingImageParts, ...incomingTextParts];

    const coreMessages = [
      // History — selectedRows is in chronological order after the .reverse() above
      ...selectedRows
        .map((row) => {
          if (row.role === 'assistant') {
            return { role: 'assistant' as const, content: stripSources(row.content) };
          }
          // User — may contain images stored as JSON parts array
          try {
            const parsed = JSON.parse(row.content);
            if (Array.isArray(parsed)) {
              const parts = parsed
                .map((p: { type: string; text?: string; url?: string; contentType?: string }) =>
                  p.type === 'image' && p.url
                    ? { type: 'image' as const, image: new URL(p.url), mediaType: p.contentType }
                    : { type: 'text' as const, text: p.text ?? '' }
                )
                .filter(
                  (p: { type: string; text?: string }) => !(p.type === 'text' && !p.text?.trim())
                );
              if (parts.length > 0) return { role: 'user' as const, content: parts };
            }
          } catch {
            /* plain text — fall through */
          }
          const t = stripSources(row.content);
          return t ? { role: 'user' as const, content: t } : null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null),
      // Incoming user message
      {
        role: 'user' as const,
        // When content is an array it must be non-empty — Anthropic rejects empty arrays.
        // Fall back to plain string if we somehow end up with no parts (safety net).
        content:
          incomingContent.length > 0
            ? incomingContent
            : textFromIncoming || 'Continue the conversation.',
      },
    ];

    // Server-side web search for Michelle only. maxUses: 2 lets her do a follow-up search
    // when the first result is insufficient (e.g. multi-step research), without tripling cost.
    const tools =
      memberId === 'michelle-lim'
        ? { web_search: anthropic.tools.webSearch_20260209({ maxUses: 2 }) }
        : undefined;

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: coreMessages,
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
