import { getDb } from "../core";
import { getTask } from "./tasks";
import type { LabRun, ProcessRow } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export async function getActiveProcessForTaskType(
  ownerId: string,
  taskType: string
): Promise<ProcessRow | null> {
  const db = await getDb();
  const rows = await db.select<ProcessRow[]>(
    `SELECT * FROM processes
     WHERE owner_id = ? AND task_type = ? AND status = 'active'
     LIMIT 1`,
    [ownerId, taskType]
  );
  return rows.length === 0 ? null : rows[0];
}

// Promotes a winning run to an active Process.
// Retires any existing active process for the same task_type first.
export async function promoteToProcess(
  ownerId: string,
  runId: string
): Promise<ProcessRow> {
  const db = await getDb();

  const runs = await db.select<LabRun[]>(
    "SELECT * FROM lab_runs WHERE id = ? AND owner_id = ? LIMIT 1",
    [runId, ownerId]
  );
  if (runs.length === 0) throw new Error("Run not found.");
  const run = runs[0];

  if (run.is_winner !== 1) {
    throw new Error("Run is not marked as winner. Star a winner first.");
  }
  if (run.status !== "success") {
    throw new Error("Cannot promote a failed run.");
  }
  if (run.agent_id === null) {
    throw new Error("Run has no associated agent (orphaned).");
  }

  const task = await getTask(run.task_id);
  if (task === null) throw new Error("Task not found.");

  const now = Math.floor(Date.now() / 1000);

  // Retire current active for this task_type (if any). Done in a single
  // statement to satisfy the partial unique index ordering.
  await db.execute(
    `UPDATE processes
     SET status = 'retired', retired_at = ?
     WHERE owner_id = ? AND task_type = ? AND status = 'active'`,
    [now, ownerId, task.task_type]
  );

  const id = generateUuid();
  await db.execute(
    `INSERT INTO processes
       (id, owner_id, task_type, agent_id, agent_name, agent_version,
        status, promoted_from_run_id)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`,
    [id, ownerId, task.task_type, run.agent_id, run.agent_name, run.agent_version, runId]
  );

  const created = await db.select<ProcessRow[]>(
    "SELECT * FROM processes WHERE id = ?",
    [id]
  );
  return created[0];
}