import { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, RefreshCw, Stethoscope } from "lucide-react";
import {
  COLORS, PANEL, MONO_LABEL, MONO_LABEL_LOOSE, SPRING,
} from "../../../lib/theme";
import { Owner } from "../../core";
import { gatherDiagnostics, type Diagnostics } from "../gather";
import { formatAsMarkdown } from "../format";

interface DiagnosticsProps {
    owner: Owner
}

export function DiagnosticsPanel({ owner }: DiagnosticsProps): JSX.Element {
  //const owner = useOwner();
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function refresh(): Promise<void> {
    if (owner === null) return;
    setLoading(true);
    const d = await gatherDiagnostics(owner);
    setDiag(d);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => { if (!cancelled) await refresh(); })();
    return () => { cancelled = true; };
  }, [owner?.id]);

  async function copy(): Promise<void> {
    if (diag === null) return;
    await navigator.clipboard.writeText(formatAsMarkdown(diag));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, ...SPRING }}
      style={{ ...PANEL, padding: 0, marginTop: "12px" }}
    >
      <div style={{
        padding: "14px 18px",
        borderBottom: `1px solid ${COLORS.divider}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Stethoscope size={14} style={{ color: COLORS.cyan }} />
          <div>
            <div style={{ color: COLORS.textPrimary, fontSize: "13px", fontWeight: 500 }}>
              Diagnostics
            </div>
            <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
              Paste into GitHub issues when reporting bugs.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            style={iconBtn()}
            aria-label="refresh"
          >
            <RefreshCw size={12} />
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            disabled={diag === null}
            style={{
              ...MONO_LABEL_LOOSE,
              color: copied ? COLORS.green : COLORS.cyan,
              padding: "6px 12px",
              background: copied
                ? `rgba(${COLORS.greenRgb},0.08)`
                : `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid ${copied ? `rgba(${COLORS.greenRgb},0.3)` : `rgba(${COLORS.cyanRgb},0.3)`}`,
              borderRadius: "5px",
              cursor: diag === null ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "5px",
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 18px" }}>
        {loading ? (
          <div style={{ color: COLORS.textFaint, fontSize: "12px" }}>Gathering…</div>
        ) : diag === null ? (
          <div style={{ color: COLORS.textFaint, fontSize: "12px" }}>No data.</div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "6px 16px",
            fontSize: "12px",
          }}>
            <Row label="VERSION" value={diag.app.version} />
            <Row label="OS" value={`${diag.os.platform} ${diag.os.arch} · ${diag.os.version}`} />
            <Row label="OWNER ID" value={diag.owner.id} mono />
            <Row label="ONBOARDING" value={diag.config.onboardingCompleted ? "complete" : "pending"} />
            <Row label="COST CAP" value={`$${(diag.config.monthlyCostCapCents / 100).toFixed(2)}/mo`} />
            <Row label="KEYS" value={
              diag.services.configuredKeys.length > 0
                ? diag.services.configuredKeys.join(", ")
                : "(none)"
            } />
            <Row label="OLLAMA" value={
              diag.services.ollamaReachable
                ? `running, ${diag.services.ollamaModelCount} model(s)`
                : "not running"
            } />
            <Row label="VAULTS" value={`${diag.vault.sourcesCount} source(s)`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <>
      <span style={{ ...MONO_LABEL, color: COLORS.textFaint }}>{label}</span>
      <span style={{
        color: COLORS.textPrimary,
        fontFamily: mono ? "monospace" : undefined,
        wordBreak: "break-all",
      }}>
        {value}
      </span>
    </>
  );
}

function iconBtn(): React.CSSProperties {
  return {
    color: COLORS.textFaint,
    background: "transparent",
    border: `1px solid ${COLORS.divider}`,
    padding: "5px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  };
}