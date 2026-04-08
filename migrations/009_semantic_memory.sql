-- 009_semantic_memory.sql
-- Adds memory_type to member_memory so episodic (per-conversation) and semantic
-- (cross-conversation pattern) summaries can coexist in the same table.
-- Semantic entries are extracted every 5th episodic write per member using Haiku.

ALTER TABLE member_memory
  ADD COLUMN memory_type TEXT NOT NULL DEFAULT 'episodic'
    CHECK (memory_type IN ('episodic', 'semantic'));

CREATE INDEX member_memory_type ON member_memory (member_id, memory_type, created_at DESC);
