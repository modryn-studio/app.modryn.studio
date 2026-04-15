# Project Context

## Core Framework

<!-- The three decisions that justify building this. Fill these in before writing a single line of code.
     If you can't fill these in, you don't have a product yet — you have a hypothesis.

     1. Market you care about:
        A market you already understand from experience, frustration, or obsession.

     2. What people already pay for in this market:
        A product (or service) with proven demand. Name it. Note the price. Note the top complaint.
        You are not guessing — you looked this up. Cite a source.

     3. Your differentiation (your signature):
        The one thing you do differently. This is the only creative decision in the framework.
        "Same job, for a different person" counts. "Same thing, without the worst thing" counts.
        Avoid: "better", "faster", "cheaper" without a specific mechanism.
-->

Market: AI-powered productivity and team collaboration tools for indie founders and solo operators building digital businesses.

Reference product (what people pay for): Notion AI ($10/mo add-on) and Character.AI (free–$9.99/mo). Notion AI complaint: too generic, no persistent personality or role. Character.AI complaint: fun but not useful for real work — no task management, no memory, no company context.

Your angle: A real company operating system where AI team members have distinct, persistent personalities modeled after real thinkers — not generic assistants. The mechanism: system-prompt-driven personality + database-backed memory + task delegation and decision logging, wrapped in a company OS interface, not a chat UI. Members are assigned real work units and produce deliverables — strategy docs, research briefs, copy, recommendations — not just chat responses.

## Product

An internal AI company operating system for Modryn Studio. The founder runs Modryn Studio by delegating real work to AI team members modeled after distinct thinkers — assigning tasks, reviewing deliverables, and logging decisions. Members can be queried one-on-one, convened in group threads, and deployed on active work items. They accumulate company context over time and operate with accountability — not just as conversational tools, but as functional members of a working team.

## Target User

A full-stack solo founder — analytical, visionary, building a digital studio — who wants strategic leverage without hiring. Specifically: someone who thinks in frameworks, makes decisions through debate, and wants an AI team that pushes back rather than just agrees. Right now, that person is the Modryn Studio founder.

## Deployment

<!-- How is this project served? Pick one mode and fill in the three fields below.

     MODE: modryn-app
     Served at modrynstudio.com/tools/[slug] via rewrites in modryn-studio-v2.
     This repo deploys to Vercel (.vercel.app URL). modryn-studio-v2 proxies
     modrynstudio.com/tools/[slug]/* to it. Google sees one domain — good for SEO.
     → basePath: '/tools/your-slug' in next.config.ts
     → BASE_PATH = '/tools/your-slug' in src/lib/base-path.ts

     MODE: standalone-subdomain
     Served at subdomain.domain.com — its own Vercel deployment + custom subdomain DNS.
     → Remove basePath from next.config.ts entirely
     → BASE_PATH = '' in src/lib/base-path.ts

     MODE: standalone-domain
     Served at its own root domain (e.g. specifythat.com).
     → Remove basePath from next.config.ts entirely
     → BASE_PATH = '' in src/lib/base-path.ts
-->

mode: standalone-subdomain

modrynstudio.com has a verified **Domain property** in Google Search Console. All tools under that domain are covered automatically. Never walk through domain verification steps — just submit the tool sitemap to the existing property.
url: https://app.modrynstudio.com
basePath:

## Minimum Money Loop

<!-- Blank — no monetization at this stage. Internal tool only. -->

## Stack Additions

- Neon (serverless Postgres + Neon Auth via @neondatabase/auth)
- Anthropic API (claude-sonnet-4-6 for AI member responses; claude-haiku-4-5-20251001 for memory summarization and org fact extraction)
- Vercel SSE (Server-Sent Events for real-time streaming responses)
- Vercel Hobby tier (hosting + serverless functions)

## Project Structure Additions

- /migrations — Neon SQL migration files (schema source of truth)
- /docs — Human-readable docs including the founding document (modryn-studio-founding-document.md) used for company context injection
- /src/lib/context.ts — `getCompanyContext()` reads the founding document from disk; `getProjectContext(projectId)` queries the projects table and returns project name + context wrapped in `<project-context>` tags for injection
- /src/components/modryn/project-switcher.tsx — Inline project selector in the sidebar and mobile drawer; floating dropdown (never pushes layout), inline rename on hover (pencil icon → Enter saves, Escape cancels, blur saves), "New project" row at the bottom; optimistic name update with revert on failure
- /src/components/modryn/project-setup-view.tsx — Full-panel creation form; shown when no projects exist, or when "New project" is triggered from the switcher

## Data Layer Notes

- All persistent state lives in Neon: projects, conversations, messages, tasks, member_memory, decisions, org_memory
- Projects are the top-level container. Every conversation, task, decision, and org_memory row is scoped to a project via `project_id`. Members are workspace-wide (not project-scoped).
- Context injection stack (assembled per request via `assembleContext()` in /src/lib/tokens.ts, priority-pruned):

  **DM / Thread routes (12k token budget):**
  | Priority | Layer | Prunable |
  |---|---|---|
  | 1 | Format instructions (surface-specific word limits) | No |
  | 2 | Member system prompt (from DB) | No |
  | 3 | Company context (founding doc from disk) | No |
  | 4 | Project context (name + context field from projects table) | No |
  | 5 | Tasks (member's active work queue for this project) | Yes |
  | 6 | Semantic memory (behavioural patterns, cross-project) | Yes |
  | 7 | Org memory (project-scoped facts from org_memory + decisions UNION) | Yes |
  | 8 | Episodic memory (per-conversation summaries, project-scoped) | Yes |

  **Task execution route (8k token budget):**
  | Priority | Layer | Prunable |
  |---|---|---|
  | 1 | Format instructions | No |
  | 2 | Member system prompt | No |
  | 3 | Company context | No |
  | 4 | Project context | No |
  | 5 | Org memory (project-scoped) | Yes |

- Memory tiers:
  - Episodic: one summary per DM conversation (upserted), written by Haiku after 2+ user turns. DM writes and reads are project-scoped (`project_id`); thread reads fetch cross-project (no project filter in the respond route).
  - Semantic: behavioural patterns across all episodic summaries for a member — cross-project, `project_id = NULL`. Written every 5th episodic entry.
  - Org memory: team-wide facts extracted from DM summaries and full thread transcripts (auto) or logged manually. Project-scoped (`project_id` required on all rows). Merged with decisions table via UNION in `getOrgMemory(projectId)`.
- Org fact extraction: uses `Output.object()` + `NoObjectGeneratedError` handling — schema-enforced, no manual JSON parsing
- Member-to-member orchestration (threads): sequenced Claude calls via `/api/threads/[threadId]/respond` — each member gets full thread transcript + their own system prompt + memory context; idempotency check prevents double-responses; extraction runs post-sequence via `/api/threads/[threadId]/extract`
- Task structure: each task has { title, description, assigned_to, status (pending/in_progress/done/blocked), output (text), due_at, created_at, updated_at }

## Route Map

- `/` → Dashboard / Company HQ — overview of active members, recent conversations, pending tasks
- `/dm/[memberId]` → One-on-one chat with an AI team member (real-time streaming)
- `/threads` → Group conversation threads (async, multi-member)
- `/inbox` → Async messages — member-initiated messages to the founder, like internal email
- `/tasks` → Task management — the founder assigns a task to a member with a brief and deliverable type (strategy doc, research brief, copy draft, decision recommendation, analysis); member produces the output; founder reviews and logs the decision
- `/calendar` → Scheduled meetings and group sessions

## Monetization

none

## Target Subreddits

<!-- Not applicable at this stage — internal tool, not launching publicly yet. -->

## Social Profiles

- X/Twitter: https://x.com/lukehanner
- GitHub: https://github.com/modryn-studio/app.modryn.studio
- Dev.to: https://dev.to/lukehanner
- Ship or Die: https://shipordie.club/lukehanner
