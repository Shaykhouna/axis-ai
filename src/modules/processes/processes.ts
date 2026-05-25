import { getDb } from "../core";
import type { ProcessRow } from "./types";

export async function listActiveProcesses(ownerId: string): Promise<ProcessRow[]> {
  const db = await getDb();
  return await db.select<ProcessRow[]>(
    `SELECT * FROM processes
     WHERE owner_id = ? AND status = 'active'
     ORDER BY task_type ASC`,
    [ownerId]
  );
}

export async function listRetiredProcesses(ownerId: string): Promise<ProcessRow[]> {
  const db = await getDb();
  return await db.select<ProcessRow[]>(
    `SELECT * FROM processes
     WHERE owner_id = ? AND status = 'retired'
     ORDER BY retired_at DESC`,
    [ownerId]
  );
}

export async function getActiveProcessByTaskType(
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

export async function getProcessById(processId: string): Promise<ProcessRow | null> {
  const db = await getDb();
  const rows = await db.select<ProcessRow[]>(
    "SELECT * FROM processes WHERE id = ? LIMIT 1",
    [processId]
  );
  return rows.length === 0 ? null : rows[0];
}

export async function retireProcess(
  ownerId: string,
  processId: string
): Promise<void> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await db.execute(
    `UPDATE processes
     SET status = 'retired', retired_at = ?
     WHERE id = ? AND owner_id = ? AND status = 'active'`,
    [now, processId, ownerId]
  );
}

// Hard delete. Only meant for retired processes (e.g. orphaned ones).
// Active processes should go through retire first.
export async function deleteProcess(
  ownerId: string,
  processId: string
): Promise<void> {
  const proc = await getProcessById(processId);
  if (proc === null) return;
  if (proc.owner_id !== ownerId) throw new Error("Forbidden.");
  if (proc.status === "active") {
    throw new Error("Retire the process before deleting.");
  }
  const db = await getDb();
  await db.execute(
    "DELETE FROM processes WHERE id = ? AND owner_id = ?",
    [processId, ownerId]
  );
}