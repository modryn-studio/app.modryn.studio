import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id    TEXT        PRIMARY KEY,
    role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS invites (
    token      TEXT        PRIMARY KEY,
    email      TEXT,
    created_by TEXT        NOT NULL,
    used_by    TEXT,
    used_at    TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

console.log('Migration 004 complete: user_roles and invites tables created.');
