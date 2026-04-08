import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('threads');

const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  brief: z.string().min(1),
  memberOrder: z.array(z.string()).min(1),
});

// GET /api/threads — list all threads, newest first, with last message preview
export async function GET(_req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const threads = await sql`
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (
          SELECT content FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT sender_id FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_sender_id,
        (
          SELECT COUNT(*) FROM conversation_members
          WHERE conversation_id = c.id AND member_id != 'founder'
        ) AS participant_count
      FROM conversations c
      WHERE c.type = 'thread'
      ORDER BY c.updated_at DESC
    `;

    return log.end(ctx, Response.json({ threads }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/threads — create thread, insert all members with respond_order, insert brief
export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { title, brief, memberOrder } = createThreadSchema.parse(body);

    log.info(ctx.reqId, 'Creating thread', { title, memberCount: memberOrder.length });

    // Create conversation
    const [conversation] = await sql`
      INSERT INTO conversations (type, title)
      VALUES ('thread', ${title})
      RETURNING id
    `;
    const threadId: string = conversation.id;

    // Insert founder as participant (respond_order = -1, never responds)
    await sql`
      INSERT INTO conversation_members (conversation_id, member_id, respond_order)
      VALUES (${threadId}, 'founder', -1)
    `;

    // Insert AI members in specified respond order
    for (let i = 0; i < memberOrder.length; i++) {
      await sql`
        INSERT INTO conversation_members (conversation_id, member_id, respond_order)
        VALUES (${threadId}, ${memberOrder[i]}, ${i})
      `;
    }

    // Insert founder's brief as the first message
    await sql`
      INSERT INTO messages (conversation_id, sender_id, role, content)
      VALUES (${threadId}, 'founder', 'user', ${brief})
    `;

    log.info(ctx.reqId, 'Thread created', { threadId });

    return log.end(ctx, Response.json({ threadId, memberOrder }), { threadId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
