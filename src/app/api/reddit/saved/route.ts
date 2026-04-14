import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('reddit/saved');

const createSchema = z.object({
  projectId: z.string().uuid(),
  url: z.string().url(),
  label: z.string().min(1).max(300),
  text: z.string().min(1),
  depth: z.number().int().min(2).max(99).default(4),
});

// GET /api/reddit/saved?projectId=... — list saved threads for a project (no text, labels only)
export async function GET(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    if (!projectId) {
      return log.end(ctx, Response.json({ error: 'projectId required' }, { status: 400 }));
    }
    const rows = await sql`
      SELECT id, url, label, depth, created_at
      FROM saved_reddit_urls
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;
    return log.end(ctx, Response.json({ saved: rows }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/reddit/saved — save a fetched Reddit thread with cached text
export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { projectId, url, label, text, depth } = createSchema.parse(body);

    const [row] = await sql`
      INSERT INTO saved_reddit_urls (project_id, url, label, text, depth)
      VALUES (${projectId}, ${url}, ${label}, ${text}, ${depth})
      RETURNING id, url, label, depth, created_at
    `;

    log.info(ctx.reqId, 'Saved Reddit URL', { id: row.id, label });
    return log.end(ctx, Response.json({ saved: row }), { id: row.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
