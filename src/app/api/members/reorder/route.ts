import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('members/reorder');

// PATCH /api/members/reorder
// Body: { orderedIds: string[] } — full ordered list of member IDs
export async function PATCH(req: Request): Promise<Response> {
  const ctx = log.begin();

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  const [roleRow] = await sql`SELECT role FROM user_roles WHERE user_id = ${session.user.id}`;
  if (roleRow?.role !== 'admin') {
    return log.end(ctx, Response.json({ error: 'Forbidden' }, { status: 403 }));
  }

  try {
    const body = await req.json();
    const { orderedIds } = body;

    if (
      !Array.isArray(orderedIds) ||
      orderedIds.length === 0 ||
      orderedIds.some((id) => typeof id !== 'string' || !id.trim())
    ) {
      return log.end(
        ctx,
        Response.json({ error: 'orderedIds must be a non-empty array of strings' }, { status: 400 })
      );
    }

    // Update each member's sort_order based on its position in the array
    await sql`
      UPDATE members SET sort_order = updates.pos
      FROM (
        SELECT unnest(${orderedIds}::text[]) AS id,
               generate_series(1, ${orderedIds.length}::int) AS pos
      ) AS updates
      WHERE members.id = updates.id
    `;

    log.info(ctx.reqId, 'Members reordered', { count: orderedIds.length });
    return log.end(ctx, Response.json({ ok: true }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
