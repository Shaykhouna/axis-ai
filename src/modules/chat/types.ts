export type MessageRole = "user" | "refined" | "assistant" | "summary";

export interface Conversation {
  id: string;
  owner_id: string;
  title: string;
  process_id: string | null;
  preprocessor_model_id: string;
  message_count: number;
  summary: string | null;
  summary_through_message_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  owner_id: string;
  role: MessageRole;
  content: string;
  router_call_id: string | null;
  parent_message_id: string | null;
  tokens_in: number;
  tokens_out: number;
  cost_cents: number;
  latency_ms: number;
  created_at: number;
}