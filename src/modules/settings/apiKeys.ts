import { getDb } from "../core";
import { keychainSet, keychainDelete } from "./keychain";
import type { ApiKeyRef } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

// Keychain key naming. Scoped by owner so multi-tenant later doesn't collide.
function buildKeychainKey(ownerId: string, service: string): string {
  return `${ownerId}:${service}`;
}

export async function listApiKeyRefs(ownerId: string): Promise<ApiKeyRef[]> {
  const db = await getDb();
  return await db.select<ApiKeyRef[]>(
    "SELECT * FROM api_key_refs WHERE owner_id = ? ORDER BY service ASC",
    [ownerId]
  );
}

// Stores the key in OS keychain, then writes a reference row.
// If the keychain write fails, no DB row is written (atomic-ish from user POV).
export async function setApiKey(
  ownerId: string,
  service: string,
  value: string
): Promise<ApiKeyRef> {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error("Key cannot be empty.");
  }

  const keychainKey = buildKeychainKey(ownerId, service);
  console.log("[DEBUG setApiKey] storing under key:", keychainKey, "value length:", trimmed.length); // DEBUG
  await keychainSet(keychainKey, trimmed);

  const db = await getDb();
  // Replace any existing ref for this owner+service (UNIQUE constraint).
  await db.execute(
    "DELETE FROM api_key_refs WHERE owner_id = ? AND service = ?",
    [ownerId, service]
  );
  const id = generateUuid();
  await db.execute(
    "INSERT INTO api_key_refs (id, owner_id, service, keychain_key) VALUES (?, ?, ?, ?)",
    [id, ownerId, service, keychainKey]
  );

  const rows = await db.select<ApiKeyRef[]>(
    "SELECT * FROM api_key_refs WHERE id = ?",
    [id]
  );
  return rows[0];
}

export async function deleteApiKey(
  ownerId: string,
  service: string
): Promise<void> {
  const keychainKey = buildKeychainKey(ownerId, service);
  // Delete from keychain first; if that fails, the DB row stays as a marker.
  await keychainDelete(keychainKey);

  const db = await getDb();
  await db.execute(
    "DELETE FROM api_key_refs WHERE owner_id = ? AND service = ?",
    [ownerId, service]
  );
}

// For internal use by Router module later: fetches the secret value on demand.
// Kept in apiKeys.ts (not exported via index until Router needs it) to keep
// the surface area minimal.
export async function readApiKeyValue(
  ownerId: string,
  service: string
): Promise<string | null> {
  const { keychainGet } = await import("./keychain");
  const key = buildKeychainKey(ownerId, service);
  //console.log("[DEBUG readApiKeyValue] looking up key:", key); // DEBUG
  const result = await keychainGet(key);
  //console.log("[DEBUG readApiKeyValue] keychain returned:", result === null ? "NULL" : `${result.length} chars`); // DEBUG
  return result;
  //return await keychainGet(buildKeychainKey(ownerId, service));

}