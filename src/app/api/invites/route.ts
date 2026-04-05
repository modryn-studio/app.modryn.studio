import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import { env } from '@/lib/env';
import { randomBytes } from 'crypto';

const log = createRouteLogger('invites');

async function requireAdmin(req: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user) return null;
  const [row] = await sql`SELECT role FROM user_roles WHERE user_id = ${session.user.id}`;
  return row?.role === 'admin' ? session.user : null;
}

// GET /api/invites — list pending (unused, non-expired) invites
export async function GET(): Promise<Response> {
  const ctx = log.begin();
  const admin = await requireAdmin({} as Request);
  if (!admin) {
    return log.end(ctx, Response.json({ error: 'Forbidden' }, { status: 403 }));
  }

  try {
    const rows = await sql`
      SELECT token, email, used_at, expires_at, created_at
      FROM invites
      ORDER BY created_at DESC
    `;
    return log.end(ctx, Response.json(rows));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/invites — create an invite token
// Body: { email?: string } — email is optional; if set, the invite is locked to that address
export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const admin = await requireAdmin(req);
  if (!admin) {
    return log.end(ctx, Response.json({ error: 'Forbidden' }, { status: 403 }));
  }

  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;

    const token = randomBytes(24).toString('hex');

    await sql`
      INSERT INTO invites (token, email, created_by)
      VALUES (${token}, ${email}, ${admin.id})
    `;

    const appUrl = env.NEXT_PUBLIC_APP_URL ?? 'https://app.modrynstudio.com';
    const inviteUrl = `${appUrl}/auth/sign-up?token=${token}`;

    log.info(ctx.reqId, 'Invite created', { token: token.slice(0, 8) + '...', email });
    return log.end(ctx, Response.json({ token, url: inviteUrl }, { status: 201 }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
