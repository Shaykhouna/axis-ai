import { getDb } from "../core";
import { cosineSimilarity, embedTexts } from "./embeddings";
import type { /*ChunkInput,*/ VaultChunk, SearchResult } from "./types";

function generateUuid(): string {
  return crypto.randomUUID();
}

export interface InsertChunkParams {
  ownerId: string;
  sourceId: string;
  sourcePath: string;
  chunkIndex: number;
  heading: string | null;
  content: string;
  embedding: number[];
  embeddingModel: string;
  tokens: number;
}

export async function insertChunk(p: InsertChunkParams): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO vault_chunks
       (id, owner_id, source_id, source_path, chunk_index,
        heading, content, embedding, embedding_model, tokens)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      generateUuid(),
      p.ownerId,
      p.sourceId,
      p.sourcePath,
      p.chunkIndex,
      p.heading,
      p.content,
      JSON.stringify(p.embedding),
      p.embeddingModel,
      p.tokens,
    ]
  );
}

export async function deleteChunksForSource(sourceId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM vault_chunks WHERE source_id = ?", [sourceId]);
}

export async function countChunks(ownerId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM vault_chunks WHERE owner_id = ?",
    [ownerId]
  );
  return rows[0]?.n ?? 0;
}

// Retrieves the top-k most similar chunks for a query string.
// Brute-force cosine over all chunks for this owner.
// For < 10k chunks this is ~50ms on modern hardware.
export async function searchSimilar(
  ownerId: string,
  query: string,
  k: number = 5
): Promise<SearchResult[]> {
  const { vectors } = await embedTexts(ownerId, [query]);
  if (vectors.length === 0) return [];
  const queryVec = vectors[0];

  const db = await getDb();
  const rows = await db.select<VaultChunk[]>(
    "SELECT * FROM vault_chunks WHERE owner_id = ?",
    [ownerId]
  );

  const scored = rows.map((chunk) => {
    const embedding = JSON.parse(chunk.embedding) as number[];
    const score = cosineSimilarity(queryVec, embedding);
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}