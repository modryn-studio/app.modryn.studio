import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('tasks/id');

const patchSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'done', 'blocked']).optional(),
  output: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const { status, output } = patchSchema.parse(body);

    if (!status && output === undefined) {
      return log.end(ctx, Response.json({ error: 'Nothing to update' }, { status: 400 }));
    }

    const [row] = await sql`
      UPDATE tasks
      SET
        status = COALESCE(${status ?? null}, status),
        output = COALESCE(${output ?? null}, output),
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, title, assigned_to, status, output, updated_at
    `;

    if (!row) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    log.info(ctx.reqId, 'Task updated', { id, status, hasOutput: !!output });
    return log.end(ctx, Response.json({ task: row }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
