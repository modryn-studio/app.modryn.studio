# Modryn Studio — Copilot Context

## Who I Am

Luke Hanner is a solo founder building Modryn Studio — a digital studio shipping micro-SaaS products and tools. This app is the internal company operating system: a workspace where Luke converses with AI team members modeled after real thinkers (starting with Peter Thiel), assigns tasks, logs decisions, and runs async group threads. It is an internal tool only — not a public product. The target user is Luke himself: analytical, framework-driven, wants strategic challenge not agreement.

## Deployment

<!-- Filled in by /setup from context.md.
     Read this before touching next.config.ts, BASE_PATH, site.ts, or any hardcoded URL.
     If mode is modryn-app:         basePath must stay set in next.config.ts.
     If mode is standalone-*:       basePath must be absent from next.config.ts. -->

mode: standalone-subdomain
url: private
basePath: <!-- empty — standalone-subdomain mode -->

## Stack

- Next.js 16 (App Router) with TypeScript
- Tailwind CSS for styling
- Vercel for deployment
- Vercel Analytics `<Analytics />` in `layout.tsx` — zero-config pageview tracking, no env vars needed
- `@/lib/analytics.ts` — no-op stub with named methods; wire in a real provider here if needed
- Resend — installed, not yet wired to product flow
- Stripe — installed, not yet active (monetization: none at this stage)
- lucide-react — icon library
- **Installed:** `ai` 6.x, `@ai-sdk/react` 3.x, `@ai-sdk/anthropic` 3.x — streaming AI responses via `/api/chat`
- **Not yet installed — planned:** Neon (serverless Postgres + Neon Auth)

## Project Structure

```
/app                    → Next.js App Router pages
/components             → Reusable UI components
/lib                    → Utilities, helpers, data fetching
/members                → AI member configs, system prompts, personality definitions
/conversations          → Conversation threads and message history
/tasks                  → Task assignments and outputs per member
/memory                 → Summarized context per member, updated after each session
```

## Route Map

- `/` → Dashboard / Company HQ — active members, recent conversations, pending tasks
- `/dm/[memberId]` → One-on-one chat with an AI team member (real-time streaming)
- `/threads` → Group conversation threads (async, multi-member)
- `/inbox` → Async messages — member-initiated messages to the founder
- `/tasks` → Task management — assigned to members, with status and output
- `/calendar` → Scheduled meetings and group sessions
- `/privacy` → Privacy policy
- `/terms` → Terms of service

## Brand & Voice

**Voice:** Direct and functional — say the thing, no softening. Technical precision over warmth. System language, not consumer app language. Status labels are exact: "online", "analyzing", "generating" — never "thinking" or "loading". Always label AI elements explicitly. First-principles framing in copy. Mono font for system/meta text is intentional. Never use: "powerful", "seamless", "unlock", "supercharge", "AI-powered", "next-level", "revolutionary".

**Target User:** A solo founder who thinks in frameworks and makes decisions through debate. They want an AI team that pushes back, not one that agrees. They've tried generic AI tools and found them too agreeable to be useful.

**Visual Rules:**

- Color mode: Split-tone — dark chrome (sidebar, nav rail, headers) with warm cream content panels (chat, inbox, context pane). Not dark mode throughout. No system toggle.
- Fonts: Inter (body/UI) + JetBrains Mono (system labels, timestamps, badges, code)
- Avatars: `rounded-sm` square — not circular
- Motion: pulse only for active/streaming states. No scroll animations.
- Density: information-dense workspace aesthetic — not a marketing page
- Avoid: gradients, bright fills, rounded pill shapes, popups, onboarding modals

**Colors:**

Two distinct zones:

_Dark chrome (sidebar, nav rail, mobile header/tabs):_

- Sidebar bg `oklch(0.10 0 0)` — leftmost chrome, darkest surface
- Sidebar accent `oklch(0.18 0 0)` — hover + active row highlight
- Sidebar border `oklch(0.18 0 0)` — rail + roster dividers
- Sidebar foreground `oklch(0.85 0 0)` — primary member names, nav labels

_Warm cream panels (chat, inbox, context pane):_

- Panel `oklch(0.965 0.004 80)` — main reading surface, warm off-white
- AI surface `oklch(0.94 0.004 80)` — AI message rows
- Panel border `oklch(0.88 0.004 80)` — row dividers, input borders
- Panel foreground `oklch(0.15 0 0)` — primary body text on cream
- Panel muted `oklch(0.5 0 0)` — timestamps, secondary labels

_Brand tokens (shared):_

- Accent `#E4E4E7` — near-white neutral, active states, selected items
- Secondary `#D4922A` — status indicators: analyzing, unread, streaming (warm amber)
- Background `#171717` — app background behind panels
- Text `#FAFAFA` — body text (near-white on dark)

**Copy reference:**

- Status: "online" / "analyzing" / "generating"
- Empty state: "Start a conversation. Ask anything — strategy, decisions, first principles."
- AI badge: small mono tag reading "AI" — always visible on AI member avatars/messages
- Disclaimer: "Responses reflect AI modeling only, not the views of real individuals"

## README Standard

Every project README follows this exact structure — no more, no less:

```markdown
![Project Name](public/brand/banner.png)

# Project Name

One-line tagline. Outcome-focused — lead with what the user gets, not the technology.

→ [domain.com](https://domain.com)

---

Next.js · TypeScript · Tailwind CSS · Vercel
```

Rules:

- **Banner image** — always first. Path is `public/brand/banner.png`.
- **H1 title** — product name only, no subtitle.
- **Tagline** — one sentence. What the user gets. No buzzwords ("powerful", "seamless", "AI-powered").
- **Live link** — `→ [domain.com](https://domain.com)` format. Always present if live.
- **Divider** — `---` separator before the stack line.
- **Stack line** — `·`-separated list of core tech only. No version numbers, no descriptions.
- **Nothing else.** No install instructions, no contributing section, no architecture diagrams, no screenshots beyond the banner. Real docs go in `/docs` or on the live site.

When adding a badge row (optional, for open source tools/libraries only):

- Place it between the H1 and the tagline
- Use shields.io format: `[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)`
- Keep it to 3 badges max: typically license + CI status + live site
- Apps (not libraries) should skip badges entirely

## Tailwind v4

This project uses Tailwind CSS v4. The rules are different from v3 — follow these exactly.

**Design tokens live in `@theme`, not `:root`:**

```css
/* ✅ correct — generates text-accent, bg-panel, border-sidebar-border, etc. */
@theme {
  --color-accent: #e4e4e7; /* near-white neutral — active states, selected items */
  --color-secondary: #d4922a; /* warm amber — analyzing, unread, streaming */
  --color-bg: #171717; /* page background base */
  --color-text: #fafafa; /* body text — near-white on dark */
  --color-muted: #6b6b6b; /* secondary text, timestamps, placeholders */
  --color-sidebar: oklch(0.1 0 0); /* dark chrome surface */
  --color-panel: oklch(0.965 0.004 80); /* warm cream reading surface */
  --font-heading: var(--font-inter); /* Inter — body and UI text */
}

/* ❌ wrong — :root creates CSS variables but NO utility classes */
:root {
  --color-accent: #e4e4e7;
}
```

**Use `(--color-*)` shorthand in class strings — never `[var(--color-*)]`:**

```tsx
// ✅ correct — TW v4 native shorthand
<div className="border-(--color-border) bg-(--color-surface) text-(--color-muted)" />

// ❌ wrong — v3 bracket notation, verbose and unnecessary in v4
<div className="border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]" />
```

If tokens are defined in `@theme`, you can also use the short utility names directly:

```tsx
// ✅ also correct when @theme is properly set up
<div className="border-border bg-surface text-muted text-accent" />
```

Never add `tailwind.config.*` — v4 has no config file. All theme customization goes in `globals.css` under `@theme`.

## API Route Logging

Every new API route (`app/api/**/route.ts`) MUST use `createRouteLogger` from `@/lib/route-logger`.

```typescript
import { createRouteLogger } from '@/lib/route-logger';
const log = createRouteLogger('my-route');

export async function POST(req: Request): Promise<Response> {
  const ctx = log.begin();
  try {
    log.info(ctx.reqId, 'Request received', {
      /* key fields */
    });
    // ... handler body ...
    return log.end(ctx, Response.json(result), {
      /* key result fields */
    });
  } catch (error) {
    log.err(ctx, error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

- `begin()` prints the `─` separator + START line with a 5-char `reqId`
- `info()` / `warn()` log mid-request milestones
- `end()` logs ✅ with elapsed ms and returns the response
- `err()` logs ❌ with elapsed ms
- Never use raw `console.log` in routes — always go through the logger

## Analytics

Vercel Analytics (`<Analytics />` in `layout.tsx`) handles pageviews automatically — no config needed.

`@/lib/analytics.ts` is a no-op stub with named methods. Add a named method for each distinct user action — keeps events typed and discoverable. Wire in a real provider (PostHog, Mixpanel, etc.) inside `analytics.ts` if custom event tracking is needed later.

```typescript
import { analytics } from '@/lib/analytics';
analytics.track('event_name', { prop: value });
```

**Vercel plan check required before adding custom events.** Custom events require Vercel Pro ($20/mo) — they do not appear in the Vercel Analytics dashboard on Hobby. Adding real event calls without an upgraded plan creates dead code that misleads future readers. Before instrumenting scroll depth, click events, conversion tracking, screenshot views, or any custom event: confirm the plan. If on Hobby, keep `analytics.ts` as a no-op stub until the plan is upgraded or a different provider is explicitly wired in. Do not add GA4 or PostHog without explicit instruction — keep it simple.

## Dev Server

Start with `Ctrl+Shift+B` (default build task). This runs:

```
npm run dev -- --port 3000 2>&1 | Tee-Object -FilePath dev.log
```

Tell Copilot **"check logs"** at any point — it reads `dev.log` and flags errors or slow requests.

## Code Style

- Write as a senior engineer: minimal surface area, obvious naming, no abstractions before they're needed
- Comments explain WHY, not what
- One file = one responsibility
- Prefer early returns for error handling
- Never break existing functionality when adding new features
- Leave TODO comments for post-launch polish items

## Core Rules

- Every page earns its place — no pages for businesses not yet running
- Ship fast, stay honest — empty is better than fake
- Ugly is acceptable, broken is not — polish the core action ruthlessly
- Ship one killer feature, not ten mediocre ones
- Instrument analytics before features — data from day one
- Onboard users to value in under 2 minutes
- **Local-first by default** — no accounts, no data stored server-side, pay only when you use it. This is a brand-level commitment across every product, not a feature toggle.

## Positioning Decision: AI

Do NOT lead with "AI" in copy or headlines. The backlash is real and targets AI hype, not useful tools. Lead with outcomes and the user's problem. AI is an implementation detail, not a selling point.

- ✅ "Tools for people who don't have time for bad software"
- ✅ "I did the research so you don't have to"
- ❌ "AI-powered", "AI-first", "built with AI"
  Products use AI internally. The marketing never needs to say so.
