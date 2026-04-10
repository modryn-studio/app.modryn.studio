import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import { getCompanyContext, getOrgMemory } from '@/lib/context';
import { assembleContext } from '@/lib/tokens';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('threads/[threadId]/respond');

// Position-aware format instructions for thread contributions.
// First responder has no prior contributions to reference — anti-anticipation clause
// prevents the model from inferring what other members will say from role descriptions.
const THREAD_FORMAT_FIRST =
  "You are the first to respond in a group strategy thread. Respond directly to the founder's brief. Your response should be 150–300 words. Lead with your sharpest point. Do not anticipate, predict, or attribute positions to team members who have not yet contributed to this thread. You do not know what they will say. The founder's brief may reference prior conversations with team members — those are historical context, not predictions of what those members will say here.";

const THREAD_FORMAT_SUBSEQUENT =
  'You are contributing to a group strategy thread. Your response should be 150–300 words. Reference at least one prior contribution by name — build on it or challenge it directly. Lead with your sharpest point. Do not summarize what others said before adding your view. Do not anticipate or attribute positions to team members who have not yet contributed to this thread.';

// Strip cross-member name references from system prompts in thread context.
// In DMs these are useful (delegation awareness), but in threads they prime
// anticipation of members who haven't spoken yet.
// Patterns covered:
//   "(that's Dieter Rams)" — Munger's full-name parentheticals
//   "(Munger)", "(Marc)" — Jobs/Marc's short-name parentheticals
//   "— Jobs", "— Marc" — Michelle/Dieter's dash-name attributions
const MEMBER_NAMES =
  'Charlie Munger|Steve Jobs|Michelle Lim|Marc Lou|Dieter Rams|Munger|Jobs|Michelle|Marc|Rams';
function stripCrossMemberRefs(prompt: string): string {
  return prompt
    .replace(new RegExp(`\\(that's (?:${MEMBER_NAMES})\\)`, 'gi'), '')
    .replace(new RegExp(`\\((?:${MEMBER_NAMES})\\)`, 'gi'), '')
    .replace(new RegExp(` — (?:${MEMBER_NAMES})(?=\\s*$)`, 'gim'), '')
    .replace(/ {2,}/g, ' ')
    .replace(/- +\n/g, '\n');
}

const respondSchema = z.object({
  memberId: z.string().min(1),
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
    const body = await req.json();
    const { memberId } = respondSchema.parse(body);

    log.info(ctx.reqId, 'Respond request', { threadId, memberId });

    // Guard: memberId must be a participant in this thread.
    // Prevents bypassing per-reply exclusion via direct API calls.
    const [memberInThread] = await sql`
      SELECT 1 FROM conversation_members
      WHERE conversation_id = ${threadId} AND member_id = ${memberId}
      LIMIT 1
    `;
    if (!memberInThread) {
      return log.end(
        ctx,
        Response.json({ error: 'Member is not a participant in this thread' }, { status: 403 })
      );
    }

    // Fetch member, episodic + semantic memory, and org memory in parallel
    const [memberRows, episodicRows, semanticRows, orgMemory] = await Promise.all([
      sql`SELECT name, role, initials, system_prompt FROM members WHERE id = ${memberId} LIMIT 1`,
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
    ]);

    if (!memberRows[0]) {
      return log.end(ctx, Response.json({ error: 'Member not found' }, { status: 404 }));
    }
    const member = memberRows[0];

    // Idempotency: if this member already responded after the last founder message,
    // return the existing response rather than generating a duplicate.
    const [existing] = await sql`
      SELECT id, content, created_at FROM messages
      WHERE conversation_id = ${threadId}
        AND sender_id = ${memberId}
        AND created_at > (
          SELECT COALESCE(
            MAX(created_at),
            (SELECT created_at FROM conversations WHERE id = ${threadId})
          )
          FROM messages
          WHERE conversation_id = ${threadId} AND sender_id = 'founder'
        )
      LIMIT 1
    `;
    if (existing) {
      log.info(ctx.reqId, 'Idempotent return — already responded', {
        threadId,
        memberId,
        messageId: existing.id,
      });
      return log.end(
        ctx,
        Response.json({
          message: {
            id: existing.id,
            sender_id: memberId,
            sender_name: member.name,
            sender_initials: member.initials,
            sender_role: member.role,
            role: 'assistant',
            content: existing.content,
            created_at: existing.created_at,
          },
        }),
        { memberId }
      );
    }

    // Re-query thread messages fresh from DB — this is the key behavior.
    // Each member sees all prior responses including members who responded before them.
    const threadMessages = await sql`
      SELECT
        msg.sender_id,
        msg.content,
        m.name    AS sender_name,
        m.role    AS sender_role
      FROM messages msg
      LEFT JOIN members m ON m.id = msg.sender_id
      WHERE msg.conversation_id = ${threadId}
      ORDER BY msg.created_at ASC
    `;

    // Build labeled transcript so each member knows who said what
    const transcript = (
      threadMessages as Array<{
        sender_id: string;
        content: string;
        sender_name: string | null;
        sender_role: string | null;
      }>
    )
      .map((msg) => {
        const label =
          msg.sender_id === 'founder'
            ? 'Luke (Founder)'
            : `${msg.sender_name} (${msg.sender_role})`;
        return `${label}:\n${msg.content}`;
      })
      .join('\n\n---\n\n');

    // First responder = no non-founder messages exist in the transcript yet.
    // Used to select the correct format instruction (no "reference prior contributions" when there are none).
    const isFirstResponder = !(threadMessages as Array<{ sender_id: string }>).some(
      (msg) => msg.sender_id !== 'founder'
    );
    const threadFormat = isFirstResponder ? THREAD_FORMAT_FIRST : THREAD_FORMAT_SUBSEQUENT;

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

    // Priority order per plan Phase 3: format=1, system=2, company=3, semantic=4, org=5, episodic=6
    // System prompt is stripped of cross-member name refs to prevent anticipation in threads.
    const systemPrompt = assembleContext([
      { label: 'format', content: `## Format Instructions\n\n${threadFormat}`, priority: 1 },
      { label: 'system', content: stripCrossMemberRefs(member.system_prompt ?? ''), priority: 2 },
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

    const result = streamText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `The full thread so far:\n\n${transcript}\n\nContribute your response.`,
        },
      ],
      maxOutputTokens: 800,
      temperature: 0.7,
      async onFinish({ text }) {
        // DB write happens inside onFinish — the stream does not close until this
        // resolves. This guarantees that when the client reads stream-done and fires
        // the next member's respond call, the history query sees the completed row.
        const [inserted] = await sql`
          INSERT INTO messages (conversation_id, sender_id, role, content)
          VALUES (${threadId}, ${memberId}, 'assistant', ${text})
          RETURNING id, created_at
        `;

        await sql`UPDATE conversations SET updated_at = now() WHERE id = ${threadId}`;

        // Org-level fact extraction is handled by /extract endpoint called by the
        // client after the full sequence completes — not here per-member.

        log.info(ctx.reqId, 'Response inserted', {
          threadId,
          memberId,
          messageId: inserted.id,
          // How much context the member saw — useful for spotting transcript bloat
          transcriptMessages: threadMessages.length,
          // Word count vs 150–300 word format target
          wordCount: text.split(/\s+/).filter(Boolean).length,
        });
      },
    });

    return log.end(ctx, result.toTextStreamResponse(), { memberId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
