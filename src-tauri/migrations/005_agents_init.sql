-- Agents module. Versioned by (owner_id, name, version).
-- Editing creates a new row with version+1; old version is marked is_latest=0.
-- Runs in router_calls log the model used; agent identity is recovered
-- by Lab in its own runs table later.

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,

  version INTEGER NOT NULL DEFAULT 1,
  is_latest INTEGER NOT NULL DEFAULT 1,

  model_id TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  temperature REAL NOT NULL DEFAULT 0.7,
  max_tokens INTEGER NOT NULL DEFAULT 1024,

  use_vault_context INTEGER NOT NULL DEFAULT 0,
  vault_top_k INTEGER NOT NULL DEFAULT 5,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

  UNIQUE (owner_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_agents_owner_latest ON agents(owner_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_agents_owner_name ON agents(owner_id, name);