import { getDb } from "../core";
import type { Agent, AgentInput } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

// Latest versions only, one row per agent name.
export async function listAgents(ownerId: string): Promise<Agent[]> {
  const db = await getDb();
  return await db.select<Agent[]>(
    `SELECT * FROM agents
     WHERE owner_id = ? AND is_latest = 1
     ORDER BY name ASC`,
    [ownerId]
  );
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const db = await getDb();
  const rows = await db.select<Agent[]>(
    "SELECT * FROM agents WHERE id = ? LIMIT 1",
    [agentId]
  );
  return rows.length === 0 ? null : rows[0];
}

export async function getLatestByName(
  ownerId: string,
  name: string
): Promise<Agent | null> {
  const db = await getDb();
  const rows = await db.select<Agent[]>(
    `SELECT * FROM agents
     WHERE owner_id = ? AND name = ? AND is_latest = 1
     LIMIT 1`,
    [ownerId, name]
  );
  return rows.length === 0 ? null : rows[0];
}

export async function getVersionHistory(
  ownerId: string,
  name: string
): Promise<Agent[]> {
  const db = await getDb();
  return await db.select<Agent[]>(
    `SELECT * FROM agents
     WHERE owner_id = ? AND name = ?
     ORDER BY version DESC`,
    [ownerId, name]
  );
}

export async function createAgent(
  ownerId: string,
  input: AgentInput
): Promise<Agent> {
  const trimmedName = input.name.trim();
  if (trimmedName.length === 0) throw new Error("Agent name cannot be empty.");

  // Reject duplicates by name (case-sensitive — explicit choice).
  const existing = await getLatestByName(ownerId, trimmedName);
  if (existing !== null) {
    throw new Error(
      `Agent named "${trimmedName}" already exists. Edit it to create a new version.`
    );
  }

  const db = await getDb();
  const id = generateUuid();
  await db.execute(
    `INSERT INTO agents
       (id, owner_id, name, domain, version, is_latest,
        model_id, system_prompt, temperature, max_tokens,
        use_vault_context, vault_top_k)
     VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      ownerId,
      trimmedName,
      input.domain,
      input.model_id,
      input.system_prompt,
      input.temperature,
      input.max_tokens,
      input.use_vault_context,
      input.vault_top_k,
    ]
  );

  const created = await getAgent(id);
  if (created === null) throw new Error("Agent insert failed.");
  return created;
}

// Editing = new version. Old row keeps version N, new row gets N+1.
// is_latest moves to the new row. This preserves audit trail for re-Lab.
export async function updateAgent(
  ownerId: string,
  agentId: string,
  patch: Partial<AgentInput>
): Promise<Agent> {
  const current = await getAgent(agentId);
  if (current === null) throw new Error("Agent not found.");
  if (current.owner_id !== ownerId) throw new Error("Forbidden.");

  const db = await getDb();
  await db.execute(
    "UPDATE agents SET is_latest = 0 WHERE owner_id = ? AND name = ?",
    [ownerId, current.name]
  );

  const newId = generateUuid();
  const merged: AgentInput = {
    name: current.name,                                               // name is immutable across versions
    domain: patch.domain !== undefined ? patch.domain : current.domain,
    model_id: patch.model_id ?? current.model_id,
    system_prompt: patch.system_prompt ?? current.system_prompt,
    temperature: patch.temperature ?? current.temperature,
    max_tokens: patch.max_tokens ?? current.max_tokens,
    use_vault_context: patch.use_vault_context ?? current.use_vault_context,
    vault_top_k: patch.vault_top_k ?? current.vault_top_k,
  };

  await db.execute(
    `INSERT INTO agents
       (id, owner_id, name, domain, version, is_latest,
        model_id, system_prompt, temperature, max_tokens,
        use_vault_context, vault_top_k)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
    [
      newId,
      ownerId,
      merged.name,
      merged.domain,
      current.version + 1,
      merged.model_id,
      merged.system_prompt,
      merged.temperature,
      merged.max_tokens,
      merged.use_vault_context,
      merged.vault_top_k,
    ]
  );

  const updated = await getAgent(newId);
  if (updated === null) throw new Error("Agent update failed.");
  return updated;
}

// Deletes ALL versions of an agent by name.
export async function deleteAgent(
  ownerId: string,
  agentId: string
): Promise<void> {
  const agent = await getAgent(agentId);
  if (agent === null) return;
  if (agent.owner_id !== ownerId) throw new Error("Forbidden.");

  const db = await getDb();
  await db.execute(
    "DELETE FROM agents WHERE owner_id = ? AND name = ?",
    [ownerId, agent.name]
  );
}