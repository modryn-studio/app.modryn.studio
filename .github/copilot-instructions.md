# Modryn Studio — Copilot Context

## Project

Internal company OS for Luke Hanner (solo founder). Luke converses with AI team members modeled after real thinkers, assigns tasks, logs decisions, and runs async group threads. Internal tool only — not a public product. Target user is Luke: analytical, framework-driven, wants strategic challenge not agreement.

## Deployment

mode: standalone-subdomain — `basePath` must be absent from `next.config.ts`.

## Stack

- Next.js 16 App Router · TypeScript · React 19 · React Compiler (`babel-plugin-react-compiler`)
- Tailwind CSS v4 — tokens in `@theme` inside `globals.css`, no `tailwind.config.*`
- Vercel · `<Analytics />` in `layout.tsx` for pageviews (zero config)
- `@/lib/analytics.ts` — no-op stub; wire a real provider here if needed
- lucide-react icons · `@radix-ui/react-dialog` (Sheet) · `@radix-ui/react-slot` (Button)
- `react-markdown` + `remark-gfm` + `remark-breaks` — Markdown rendering in AI messages
- `shiki` — syntax highlighting inside Markdown blocks
- `use-stick-to-bottom` — auto-scroll in chat views
- `@tailwindcss/typography` — prose styles for Markdown content
- `ai` 6.x · `@ai-sdk/react` 3.x · `@ai-sdk/anthropic` 3.x — streaming via `/api/chat`
  - `claude-sonnet-4-6` — main member responses (DMs + threads + tasks)
  - `claude-haiku-4-5-20251001` — episodic summarization, semantic memory, org fact extraction
  - `Output.object()` with `maxSteps: 2` + `NoObjectGeneratedError` — schema-enforced structured extraction, no manual JSON parsing
- `@/lib/tokens.ts` — `assembleContext()` builds the system prompt from priority-ordered layers with a token budget; lower-priority layers pruned first. DMs + threads: 12k budget, 6 layers (format → system → company → semantic → org → episodic). Tasks: 8k budget, 4 layers (format → system → company → org) — no episodic/semantic.
- Memory tiers (all in `member_memory` / `org_memory` tables):
  - Episodic — one summary per DM conversation, upserted by Haiku after 5+ user turns
  - Semantic — behavioural patterns across episodic summaries, written every 5th episodic entry
  - Org — team-wide facts merged from `decisions` + `org_memory` tables via UNION in `getOrgMemory()`
- Neon (serverless Postgres) · `@neondatabase/auth` — Neon Auth active, invite-gated access
- `zod` — request body validation in API routes

## Project Structure

```
src/app/              → App Router pages + API routes
src/components/       → UI primitives (ui/) and app components (modryn/)
src/lib/              → Utilities, analytics stub, route logger, auth, context injection
src/config/           → site.ts
docs/                 → Founding document + user guide (founding doc injected as company context at runtime)
migrations/           → Neon SQL migration files (schema source of truth)
```

## Routes

- `/` — Dashboard / Company HQ
- `/dm/[memberId]` — One-on-one chat (real-time streaming)
- `/threads` — Group async threads
- `/inbox` — Member-initiated async messages
- `/tasks` — Task assignments and outputs
- `/calendar` — Scheduled sessions
- `/auth/sign-in` — Sign in (Neon Auth)
- `/auth/sign-up` — Accept invite + create account (invite-gated)

## Brand & Voice

Status labels: `"online"` / `"analyzing"` / `"generating"` — never `"thinking"` or `"loading"`.
Never use: `"powerful"`, `"seamless"`, `"unlock"`, `"supercharge"`, `"AI-powered"`, `"next-level"`, `"revolutionary"`.
Do not lead with "AI" in any copy or headline — it's an implementation detail, not a selling point.

## Visual Rules

Split-tone layout: dark chrome sidebar + warm cream content panels. No dark mode toggle.

**Dark chrome** (sidebar, nav rail, mobile header):

- bg `oklch(0.10 0 0)` · accent/hover `oklch(0.28 0 0)` · border `oklch(0.18 0 0)` · fg `oklch(0.85 0 0)`
- status-online `oklch(0.72 0.19 160)` · status-active `#d4922a` · status-generating `oklch(0.55 0.08 80)`

**Warm cream panels** (chat, inbox, context):

- bg `oklch(0.965 0.004 80)` · AI surface `oklch(0.94 0.004 80)` · border `oklch(0.88 0.004 80)` · fg `oklch(0.15 0 0)` · muted `oklch(0.5 0 0)`
- text `oklch(0.25 0 0)` · text-secondary `oklch(0.4 0 0)` · faint `oklch(0.6 0 0)` · selected `oklch(0.93 0.004 80)`
- panel-chrome (founder avatar bg) `oklch(0.82 0 0)` · panel-chrome-strong (AI avatar bg) `oklch(0.65 0 0)` · panel-chrome-foreground (initials) `oklch(0.4 0 0)`
- panel-badge (AI badge bg) `oklch(0.9 0.002 80)` · panel-input `oklch(0.945 0.003 80)` · panel-inverse `oklch(0.9 0 0)`

**Shared brand tokens**: accent `#E4E4E7` · secondary/amber `#D4922A` · app bg `#171717`

Fonts: Inter (body/UI) + JetBrains Mono (timestamps, labels, code).
Avatars: `rounded-sm` square — never circular.
Motion: pulse only for active/streaming states.
Avoid: gradients, bright fills, pill shapes, popups, onboarding modals.

## API Routes

Every `app/api/**/route.ts` must use `createRouteLogger` from `@/lib/route-logger`. Never use raw `console.log` in routes.

## Code Style

- Minimal surface area — no abstractions before they're needed
- Comments explain WHY
- One file = one responsibility
- Prefer early returns for error handling
- Never break existing functionality when adding features
- `'use client'` blocks `metadata` exports silently — use server shell + client content pattern for pages that need both
