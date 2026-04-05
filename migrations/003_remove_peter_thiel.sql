-- Modryn Studio — Remove Peter Thiel seed + add founder_profile
-- Migration: 003
-- Run against existing databases that already ran 001_initial.sql
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- Remove Peter Thiel data in dependency order
DELETE FROM member_memory       WHERE member_id  = 'peter-thiel';
DELETE FROM messages            WHERE sender_id  = 'peter-thiel';
DELETE FROM conversation_members WHERE member_id = 'peter-thiel';
DELETE FROM tasks               WHERE assigned_to = 'peter-thiel';
DELETE FROM members             WHERE id          = 'peter-thiel';

-- Create founder_profile if it was never created (pre-003 databases)
CREATE TABLE IF NOT EXISTS founder_profile (
  id          TEXT        PRIMARY KEY DEFAULT 'founder',
  name        TEXT        NOT NULL DEFAULT '',
  description TEXT        NOT NULL DEFAULT '',
  avatar_url  TEXT        NOT NULL DEFAULT '',
  initials    TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO founder_profile (id) VALUES ('founder') ON CONFLICT DO NOTHING;
