import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('reddit/saved/id');

// GET /api/reddit/saved/[id] — fetch full text of a saved thread
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  const { id } = await params;
  try {
    const [row] = await sql`
      SELECT id, url, label, text, depth, created_at
      FROM saved_reddit_urls
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!row) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }
    return log.end(ctx, Response.json({ saved: row }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/reddit/saved/[id] — remove a saved thread
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  const { id } = await params;
  try {
    const [row] = await sql`
      DELETE FROM saved_reddit_urls WHERE id = ${id} RETURNING id
    `;
    if (!row) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }
    log.info(ctx.reqId, 'Deleted saved Reddit URL', { id });
    return log.end(ctx, Response.json({ ok: true }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
