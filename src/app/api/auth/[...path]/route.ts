import { auth } from '@/lib/auth/server';
import type { NextRequest } from 'next/server';

const { GET: _GET, POST: _POST } = auth.handler();

// Neon Auth (Better Auth) validates the Origin header against registered trusted origins.
// Preview deployments have dynamic URLs (*.vercel.app) that aren't registered, so we
// rewrite the Origin to the production URL before proxying to Neon's auth service.
function withCanonicalOrigin(request: NextRequest): Request {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return request;

  const headers = new Headers(request.headers);
  headers.set('origin', appUrl);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: 'half',
  } as RequestInit);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _GET(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const params = await ctx.params;
  return _POST(withCanonicalOrigin(request), { params: Promise.resolve(params) });
}
