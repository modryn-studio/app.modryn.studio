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

    // Find existing DM between founder and this member
    const existing = await sql`
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
      const created = await sql`
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
