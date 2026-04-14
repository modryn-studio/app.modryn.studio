-- Saved Reddit URLs per project. Full thread text is cached at save time
-- so threads load instantly without a re-fetch.

CREATE TABLE IF NOT EXISTS saved_reddit_urls (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  label      TEXT        NOT NULL,
  text       TEXT        NOT NULL,
  depth      INTEGER     NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_reddit_urls_project_id_idx
  ON saved_reddit_urls (project_id);
