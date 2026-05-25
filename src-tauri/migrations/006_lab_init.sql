-- Lab module schema. Also creates `processes` because Lab is its producer;
-- the Processes module (next delivery) owns the consume-side functions.

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  context_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_owner_type ON tasks(owner_id, task_type);

-- One agent's attempt at one task in the Lab.
-- agent_id has NO foreign key so deleting an agent doesn't wipe history;
-- agent_name and agent_version are denormalized for display.
CREATE TABLE IF NOT EXISTS lab_runs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  agent_id TEXT,
  agent_name TEXT NOT NULL,
  agent_version INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  output TEXT,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_cents REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  vault_chunks_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  score INTEGER,
  is_winner INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_lab_runs_task ON lab_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_lab_runs_owner ON lab_runs(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS processes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  agent_id TEXT,
  agent_name TEXT NOT NULL,
  agent_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  promoted_from_run_id TEXT NOT NULL,
  retired_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Partial unique index: at most one active process per (owner, task_type).
CREATE UNIQUE INDEX IF NOT EXISTS uq_processes_active
  ON processes(owner_id, task_type)
  WHERE status = 'active';