-- Migration: 013_synthesize_watermark
-- Adds a watermark column to conversations used by DM decisions-draft.
-- After each synthesis, the route advances this timestamp to the last message's
-- created_at so subsequent Synthesize calls only read unseen turns.
-- NULL = never synthesized; the route reads the full conversation history.
-- Threads don't use this — they scope by round (messages after last founder post).

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_synthesized_at TIMESTAMPTZ;
