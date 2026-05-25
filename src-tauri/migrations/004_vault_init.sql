-- Vault module schema.

CREATE TABLE IF NOT EXISTS vault_sources (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'folder',
  path TEXT NOT NULL,
  display_name TEXT NOT NULL,
  last_synced_at INTEGER,
  file_count INTEGER NOT NULL DEFAULT 0,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (owner_id, path)
);

CREATE TABLE IF NOT EXISTS vault_chunks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES vault_sources(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  heading TEXT,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  tokens INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_vault_chunks_owner ON vault_chunks(owner_id);
CREATE INDEX IF NOT EXISTS idx_vault_chunks_source ON vault_chunks(source_id);