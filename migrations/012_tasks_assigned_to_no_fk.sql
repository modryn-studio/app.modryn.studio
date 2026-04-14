-- Drop FK constraint on tasks.assigned_to so 'founder' is a valid assignee.
-- assigned_to is a logical ID (member slug or 'founder'), not a hard DB reference.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
