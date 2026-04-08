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
  type       TEXT        NOT NULL,   -- 'dm' | 'thread' (original comment said 'group'|'async' — outdated)
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


-- ─── Founder Profile ────────────────────────────────────────────────────────
-- Single row representing the human founder. Created empty on first migration;
-- populated by the user via the setup flow.

CREATE TABLE founder_profile (
  id          TEXT        PRIMARY KEY DEFAULT 'founder',
  name        TEXT        NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  avatar_url  TEXT        NOT NULL DEFAULT '',
  initials    TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO founder_profile (id) VALUES ('founder');
