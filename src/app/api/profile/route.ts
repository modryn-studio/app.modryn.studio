import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('profile');

// Inline — avoids importing from 'use client' module into server bundle
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
    const rows =
      await sql`SELECT name, role, description, avatar_url, initials FROM founder_profile WHERE id = 'founder' LIMIT 1`;
    const row = rows[0];
    if (!row) {
      return log.end(
        ctx,
        Response.json({
          name: '',
          role: '',
          description: '',
          avatarDataUrl: '',
          initials: '',
        })
      );
    }
    return log.end(
      ctx,
      Response.json({
        name: row.name,
        role: row.role,
        description: row.description,
        avatarDataUrl: row.avatar_url,
        initials: row.initials,
      })
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { name, role, description, avatarDataUrl } = body;

    // Build only the fields that were sent
    const updates: Record<string, string> = {};
    if (typeof name === 'string') updates.name = name.trim();
    if (typeof role === 'string') updates.role = role.trim();
    if (typeof description === 'string') updates.description = description;
    if (typeof avatarDataUrl === 'string') {
      // Limit avatar data URL to ~500 KB to prevent DB bloat
      if (avatarDataUrl.length > 512_000) {
        return log.end(
          ctx,
          Response.json({ error: 'Avatar image is too large (max 500 KB)' }, { status: 413 })
        );
      }
      updates.avatar_url = avatarDataUrl;
    }

    const newName = updates.name ?? undefined;
    const newInitials = newName ? deriveInitials(newName) : undefined;

    if (newName !== undefined) {
      updates.initials = newInitials!;
    }

    if (Object.keys(updates).length === 0) {
      return log.end(ctx, Response.json({ error: 'No fields to update' }, { status: 400 }));
    }

    // Build a single UPDATE — only touch the sent fields
    await sql`
      UPDATE founder_profile SET
        name = COALESCE(${updates.name ?? null}, name),
        role = COALESCE(${updates.role ?? null}, role),
        description = COALESCE(${updates.description ?? null}, description),
        avatar_url = COALESCE(${updates.avatar_url ?? null}, avatar_url),
        initials = COALESCE(${updates.initials ?? null}, initials),
        updated_at = now()
      WHERE id = 'founder'
    `;

    // Return the full updated profile
    const rows =
      await sql`SELECT name, role, description, avatar_url, initials FROM founder_profile WHERE id = 'founder' LIMIT 1`;
    const row = rows[0]!;

    const profile = {
      name: row.name,
      role: row.role,
      description: row.description,
      avatarDataUrl: row.avatar_url,
      initials: row.initials,
    };

    log.info(ctx.reqId, 'Profile updated', { name: profile.name });
    return log.end(ctx, Response.json(profile));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
