import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, RefreshCw, AlertTriangle } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
} from "../../../lib/theme";
import { syncCatalog, listModels } from "../catalog";
import { getSettings, updateSettings } from "../../settings";
import type { ModelInfo } from "../types";

interface CatalogPanelProps {
  ownerId: string;
}

export function CatalogPanel({ ownerId }: CatalogPanelProps): JSX.Element {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    count: number;
    source: "remote" | "fallback";
    fallbackReason: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogUrl, setCatalogUrl] = useState<string>("");

  async function refresh(): Promise<void> {
    try {
      const [m, s] = await Promise.all([listModels(), getSettings(ownerId)]);
      setModels(m);
      setLastSynced(s.model_catalog_last_synced_at);
      setCatalogUrl(s.model_catalog_url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, [ownerId]);

  async function handleSync(): Promise<void> {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncCatalog(ownerId);
      setLastResult(result);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  async function handleUrlSave(): Promise<void> {
    try {
      await updateSettings(ownerId, { model_catalog_url: catalogUrl.trim() });
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING }}
      style={{ ...PANEL }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 18px",
          borderBottom: `1px solid ${COLORS.divider}`,
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            background: `rgba(${COLORS.cyanRgb},0.06)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.18)`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: softGlow(COLORS.cyanRgb, 0.1),
            flexShrink: 0,
          }}
        >
          <Database size={15} color={COLORS.cyan} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...MONO_LABEL,
              color: `rgba(${COLORS.cyanRgb},0.5)`,
              marginBottom: "2px",
            }}
          >
            CATALOG
          </div>
          <div
            style={{
              color: COLORS.textPrimary,
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Model Manifest
          </div>
          <div
            style={{
              color: COLORS.textFaint,
              fontSize: "11px",
              marginTop: "2px",
            }}
          >
            Synced from your hosted JSON manifest.
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.cyan,
            padding: "6px 12px",
            background: `rgba(${COLORS.cyanRgb},0.08)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
            borderRadius: "5px",
            cursor: syncing ? "not-allowed" : "pointer",
            opacity: syncing ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <motion.span
            animate={syncing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              syncing
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { duration: 0 }
            }
            style={{ display: "inline-flex" }}
          >
            <RefreshCw size={11} />
          </motion.span>
          {syncing ? "SYNCING" : "SYNC NOW"}
        </button>
      </div>

      {/* Status row */}
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          gap: "20px",
          borderBottom: `1px solid ${COLORS.divider}`,
        }}
      >
        <div>
          <div
            style={{
              ...MONO_LABEL,
              color: `rgba(${COLORS.cyanRgb},0.45)`,
              marginBottom: "3px",
            }}
          >
            MODELS
          </div>
          <div
            style={{ color: COLORS.cyan, fontSize: "18px", fontWeight: 700 }}
          >
            {models.length}
          </div>
        </div>
        <div>
          <div
            style={{
              ...MONO_LABEL,
              color: `rgba(${COLORS.cyanRgb},0.45)`,
              marginBottom: "3px",
            }}
          >
            LAST SYNC
          </div>
          <div
            style={{
              color: COLORS.textSecondary,
              fontSize: "12px",
              fontFamily: "monospace",
            }}
          >
            {lastSynced === null
              ? "never"
              : new Date(lastSynced * 1000).toLocaleString()}
          </div>
        </div>
        {lastResult !== null && (
          <div>
            <div
              style={{
                ...MONO_LABEL,
                color: `rgba(${COLORS.cyanRgb},0.45)`,
                marginBottom: "3px",
              }}
            >
              SOURCE
            </div>
            <div
              style={{
                color:
                  lastResult.source === "remote" ? COLORS.green : COLORS.amber,
                fontSize: "12px",
                fontFamily: "monospace",
                letterSpacing: "0.1em",
              }}
            >
              {lastResult.source.toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Manifest URL editor */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: `1px solid ${COLORS.divider}`,
          display: "flex",
          flexDirection: "column",
          gap: "5px",
        }}
      >
        <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)` }}>
          MANIFEST URL
        </div>
        <input
          type="text"
          value={catalogUrl}
          onChange={(e) => setCatalogUrl(e.target.value)}
          onBlur={() => void handleUrlSave()}
          placeholder="https://raw.githubusercontent.com/user/repo/branch/catalog.json"
          spellCheck={false}
          style={{
            background: COLORS.inputBg,
            border: `1px solid ${COLORS.inputBorder}`,
            borderRadius: "6px",
            padding: "6px 10px",
            color: COLORS.textPrimary,
            fontSize: "11px",
            fontFamily: "monospace",
            outline: "none",
            width: "100%",
          }}
        />
        <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint }}>
          Must serve raw JSON. `github.com/.../blob/...` URLs return HTML and
          will fall back.
        </div>
      </div>

      {/* Fallback warning */}
      <AnimatePresence>
        {lastResult?.source === "fallback" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "10px 18px",
              background: `rgba(${COLORS.amberRgb},0.04)`,
              borderBottom: `1px solid rgba(${COLORS.amberRgb},0.14)`,
              color: COLORS.amber,
              fontSize: "11px",
              display: "flex",
              gap: "8px",
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              size={12}
              style={{ marginTop: "2px", flexShrink: 0 }}
            />
            <span>
              Remote manifest unreachable — using embedded fallback.{" "}
              <span style={{ opacity: 0.7 }}>
                ({lastResult.fallbackReason})
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {error !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "10px 18px",
              background: `rgba(${COLORS.redRgb},0.05)`,
              borderBottom: `1px solid rgba(${COLORS.redRgb},0.18)`,
              color: COLORS.red,
              fontSize: "11px",
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Model list */}
      <div style={{ padding: "8px 0", maxHeight: "260px", overflowY: "auto" }}>
        {models.length === 0 ? (
          <div
            style={{
              padding: "20px",
              color: COLORS.textFaint,
              fontSize: "12px",
              textAlign: "center",
            }}
          >
            No models cached. Click SYNC NOW.
          </div>
        ) : (
          models.map((m) => (
            <div
              key={m.id}
              style={{
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${COLORS.divider}`,
              }}
            >
              <div>
                <div style={{ color: COLORS.textPrimary, fontSize: "13px" }}>
                  {m.display_name}
                </div>
                <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint }}>
                  {m.id} · {(m.context_window / 1000).toFixed(0)}K ctx
                </div>
              </div>
              <div
                style={{
                  ...MONO_LABEL_LOOSE,
                  color: COLORS.textMuted,
                  textAlign: "right",
                }}
              >
                ${(m.input_cost_per_million / 100).toFixed(2)} / $
                {(m.output_cost_per_million / 100).toFixed(2)}
                <div style={{ fontSize: "8px", opacity: 0.6 }}>
                  per M in / out
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
