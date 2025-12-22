CREATE TABLE IF NOT EXISTS pastes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'text',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_pastes_slug
  ON pastes(slug);

CREATE INDEX IF NOT EXISTS idx_pastes_language
  ON pastes(language);

CREATE INDEX IF NOT EXISTS idx_pastes_deleted_at
  ON pastes(deleted_at);

CREATE INDEX IF NOT EXISTS idx_pastes_created_at
  ON pastes(created_at);
