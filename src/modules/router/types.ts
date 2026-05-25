export interface ServiceEndpoints {
  chat: string | null;
  embed: string | null;
  balance: string | null;
}

export type ServiceStatus = "active" | "coming_soon" | "deprecated";

export interface Service {
  id: string;
  display_name: string;
  status: ServiceStatus;
  endpoints: ServiceEndpoints;
  auth_pattern: string | null;
  auth_extra_headers: Record<string, string> | null;
  key_url: string | null;
  key_prefix_hint: string | null;
  synced_at: number;
}

export type ModelType = "chat" | "embedding";

export interface ModelInfo {
  id: string;
  provider: string;
  display_name: string;
  context_window: number;
  input_cost_per_million: number;   // cents per million input tokens
  output_cost_per_million: number;  // cents per million output tokens
  capabilities: string[];
  available_via: string[];
  status: "active" | "deprecated" | "experimental";
  synced_at: number;
  type: ModelType;
  embedding_dim: number | null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// export type SupportedVia = "openrouter";

export interface ChatParams {
  ownerId: string;
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  //via?: string;
}

export interface ChatResult {
  output: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  modelId: string;
  via: string;
}

export interface EmbedParams {
  ownerId: string;
  modelId: string;
  texts: string[];
}

export interface EmbedResult {
  vectors: number[][];
  tokensIn: number;
  costCents: number;
  latencyMs: number;
  modelId: string;
  via: string;
  embeddingDim: number;
}

export interface RouterCall {
  id: string;
  owner_id: string;
  model_id: string;
  service: string;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  latency_ms: number;
  status: "success" | "error" | "blocked_by_cap";
  error_message: string | null;
  created_at: number;
}

export interface BudgetStatus {
  mtd_cents: number;
  cap_cents: number;
  remaining_cents: number;
  exceeded: boolean;
}

export class BudgetExceededError extends Error {
  public readonly mtdCents: number;
  public readonly capCents: number;
  constructor(mtdCents: number, capCents: number) {
    super(
      `Monthly cap exceeded: $${(mtdCents / 100).toFixed(2)} / $${(capCents / 100).toFixed(2)}`
    );
    this.name = "BudgetExceededError";
    this.mtdCents = mtdCents;
    this.capCents = capCents;
  }
}