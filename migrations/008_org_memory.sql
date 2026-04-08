-- 008_org_memory.sql
-- Shared organizational memory — auto-extracted from conversations and manually logged.
-- Merged with decisions at read time via getOrgMemory() — no dual-write needed.

CREATE TABLE org_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  source_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  source_member_id TEXT,
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('auto', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX org_memory_created_at ON org_memory (created_at DESC);
