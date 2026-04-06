import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import { deriveInitials } from '@/lib/initials';
import '@/lib/env';

const log = createRouteLogger('members/[id]');

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  const [roleRow] = await sql`SELECT role FROM user_roles WHERE user_id = ${session.user.id}`;
  if (roleRow?.role !== 'admin') {
    return log.end(ctx, Response.json({ error: 'Forbidden' }, { status: 403 }));
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, role, system_prompt, personality_notes, avatar_data_url } = body;

    if (typeof avatar_data_url === 'string' && avatar_data_url.length > 1_500_000) {
      return log.end(
        ctx,
        Response.json({ error: 'Avatar image is too large (max 1 MB)' }, { status: 413 })
      );
    }

    const updates: Record<string, string | null> = {};
    if (typeof name === 'string') {
      updates.name = name.trim();
      updates.initials = deriveInitials(name.trim());
    }
    if (typeof role === 'string') updates.role = role.trim();
    if (typeof system_prompt === 'string') updates.system_prompt = system_prompt.trim();
    if (typeof personality_notes === 'string')
      updates.personality_notes = personality_notes.trim() || null;
    if (typeof avatar_data_url === 'string') updates.avatar_url = avatar_data_url;

    if (Object.keys(updates).length === 0) {
      return log.end(ctx, Response.json({ error: 'No fields to update' }, { status: 400 }));
    }

    const newName = updates.name ?? null;
    const newRole = updates.role ?? null;
    const newInitials = updates.initials ?? null;
    const newSystemPrompt = updates.system_prompt ?? null;
    const hasPersonalityNotes = 'personality_notes' in updates;
    const newPersonalityNotes = hasPersonalityNotes ? (updates.personality_notes ?? null) : null;
    const hasAvatar = 'avatar_url' in updates;
    const newAvatarUrl = hasAvatar ? (updates.avatar_url ?? null) : null;

    const rows = await sql`
      UPDATE members SET
        name              = COALESCE(${newName}, name),
        role              = COALESCE(${newRole}, role),
        initials          = COALESCE(${newInitials}, initials),
        system_prompt     = COALESCE(${newSystemPrompt}, system_prompt),
        personality_notes = CASE WHEN ${hasPersonalityNotes} THEN ${newPersonalityNotes} ELSE personality_notes END,
        avatar_url        = CASE WHEN ${hasAvatar} THEN ${newAvatarUrl} ELSE avatar_url END
      WHERE id = ${id}
      RETURNING id, name, role, initials, status, avatar_url, system_prompt, personality_notes
    `;

    if (rows.length === 0) {
      return log.end(ctx, Response.json({ error: 'Member not found' }, { status: 404 }));
    }

    const m = rows[0];
    log.info(ctx.reqId, 'Member updated', { id: m.id });
    return log.end(
      ctx,
      Response.json({
        id: m.id,
        name: m.name,
        role: m.role,
        initials: m.initials,
        status: m.status,
        avatarUrl: m.avatar_url,
        systemPrompt: m.system_prompt,
        personalityNotes: m.personality_notes ?? '',
      })
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
