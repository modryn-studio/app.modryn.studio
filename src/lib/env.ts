import { z } from 'zod';

const schema = z.object({
  // Required — app will not start without these
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEON_AUTH_BASE_URL: z.string().min(1, 'NEON_AUTH_BASE_URL is required'),
  NEON_AUTH_COOKIE_SECRET: z.string().min(1, 'NEON_AUTH_COOKIE_SECRET is required'),

  // Optional — boilerplate features, not all active at once
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  FEEDBACK_TO: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_SEGMENT_ID: z.string().optional(),

  NEXT_PUBLIC_SITE_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Missing or invalid environment variables:\n${missing}`);
}

export const env = parsed.data;
