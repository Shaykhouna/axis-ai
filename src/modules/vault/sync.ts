import { readTextFile, readDir } from "@tauri-apps/plugin-fs";
import { chunkMarkdown } from "./chunker";
import { embedTexts, VAULT_EMBEDDING_MODEL } from "./embeddings";
import { insertChunk, deleteChunksForSource } from "./chunks";
import { updateSourceStats } from "./sources";
import type { VaultSource, SyncProgress } from "./types";

interface FileEntry {
  path: string;
  name: string;
}

// Recursively collect all .md files under a folder.
// Tauri's readDir is non-recursive in v2; we walk manually.
async function collectMarkdownFiles(rootPath: string): Promise<FileEntry[]> {
  const out: FileEntry[] = [];

  async function walk(dirPath: string): Promise<void> {
    const entries = await readDir(dirPath);
    for (const entry of entries) {
      const fullPath = `${dirPath}/${entry.name}`;
      if (entry.isDirectory) {
        // Skip Obsidian's internal folder and dot-prefixed dirs
        if (entry.name.startsWith(".")) continue;
        await walk(fullPath);
      } else if (entry.isFile && entry.name.endsWith(".md")) {
        out.push({ path: fullPath, name: entry.name });
      }
    }
  }

  await walk(rootPath);
  return out;
}

export interface SyncCallbacks {
  onProgress?: (progress: SyncProgress) => void;
}

// Full re-sync: deletes all chunks for the source, then re-chunks
// and re-embeds every .md file. v1 doesn't do incremental sync.
export async function syncSource(
  source: VaultSource,
  callbacks: SyncCallbacks = {}
): Promise<{ fileCount: number; chunkCount: number; totalTokens: number }> {
  const { onProgress } = callbacks;

  const files = await collectMarkdownFiles(source.path);
  let chunksCreated = 0;
  let totalTokens = 0;

  onProgress?.({
    totalFiles: files.length,
    filesProcessed: 0,
    chunksCreated: 0,
    currentFile: null,
    done: false,
    error: null,
  });

  await deleteChunksForSource(source.id);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({
      totalFiles: files.length,
      filesProcessed: i,
      chunksCreated,
      currentFile: file.name,
      done: false,
      error: null,
    });

    try {
      const content = await readTextFile(file.path);
      const chunks = chunkMarkdown(content);
      if (chunks.length === 0) continue;

      const texts = chunks.map((c) =>
        c.heading !== null ? `# ${c.heading}\n\n${c.content}` : c.content
      );
      const { vectors, totalTokens: batchTokens } = await embedTexts(source.owner_id, texts);
      totalTokens += batchTokens;

      for (let j = 0; j < chunks.length; j++) {
        await insertChunk({
          ownerId: source.owner_id,
          sourceId: source.id,
          sourcePath: file.path,
          chunkIndex: j,
          heading: chunks[j].heading,
          content: chunks[j].content,
          embedding: vectors[j],
          embeddingModel: VAULT_EMBEDDING_MODEL,
          tokens: 0,
        });
        chunksCreated += 1;
      }
    } catch (err) {
      // Skip unreadable / broken file but keep going
      console.error(`Vault sync failed for ${file.path}:`, err);
    }
  }

  await updateSourceStats(source.id, files.length, chunksCreated);

  onProgress?.({
    totalFiles: files.length,
    filesProcessed: files.length,
    chunksCreated,
    currentFile: null,
    done: true,
    error: null,
  });

  return { fileCount: files.length, chunkCount: chunksCreated, totalTokens };
}