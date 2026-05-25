-- Settings module schema.
-- One settings row per owner. API key REFERENCES only — actual keys live in OS keychain.

CREATE TABLE IF NOT EXISTS settings (
  owner_id TEXT PRIMARY KEY REFERENCES owners(id) ON DELETE CASCADE,

  -- Privacy: opt-in OFF by default (the contract)
  benchmark_opt_in INTEGER NOT NULL DEFAULT 0,

  -- Cost controls (cents to avoid float drift)
  monthly_cost_cap_cents INTEGER NOT NULL DEFAULT 3000,

  -- Key source mode. v1 = byok. v2 will add platform_proxy.
  api_key_source TEXT NOT NULL DEFAULT 'byok',

  -- Model catalog (consumed by Router module)
  model_catalog_url TEXT NOT NULL DEFAULT 'https://https://example.com//catalog.json',
  model_catalog_last_synced_at INTEGER,

  -- Self-classification (used by Benchmarks later; FK-less to allow free-text)
  user_domain_tag TEXT,

  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Pointers to keychain entries. NEVER stores the secret value itself.
CREATE TABLE IF NOT EXISTS api_key_refs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  keychain_key TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (owner_id, service)
);

CREATE INDEX IF NOT EXISTS idx_api_key_refs_owner ON api_key_refs(owner_id);