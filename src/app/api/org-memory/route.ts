import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('org-memory');

const createOrgMemorySchema = z.object({
  content: z.string().min(1).max(2000),
  sourceConversationId: z.string().uuid().optional(),
  sourceMemberId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const body = await req.json();
    const { content, sourceConversationId, sourceMemberId } = createOrgMemorySchema.parse(body);

    const [row] = await sql`
      INSERT INTO org_memory (content, source_conversation_id, source_member_id, extraction_type)
      VALUES (${content}, ${sourceConversationId ?? null}, ${sourceMemberId ?? null}, 'manual')
      RETURNING id, content, created_at
    `;

    log.info(ctx.reqId, 'Org memory logged', { id: row.id });
    return log.end(ctx, Response.json(row), { id: row.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
