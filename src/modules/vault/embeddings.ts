import { embed, DEFAULT_EMBEDDING_MODEL } from "../router/embed";

//const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
//const EMBEDDING_MODEL = "text-embedding-3-small";
//const EMBEDDING_DIM = 1536;
//const COST_PER_MILLION_CENTS = 2;   // $0.02 per million input tokens

export const VAULT_EMBEDDING_MODEL = DEFAULT_EMBEDDING_MODEL;
// Kept for backwards-compat with chunks.embedding_model column.
export const VAULT_EMBEDDING_DIM = 1536;

// interface OpenAIEmbeddingResponse {
//   data?: Array<{ embedding: number[]; index: number }>;
//   usage?: { prompt_tokens: number; total_tokens: number };
//   error?: { message: string };
// }

export async function embedTexts(
  ownerId: string,
  texts: string[]
): Promise<{ vectors: number[][]; totalTokens: number }> {
  const result = await embed({
    ownerId,
    modelId: DEFAULT_EMBEDDING_MODEL,
    texts,
  });
  return { vectors: result.vectors, totalTokens: result.tokensIn };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0; let magA = 0; let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}