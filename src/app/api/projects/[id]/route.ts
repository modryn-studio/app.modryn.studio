import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('projects/[id]');

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  context: z.string().optional(),
});

// PATCH /api/projects/[id] — update project name and/or context
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, context } = updateProjectSchema.parse(body);

    const [row] = await sql`
      UPDATE projects
      SET name = COALESCE(${name ?? null}, name),
          context = COALESCE(${context ?? null}, context),
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, name, context, created_at, updated_at
    `;

    if (!row) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    log.info(ctx.reqId, 'Project updated', { id });
    return log.end(ctx, Response.json({ project: row }), { id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — delete a project (cascade-safe: only if no conversations exist)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { id } = await params;

    // Guard: don't delete a project that still has conversations
    const [hasConversations] = await sql`
      SELECT 1 FROM conversations WHERE project_id = ${id} LIMIT 1
    `;
    if (hasConversations) {
      return log.end(
        ctx,
        Response.json(
          { error: 'Cannot delete a project that has conversations. Delete conversations first.' },
          { status: 409 }
        )
      );
    }

    const [row] = await sql`
      DELETE FROM projects WHERE id = ${id} RETURNING id
    `;
    if (!row) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    log.info(ctx.reqId, 'Project deleted', { id });
    return log.end(ctx, Response.json({ ok: true }), { id });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
