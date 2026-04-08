import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('threads/[threadId]/reply');

const replySchema = z.object({
  content: z.string().min(1),
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
    const { content } = replySchema.parse(body);

    log.info(ctx.reqId, 'Reply request', { threadId });

    const [inserted] = await sql`
      INSERT INTO messages (conversation_id, sender_id, role, content)
      VALUES (${threadId}, 'founder', 'user', ${content})
      RETURNING id, created_at
    `;

    await sql`UPDATE conversations SET updated_at = now() WHERE id = ${threadId}`;

    log.info(ctx.reqId, 'Reply inserted', { threadId, messageId: inserted.id });

    return log.end(
      ctx,
      Response.json({
        message: {
          id: inserted.id,
          sender_id: 'founder',
          sender_name: null,
          sender_initials: null,
          sender_role: null,
          role: 'user',
          content,
          created_at: inserted.created_at,
        },
      })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
