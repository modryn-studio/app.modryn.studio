import fs from 'fs';
import path from 'path';

// Returns the contents of the founding document as a string.
// This is injected into every chat session between the member system prompt
// and member_memory. If the file is missing, returns an empty string so the
// API route degrades gracefully rather than throwing.
// To switch to DB-backed context (Option B), replace this function only.
export function getCompanyContext(): string {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'modryn-studio-founding-document.md');
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}
