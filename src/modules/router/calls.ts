import { getDb } from "../core";
import type { RouterCall } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export interface CallLogParams {
  ownerId: string;
  modelId: string;
  service: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  status: "success" | "error" | "blocked_by_cap";
  errorMessage: string | null;
}

export async function logCall(call: CallLogParams): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO router_calls
       (id, owner_id, model_id, service, tokens_in, tokens_out,
        cost_cents, latency_ms, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateUuid(),
      call.ownerId,
      call.modelId,
      call.service,
      call.tokensIn,
      call.tokensOut,
      call.costCents,
      call.latencyMs,
      call.status,
      call.errorMessage,
    ]
  );
}

export async function listRecentCalls(
  ownerId: string,
  limit: number = 20
): Promise<RouterCall[]> {
  const db = await getDb();
  return await db.select<RouterCall[]>(
    `SELECT * FROM router_calls
     WHERE owner_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [ownerId, limit]
  );
}