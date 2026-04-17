---
name: update
description: Re-reads context.md, brand.md, and development-principles.md and cascades any changes into copilot-instructions.md, site.ts, and next.config.ts
agent: agent
---

`context.md`, `brand.md`, and `development-principles.md` are the source of truth for this project. This command cascades any edits from those files into the derived files that `/setup` originally populated.

Run this any time you edit `context.md` or `brand.md`. Do not run `/setup` again — that re-runs setup steps (wiring components, installing packages) that should only happen once.

---

## Step 1: Read the source files

Read all three source files:

1. `context.md` — product name, URL, target user, stack, routes, monetization, analytics events
2. `brand.md` — voice rules, visual rules, user types, emotional arc, copy examples
3. `development-principles.md` — product philosophy (rarely changes, but check it)

---

## Step 2: Cascade into `copilot-instructions.md`

Update the following sections based on what changed. Do not touch sections that haven't changed. Do not touch `## README Standard`, `## API Route Logging`, `## Analytics`, `## Dev Server`, `## Code Style`, or `## Core Rules` — those are permanent.

- **`## Who I Am`** — product description, user types from `brand.md` and `context.md`
- **`## Stack`** — derive from `package.json` (installed) + `context.md` Stack Additions (not yet installed). Never list a package as installed if it's not in `package.json`.
- **`## Project Structure`** — any new dirs added to `context.md` Project Structure Additions
- **`## Route Map`** — every route listed in `context.md` Route Map, one-line description each. Always include `/privacy` and `/terms`.
- **`## Brand & Voice`** — voice rules, visual rules, emotional arc, copy rules, user-type-specific rules from `brand.md`

---

## Step 3: Cascade into `src/config/site.ts`

Only update fields that differ from the current source. Check each:

- `name` / `shortName` — from `context.md` product name
- `url` — from `context.md` URL section
- `description` — 110–160 char meta description
- `ogTitle` — 50–60 char, format: "Product Name | Short Value Prop"
- `ogDescription` — 110–160 char, slightly more marketing-forward
- `founder` — from `context.md` or default "Luke Hanner"
- `accent` / `bg` — hex values from `brand.md` Visual Rules
- `social.*` — from `context.md` Social Profiles section

If a field is already accurate, leave it alone.

---

## Step 4: Cascade into `next.config.ts`

Check the deployment mode in `context.md` Deployment section.

- If `mode: standalone-domain` — `basePath` must be absent or empty in `next.config.ts`. Remove it if present.
- If `mode: modryn-app` — extract the slug (last path segment after `/tools/` in the URL field) and set `basePath: '/tools/[slug]'`.

If the URL field or mode is blank, leave `next.config.ts` as-is and warn Luke.

---

## Step 5: Cascade into `README.md`

Update only if the values differ. Do not reformat the file — preserve the `<picture>` block (if present), H1, live link, and divider exactly.

- **Tagline** (line after the `# Product Name` heading): pull from `brand.md` Copy Examples — use the hero H1 value, optionally appended with a short phrase that matches the brand voice.
- **Stack line** (after `---`): derive from `package.json`. Format: `Name · Name · Name`. Major packages only. Never list a package not in `package.json`. Never include tools or services not actively used (e.g. GA4, Mixpanel) unless they appear in `package.json`.

If both are already accurate, leave the file alone.

---

## Step 6: Update `docs/guide.md`

Create the `docs/` directory if it doesn't exist. Generate or update `docs/guide.md` based on the **actual current state of the codebase** — not the source docs.

**Read these files:**

- `src/app/page.tsx` — what sections are on the page
- `src/components/` — any interactive components (forms, widgets)

**Write the guide with these rules:**

- Written for a non-technical user who has never seen the app. Plain language. No component names, no API details, no code.
- One sentence of context per section, then numbered steps for any action that isn't obvious.
- If a feature isn't live yet, say so in one line. Don't explain why.
- End with a status table: what works ✅, what's built but not wired ⏳, what's missing ❌.
- Scannable over readable — short sections, no dense paragraphs, no walls of text. A user should be able to find what they need in 10 seconds.

If `docs/guide.md` already exists, update it to reflect current state. Remove anything that's no longer true.

---

## Step 7: Update `docs/architecture.md`

Update `docs/architecture.md` to reflect the current state of the AI plumbing. Read the actual source before writing — do not guess.

**Read these files:**

- `src/app/api/chat/route.ts` — DM route: model, tools, message window, memory fetch
- `src/app/api/threads/[threadId]/respond/route.ts` — thread respond: model, tools, transcript structure, idempotency
- `src/lib/tokens.ts` — `assembleContext()` budget and priority order
- `src/lib/context.ts` — memory fetch and org extraction helpers
- Latest migration file in `migrations/` — for any schema changes

**Update only sections that have actually changed:**

- Models (if the model strings changed)
- System prompt priority order (if layers were added/removed/reordered)
- DM vs Thread message structure (if window size, transcript format, or history logic changed)
- Web search (if the gate condition, maxUses, or tool name changed)
- Memory (if triggers, row limits, or table names changed)
- Thread orchestration (if the client-side loop logic changed)
- Member IDs (if members were added or removed — query the DB or check migrations)
- DB schema table list (if new tables were added)

If a genuinely new capability exists in the source files that has no corresponding section in `architecture.md` (e.g. a new route type, a new utility tool, a new memory tier, a new tool integration), add a new minimal section for it. Keep new sections to the same density as existing ones.

**Rules:**

- `architecture.md` covers AI plumbing only: models, system prompts, memory, thread orchestration, DB schema. Stack, conventions, and routes are documented in `copilot-instructions.md` — do not duplicate them here.
- Keep it lean — one or two sentences per section max, tables where they help
- Do not add commentary or reasoning — just facts about how it's built
- Do not remove sections that are still accurate
- Never document something that isn't in the code

---

## Step 8: Report

After cascading, report:

- Which files were changed and which sections were updated
- Which files were already in sync (no changes needed)
- Anything in `context.md` or `brand.md` that is incomplete, contradictory, or missing that could cause issues later (flag but do not invent)

Do not commit. Luke reviews the diff and commits manually.
