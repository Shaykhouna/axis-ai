import { getDb } from "../core";
import type { VaultSource } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export async function listSources(ownerId: string): Promise<VaultSource[]> {
  const db = await getDb();
  return await db.select<VaultSource[]>(
    "SELECT * FROM vault_sources WHERE owner_id = ? ORDER BY created_at ASC",
    [ownerId]
  );
}

export async function createSource(
  ownerId: string,
  path: string,
  displayName: string
): Promise<VaultSource> {
  const db = await getDb();
  const id = generateUuid();
  await db.execute(
    `INSERT INTO vault_sources (id, owner_id, source_type, path, display_name)
     VALUES (?, ?, 'folder', ?, ?)`,
    [id, ownerId, path, displayName]
  );
  const rows = await db.select<VaultSource[]>(
    "SELECT * FROM vault_sources WHERE id = ?",
    [id]
  );
  return rows[0];
}

export async function deleteSource(ownerId: string, sourceId: string): Promise<void> {
  const db = await getDb();
  // ON DELETE CASCADE removes chunks.
  await db.execute(
    "DELETE FROM vault_sources WHERE id = ? AND owner_id = ?",
    [sourceId, ownerId]
  );
}

export async function updateSourceStats(
  sourceId: string,
  fileCount: number,
  chunkCount: number
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE vault_sources
     SET file_count = ?, chunk_count = ?, last_synced_at = ?
     WHERE id = ?`,
    [fileCount, chunkCount, Math.floor(Date.now() / 1000), sourceId]
  );
}