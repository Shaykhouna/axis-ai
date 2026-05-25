-- Core module schema. v1: single local owner.
-- owner_id on every owned row prepares the multi-tenant migration later.

CREATE TABLE IF NOT EXISTS owners (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT 'me',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  is_local_owner INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (owner_id, name)
);

CREATE INDEX IF NOT EXISTS idx_domains_owner ON domains(owner_id);