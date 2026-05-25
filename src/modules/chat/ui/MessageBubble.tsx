import { JSX, useState } from "react";
import { User, Cpu, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { COLORS, MONO_LABEL } from "../../../lib/theme";
import type { Message } from "../types";

interface Turn {
  user: Message | null;
  refined: Message | null;
  assistant: Message | null;
}

interface Props {
  turn: Turn;
}

export function MessageBubble({ turn }: Props): JSX.Element {
  const [refinedOpen, setRefinedOpen] = useState(false);

  const totalCostCents =
    (turn.refined?.cost_cents ?? 0) + (turn.assistant?.cost_cents ?? 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* USER */}
      {turn.user !== null && (
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <Avatar color="cyan" icon={<User size={13} style={{ color: COLORS.cyan }} />} />
          <div style={{
            flex: 1,
            color: COLORS.textPrimary,
            fontSize: "13px",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            paddingTop: "4px",
          }}>
            {turn.user.content}
          </div>
        </div>
      )}

      {/* REFINED (collapsed by default) */}
      {turn.refined !== null && (
        <div style={{
          marginLeft: "36px",
          background: "rgba(255,255,255,0.02)",
          border: `1px solid ${COLORS.divider}`,
          borderRadius: "5px",
          overflow: "hidden",
        }}>
          <button
            type="button"
            onClick={() => setRefinedOpen(!refinedOpen)}
            style={{
              ...MONO_LABEL,
              color: COLORS.textFaint,
              background: "transparent",
              border: "none",
              padding: "6px 10px",
              width: "100%",
              textAlign: "left",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {refinedOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            <Sparkles size={10} style={{ color: COLORS.cyan }} />
            REFINED · {turn.refined.latency_ms}MS
          </button>
          {refinedOpen && (
            <div style={{
              padding: "10px 14px 12px 14px",
              fontSize: "12px",
              color: COLORS.textSecondary,
              whiteSpace: "pre-wrap",
              borderTop: `1px solid ${COLORS.divider}`,
              fontStyle: "italic",
              lineHeight: 1.65,
            }}>
              {turn.refined.content}
            </div>
          )}
        </div>
      )}

      {/* ASSISTANT */}
      {turn.assistant !== null && (
        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <Avatar color="green" icon={<Cpu size={13} style={{ color: COLORS.green }} />} />
          <div style={{ flex: 1, paddingTop: "4px" }}>
            <div style={{
              color: COLORS.textPrimary,
              fontSize: "13px",
              lineHeight: 1.75,
              whiteSpace: "pre-wrap",
            }}>
              {turn.assistant.content}
            </div>
            <div style={{
              ...MONO_LABEL,
              color: COLORS.textFaint,
              marginTop: "8px",
              display: "flex",
              gap: "14px",
            }}>
              <span>LOCAL {turn.refined?.latency_ms ?? 0}MS</span>
              <span>CLOUD {turn.assistant.latency_ms}MS</span>
              <span>COST {formatCost(totalCostCents)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AvatarProps {
  color: "cyan" | "green";
  icon: JSX.Element;
}

function Avatar({ color, icon }: AvatarProps): JSX.Element {
  const rgb = color === "cyan" ? COLORS.cyanRgb : COLORS.greenRgb;
  return (
    <div style={{
      width: "26px",
      height: "26px",
      borderRadius: "5px",
      background: `rgba(${rgb},0.08)`,
      border: `1px solid rgba(${rgb},0.25)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: "2px",
    }}>
      {icon}
    </div>
  );
}

function formatCost(cents: number): string {
  if (cents === 0) return "0¢";
  if (cents < 1) return `${cents.toFixed(3)}¢`;
  if (cents < 100) return `${cents.toFixed(2)}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}