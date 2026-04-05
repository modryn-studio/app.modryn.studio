import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('members/[id]');

function deriveInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

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
    const { name, role, system_prompt, personality_notes } = body;

    const updates: Record<string, string | null> = {};
    if (typeof name === 'string') {
      updates.name = name.trim();
      updates.initials = deriveInitials(name.trim());
    }
    if (typeof role === 'string') updates.role = role.trim();
    if (typeof system_prompt === 'string') updates.system_prompt = system_prompt.trim();
    if (typeof personality_notes === 'string')
      updates.personality_notes = personality_notes.trim() || null;

    if (Object.keys(updates).length === 0) {
      return log.end(ctx, Response.json({ error: 'No fields to update' }, { status: 400 }));
    }

    const newName = updates.name ?? null;
    const newRole = updates.role ?? null;
    const newInitials = updates.initials ?? null;
    const newSystemPrompt = updates.system_prompt ?? null;
    const hasPersonalityNotes = 'personality_notes' in updates;
    const newPersonalityNotes = hasPersonalityNotes ? (updates.personality_notes ?? null) : null;

    const rows = await sql`
      UPDATE members SET
        name              = COALESCE(${newName}, name),
        role              = COALESCE(${newRole}, role),
        initials          = COALESCE(${newInitials}, initials),
        system_prompt     = COALESCE(${newSystemPrompt}, system_prompt),
        personality_notes = CASE WHEN ${hasPersonalityNotes} THEN ${newPersonalityNotes} ELSE personality_notes END
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
