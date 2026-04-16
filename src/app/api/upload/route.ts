import { put } from '@vercel/blob';
import { createRouteLogger } from '@/lib/route-logger';
import { auth } from '@/lib/auth/server';

const log = createRouteLogger('upload');

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  const { data: session } = await auth.getSession();
  if (!session?.user) {
    return log.end(ctx, Response.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return log.end(ctx, Response.json({ error: 'file field is required' }, { status: 400 }));
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return log.end(
        ctx,
        Response.json(
          { error: 'Unsupported file type. Allowed: jpeg, png, gif, webp' },
          { status: 400 }
        )
      );
    }

    if (file.size > MAX_BYTES) {
      return log.end(
        ctx,
        Response.json({ error: 'File exceeds 5 MB limit' }, { status: 400 })
      );
    }

    const blob = await put(file.name, file, {
      access: 'public',
      contentType: file.type,
    });

    log.info(ctx.reqId, 'Image uploaded', { url: blob.url, size: file.size, type: file.type });

    return log.end(ctx, Response.json({ url: blob.url, contentType: file.type }));
  } catch (err) {
    log.err(ctx.reqId, 'Upload failed', err);
    return log.end(ctx, Response.json({ error: 'Upload failed' }, { status: 500 }));
  }
}
