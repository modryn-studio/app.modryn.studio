-- Modryn Studio — Add role to founder_profile
-- Migration: 005

ALTER TABLE founder_profile ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT '';
