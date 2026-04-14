import { z } from 'zod';
import { createRouteLogger } from '@/lib/route-logger';
import '@/lib/env';

const log = createRouteLogger('reddit');

// rawJson is fetched client-side (browser IP not blocked by Reddit)
// and POSTed here for formatting only — no server-side Reddit fetch
const bodySchema = z.object({
  rawJson: z.array(z.any()),
  depth: z.number().int().min(2).max(99).default(4),
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

function formatComment(comment: RedditComment, currentDepth: number, maxDepth: number): string {
  // Skip 'more' nodes and deleted/removed comments at every level
  if (comment.kind === 'more') return '';
  if (!comment.data.author || comment.data.author === '[deleted]') return '';
  const body = (comment.data.body ?? '').trim();
  if (!body || body === '[removed]') return '';

  // 2 spaces per nesting level — proportional at all depths
  const indent = '  '.repeat(currentDepth);
  const label = currentDepth > 0 ? ' — reply' : '';
  const lines: string[] = [
    `${indent}${comment.data.author} (${comment.data.score ?? 0} upvotes)${label}`,
    `${indent}${body}`,
  ];

  // Recurse until we hit maxDepth (maxDepth = 99 for unlimited)
  if (currentDepth < maxDepth - 1) {
    const replies =
      comment.data.replies &&
      typeof comment.data.replies === 'object' &&
      comment.data.replies.data?.children;
    if (replies && replies.length > 0) {
      for (const reply of replies) {
        const formatted = formatComment(reply, currentDepth + 1, maxDepth);
        if (formatted) lines.push('', formatted);
      }
    }
  }

  return lines.join('\n');
}

// POST /api/reddit — format a Reddit thread from pre-fetched JSON
// The client fetches Reddit directly (browser IP bypasses server blocks)
export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return log.end(
        ctx,
        Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
      );
    }

    const json = parsed.data.rawJson as any[];

    const post: RedditPost = json[0]?.data?.children?.[0]?.data;
    const commentChildren: RedditComment[] = json[1]?.data?.children ?? [];

    if (!post?.title) {
      return log.end(
        ctx,
        Response.json({ error: 'Could not parse Reddit response' }, { status: 502 })
      );
    }

    // Build formatted output
    const parts: string[] = [];

    parts.push(`POST: ${post.title}`);
    parts.push(`BY: ${post.author} | ${post.score} upvotes | ${post.num_comments} comments`);

    const bodyText = (post.selftext ?? '').trim();
    if (bodyText && bodyText !== '[removed]') {
      parts.push('');
      parts.push(bodyText);
    }

    parts.push('');
    parts.push('---');
    parts.push('COMMENTS:');

    const { depth } = parsed.data;

    for (const comment of commentChildren) {
      // Skip 'more' nodes at the top level too
      if (comment.kind === 'more') continue;
      const formatted = formatComment(comment, 0, depth);
      if (formatted) {
        parts.push('');
        parts.push(formatted);
      }
    }

    const text = parts.join('\n');
    log.info(ctx.reqId, 'Formatted thread', {
      chars: text.length,
      topLevelComments: commentChildren.filter((c) => c.kind !== 'more').length,
    });

    return log.end(ctx, Response.json({ text }));
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
