import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('threads/[threadId]');

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { threadId } = await params;

    // Fetch thread metadata
    const [thread] = await sql`
      SELECT id, title, created_at, updated_at
      FROM conversations
      WHERE id = ${threadId} AND type = 'thread'
    `;
    if (!thread) {
      return log.end(ctx, Response.json({ error: 'Thread not found' }, { status: 404 }));
    }

    // Fetch respond order (AI members only, ordered by respond_order)
    const memberOrderRows = await sql`
      SELECT member_id
      FROM conversation_members
      WHERE conversation_id = ${threadId} AND member_id != 'founder'
      ORDER BY respond_order ASC
    `;
    const memberOrder: string[] = (memberOrderRows as Array<{ member_id: string }>).map(
      (r) => r.member_id
    );

    // Fetch messages with sender info joined from members table.
    // Founder row is handled via LEFT JOIN — member columns will be null for sender_id='founder'.
    const messages = await sql`
      SELECT
        msg.id,
        msg.sender_id,
        msg.role,
        msg.content,
        msg.created_at,
        m.name    AS sender_name,
        m.initials AS sender_initials,
        m.role    AS sender_role
      FROM messages msg
      LEFT JOIN members m ON m.id = msg.sender_id
      WHERE msg.conversation_id = ${threadId}
      ORDER BY msg.created_at ASC
    `;

    log.info(ctx.reqId, 'Thread fetched', {
      threadId,
      messageCount: messages.length,
      memberCount: memberOrder.length,
    });

    return log.end(ctx, Response.json({ thread, messages, memberOrder }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
