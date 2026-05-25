export interface VaultSource {
  id: string;
  owner_id: string;
  source_type: "folder" | "obsidian";
  path: string;
  display_name: string;
  last_synced_at: number | null;
  file_count: number;
  chunk_count: number;
  created_at: number;
}

export interface VaultChunk {
  id: string;
  owner_id: string;
  source_id: string;
  source_path: string;
  chunk_index: number;
  heading: string | null;
  content: string;
  embedding: string;            // JSON-encoded float[]
  embedding_model: string;
  tokens: number;
  created_at: number;
}

export interface ChunkInput {
  heading: string | null;
  content: string;
}

export interface SearchResult {
  chunk: VaultChunk;
  score: number;                // cosine similarity, -1 to 1
}

export interface SyncProgress {
  totalFiles: number;
  filesProcessed: number;
  chunksCreated: number;
  currentFile: string | null;
  done: boolean;
  error: string | null;
}