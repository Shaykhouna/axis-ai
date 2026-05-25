import { JSX, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  glow,
  softGlow,
} from "../../../lib/theme";
import type { RunResult } from "../types";

function formatCost(cents: number): string {
  if (cents === 0) return "0¢";
  if (cents < 1) return `${cents.toFixed(4)}¢`;
  if (cents < 100) return `${cents.toFixed(2)}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

interface ResultsGridProps {
  results: RunResult[];
  onScore: (runId: string, score: number) => Promise<void>;
  onSetWinner: (runId: string) => Promise<void>;
}

export function ResultsGrid({
  results,
  onScore,
  onSetWinner,
}: ResultsGridProps): JSX.Element {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: results.length <= 2
        ? "1fr 1fr"
        : "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "14px",
    }}>
      {results.map((r, i) => (
        <ResultCard
          key={`${r.agentId}-${i}`}
          result={r}
          onScore={onScore}
          onSetWinner={onSetWinner}
        />
      ))}
    </div>
  );
}

interface ResultCardProps {
  result: RunResult;
  onScore: (runId: string, score: number) => Promise<void>;
  onSetWinner: (runId: string) => Promise<void>;
}

function ResultCard({ result, onScore, onSetWinner }: ResultCardProps): JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(true);
  const r = result;
  const isWinner = r.isWinner === true;
  const canVote = r.status === "success" && r.runId !== undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING }}
      style={{
        ...PANEL,
        border: `1px solid ${isWinner
          ? `rgba(${COLORS.amberRgb},0.45)`
          : COLORS.panelBorder}`,
        boxShadow: isWinner ? glow(COLORS.amberRgb, 0.18) : "none",
      }}
    >
      {/* Card header */}
      <div style={{
        padding: "12px 14px",
        borderBottom: `1px solid ${COLORS.divider}`,
        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ color: COLORS.textPrimary, fontSize: "13px", fontWeight: 600 }}>
              {r.agentName}
            </span>
            <span style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint }}>
              v{r.agentVersion}
            </span>
            {isWinner && (
              <span style={{
                ...MONO_LABEL_LOOSE,
                color: COLORS.amber,
                padding: "2px 7px",
                background: `rgba(${COLORS.amberRgb},0.08)`,
                border: `1px solid rgba(${COLORS.amberRgb},0.3)`,
                borderRadius: "4px",
                display: "inline-flex", alignItems: "center", gap: "3px",
              }}>
                <Trophy size={9} /> WINNER
              </span>
            )}
          </div>
          <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint, marginTop: "3px" }}>
            {r.modelId}
          </div>
        </div>
        <button
          type="button"
          onClick={() => canVote && void onSetWinner(r.runId as string)}
          disabled={!canVote}
          style={{
            color: isWinner ? COLORS.amber : COLORS.textFaint,
            background: isWinner
              ? `rgba(${COLORS.amberRgb},0.1)`
              : "transparent",
            border: `1px solid ${isWinner
              ? `rgba(${COLORS.amberRgb},0.35)`
              : COLORS.inputBorder}`,
            borderRadius: "5px",
            padding: "5px 7px",
            cursor: canVote ? "pointer" : "not-allowed",
            opacity: canVote ? 1 : 0.4,
            display: "flex", alignItems: "center",
          }}
          aria-label="set as winner"
        >
          <Trophy size={13} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px" }}>
        {r.status === "running" && (
          <RunningSkeleton />
        )}
        {r.status === "error" && (
          <div style={{
            color: COLORS.red,
            fontSize: "12px",
            display: "flex", gap: "6px", alignItems: "flex-start",
          }}>
            <AlertTriangle size={12} style={{ marginTop: "1px", flexShrink: 0 }} />
            <span>{r.error}</span>
          </div>
        )}
        {r.status === "success" && (
          <>
            <div style={{
              color: COLORS.textPrimary,
              fontSize: "12.5px",
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
              maxHeight: expanded ? "none" : "180px",
              overflow: "hidden",
              position: "relative",
            }}>
              {r.output}
              {!expanded && (r.output?.length ?? 0) > 400 && (
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: "40px",
                  background: `linear-gradient(transparent, ${COLORS.panelBg})`,
                  pointerEvents: "none",
                }} />
              )}
            </div>
            {(r.output?.length ?? 0) > 400 && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                style={{
                  ...MONO_LABEL_LOOSE,
                  color: COLORS.cyan,
                  background: "transparent",
                  border: "none",
                  padding: "6px 0 0",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                {expanded ? "COLLAPSE" : "EXPAND"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Footer: score + stats */}
      {r.status === "success" && (
        <div style={{
          padding: "10px 14px",
          borderTop: `1px solid ${COLORS.divider}`,
          display: "flex", flexDirection: "column", gap: "8px",
        }}>
          {/* Score row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)` }}>
              SCORE
            </span>
            <div style={{ display: "flex", gap: "3px" }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const active = (r.score ?? 0) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => canVote && void onScore(r.runId as string, n)}
                    disabled={!canVote}
                    style={{
                      width: "22px", height: "22px",
                      borderRadius: "4px",
                      background: active
                        ? `rgba(${COLORS.cyanRgb},0.18)`
                        : `rgba(${COLORS.cyanRgb},0.04)`,
                      border: `1px solid ${active
                        ? `rgba(${COLORS.cyanRgb},0.5)`
                        : COLORS.inputBorder}`,
                      color: active ? COLORS.cyan : COLORS.textFaint,
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: canVote ? "pointer" : "not-allowed",
                      fontFamily: "monospace",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
          {/* Stats row */}
          <div style={{
            display: "flex", gap: "12px",
            ...MONO_LABEL_LOOSE,
            color: COLORS.textFaint,
            flexWrap: "wrap",
          }}>
            <span>{r.tokensIn} in</span>
            <span>{r.tokensOut} out</span>
            <span>{formatCost(r.costCents ?? 0)}</span>
            <span>{r.latencyMs}ms</span>
            {(r.vaultChunksUsed ?? 0) > 0 && (
              <span style={{ color: COLORS.green }}>vault·{r.vaultChunksUsed}</span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RunningSkeleton(): JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {[1, 0.85, 0.7].map((opacity, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18 }}
          style={{
            height: "10px",
            width: `${opacity * 100}%`,
            background: `rgba(${COLORS.cyanRgb},0.08)`,
            borderRadius: "3px",
          }}
        />
      ))}
    </div>
  );
}