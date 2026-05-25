-- Conversations: a thread, optionally bound to a Process. Owns a preprocessor
-- model choice and a rolling summary for context compression.
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  process_id TEXT,
  preprocessor_model_id TEXT NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  summary_through_message_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations(owner_id, updated_at DESC);

-- Messages: four roles. 'user' is human input; 'refined' is the local LLM's
-- reformulation; 'assistant' is the cloud Process output; 'summary' is a
-- periodic compression. Each can link to a router_calls row for audit.
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'refined', 'assistant', 'summary')),
  content TEXT NOT NULL,
  router_call_id TEXT,
  parent_message_id TEXT,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);

-- Settings gains a default preprocessor model. New conversations inherit this.
ALTER TABLE settings ADD COLUMN default_preprocessor_model_id TEXT;

-- Bootstrap Ollama as a service. auth_pattern=NULL signals "no auth needed".
INSERT OR IGNORE INTO services
  (id, display_name, status, endpoints, auth_pattern, auth_extra_headers, key_url, key_prefix_hint, synced_at)
VALUES
  ('ollama', 'Ollama (Local)', 'active',
   '{"chat":"http://localhost:11434/v1/chat/completions","embed":"http://localhost:11434/v1/embeddings","balance":null}',
   NULL,
   '{}',
   'https://ollama.com/download',
   NULL,
   0);

-- Bootstrap two curated local models. Cost is 0. available_via=ollama only.
INSERT OR IGNORE INTO models
  (id, provider, display_name, context_window, input_cost_per_million, output_cost_per_million,
   capabilities, available_via, status, synced_at, type, embedding_dim)
VALUES
  ('ollama/llama3.2:3b', 'meta', 'Llama 3.2 3B (Local)',
   131072, 0, 0, '[]', '["ollama"]', 'active', 0, 'chat', NULL),
  ('ollama/qwen2.5:3b', 'alibaba', 'Qwen 2.5 3B (Local)',
   32768, 0, 0, '[]', '["ollama"]', 'active', 0, 'chat', NULL);