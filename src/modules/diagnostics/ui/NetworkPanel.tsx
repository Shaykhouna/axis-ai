import { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Globe, Shield, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import {
  COLORS, PANEL, MONO_LABEL, /*MONO_LABEL_LOOSE,*/ SPRING,
} from "../../../lib/theme";
import { Owner } from "../../core";
import {
  buildNetworkSummary, type NetworkEntry, type NetworkUsageStats,
} from "../network";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "required": { label: "REQUIRED", color: COLORS.amber },
  "user-configured": { label: "USER-CONFIGURED", color: COLORS.cyan },
  "auto-update": { label: "AUTO-UPDATE", color: COLORS.cyan },
  "local": { label: "LOCAL (LOOPBACK)", color: COLORS.green },
};

interface SummaryState {
  enabled: Set<string>;
  manifest: NetworkEntry[];
  usage: Map<string, NetworkUsageStats>;
  totalUnique: number;
}

interface NetworkPanelProps {
    owner: Owner;
}

export function NetworkPanel({ owner }: NetworkPanelProps): JSX.Element {
  // const owner = useOwner();
  const [state, setState] = useState<SummaryState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (owner === null) return;
      const s = await buildNetworkSummary(owner.id);
      if (!cancelled) {
        setState({
          enabled: s.enabledServices,
          manifest: s.manifestEntries,
          usage: s.usage,
          totalUnique: s.totalUniqueDomains,
        });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [owner?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.42, ...SPRING }}
      style={{ ...PANEL, padding: 0, marginTop: "12px" }}
    >
      <div style={{
        padding: "14px 18px",
        borderBottom: `1px solid ${COLORS.divider}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Globe size={14} style={{ color: COLORS.cyan }} />
          <div>
            <div style={{ color: COLORS.textPrimary, fontSize: "13px", fontWeight: 500 }}>
              Network audit
            </div>
            <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
              Every domain Axis-AI may contact, and why.
            </div>
          </div>
        </div>
      </div>

      {/* Privacy declarations */}
      <div style={{
        padding: "12px 18px",
        borderBottom: `1px solid ${COLORS.divider}`,
        background: `rgba(${COLORS.greenRgb},0.04)`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          color: COLORS.green,
          fontSize: "12px",
          marginBottom: "4px",
        }}>
          <Shield size={12} />
          <strong>No telemetry. No analytics. No tracking.</strong>
        </div>
        <div style={{ color: COLORS.textSecondary, fontSize: "11px", lineHeight: 1.6 }}>
          Axis-AI does not collect usage data, send anonymous statistics, or contact any
          analytics services. The only network calls are the ones below — all triggered
          by your direct actions, and all visible in the call log.
        </div>
      </div>

      {/* The list */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ padding: "16px 18px", color: COLORS.textFaint, fontSize: "12px" }}>
            Building network summary…
          </div>
        ) : state === null ? null : (
          state.manifest.map((entry) => {
            const isEnabled = state.enabled.has(entry.id);
            const usage = state.usage.get(entry.id);
            const cat = CATEGORY_LABELS[entry.category];
            return (
              <div
                key={entry.id}
                style={{
                  padding: "14px 18px",
                  borderTop: `1px solid ${COLORS.divider}`,
                  opacity: isEnabled ? 1 : 0.55,
                }}
              >
                <div style={{
                  display: "flex", alignItems: "flex-start",
                  justifyContent: "space-between", gap: "12px",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      marginBottom: "4px",
                    }}>
                      {isEnabled
                        ? <CheckCircle2 size={12} style={{ color: COLORS.green }} />
                        : <Circle size={12} style={{ color: COLORS.textFaint }} />}
                      <span style={{
                        color: COLORS.textPrimary,
                        fontSize: "13px",
                        fontWeight: 500,
                        fontFamily: "monospace",
                      }}>
                        {entry.domain}
                      </span>
                      <span style={{
                        ...MONO_LABEL,
                        color: cat.color,
                        padding: "2px 6px",
                        background: `rgba(${
                          entry.category === "local" ? COLORS.greenRgb
                          : entry.category === "required" ? COLORS.amberRgb
                          : COLORS.cyanRgb
                        }, 0.08)`,
                        border: `1px solid rgba(${
                          entry.category === "local" ? COLORS.greenRgb
                          : entry.category === "required" ? COLORS.amberRgb
                          : COLORS.cyanRgb
                        }, 0.22)`,
                        borderRadius: "3px",
                        letterSpacing: "0.1em",
                      }}>
                        {cat.label}
                      </span>
                    </div>
                    <div style={{
                      color: COLORS.textSecondary,
                      fontSize: "12px",
                      marginBottom: "4px",
                      lineHeight: 1.55,
                    }}>
                      {entry.purpose}
                    </div>
                    <div style={{
                      color: COLORS.textFaint,
                      fontSize: "11px",
                      lineHeight: 1.55,
                    }}>
                      <strong>Triggered by:</strong> {entry.triggeredBy}
                    </div>
                    {entry.canDisable && entry.disableHow !== null && (
                      <div style={{
                        color: COLORS.textFaint,
                        fontSize: "11px",
                        marginTop: "3px",
                        lineHeight: 1.55,
                      }}>
                        <strong>To disable:</strong> {entry.disableHow}
                      </div>
                    )}
                  </div>
                  {usage !== undefined && (
                    <div style={{
                      ...MONO_LABEL,
                      color: COLORS.textFaint,
                      textAlign: "right",
                      flexShrink: 0,
                    }}>
                      <div>{usage.totalCalls} TOTAL</div>
                      <div style={{ marginTop: "2px" }}>{usage.recentCallsLast24h} LAST 24H</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 18px",
        borderTop: `1px solid ${COLORS.divider}`,
        background: "rgba(0,0,0,0.15)",
        color: COLORS.textFaint,
        fontSize: "11px",
        display: "flex", alignItems: "center", gap: "6px",
      }}>
        <AlertCircle size={11} />
        Per-call audit log: every API call is recorded in <code>router_calls</code> (queryable via DB).
      </div>
    </motion.div>
  );
}