import { JSX, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, FileText, AlertTriangle } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
  glow,
} from "../../../lib/theme";
import { runAgent } from "../runner";
import type { Agent, AgentRunResult } from "../types";

function formatCost(cents: number): string {
  if (cents === 0) return "0¢";
  if (cents < 1) return `${cents.toFixed(4)}¢`;
  if (cents < 100) return `${cents.toFixed(2)}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}

interface AgentRunPanelProps {
  ownerId: string;
  agent: Agent;
}

export function AgentRunPanel({ ownerId, agent }: AgentRunPanelProps): JSX.Element {
  const [prompt, setPrompt] = useState<string>("");
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<AgentRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun(): Promise<void> {
    if (prompt.trim().length === 0) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const r = await runAgent(ownerId, agent.id, prompt);
      setResult(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING }}
      style={{ ...PANEL }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 18px",
        borderBottom: `1px solid ${COLORS.divider}`,
      }}>
        <div style={{
          width: "34px", height: "34px",
          background: `rgba(${COLORS.greenRgb},0.07)`,
          border: `1px solid rgba(${COLORS.greenRgb},0.22)`,
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: softGlow(COLORS.greenRgb, 0.1),
        }}>
          <Zap size={15} color={COLORS.green} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.greenRgb},0.55)`, marginBottom: "2px" }}>
            EXECUTE
          </div>
          <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
            Run {agent.name} v{agent.version}
          </div>
          <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
            {agent.model_id}
            {agent.use_vault_context === 1 && ` · vault top-${agent.vault_top_k}`}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Task for this agent…"
          rows={4}
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

              {/* Vault context used */}
              {result.vaultContextUsed > 0 && (
                <details style={{
                  background: `rgba(${COLORS.cyanRgb},0.04)`,
                  border: `1px solid ${COLORS.divider}`,
                  borderRadius: "5px",
                  padding: "8px 10px",
                }}>
                  <summary style={{
                    ...MONO_LABEL_LOOSE,
                    color: COLORS.cyan,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: "6px",
                  }}>
                    <FileText size={11} />
                    {result.vaultContextUsed} VAULT CHUNK(S) INJECTED
                  </summary>
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {result.vaultChunks.map((c, i) => (
                      <div key={c.chunk.id} style={{ fontSize: "11px", color: COLORS.textSecondary }}>
                        <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint, marginBottom: "2px" }}>
                          [{i + 1}] {c.chunk.source_path.split("/").pop()} · {(c.score * 100).toFixed(1)}%
                        </div>
                        <div style={{
                          maxHeight: "80px", overflow: "hidden",
                          color: COLORS.textMuted,
                        }}>
                          {c.chunk.content.slice(0, 200)}{c.chunk.content.length > 200 && "…"}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div style={{
                display: "flex", gap: "16px",
                borderTop: `1px solid rgba(${COLORS.greenRgb},0.1)`,
                paddingTop: "8px",
                ...MONO_LABEL_LOOSE,
                color: COLORS.textFaint,
              }}>
                <span>{result.tokensIn} in</span>
                <span>{result.tokensOut} out</span>
                <span>{formatCost(result.costCents)}</span>
                <span>{result.latencyMs}ms</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}