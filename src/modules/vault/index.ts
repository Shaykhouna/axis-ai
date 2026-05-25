// Public API of the Vault module.

export { listSources, createSource, deleteSource } from "./sources";
export { syncSource } from "./sync";
export { searchSimilar, countChunks } from "./chunks";
export { VAULT_EMBEDDING_MODEL, VAULT_EMBEDDING_DIM } from "./embeddings";
export { VaultPage } from "./ui/VaultPage";
export { ensureDefaultVault } from "./defaults";
export type { DefaultVaultResult } from "./defaults";
export type {
  VaultSource,
  VaultChunk,
  SearchResult,
  SyncProgress,
} from "./types";