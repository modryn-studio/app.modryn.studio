-- Add respond_order to conversation_members for persisted thread response sequencing.
-- Required for Threads v1: each thread stores its member respond order so it
-- survives reloads and partial-sequence recovery on load.
ALTER TABLE conversation_members ADD COLUMN respond_order INTEGER NOT NULL DEFAULT 0;
