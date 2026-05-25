import { getDb } from "../core";
import { getSettings } from "../settings";
import type { Conversation } from "./types";

interface ConversationRow {
  id: string;
  owner_id: string;
  title: string;
  process_id: string | null;
  preprocessor_model_id: string;
  message_count: number;
  summary: string | null;
  summary_through_message_id: string | null;
  created_at: number;
  updated_at: number;
}

function rowToConv(row: ConversationRow): Conversation {
  return { ...row };
}

export async function listConversations(ownerId: string): Promise<Conversation[]> {
  const db = await getDb();
  const rows = await db.select<ConversationRow[]>(
    "SELECT * FROM conversations WHERE owner_id = ? ORDER BY updated_at DESC",
    [ownerId]
  );
  return rows.map(rowToConv);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await getDb();
  const rows = await db.select<ConversationRow[]>(
    "SELECT * FROM conversations WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length === 0 ? null : rowToConv(rows[0]);
}

export interface CreateConversationParams {
  ownerId: string;
  title: string;
  processId: string;
  preprocessorModelId?: string;
}

export async function createConversation(
  params: CreateConversationParams
): Promise<Conversation> {
  const db = await getDb();
  const id = crypto.randomUUID();

  let preprocessorModelId = params.preprocessorModelId;
  if (preprocessorModelId === undefined) {
    const settings = await getSettings(params.ownerId);
    if (settings.default_preprocessor_model_id === null
        || settings.default_preprocessor_model_id === "") {
      throw new Error("No default preprocessor model. Set one in Settings → Local LLM.");
    }
    preprocessorModelId = settings.default_preprocessor_model_id;
  }

  await db.execute(
    `INSERT INTO conversations
       (id, owner_id, title, process_id, preprocessor_model_id)
     VALUES (?, ?, ?, ?, ?)`,
    [id, params.ownerId, params.title, params.processId, preprocessorModelId]
  );

  const created = await getConversation(id);
  if (created === null) throw new Error("Failed to create conversation");
  return created;
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
    [title, Math.floor(Date.now() / 1000), id]
  );
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM conversations WHERE id = ?", [id]);
}

export async function bumpConversation(
  id: string,
  messageCountDelta: number
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE conversations
     SET updated_at = ?, message_count = message_count + ?
     WHERE id = ?`,
    [Math.floor(Date.now() / 1000), messageCountDelta, id]
  );
}