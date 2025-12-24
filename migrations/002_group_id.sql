CREATE TABLE IF NOT EXISTS paste_groups (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

ALTER TABLE pastes ADD COLUMN group_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_pastes_group_id ON pastes(group_id);

