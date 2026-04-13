import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('projects');

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  context: z.string().optional(),
});

// GET /api/projects — list all projects, oldest first
export async function GET(): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const rows = await sql`
      SELECT id, name, context, created_at, updated_at
      FROM projects
      ORDER BY created_at ASC
    `;
    return log.end(ctx, Response.json({ projects: rows }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/projects — create a new project
export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { name, context } = createProjectSchema.parse(body);

    const [row] = await sql`
      INSERT INTO projects (name, context)
      VALUES (${name}, ${context ?? null})
      RETURNING id, name, context, created_at, updated_at
    `;

    log.info(ctx.reqId, 'Project created', { id: row.id, name });
    return log.end(ctx, Response.json({ project: row }), { id: row.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
