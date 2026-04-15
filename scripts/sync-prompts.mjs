/**
 * sync-prompts.mjs
 *
 * Makes docs/system-prompts/ the authoritative source for member system prompts.
 * Reads every *-system-prompt.md file, derives the member ID from the filename stem,
 * and upserts to the members table in Neon.
 *
 * Usage: npm run sync-prompts
 *
 * Filename → member ID convention:
 *   charlie-munger-system-prompt.md  →  charlie-munger
 *   dieter-rams-system-prompt.md     →  dieter-rams
 *   marc-lou-system-prompt.md        →  marc-lou
 *   michelle-lim-system-prompt.md    →  michelle-lim
 *   steve-jobs-system-prompt.md      →  steve-jobs
 *
 * Run this after every prompt file edit. It is safe to run repeatedly — Postgres will
 * execute the UPDATE regardless of whether the value changed, but the observable result
 * is the same and the cost is negligible for 5 rows.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load DATABASE_URL from .env.local (not committed, local only)
function loadDatabaseUrl() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('No .env.local found — cannot connect to Neon');
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) return match[1].trim();
  }
  throw new Error('DATABASE_URL not found in .env.local');
}

const DATABASE_URL = loadDatabaseUrl();
const sql = neon(DATABASE_URL);
const promptsDir = path.join(root, 'docs', 'system-prompts');

const files = fs
  .readdirSync(promptsDir)
  .filter((f) => f.endsWith('-system-prompt.md'));

if (files.length === 0) {
  console.error('No *-system-prompt.md files found in docs/system-prompts/');
  process.exit(1);
}

console.log(`Found ${files.length} prompt file(s). Syncing to Neon...\n`);

let updated = 0;
let missed = 0;

for (const file of files) {
  // charlie-munger-system-prompt.md → charlie-munger
  const memberId = file.replace('-system-prompt.md', '');
  const filePath = path.join(promptsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  const result = await sql`
    UPDATE members
    SET system_prompt = ${content}
    WHERE id = ${memberId}
    RETURNING id, name
  `;

  if (result.length === 0) {
    console.warn(`  MISS  ${file} — no member with id="${memberId}" in DB`);
    missed++;
  } else {
    console.log(`  OK    ${result[0].name} (${memberId}) — ${content.length} chars`);
    updated++;
  }
}

console.log(`\nDone: ${updated} updated, ${missed} missed.`);
if (missed > 0) {
  console.warn(`\nWarning: ${missed} file(s) had no matching member in the database.`);
  console.warn('Check that the filename stems match the member IDs in the members table.');
  process.exit(1);
}
