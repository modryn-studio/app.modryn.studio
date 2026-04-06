-- Add sort_order to members for manual reordering
ALTER TABLE members ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Seed existing rows with their creation order
UPDATE members SET sort_order = sub.rn
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn FROM members) sub
WHERE members.id = sub.id;
