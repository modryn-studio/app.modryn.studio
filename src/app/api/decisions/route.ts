import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('decisions');

const createDecisionSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  conversationId: z.string().uuid().optional(),
  loggedBy: z.string().optional(),
});

export async function GET(): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const rows = await sql`
      SELECT id, title, description, conversation_id, logged_by, created_at
      FROM decisions
      ORDER BY created_at DESC
    `;
    return log.end(ctx, Response.json({ decisions: rows }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { title, description, conversationId, loggedBy } = createDecisionSchema.parse(body);

    const [row] = await sql`
      INSERT INTO decisions (title, description, conversation_id, logged_by)
      VALUES (${title}, ${description ?? null}, ${conversationId ?? null}, ${loggedBy ?? null})
      RETURNING id, title, description, conversation_id, logged_by, created_at
    `;

    log.info(ctx.reqId, 'Decision logged', { id: row.id, title });
    return log.end(ctx, Response.json(row), { id: row.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
