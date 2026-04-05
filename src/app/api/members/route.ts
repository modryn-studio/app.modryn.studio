import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('members');

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function deriveInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

export async function GET(): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
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

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  // Admin-only: only the admin role can create AI members
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
    const { name, role, system_prompt, personality_notes } = body;

    if (!name?.trim() || !role?.trim() || !system_prompt?.trim()) {
      return log.end(
        ctx,
        Response.json({ error: 'name, role, and system_prompt are required' }, { status: 400 })
      );
    }

    const baseId = slugify(name.trim());
    // Ensure uniqueness: append a short suffix if slug already exists
    const existing = await sql`SELECT id FROM members WHERE id LIKE ${baseId + '%'}`;
    const id = existing.length === 0 ? baseId : `${baseId}-${existing.length}`;
    const initials = deriveInitials(name.trim());

    const rows = await sql`
      INSERT INTO members (id, name, role, initials, system_prompt, personality_notes)
      VALUES (${id}, ${name.trim()}, ${role.trim()}, ${initials}, ${system_prompt.trim()}, ${personality_notes?.trim() ?? null})
      RETURNING id, name, role, initials, status, avatar_url
    `;

    const member = rows[0];
    log.info(ctx.reqId, 'Member created', { id: member.id, name: member.name });
    return log.end(
      ctx,
      Response.json(
        {
          id: member.id,
          name: member.name,
          role: member.role,
          initials: member.initials,
          status: member.status,
          avatarUrl: member.avatar_url,
        },
        { status: 201 }
      )
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
