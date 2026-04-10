import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import '@/lib/env';

const log = createRouteLogger('reddit');

const bodySchema = z.object({
  url: z.string().url().refine((u) => {
    try {
      const hostname = new URL(u).hostname.replace(/^www\./, '');
      return hostname === 'reddit.com' || hostname.endsWith('.reddit.com');
    } catch {
      return false;
    }
  }, { message: 'URL must be a reddit.com link' }),
});

// Reddit API types (only the fields we use)
interface RedditPost {
  title: string;
  author: string;
  score: number;
  num_comments: number;
  selftext: string;
}

interface RedditComment {
  kind: string; // 't1' = comment, 'more' = load-more stub
  data: {
    author?: string;
    score?: number;
    body?: string;
    replies?: { data?: { children?: RedditComment[] } } | '';
  };
}

function formatComment(comment: RedditComment, depth: number): string {
  // Skip 'more' nodes and deleted/removed comments at every level
  if (comment.kind === 'more') return '';
  if (!comment.data.author || comment.data.author === '[deleted]') return '';
  const body = (comment.data.body ?? '').trim();
  if (!body || body === '[removed]') return '';

  const indent = depth === 1 ? '  ' : '';
  const label = depth === 1 ? ' — reply' : '';
  const lines: string[] = [
    `${indent}${comment.data.author} (${comment.data.score ?? 0} upvotes)${label}`,
    `${indent}${body}`,
  ];

  // Only recurse one level deep (depth 0 → render children at depth 1, stop there)
  if (depth === 0) {
    const replies =
      comment.data.replies &&
      typeof comment.data.replies === 'object' &&
      comment.data.replies.data?.children;
    if (replies && replies.length > 0) {
      for (const reply of replies) {
        const formatted = formatComment(reply, 1);
        if (formatted) lines.push('', formatted);
      }
    }
  }

  return lines.join('\n');
}

// POST /api/reddit — fetch and format a Reddit thread
export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.end(
        ctx,
        Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid URL' }, { status: 400 }),
      );
    }

    // Normalize: force www.reddit.com, strip fragment + query, ensure .json suffix
    const original = new URL(parsed.data.url);
    original.hostname = 'www.reddit.com';
    original.hash = '';
    original.search = '';
    let pathname = original.pathname;
    // Strip trailing slash before appending .json
    if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    const jsonUrl = `https://www.reddit.com${pathname}.json?limit=100`;

    log.info(ctx.reqId, 'Fetching Reddit thread', { jsonUrl });

    const response = await fetch(jsonUrl, {
      headers: { 'User-Agent': 'modryn-studio/1.0' },
      // Disable Next.js fetch caching — always fresh
      cache: 'no-store',
    });

    if (response.status === 429) {
      return log.end(
        ctx,
        Response.json(
          { error: 'Reddit is rate limiting, try again in a moment' },
          { status: 503 },
        ),
      );
    }

    if (!response.ok) {
      log.warn(ctx.reqId, 'Reddit fetch failed', { status: response.status });
      return log.end(
        ctx,
        Response.json({ error: 'Could not fetch thread' }, { status: 502 }),
      );
    }

    const json = (await response.json()) as any[];

    const post: RedditPost = json[0]?.data?.children?.[0]?.data;
    const commentChildren: RedditComment[] = json[1]?.data?.children ?? [];

    if (!post?.title) {
      return log.end(
        ctx,
        Response.json({ error: 'Could not parse Reddit response' }, { status: 502 }),
      );
    }

    // Build formatted output
    const parts: string[] = [];

    parts.push(`POST: ${post.title}`);
    parts.push(`BY: ${post.author} | ${post.score} upvotes | ${post.num_comments} comments`);

    const body_text = (post.selftext ?? '').trim();
    if (body_text && body_text !== '[removed]') {
      parts.push('');
      parts.push(body_text);
    }

    parts.push('');
    parts.push('---');
    parts.push('COMMENTS:');

    for (const comment of commentChildren) {
      // Skip 'more' nodes at the top level too
      if (comment.kind === 'more') continue;
      const formatted = formatComment(comment, 0);
      if (formatted) {
        parts.push('');
        parts.push(formatted);
      }
    }

    const text = parts.join('\n');
    log.info(ctx.reqId, 'Formatted thread', { chars: text.length, topLevelComments: commentChildren.filter(c => c.kind !== 'more').length });

    return log.end(ctx, Response.json({ text }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
