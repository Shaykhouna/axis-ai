// Self-contained type for this module. Mirrors Lab's ProcessRow shape since
// both map to the same `processes` table; per the module boundary rule we
// don't import sibling types.
export interface ProcessRow {
  id: string;
  owner_id: string;
  task_type: string;
  agent_id: string | null;
  agent_name: string;
  agent_version: number;
  status: "active" | "retired";
  promoted_from_run_id: string;
  retired_at: number | null;
  created_at: number;
}

export interface ProcessRunResult {
  output: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  vaultChunksUsed: number;
  modelId: string;
}