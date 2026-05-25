import { getDb } from "./db";
import { DEFAULT_DOMAINS } from "../../lib/constants";
import type { Owner } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

// Idempotent. Returns the local owner, creating it on first launch.
// Every app startup calls this; subsequent calls are read-only.
export async function provisionOwner(): Promise<Owner> {
  try {
    const db = await getDb();

  const existing = await db.select<Owner[]>(
    "SELECT * FROM owners WHERE is_local_owner = 1 LIMIT 1"
  );
  if (existing.length > 0) {
    return existing[0];
  }

  const id = generateUuid();
  await db.execute(
    "INSERT INTO owners (id, display_name, is_local_owner) VALUES (?, ?, 1)",
    [id, "me"]
  );

  await seedDefaultDomains(id);

  const created = await db.select<Owner[]>(
    "SELECT * FROM owners WHERE id = ?",
    [id]
  );
  return created[0];
  } catch (error) {
    console.error("Error provisioning owner:", error);
    throw error;
  }
}

async function seedDefaultDomains(ownerId: string): Promise<void> {
  try {
    const db = await getDb();
    for (const domain of DEFAULT_DOMAINS) {
      await db.execute(
        "INSERT OR IGNORE INTO domains (id, owner_id, name, description) VALUES (?, ?, ?, ?)",
        [generateUuid(), ownerId, domain.name, domain.description]
      );
    }
  } catch (error) {
    console.error("Error seeding default domains:", error);
    throw error;
  }
}