-- Migration 010: Multi-project architecture
-- Adds projects table and project_id FK to conversations, tasks, member_memory, org_memory, decisions.
-- Migrates all existing data to "Trading Plan Machine" project.

-- Known UUID for the seed project — referenced by migration and tests.
-- Format: 00000000-0000-4000-a000-000000000001 (valid v4 UUID)

CREATE TABLE IF NOT EXISTS projects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  context    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: migrate all existing data to this project
INSERT INTO projects (id, name)
VALUES ('00000000-0000-4000-a000-000000000001', 'Trading Plan Machine')
ON CONFLICT (id) DO NOTHING;

-- conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
UPDATE conversations SET project_id = '00000000-0000-4000-a000-000000000001' WHERE project_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_id);

-- tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
UPDATE tasks SET project_id = '00000000-0000-4000-a000-000000000001' WHERE project_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_assigned_status ON tasks(project_id, assigned_to, status);

-- member_memory (nullable — semantic memory has project_id = NULL)
ALTER TABLE member_memory ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
UPDATE member_memory SET project_id = '00000000-0000-4000-a000-000000000001' WHERE project_id IS NULL AND memory_type = 'episodic';
CREATE INDEX IF NOT EXISTS idx_member_memory_project_member_type ON member_memory(project_id, member_id, memory_type);

-- org_memory
ALTER TABLE org_memory ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
UPDATE org_memory SET project_id = '00000000-0000-4000-a000-000000000001' WHERE project_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_org_memory_project ON org_memory(project_id);

-- decisions
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id);
UPDATE decisions SET project_id = '00000000-0000-4000-a000-000000000001' WHERE project_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id);
