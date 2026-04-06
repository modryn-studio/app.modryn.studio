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
- Anthropic API (claude-sonnet-4-6 for AI member responses)
- Vercel SSE (Server-Sent Events for real-time streaming responses)
- Vercel Hobby tier (hosting + serverless functions)

## Project Structure Additions

- /migrations — Neon SQL migration files (schema source of truth)
- /docs — Human-readable docs including the founding document (modryn-studio-founding-document.md) used for company context injection
- /src/lib/context.ts — `getCompanyContext()` reads the founding document from disk and returns it for injection; swap this function to switch to DB-backed context

## Data Layer Notes

- All persistent state lives in Neon: conversations, messages, tasks, member memory, decisions
- Context injection stack (assembled per request in /api/chat): [member system prompt from DB] → [company context from founding doc file] → [member memory summaries from DB]
- Memory summarization: after each session, compress conversation into structured summary and store in member_memory; inject as system context on next session
- Member-to-member orchestration: each member response gets injected as context into the next member's API call (sequenced Claude calls, each with their own system prompt)
- Proactive messaging governor: members can initiate messages, rate-limited by per-member cooldown (default 24h) or event trigger, to prevent runaway activity
- Task structure: each task has { title, brief, assigned_member, deliverable_type, status (pending/in-progress/review/done), output (text), created_at, completed_at }; deliverable_type drives how the member's system prompt frames its response

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
