-- Services table (synced from manifest, with bootstrap fallback row inserts below).
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  endpoints TEXT NOT NULL DEFAULT '{}',
  auth_pattern TEXT,
  auth_extra_headers TEXT,
  key_url TEXT,
  key_prefix_hint TEXT,
  synced_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Models gain type discriminator and embedding dim. Existing rows default to 'chat'.
ALTER TABLE models ADD COLUMN type TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE models ADD COLUMN embedding_dim INTEGER;

-- Bootstrap services so the app works before first catalog sync (or with the
-- old manifest format that doesn't include services).
INSERT OR IGNORE INTO services
  (id, display_name, status, endpoints, auth_pattern, auth_extra_headers, key_url, key_prefix_hint, synced_at)
VALUES
  ('openrouter', 'OpenRouter', 'active',
   '{"chat":"https://openrouter.ai/api/v1/chat/completions","embed":null,"balance":"https://openrouter.ai/api/v1/auth/key"}',
   'Bearer {key}',
   '{"HTTP-Referer":"https://github.com/yourname/axisai","X-Title":"Axis-AI"}',
   'https://openrouter.ai/keys',
   'sk-or-v1-',
   0),
  ('openai', 'OpenAI Direct', 'active',
   '{"chat":"https://api.openai.com/v1/chat/completions","embed":"https://api.openai.com/v1/embeddings","balance":null}',
   'Bearer {key}',
   '{}',
   'https://platform.openai.com/api-keys',
   'sk-',
   0),
  ('anthropic', 'Anthropic Direct', 'coming_soon',
   '{}', NULL, NULL, NULL, NULL, 0),
  ('groq', 'Groq', 'coming_soon',
   '{}', NULL, NULL, NULL, NULL, 0);

-- Bootstrap the default embedding model so Vault keeps working pre-sync.
INSERT OR IGNORE INTO models
  (id, provider, display_name, context_window, input_cost_per_million, output_cost_per_million,
   capabilities, available_via, status, synced_at, type, embedding_dim)
VALUES
  ('openai/text-embedding-3-small', 'openai', 'OpenAI Embedding · Small',
   8191, 2, 0, '[]', '["openai"]', 'active', 0, 'embedding', 1536);