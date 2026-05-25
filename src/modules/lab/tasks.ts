import { getDb } from "../core";
import type { Task } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export async function createTask(
  ownerId: string,
  taskType: string,
  prompt: string,
  contextJson: string | null = null
): Promise<Task> {
  const tt = taskType.trim();
  const pp = prompt.trim();
  if (tt.length === 0) throw new Error("Task type is required.");
  if (pp.length === 0) throw new Error("Prompt is required.");

  const db = await getDb();
  const id = generateUuid();
  await db.execute(
    `INSERT INTO tasks (id, owner_id, task_type, prompt, context_json)
     VALUES (?, ?, ?, ?, ?)`,
    [id, ownerId, tt, pp, contextJson]
  );
  const rows = await db.select<Task[]>("SELECT * FROM tasks WHERE id = ?", [id]);
  return rows[0];
}

export async function listTaskTypes(ownerId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ task_type: string }[]>(
    `SELECT DISTINCT task_type FROM tasks WHERE owner_id = ? ORDER BY task_type ASC`,
    [ownerId]
  );
  return rows.map((r) => r.task_type);
}

export async function listRecentTasks(ownerId: string, limit: number = 20): Promise<Task[]> {
  const db = await getDb();
  return await db.select<Task[]>(
    `SELECT * FROM tasks WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?`,
    [ownerId, limit]
  );
}

export async function getTask(taskId: string): Promise<Task | null> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    "SELECT * FROM tasks WHERE id = ? LIMIT 1",
    [taskId]
  );
  return rows.length === 0 ? null : rows[0];
}