import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('tasks');

const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  assigned_to: z.string().min(1),
  conversationId: z.string().uuid().optional(),
});

export async function GET(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { searchParams } = new URL(req.url);
    const assignedTo = searchParams.get('assignedTo');

    const rows = assignedTo
      ? await sql`
          SELECT t.id, t.title, t.description, t.assigned_to, t.status, t.output,
                 t.due_at, t.conversation_id, t.created_at, t.updated_at,
                 m.name AS assigned_to_name
          FROM tasks t
          LEFT JOIN members m ON m.id = t.assigned_to
          WHERE t.assigned_to = ${assignedTo}
          ORDER BY t.created_at DESC
        `
      : await sql`
          SELECT t.id, t.title, t.description, t.assigned_to, t.status, t.output,
                 t.due_at, t.conversation_id, t.created_at, t.updated_at,
                 m.name AS assigned_to_name
          FROM tasks t
          LEFT JOIN members m ON m.id = t.assigned_to
          ORDER BY t.created_at DESC
        `;

    return log.end(ctx, Response.json({ tasks: rows }));
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
    const { title, description, assigned_to, conversationId } = createTaskSchema.parse(body);

    const [row] = await sql`
      INSERT INTO tasks (title, description, assigned_to, conversation_id)
      VALUES (${title}, ${description ?? null}, ${assigned_to}, ${conversationId ?? null})
      RETURNING id, title, description, assigned_to, status, conversation_id, created_at
    `;

    log.info(ctx.reqId, 'Task created', { id: row.id, title, assigned_to });
    return log.end(ctx, Response.json({ task: row }), { id: row.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
