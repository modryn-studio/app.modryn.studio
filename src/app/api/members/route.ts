import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import '@/lib/env';

const log = createRouteLogger('members');

export async function GET(): Promise<Response> {
  const ctx = log.begin();
  try {
    const rows = await sql`
      SELECT id, name, role, initials, status, avatar_url
      FROM members
      ORDER BY created_at ASC
    `;

    const members = rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      initials: r.initials,
      status: r.status,
      avatarUrl: r.avatar_url,
    }));

    return log.end(ctx, Response.json(members));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
