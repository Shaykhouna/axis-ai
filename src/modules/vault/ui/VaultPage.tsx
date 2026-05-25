import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import {
  FolderOpen,
  Trash2,
  RefreshCw,
  Search,
  AlertTriangle,
  FileText,
  Database as DatabaseIcon,
} from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
  glow,
} from "../../../lib/theme";
import {
  listSources,
  createSource,
  deleteSource,
  syncSource,
  searchSimilar,
  countChunks,
} from "../index";
import type { Owner } from "../../core";
import type { VaultSource, SearchResult, SyncProgress } from "../types";

interface VaultPageProps {
  owner: Owner;
}

export function VaultPage({ owner }: VaultPageProps): JSX.Element {
  const [sources, setSources] = useState<VaultSource[]>([]);
  const [totalChunks, setTotalChunks] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const [query, setQuery] = useState<string>("");
  const [searching, setSearching] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  async function refresh(): Promise<void> {
    try {
      const [s, n] = await Promise.all([listSources(owner.id), countChunks(owner.id)]);
      setSources(s);
      setTotalChunks(n);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, [owner.id]);

  async function handleAddSource(): Promise<void> {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected === null || typeof selected !== "string") return;
      const name = selected.split("/").filter(Boolean).pop() ?? "vault";
      await createSource(owner.id, selected, name);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSync(source: VaultSource): Promise<void> {
    setSyncingId(source.id);
    setProgress(null);
    try {
      await syncSource(source, { onProgress: (p) => setProgress(p) });
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncingId(null);
    }
  }

  async function handleDelete(sourceId: string): Promise<void> {
    try {
      await deleteSource(owner.id, sourceId);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSearch(): Promise<void> {
    if (query.trim().length === 0) return;
    setSearching(true);
    setResults([]);
    try {
      const r = await searchSimilar(owner.id, query.trim(), 5);
      setResults(r);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <div style={{ maxWidth: "820px", display: "flex", flexDirection: "column", gap: "22px" }}>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "5px" }}>
          <div style={{
            width: "3px", height: "30px",
            background: "linear-gradient(180deg, #00d4ff, rgba(0,212,255,0.1))",
            borderRadius: "2px",
            boxShadow: "0 0 10px rgba(0,212,255,0.55)",
          }} />
          <h1 style={{ color: COLORS.textPrimary, fontSize: "22px", fontWeight: 600, letterSpacing: "0.05em" }}>
            Vault
          </h1>
        </div>
        <p style={{ ...MONO_LABEL_LOOSE, color: COLORS.textMuted, marginLeft: "15px" }}>
          KNOWLEDGE SUBSTRATE · {totalChunks} CHUNKS INDEXED
        </p>
      </motion.div>

      {/* Global error */}
      <AnimatePresence>
        {error !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "12px 16px",
              background: `rgba(${COLORS.redRgb},0.05)`,
              border: `1px solid rgba(${COLORS.redRgb},0.18)`,
              borderRadius: "8px",
              display: "flex", gap: "10px", alignItems: "center",
              color: COLORS.red,
              fontSize: "12px",
            }}
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sources panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.08 }}
        style={{ ...PANEL }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 18px",
          borderBottom: `1px solid ${COLORS.divider}`,
        }}>
          <div style={{
            width: "34px", height: "34px",
            background: `rgba(${COLORS.cyanRgb},0.06)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.18)`,
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: softGlow(COLORS.cyanRgb, 0.1),
          }}>
            <DatabaseIcon size={15} color={COLORS.cyan} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.5)`, marginBottom: "2px" }}>
              SOURCES
            </div>
            <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
              Knowledge folders
            </div>
            <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
              Markdown files only. Embedded via OpenAI text-embedding-3-small.
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleAddSource()}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              padding: "6px 12px",
              background: `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <FolderOpen size={11} /> ADD FOLDER
          </button>
        </div>

        {sources.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: COLORS.textFaint, fontSize: "12px" }}>
            No folders linked. Click ADD FOLDER to pick an Obsidian vault or any markdown directory.
          </div>
        ) : (
          sources.map((source) => {
            const isSyncing = syncingId === source.id;
            return (
              <div key={source.id} style={{
                padding: "14px 18px",
                borderTop: `1px solid ${COLORS.divider}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: COLORS.textPrimary, fontSize: "13px", fontWeight: 500 }}>
                      {source.display_name}
                    </div>
                    <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint, wordBreak: "break-all", marginTop: "2px" }}>
                      {source.path}
                    </div>
                    <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textMuted, marginTop: "6px", display: "flex", gap: "14px" }}>
                      <span>{source.file_count} files</span>
                      <span>{source.chunk_count} chunks</span>
                      <span>
                        {source.last_synced_at === null
                          ? "never synced"
                          : `synced ${new Date(source.last_synced_at * 1000).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => void handleSync(source)}
                      disabled={isSyncing}
                      style={{
                        ...MONO_LABEL_LOOSE,
                        color: COLORS.cyan,
                        padding: "5px 10px",
                        background: `rgba(${COLORS.cyanRgb},0.06)`,
                        border: `1px solid rgba(${COLORS.cyanRgb},0.22)`,
                        borderRadius: "5px",
                        cursor: isSyncing ? "not-allowed" : "pointer",
                        opacity: isSyncing ? 0.6 : 1,
                        display: "flex", alignItems: "center", gap: "5px",
                      }}
                    >
                      <motion.span
                        animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
                        transition={isSyncing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                        style={{ display: "inline-flex" }}
                      >
                        <RefreshCw size={10} />
                      </motion.span>
                      {isSyncing ? "SYNCING" : "SYNC"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(source.id)}
                      style={{
                        color: COLORS.textFaint,
                        background: "transparent",
                        border: `1px solid ${COLORS.inputBorder}`,
                        borderRadius: "5px",
                        padding: "4px 6px",
                        cursor: "pointer",
                      }}
                      aria-label={`remove ${source.display_name}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Sync progress */}
                <AnimatePresence>
                  {isSyncing && progress !== null && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginTop: "10px" }}
                    >
                      <div style={{
                        ...MONO_LABEL_LOOSE,
                        color: COLORS.cyan,
                        marginBottom: "4px",
                      }}>
                        {progress.filesProcessed} / {progress.totalFiles} files · {progress.chunksCreated} chunks
                        {progress.currentFile !== null && ` · ${progress.currentFile}`}
                      </div>
                      <div style={{
                        height: "2px",
                        background: `rgba(${COLORS.cyanRgb},0.1)`,
                        borderRadius: "1px",
                        overflow: "hidden",
                      }}>
                        <motion.div
                          animate={{
                            width: progress.totalFiles === 0
                              ? "0%"
                              : `${(progress.filesProcessed / progress.totalFiles) * 100}%`,
                          }}
                          style={{
                            height: "100%",
                            background: COLORS.cyan,
                            boxShadow: glow(COLORS.cyanRgb, 0.4),
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </motion.div>

      {/* Search panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.16 }}
        style={{ ...PANEL }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 18px",
          borderBottom: `1px solid ${COLORS.divider}`,
        }}>
          <div style={{
            width: "34px", height: "34px",
            background: `rgba(${COLORS.cyanRgb},0.06)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.18)`,
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: softGlow(COLORS.cyanRgb, 0.1),
          }}>
            <Search size={15} color={COLORS.cyan} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.5)`, marginBottom: "2px" }}>
              RETRIEVAL
            </div>
            <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
              Semantic search
            </div>
            <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
              Top-5 cosine matches. Used by Lab and Agents later.
            </div>
          </div>
        </div>

        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSearch(); }}
              placeholder="ask your vault…"
              style={{
                background: COLORS.inputBg,
                border: `1px solid ${COLORS.inputBorder}`,
                borderRadius: "6px",
                padding: "8px 10px",
                color: COLORS.textPrimary,
                fontSize: "13px",
                outline: "none",
                flex: 1,
              }}
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={searching || query.trim().length === 0}
              style={{
                ...MONO_LABEL_LOOSE,
                color: COLORS.cyan,
                padding: "8px 14px",
                background: `rgba(${COLORS.cyanRgb},0.08)`,
                border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
                borderRadius: "5px",
                cursor: (searching || query.trim().length === 0) ? "not-allowed" : "pointer",
                opacity: (searching || query.trim().length === 0) ? 0.6 : 1,
              }}
            >
              {searching ? "SEARCHING" : "SEARCH"}
            </button>
          </div>

          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {results.map((r, idx) => (
                <motion.div
                  key={r.chunk.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{
                    background: `rgba(${COLORS.cyanRgb},0.03)`,
                    border: `1px solid ${COLORS.divider}`,
                    borderRadius: "6px",
                    padding: "10px 12px",
                  }}
                >
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "6px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: COLORS.textMuted, fontSize: "11px", minWidth: 0 }}>
                      <FileText size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.chunk.source_path.split("/").pop()}
                        {r.chunk.heading !== null && ` · ${r.chunk.heading}`}
                      </span>
                    </div>
                    <span style={{
                      ...MONO_LABEL_LOOSE,
                      color: r.score > 0.5 ? COLORS.green : COLORS.amber,
                      flexShrink: 0,
                      marginLeft: "8px",
                    }}>
                      {(r.score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{
                    color: COLORS.textSecondary,
                    fontSize: "12px",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    maxHeight: "120px",
                    overflow: "hidden",
                  }}>
                    {r.chunk.content}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}