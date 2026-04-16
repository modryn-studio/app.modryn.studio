import { NextRequest } from 'next/server';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('conversations-dm');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { memberId } = await params;
    const { searchParams } = new URL(_req.url);
    const projectId = searchParams.get('projectId');

    // Find existing DM between founder and this member, scoped to project
    const existing = projectId
      ? await sql`
          SELECT c.id FROM conversations c
          JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.member_id = 'founder'
          JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.member_id = ${memberId}
          WHERE c.type = 'dm' AND c.project_id = ${projectId}
          LIMIT 1
        `
      : await sql`
          SELECT c.id FROM conversations c
          JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.member_id = 'founder'
          JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.member_id = ${memberId}
          WHERE c.type = 'dm'
          LIMIT 1
        `;

    let conversationId: string;

    if (existing.length > 0) {
      conversationId = existing[0].id;
    } else {
      // Create new DM conversation
      const created = projectId
        ? await sql`
            INSERT INTO conversations (type, project_id) VALUES ('dm', ${projectId}) RETURNING id
          `
        : await sql`
            INSERT INTO conversations (type) VALUES ('dm') RETURNING id
          `;
      conversationId = created[0].id;

      await sql`
        INSERT INTO conversation_members (conversation_id, member_id)
        VALUES (${conversationId}, 'founder'), (${conversationId}, ${memberId})
      `;

      log.info(ctx.reqId, 'Created DM conversation', { memberId, conversationId });
    }

    // Load message history
    const messages = await sql`
      SELECT id, sender_id, role, content, created_at
      FROM messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;

    const formatted = messages.map((m) => ({
      id: m.id,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.created_at,
    }));

    return log.end(ctx, Response.json({ conversationId, messages: formatted }), { memberId });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { memberId } = await params;
    const body = await req.json();
    const { messageId } = body as { messageId: string };
    if (!messageId) {
      return log.end(ctx, Response.json({ error: 'messageId required' }, { status: 400 }));
    }

    // Client-generated message IDs (AI SDK nanoids) are not UUIDs and will never be in the DB.
    // Return a no-op 200 instead of letting Postgres throw a uuid parse error.
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(messageId)) {
      return log.end(ctx, Response.json({ deleted: 0 }));
    }

    // Find the message and its conversation (scoped to this member's DM)
    const found = await sql`
      SELECT m.id, m.created_at, m.conversation_id
      FROM messages m
      JOIN conversation_members cm1 ON cm1.conversation_id = m.conversation_id AND cm1.member_id = 'founder'
      JOIN conversation_members cm2 ON cm2.conversation_id = m.conversation_id AND cm2.member_id = ${memberId}
      WHERE m.id = ${messageId}
      LIMIT 1
    `;
    if (found.length === 0) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    const { conversation_id, created_at } = found[0];

    // Delete this message and all messages after it in the conversation
    const deleted = await sql`
      DELETE FROM messages
      WHERE conversation_id = ${conversation_id}
        AND created_at >= ${created_at}
      RETURNING id
    `;

    return log.end(ctx, Response.json({ deleted: deleted.length }), {
      memberId,
      deletedCount: deleted.length,
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
