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

Your angle: A real company operating system where AI team members have distinct, persistent personalities modeled after real thinkers — not generic assistants. The mechanism: system-prompt-driven personality + database-backed memory + task and decision logging, wrapped in a company OS interface, not a chat UI.

## Product

An internal AI team communication system for Modryn Studio. The founder converses one-on-one or in group threads with AI personalities modeled after real public figures. Members have persistent memory, can be assigned tasks, send async messages, and participate in scheduled group discussions — operating like a real company team.

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

- /members — AI member configs, system prompts, personality definitions
- /migrations — Neon SQL migration files (schema source of truth)

## Data Layer Notes

- All persistent state lives in Neon: conversations, messages, tasks, member memory, decisions
- Memory summarization: after each session, compress conversation into structured summary and store in member_memory; inject as system context on next session
- Member-to-member orchestration: each member response gets injected as context into the next member's API call (sequenced Claude calls, each with their own system prompt)
- Proactive messaging governor: members can initiate messages, rate-limited by per-member cooldown (default 24h) or event trigger, to prevent runaway activity

## Route Map

- `/` → Dashboard / Company HQ — overview of active members, recent conversations, pending tasks
- `/dm/[memberId]` → One-on-one chat with an AI team member (real-time streaming)
- `/threads` → Group conversation threads (async, multi-member)
- `/inbox` → Async messages — member-initiated messages to the founder, like internal email
- `/tasks` → Task management — assigned to members, with status and output
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
