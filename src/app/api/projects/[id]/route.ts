import { z } from 'zod';
import { del } from '@vercel/blob';
import { createRouteLogger } from '@/lib/route-logger';
import sql from '@/lib/db';
import { auth } from '@/lib/auth/server';
import '@/lib/env';

const log = createRouteLogger('projects/[id]');

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  context: z.string().optional(),
});

type MessageRow = { content: string };

function extractBlobUrls(content: string): string[] {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((part: unknown) => {
        if (!part || typeof part !== 'object') return [];
        const p = part as { type?: string; url?: string };
        if (p.type !== 'image' || !p.url) return [];
        try {
          const url = new URL(p.url);
          if (url.hostname.endsWith('blob.vercel-storage.com')) return [url.toString()];
          return [];
        } catch {
          return [];
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectBlobUrls(rows: MessageRow[]): string[] {
  return [...new Set(rows.flatMap((r) => extractBlobUrls(r.content)))];
}

// PATCH /api/projects/[id] — update project name and/or context
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, context } = updateProjectSchema.parse(body);

    const [row] = await sql`
      UPDATE projects
      SET name = COALESCE(${name ?? null}, name),
          context = COALESCE(${context ?? null}, context),
          updated_at = now()
      WHERE id = ${id}
      RETURNING id, name, context, created_at, updated_at
    `;

    if (!row) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    log.info(ctx.reqId, 'Project updated', { id });
    return log.end(ctx, Response.json({ project: row }), { id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return log.end(ctx, Response.json({ error: error.issues }, { status: 400 }));
    }
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/projects/[id] — hard-delete a project and project-scoped data.
// Blob cleanup runs best-effort after DB commit and only removes URLs that are
// not referenced by messages in any other project.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const ctx = log.begin();
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }
  try {
    const { id } = await params;

    const [existingProject] = await sql`
      SELECT id FROM projects WHERE id = ${id} LIMIT 1
    `;
    if (!existingProject) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    // Extract candidate blob URLs from this project's message history before row deletion.
    const projectMessageRows = (await sql`
      SELECT m.content
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.project_id = ${id}
    `) as MessageRow[];

    const candidateBlobUrls = collectBlobUrls(projectMessageRows);
    let unreferencedBlobUrls: string[] = [];
    if (candidateBlobUrls.length > 0) {
      // Build the set of blob URLs that are still referenced by other projects.
      const otherProjectMessageRows = (await sql`
        SELECT m.content
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.project_id IS DISTINCT FROM ${id}
      `) as MessageRow[];
      const referencedElsewhere = new Set(collectBlobUrls(otherProjectMessageRows));
      unreferencedBlobUrls = candidateBlobUrls.filter((url) => !referencedElsewhere.has(url));
    }

    const [
      deletedTasks,
      deletedDecisions,
      deletedMemberMemory,
      deletedOrgMemory,
      deletedConversations,
      deletedProject,
    ] = await sql.transaction((txn) => [
      txn`DELETE FROM tasks WHERE project_id = ${id} RETURNING id`,
      txn`DELETE FROM decisions WHERE project_id = ${id} RETURNING id`,
      txn`DELETE FROM member_memory WHERE project_id = ${id} RETURNING id`,
      txn`DELETE FROM org_memory WHERE project_id = ${id} RETURNING id`,
      txn`DELETE FROM conversations WHERE project_id = ${id} RETURNING id`,
      txn`DELETE FROM projects WHERE id = ${id} RETURNING id`,
    ]);

    if (deletedProject.length === 0) {
      return log.end(ctx, Response.json({ error: 'Not found' }, { status: 404 }));
    }

    // Best-effort blob cleanup. Project deletion should not fail if storage cleanup fails.
    if (unreferencedBlobUrls.length > 0) {
      try {
        await del(unreferencedBlobUrls);
      } catch (error) {
        log.warn(ctx.reqId, 'Blob cleanup failed after project deletion', {
          projectId: id,
          blobCount: unreferencedBlobUrls.length,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    log.info(ctx.reqId, 'Project deleted', {
      id,
      tasks: deletedTasks.length,
      decisions: deletedDecisions.length,
      member_memory: deletedMemberMemory.length,
      org_memory: deletedOrgMemory.length,
      conversations: deletedConversations.length,
      blobs_deleted: unreferencedBlobUrls.length,
    });

    return log.end(
      ctx,
      Response.json({
        ok: true,
        deleted: {
          projectId: id,
          tasks: deletedTasks.length,
          decisions: deletedDecisions.length,
          memberMemory: deletedMemberMemory.length,
          orgMemory: deletedOrgMemory.length,
          conversations: deletedConversations.length,
          blobs: unreferencedBlobUrls.length,
        },
      }),
      { id }
    );
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
