import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Zap, AlertTriangle } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
  glow,
} from "../../../lib/theme";
import { listModels } from "../catalog";
import { chat } from "../chat";
import { getBudgetStatus } from "../billing";
import type { ModelInfo, BudgetStatus } from "../types";
import { 
    getConfiguredServices,
  isModelAvailable,
  missingKeysFor
} from "../../router"

interface TestCallPanelProps {
  ownerId: string;
}

interface TestResult {
  output: string;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  latencyMs: number;
}

export function TestCallPanel({ ownerId }: TestCallPanelProps): JSX.Element {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("Reply with exactly one word: ping");
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [/*availabilityMap*/, setAvailabilityMap] = useState<Map<string, { available: boolean; missing: string[] }>>(new Map());

  async function refresh(): Promise<void> {
    let cancelled = false;
    try {
      const [m, b, s] = await Promise.all([listModels(), getBudgetStatus(ownerId), getConfiguredServices(ownerId)]);
      setModels(m);
      setBudget(b);
      if (modelId === "" && m.length > 0) {
        setModelId(m[0].id);
      }const map = new Map<string, { available: boolean; missing: string[] }>();
      for (const model of m) {
        const available = await isModelAvailable(model, s);
        const missing = available ? [] : await missingKeysFor(model, s);
        map.set(model.id, { available, missing });
      }
      if (!cancelled) setAvailabilityMap(map);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
  }, [ownerId]);

  async function handleRun(): Promise<void> {
    if (modelId === "" || prompt.trim().length === 0) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const r = await chat({
        ownerId,
        modelId,
        messages: [{ role: "user", content: prompt }],
        maxTokens: 128,
      });
      setResult({
        output: r.output,
        tokensIn: r.tokensIn,
        tokensOut: r.tokensOut,
        costCents: r.costCents,
        latencyMs: r.latencyMs,
      });
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  function inputStyle(): React.CSSProperties {
  return {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: "6px",
    padding: "6px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };
}

  function formatCost(cents: number): string {
    if (cents === 0) return "0¢";
    if (cents < 1) return `${cents.toFixed(4)}¢`;
    if (cents < 100) return `${cents.toFixed(2)}¢`;
    return `$${(cents / 100).toFixed(2)}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING }}
      style={{ ...PANEL }}
    >
      {/* Header */}
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
          <Zap size={15} color={COLORS.cyan} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.5)`, marginBottom: "2px" }}>
            DIAGNOSTIC
          </div>
          <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
            Test Call
          </div>
          <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
            One-shot call to verify the router end-to-end.
          </div>
        </div>
        {budget !== null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)`, marginBottom: "2px" }}>
              MTD
            </div>
            <div style={{
              color: budget.exceeded ? COLORS.red : COLORS.cyan,
              fontSize: "13px",
              fontFamily: "monospace",
              fontWeight: 600,
            }}>
              {/*${(budget.mtd_cents / 100).toFixed(3)} / ${(budget.cap_cents / 100).toFixed(0)}*/}
              {formatCost(budget.mtd_cents)} / ${(budget.cap_cents / 100).toFixed(0)}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Model picker */}
        <div>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)`, marginBottom: "5px" }}>
            MODEL
          </div>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            style={{
              ...inputStyle(),
              paddingRight: "28px",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300d4ff' opacity='.45'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              background: COLORS.inputBg,
              border: `1px solid ${COLORS.inputBorder}`,
              borderRadius: "6px",
              padding: "6px 10px",
              color: COLORS.textPrimary,
              fontSize: "13px",
              width: "100%",
              outline: "none",
              
            }}
          >
            {models.length === 0 && <option value="">— no models cached, sync catalog first —</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name} ({m.id})
              </option>
            ))}
          </select>
        </div>

        {/* Prompt */}
        <div>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)`, marginBottom: "5px" }}>
            PROMPT
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
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
        </div>

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={running || modelId === ""}
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.cyan,
            padding: "8px 14px",
            background: `rgba(${COLORS.cyanRgb},0.08)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
            borderRadius: "5px",
            cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.6 : 1,
            display: "flex", alignItems: "center", gap: "6px",
            justifyContent: "center",
            alignSelf: "flex-start",
            boxShadow: running ? "none" : glow(COLORS.cyanRgb, 0.15),
          }}
        >
          <Play size={11} />
          {running ? "RUNNING…" : "RUN"}
        </button>

        {/* Error */}
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

        {/* Result */}
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
              <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.greenRgb},0.6)`, letterSpacing: "0.22em" }}>
                OUTPUT
              </div>
              <div style={{
                color: COLORS.textPrimary,
                fontSize: "13px",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}>
                {result.output}
              </div>
              <div style={{
                display: "flex", gap: "16px",
                borderTop: `1px solid rgba(${COLORS.greenRgb},0.1)`,
                paddingTop: "8px",
                ...MONO_LABEL_LOOSE,
                color: COLORS.textFaint,
              }}>
                <span>{result.tokensIn} in</span>
                <span>{result.tokensOut} out</span>
                {/*<span>${result.costCents.toFixed(4)}</span>*/}
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