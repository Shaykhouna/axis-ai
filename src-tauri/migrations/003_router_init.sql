-- Router module schema.

-- Cached model catalog. Refreshed from the JSON manifest hosted by you.
CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  display_name TEXT NOT NULL,
  context_window INTEGER NOT NULL,
  input_cost_per_million INTEGER NOT NULL,
  output_cost_per_million INTEGER NOT NULL,
  capabilities TEXT NOT NULL DEFAULT '[]',
  available_via TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  synced_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Per-call audit log. Powers cost cap enforcement and recent-calls views.
-- cost_cents is REAL so sub-cent precision survives aggregation.
CREATE TABLE IF NOT EXISTS router_calls (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  service TEXT NOT NULL,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_router_calls_owner_created ON router_calls(owner_id, created_at DESC);