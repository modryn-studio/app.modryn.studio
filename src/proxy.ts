import { auth } from '@/lib/auth/server';

export const proxy = auth.middleware({ loginUrl: '/auth/sign-in' });

export const config = {
  matcher: [
    // Protect all app routes except static assets, public files, and auth/api routes.
    // API routes handle their own session checks and should return 401, not be redirected.
    '/((?!_next/static|_next/image|favicon.ico|brand|icon|opengraph-image|manifest|auth|api).*)',
  ],
};
