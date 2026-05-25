export interface Task {
  id: string;
  owner_id: string;
  task_type: string;
  prompt: string;
  context_json: string | null;
  created_at: number;
}

export interface LabRun {
  id: string;
  owner_id: string;
  task_id: string;
  agent_id: string | null;
  agent_name: string;
  agent_version: number;
  model_id: string;
  output: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  latency_ms: number;
  vault_chunks_used: number;
  status: "success" | "error";
  error_message: string | null;
  score: number | null;
  is_winner: number;
  created_at: number;
}

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

export interface RunResult {
  agentId: string;
  agentName: string;
  agentVersion: number;
  modelId: string;
  status: "running" | "success" | "error";
  output?: string;
  tokensIn?: number;
  tokensOut?: number;
  costCents?: number;
  latencyMs?: number;
  vaultChunksUsed?: number;
  error?: string;
  runId?: string;
  score?: number;
  isWinner?: boolean;
}