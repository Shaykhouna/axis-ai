import { JSX, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Workflow,
  Play,
  ChevronDown,
  ChevronUp,
  Trash2,
  Archive,
  AlertTriangle,
  FileText,
  Layers,
} from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  glow,
  softGlow,
} from "../../../lib/theme";
import { runProcess } from "../runner";
import type { ProcessRow, ProcessRunResult } from "../types";

function formatCost(cents: number): string {
  if (cents === 0) return "0¢";
  if (cents < 1) return `${cents.toFixed(4)}¢`;
  if (cents < 100) return `${cents.toFixed(2)}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

interface ProcessCardProps {
  ownerId: string;
  process: ProcessRow;
  expanded: boolean;
  onToggle: () => void;
  onRetire?: () => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function ProcessCard({
  ownerId,
  process,
  expanded,
  onToggle,
  onRetire,
  onDelete,
}: ProcessCardProps): JSX.Element {
  const [prompt, setPrompt] = useState<string>("");
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<ProcessRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActive = process.status === "active";
  const accentRgb = isActive ? COLORS.greenRgb : COLORS.textFaint.replace(/[^0-9,]/g, "").slice(0, -1);
  const accent = isActive ? COLORS.green : COLORS.textMuted;

  async function handleRun(): Promise<void> {
    if (prompt.trim().length === 0) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const r = await runProcess(ownerId, process.id, prompt);
      setResult(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
    style={{
      ...PANEL,
      border: `1px solid ${isActive
        ? `rgba(${COLORS.greenRgb},0.18)`
        : COLORS.panelBorder}`,
      opacity: isActive ? 1 : 0.75,
      transition: "border-color 0.18s, opacity 0.18s",
    }}
  >
      {/* Header (always visible) */}
      <div
        onClick={isActive ? onToggle : undefined}
        style={{
          padding: "14px 18px",
          cursor: isActive ? "pointer" : "default",
          display: "flex", alignItems: "center", gap: "12px",
          borderBottom: expanded ? `1px solid ${COLORS.divider}` : "none",
        }}
      >
        <div style={{
          width: "32px", height: "32px",
          background: `rgba(${isActive ? COLORS.greenRgb : COLORS.cyanRgb},0.07)`,
          border: `1px solid rgba(${isActive ? COLORS.greenRgb : COLORS.cyanRgb},0.22)`,
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: isActive ? softGlow(COLORS.greenRgb, 0.1) : "none",
          flexShrink: 0,
        }}>
          {isActive ? (
            <Workflow size={14} color={COLORS.green} />
          ) : (
            <Archive size={14} color={COLORS.textMuted} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{
              color: COLORS.textPrimary,
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "monospace",
              letterSpacing: "0.02em",
            }}>
              {process.task_type}
            </div>
            <span style={{
              ...MONO_LABEL_LOOSE,
              color: accent,
              padding: "1px 7px",
              background: `rgba(${isActive ? COLORS.greenRgb : "100,160,200"},0.07)`,
              border: `1px solid rgba(${isActive ? COLORS.greenRgb : "100,160,200"},0.22)`,
              borderRadius: "3px",
            }}>
              {process.status.toUpperCase()}
            </span>
          </div>
          <div style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.textFaint,
            marginTop: "3px",
            display: "flex", gap: "10px", flexWrap: "wrap",
          }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              {process.agent_name} <Layers size={9} /> v{process.agent_version}
            </span>
            {process.status === "retired" && process.retired_at !== null && (
              <span>retired {new Date(process.retired_at * 1000).toLocaleString()}</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "5px", alignItems: "center", flexShrink: 0 }}>
          {isActive && (
            <ChevronDown
              size={14}
              color={COLORS.textFaint}
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.18s",
              }}
            />
          )}
          {isActive && onRetire !== undefined && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void onRetire(); }}
              style={iconButton(COLORS.textFaint)}
              aria-label="retire process"
            >
              <Archive size={12} />
            </button>
          )}
          {!isActive && onDelete !== undefined && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void onDelete(); }}
              style={iconButton(COLORS.textFaint)}
              aria-label="delete process"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded: run interface */}
      <AnimatePresence>
        {expanded && isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="prompt for this process…"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    void handleRun();
                  }
                }}
                style={{
                  background: COLORS.inputBg,
                  border: `1px solid ${COLORS.inputBorder}`,
                  borderRadius: "6px",
                  padding: "8px 10px",
                  color: COLORS.textPrimary,
                  fontSize: "13px",
                  width: "100%",
                  outline: "none",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <button
                type="button"
                onClick={() => void handleRun()}
                disabled={running || prompt.trim().length === 0}
                style={{
                  ...MONO_LABEL_LOOSE,
                  color: COLORS.green,
                  padding: "8px 14px",
                  background: `rgba(${COLORS.greenRgb},0.08)`,
                  border: `1px solid rgba(${COLORS.greenRgb},0.3)`,
                  borderRadius: "5px",
                  cursor: (running || prompt.trim().length === 0) ? "not-allowed" : "pointer",
                  opacity: (running || prompt.trim().length === 0) ? 0.6 : 1,
                  display: "flex", alignItems: "center", gap: "6px",
                  alignSelf: "flex-start",
                  boxShadow: running ? "none" : glow(COLORS.greenRgb, 0.15),
                }}
              >
                <Play size={11} />
                {running ? "RUNNING…" : "RUN"}
              </button>

              <AnimatePresence>
                {error !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: "10px 12px",
                      background: `rgba(${COLORS.redRgb},0.05)`,
                      border: `1px solid rgba(${COLORS.redRgb},0.18)`,
                      borderRadius: "6px",
                      color: COLORS.red,
                      fontSize: "12px",
                      display: "flex", gap: "8px", alignItems: "flex-start",
                    }}
                  >
                    <AlertTriangle size={13} style={{ marginTop: "1px", flexShrink: 0 }} />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {result !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      background: `rgba(${COLORS.greenRgb},0.04)`,
                      border: `1px solid rgba(${COLORS.greenRgb},0.18)`,
                      borderRadius: "6px",
                      padding: "12px 14px",
                      display: "flex", flexDirection: "column", gap: "10px",
                    }}
                  >
                    <div style={{
                      ...MONO_LABEL,
                      color: `rgba(${COLORS.greenRgb},0.6)`,
                      letterSpacing: "0.22em",
                    }}>
                      OUTPUT
                    </div>
                    <div style={{
                      color: COLORS.textPrimary,
                      fontSize: "13px",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                    }}>
                      {result.output}
                    </div>
                    <div style={{
                      display: "flex", gap: "14px",
                      borderTop: `1px solid rgba(${COLORS.greenRgb},0.1)`,
                      paddingTop: "8px",
                      ...MONO_LABEL_LOOSE,
                      color: COLORS.textFaint,
                      flexWrap: "wrap",
                    }}>
                      <span>{result.tokensIn} in</span>
                      <span>{result.tokensOut} out</span>
                      <span>{formatCost(result.costCents)}</span>
                      <span>{result.latencyMs}ms</span>
                      <span>{result.modelId}</span>
                      {result.vaultChunksUsed > 0 && (
                        <span style={{ color: COLORS.green, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <FileText size={9} /> vault·{result.vaultChunksUsed}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function iconButton(color: string): React.CSSProperties {
  return {
    color,
    background: "transparent",
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: "5px",
    padding: "4px 6px",
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}