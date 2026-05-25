import { getDb } from "../core";
import type { LabRun } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export interface InsertLabRunParams {
  ownerId: string;
  taskId: string;
  agentId: string;
  agentName: string;
  agentVersion: number;
  modelId: string;
  output: string | null;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
  vaultChunksUsed: number;
  status: "success" | "error";
  errorMessage: string | null;
}

export async function insertLabRun(p: InsertLabRunParams): Promise<string> {
  const db = await getDb();
  const id = generateUuid();
  await db.execute(
    `INSERT INTO lab_runs
       (id, owner_id, task_id, agent_id, agent_name, agent_version, model_id,
        output, tokens_in, tokens_out, cost_cents, latency_ms,
        vault_chunks_used, status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, p.ownerId, p.taskId, p.agentId, p.agentName, p.agentVersion, p.modelId,
      p.output, p.tokensIn, p.tokensOut, p.costCents, p.latencyMs,
      p.vaultChunksUsed, p.status, p.errorMessage,
    ]
  );
  return id;
}

export async function listRunsForTask(taskId: string): Promise<LabRun[]> {
  const db = await getDb();
  return await db.select<LabRun[]>(
    "SELECT * FROM lab_runs WHERE task_id = ? ORDER BY created_at ASC",
    [taskId]
  );
}

export async function scoreRun(
  ownerId: string,
  runId: string,
  score: number
): Promise<void> {
  if (score < 1 || score > 5) throw new Error("Score must be 1-5.");
  const db = await getDb();
  await db.execute(
    "UPDATE lab_runs SET score = ? WHERE id = ? AND owner_id = ?",
    [score, runId, ownerId]
  );
}

// Marks exactly one run as winner; clears is_winner on all siblings.
export async function setWinner(ownerId: string, runId: string): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ task_id: string }[]>(
    "SELECT task_id FROM lab_runs WHERE id = ? AND owner_id = ?",
    [runId, ownerId]
  );
  if (rows.length === 0) throw new Error("Run not found.");
  const taskId = rows[0].task_id;
  await db.execute("UPDATE lab_runs SET is_winner = 0 WHERE task_id = ?", [taskId]);
  await db.execute(
    "UPDATE lab_runs SET is_winner = 1 WHERE id = ? AND owner_id = ?",
    [runId, ownerId]
  );
}

export async function clearWinner(taskId: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE lab_runs SET is_winner = 0 WHERE task_id = ?", [taskId]);
}