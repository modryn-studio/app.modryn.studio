-- Modryn Studio — Add avatar_url to members
-- Migration: 002_add_member_avatars

ALTER TABLE members ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';
