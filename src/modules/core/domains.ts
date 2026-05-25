import { getDb } from "./db";
import type { Domain } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export async function listDomains(ownerId: string): Promise<Domain[]> {

  try {
    const db = await getDb();
    return await db.select<Domain[]>(
      "SELECT * FROM domains WHERE owner_id = ? ORDER BY name ASC",
      [ownerId]
    );
  } catch (error) {
    console.error("Error listing domains:", error);
    throw error;
  }
}

export async function createDomain(
  ownerId: string,
  name: string,
  description: string | null
): Promise<Domain> {

  try {
    const db = await getDb();
    const id = generateUuid();
    await db.execute(
      "INSERT INTO domains (id, owner_id, name, description) VALUES (?, ?, ?, ?)",
      [id, ownerId, name.trim(), description]
    );
  const rows = await db.select<Domain[]>(
    "SELECT * FROM domains WHERE id = ?",
    [id]
  );
  return rows[0];} catch (error) {
    console.error("Error creating domain:", error);
    throw error;
  }
}

export async function deleteDomain(
  ownerId: string,
  domainId: string
): Promise<void> {
  try {
    const db = await getDb();
    await db.execute(
      "DELETE FROM domains WHERE id = ? AND owner_id = ?",
      [domainId, ownerId]
    );
  } catch (error) {
    console.error("Error deleting domain:", error);
    throw error;
  }
}