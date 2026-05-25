import { getDb } from "../core";
import type { Settings } from "./types";

const DEFAULT_CATALOG_URL =
  "https://raw.githubusercontent.com/Shaykhouna/open_library/main/axis-ai/catalog.json";

// Returns the owner's settings row, creating the default row on first access.
export async function getSettings(ownerId: string): Promise<Settings> {
  const db = await getDb();
  const existing = await db.select<Settings[]>(
    "SELECT * FROM settings WHERE owner_id = ? LIMIT 1",
    [ownerId]
  );
  if (existing.length > 0) {
    return existing[0];
  }

  // First-touch creation. Defaults match the schema.
  await db.execute(
    `INSERT INTO settings (owner_id, model_catalog_url) VALUES (?, ?)`,
    [ownerId, DEFAULT_CATALOG_URL]
  );
  const created = await db.select<Settings[]>(
    "SELECT * FROM settings WHERE owner_id = ?",
    [ownerId]
  );
  return created[0];
}

// Allow-list approach: only known columns can be patched.
// Prevents accidental injection of arbitrary fields.
const PATCHABLE_FIELDS = new Set<keyof Settings>([
  "benchmark_opt_in",
  "monthly_cost_cap_cents",
  "api_key_source",
  "model_catalog_url",
  "model_catalog_last_synced_at",
  "user_domain_tag",
  "default_preprocessor_model_id",
  "onboarding_completed",
]);

export async function updateSettings(
  ownerId: string,
  patch: Partial<Settings>
): Promise<Settings> {
  const db = await getDb();

  const entries = Object.entries(patch).filter(([k]) =>
    PATCHABLE_FIELDS.has(k as keyof Settings)
  );
  if (entries.length === 0) {
    return await getSettings(ownerId);
  }

  const setClause = entries.map(([k]) => `${k} = ?`).join(", ");
  const values = entries.map(([, v]) => v);
  values.push(Math.floor(Date.now() / 1000)); // updated_at
  values.push(ownerId);

  await db.execute(
    `UPDATE settings SET ${setClause}, updated_at = ? WHERE owner_id = ?`,
    values
  );

  return await getSettings(ownerId);
}