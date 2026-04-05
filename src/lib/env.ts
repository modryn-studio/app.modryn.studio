import { z } from 'zod';

const schema = z.object({
  // Required — app will not start without these
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEON_AUTH_BASE_URL: z.string().min(1, 'NEON_AUTH_BASE_URL is required'),
  NEON_AUTH_COOKIE_SECRET: z.string().min(1, 'NEON_AUTH_COOKIE_SECRET is required'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),

  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Missing or invalid environment variables:\n${missing}`);
}

export const env = parsed.data;
