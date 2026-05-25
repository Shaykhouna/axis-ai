import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowRight, AlertTriangle, Check } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  glow,
  softGlow,
} from "../../../lib/theme";
import { getActiveProcessForTaskType } from "../promote";
import type { RunResult, ProcessRow } from "../types";

interface PromotePanelProps {
  ownerId: string;
  taskType: string;
  winner: RunResult;
  onPromote: () => Promise<void>;
  promoted: ProcessRow | null;
  promoting: boolean;
}

export function PromotePanel({
  ownerId,
  taskType,
  winner,
  onPromote,
  promoted,
  promoting,
}: PromotePanelProps): JSX.Element {
  const [currentActive, setCurrentActive] = useState<ProcessRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveProcessForTaskType(ownerId, taskType)
      .then((p) => { if (!cancelled) setCurrentActive(p); })
      .catch(() => { /* swallowed; promote will surface real errors */ });
    return () => { cancelled = true; };
  }, [ownerId, taskType, promoted]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING }}
      style={{
        ...PANEL,
        border: `1px solid rgba(${COLORS.amberRgb},0.25)`,
        boxShadow: softGlow(COLORS.amberRgb, 0.08),
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 18px",
        borderBottom: `1px solid rgba(${COLORS.amberRgb},0.12)`,
      }}>
        <div style={{
          width: "34px", height: "34px",
          background: `rgba(${COLORS.amberRgb},0.08)`,
          border: `1px solid rgba(${COLORS.amberRgb},0.3)`,
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: softGlow(COLORS.amberRgb, 0.12),
        }}>
          <Trophy size={15} color={COLORS.amber} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.amberRgb},0.6)`, marginBottom: "2px" }}>
            PROMOTE
          </div>
          <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
            Freeze winner as Process
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Promotion summary */}
        <div style={{
          display: "flex", alignItems: "center", gap: "14px",
          padding: "10px 12px",
          background: `rgba(${COLORS.amberRgb},0.03)`,
          border: `1px solid rgba(${COLORS.amberRgb},0.12)`,
          borderRadius: "6px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.amberRgb},0.55)`, marginBottom: "3px" }}>
              TASK TYPE
            </div>
            <div style={{ color: COLORS.textPrimary, fontSize: "13px", fontFamily: "monospace" }}>
              {taskType}
            </div>
          </div>
          <ArrowRight size={14} color={COLORS.textFaint} />
          <div style={{ flex: 1 }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.amberRgb},0.55)`, marginBottom: "3px" }}>
              AGENT
            </div>
            <div style={{ color: COLORS.textPrimary, fontSize: "13px" }}>
              {winner.agentName} <span style={{ color: COLORS.textFaint, fontSize: "11px" }}>v{winner.agentVersion}</span>
            </div>
          </div>
        </div>

        {/* Warning if current active exists */}
        <AnimatePresence>
          {currentActive !== null && promoted === null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: "10px 12px",
                background: `rgba(${COLORS.amberRgb},0.05)`,
                border: `1px solid rgba(${COLORS.amberRgb},0.2)`,
                borderRadius: "6px",
                display: "flex", gap: "8px", alignItems: "flex-start",
                color: COLORS.amber,
                fontSize: "11.5px",
              }}
            >
              <AlertTriangle size={12} style={{ marginTop: "2px", flexShrink: 0 }} />
              <span>
                Will retire current active process for <code style={{ color: COLORS.textPrimary }}>{taskType}</code>:{" "}
                <strong>{currentActive.agent_name} v{currentActive.agent_version}</strong>.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promoted confirmation */}
        <AnimatePresence>
          {promoted !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{
                padding: "10px 12px",
                background: `rgba(${COLORS.greenRgb},0.05)`,
                border: `1px solid rgba(${COLORS.greenRgb},0.22)`,
                borderRadius: "6px",
                display: "flex", gap: "8px", alignItems: "center",
                color: COLORS.green,
                fontSize: "12px",
              }}
            >
              <Check size={13} />
              <span>
                Process active. <code style={{ color: COLORS.textPrimary }}>{taskType}</code> now routes to {promoted.agent_name} v{promoted.agent_version}.
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Promote button (hidden once promoted) */}
        {promoted === null && (
          <button
            type="button"
            onClick={() => void onPromote()}
            disabled={promoting}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.amber,
              padding: "8px 14px",
              background: `rgba(${COLORS.amberRgb},0.08)`,
              border: `1px solid rgba(${COLORS.amberRgb},0.35)`,
              borderRadius: "5px",
              cursor: promoting ? "not-allowed" : "pointer",
              opacity: promoting ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: "6px",
              alignSelf: "flex-start",
              boxShadow: promoting ? "none" : glow(COLORS.amberRgb, 0.15),
            }}
          >
            <Trophy size={11} />
            {promoting ? "PROMOTING…" : "PROMOTE TO PROCESS"}
          </button>
        )}
      </div>
    </motion.div>
  );
}