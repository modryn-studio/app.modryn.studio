import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import { extractAndStoreOrgFacts } from '@/lib/context';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('threads/[threadId]/extract');

// Called by the client after runRespondSequence completes — regardless of
// how many members succeeded or failed. Extracts org-level facts from the
// full thread transcript and writes them to org_memory.
// Keeping extraction here (not in the respond route) ensures it fires once,
// after all members have had their chance, and is independently debuggable.

const extractSchema = z.object({
  memberId: z.string().min(1), // The member acting as attribution source for the extraction
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
    const { memberId } = extractSchema.parse(body);

    log.info(ctx.reqId, 'Extract request', { threadId, memberId });

    // Fetch full thread transcript
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

    if (threadMessages.length === 0) {
      return log.end(ctx, Response.json({ ok: true, extracted: 0 }));
    }

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

    await extractAndStoreOrgFacts(transcript, threadId, memberId);

    log.info(ctx.reqId, 'Extraction complete', { threadId, memberId });

    return log.end(ctx, Response.json({ ok: true }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
