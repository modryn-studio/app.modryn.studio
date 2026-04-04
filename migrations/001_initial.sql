-- Modryn Studio — Initial Schema
-- Migration: 001_initial
-- Run against your Neon database

-- ─── Members ────────────────────────────────────────────────────────────────
-- AI team member profiles, personality config, and proactive messaging governor.
-- 'founder' is not a row here — the founder is identified by sender_id = 'founder'
-- in messages.

CREATE TABLE members (
  id                    TEXT        PRIMARY KEY,          -- e.g. 'peter-thiel'
  name                  TEXT        NOT NULL,
  role                  TEXT        NOT NULL,
  initials              TEXT        NOT NULL,
  system_prompt         TEXT        NOT NULL,
  personality_notes     TEXT,                             -- human-readable notes, not injected
  status                TEXT        NOT NULL DEFAULT 'online',  -- 'online' | 'analyzing' | 'generating'
  can_initiate          BOOLEAN     NOT NULL DEFAULT TRUE, -- can member send proactive messages?
  initiate_cooldown_hrs INTEGER     NOT NULL DEFAULT 24,   -- proactive message governor (hours)
  last_initiated_at     TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── Conversations ──────────────────────────────────────────────────────────
-- A thread: either a DM (founder ↔ one member) or a group thread.
-- 'async' type = inbox-style, not real-time.

CREATE TABLE conversations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT        NOT NULL,   -- 'dm' | 'group' | 'async'
  title      TEXT,                   -- display title for group threads
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── Conversation Members ───────────────────────────────────────────────────
-- Which members (and/or founder) participate in each conversation.
-- Use member_id = 'founder' for the founder's participation slot.

CREATE TABLE conversation_members (
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  member_id       TEXT        NOT NULL,                   -- members.id or 'founder'
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, member_id)
);


-- ─── Messages ───────────────────────────────────────────────────────────────
-- Individual messages within a conversation.
-- role maps directly to AI SDK roles for context injection.

CREATE TABLE messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT        NOT NULL,   -- members.id or 'founder'
  role            TEXT        NOT NULL,   -- 'user' | 'assistant'
  content         TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_id_created_at
  ON messages (conversation_id, created_at);

CREATE INDEX messages_sender_id
  ON messages (sender_id);


-- ─── Tasks ──────────────────────────────────────────────────────────────────
-- Tasks assigned to a member, with optional link back to the conversation
-- where the task was created or discussed.

CREATE TABLE tasks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to     TEXT        NOT NULL REFERENCES members(id),
  title           TEXT        NOT NULL,
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'done' | 'blocked'
  output          TEXT,                                    -- member's completed work product
  due_at          TIMESTAMPTZ,
  conversation_id UUID        REFERENCES conversations(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_assigned_to_status
  ON tasks (assigned_to, status);


-- ─── Member Memory ──────────────────────────────────────────────────────────
-- Compressed summaries of past sessions, injected as system context on the
-- next session with that member. One row per session summary.
-- Oldest rows can be pruned or further compressed as volume grows.

CREATE TABLE member_memory (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       TEXT        NOT NULL REFERENCES members(id),
  summary         TEXT        NOT NULL,                   -- compressed session summary
  conversation_id UUID        REFERENCES conversations(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX member_memory_member_id_created_at
  ON member_memory (member_id, created_at DESC);


-- ─── Decisions ──────────────────────────────────────────────────────────────
-- Logged outcomes from conversations — the company's decision log.

CREATE TABLE decisions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT        NOT NULL,
  description     TEXT,
  conversation_id UUID        REFERENCES conversations(id),
  logged_by       TEXT,                                   -- members.id or 'founder'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── Seed: Peter Thiel ──────────────────────────────────────────────────────
-- Insert the first AI team member. System prompt lives here as source of truth;
-- the API route reads it from the DB instead of being hardcoded.

INSERT INTO members (id, name, role, initials, system_prompt, personality_notes)
VALUES (
  'peter-thiel',
  'Peter Thiel',
  'AI Strategist',
  'PT',
  'You are Peter Thiel — co-founder of PayPal, Palantir, and Founders Fund, and author of Zero to One. You are the AI Strategist inside Modryn Studio, advising the Founder directly.

Your thinking style:
- You reason from first principles, not analogies or market consensus
- You are deeply contrarian — if the conventional wisdom says X, you interrogate why that belief exists and whether it is actually true
- You think in monopolies vs. competition. You believe competition is for losers. The goal is to be so good at one thing that competition becomes irrelevant
- You use the Zero to One lens: going from 0 to 1 (creating something genuinely new) is infinitely more valuable than going from 1 to N (iteration and globalization of existing ideas)
- You are calm, deliberate, and precise. You do not use filler words or hollow encouragement
- You ask hard, specific questions that reframe the founder''s assumptions
- You do not hedge unnecessarily. You state your views directly and with confidence
- You believe startups succeed by secrets — things that are true but that most people do not believe yet
- You reference your experience at PayPal, Palantir, early Facebook investment, and your writings where relevant
- You care about defensibility: network effects, scale, switching costs, brand, proprietary technology
- You are skeptical of consensus opinions, market research, and best practices

Founder context:
- The founder (Luke) is analytical and visionary. He thinks in frameworks and makes decisions through debate and data, with gut instinct in the mix.
- He communicates directly and bluntly day-to-day. Detailed and thorough when planning.
- He is building Modryn Studio — a modern indie digital studio. Software tools, writing, and produced content. No physical products. Multiple compounding revenue streams.
- His end goal is engaged freedom: 6–8 hours a day on things that matter, no physical toll, no ceiling.
- He wants strategic challenge, not agreement. Push back when the idea is derivative or the reasoning is weak.

Tone: blunt, Socratic, intellectually serious. Ask questions as much as you answer them. Do not encourage bad ideas — push back, sharply but respectfully.

Format: respond in clear prose. Do not use bullet points unless structure genuinely helps. Keep responses focused and substantive — not padded. When appropriate, end with a question that pushes the founder to think harder.',
  'Contrarian strategist. Most valuable for stress-testing product ideas, forcing singular conviction, long-term positioning, and identifying unfair advantage. Blind spots: can dismiss valid incremental wins; monopoly framework calibrated for venture-scale, may need adjustment for indie studio context.'
);
