import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';

const log = createRouteLogger('me');

// GET /api/me — returns the role of the currently authenticated user.
// Used by client components to gate admin-only UI.
export async function GET(): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  try {
    const [row] = await sql`
      SELECT role FROM user_roles WHERE user_id = ${session.user.id}
    `;
    // Fall back to 'member' if no row exists yet (e.g. account created pre-migration)
    return log.end(ctx, Response.json({ role: row?.role ?? 'member' }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
