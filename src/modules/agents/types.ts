import type { SearchResult } from "../vault";

export interface Agent {
  id: string;
  owner_id: string;
  name: string;
  domain: string | null;
  version: number;
  is_latest: number;
  model_id: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_vault_context: number;
  vault_top_k: number;
  created_at: number;
}

export interface AgentInput {
  name: string;
  domain: string | null;
  model_id: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_vault_context: number;
  vault_top_k: number;
}

export interface AgentRunResult {
  output: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  modelId: string;
  vaultContextUsed: number;
  vaultChunks: SearchResult[];
}