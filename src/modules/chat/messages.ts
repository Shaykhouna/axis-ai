import { getDb } from "../core";
import type { Message, MessageRole } from "./types";

export async function listMessages(conversationId: string): Promise<Message[]> {
  const db = await getDb();
  return await db.select<Message[]>(
    "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC",
    [conversationId]
  );
}

export interface CreateMessageParams {
  conversationId: string;
  ownerId: string;
  role: MessageRole;
  content: string;
  routerCallId?: string | null;
  parentMessageId?: string | null;
  tokensIn?: number;
  tokensOut?: number;
  costCents?: number;
  latencyMs?: number;
}

export async function createMessage(params: CreateMessageParams): Promise<Message> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO messages
       (id, conversation_id, owner_id, role, content, router_call_id,
        parent_message_id, tokens_in, tokens_out, cost_cents, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, params.conversationId, params.ownerId, params.role, params.content,
      params.routerCallId ?? null, params.parentMessageId ?? null,
      params.tokensIn ?? 0, params.tokensOut ?? 0,
      params.costCents ?? 0, params.latencyMs ?? 0,
    ]
  );
  const rows = await db.select<Message[]>(
    "SELECT * FROM messages WHERE id = ?",
    [id]
  );
  return rows[0];
}