import { JSX, useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { COLORS, MONO_LABEL, MONO_LABEL_LOOSE } from "../../../lib/theme";
import { NewConversationDialog } from "./NewConversationDialog";
import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  ownerId: string;
  onSelect: (id: string) => void;
  onConversationCreated: (conv: Conversation) => Promise<void>;
}

export function ConversationList({
  conversations, activeId, ownerId, onSelect, onConversationCreated,
}: Props): JSX.Element {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div style={{
        width: "260px",
        borderRight: `1px solid ${COLORS.divider}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{
          padding: "14px",
          borderBottom: `1px solid ${COLORS.divider}`,
        }}>
          <button
            type="button"
            onClick={() => setShowDialog(true)}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              width: "100%",
              padding: "8px 12px",
              background: `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
          >
            <Plus size={12} /> NEW CONVERSATION
          </button>
        </div>
        <div style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}>
          {conversations.length === 0 ? (
            <div style={{
              padding: "20px",
              color: COLORS.textFaint,
              fontSize: "12px",
              textAlign: "center",
            }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                style={{
                  padding: "12px 14px",
                  background: c.id === activeId
                    ? `rgba(${COLORS.cyanRgb},0.06)`
                    : "transparent",
                  borderLeft: c.id === activeId
                    ? `2px solid ${COLORS.cyan}`
                    : "2px solid transparent",
                  borderBottom: `1px solid ${COLORS.divider}`,
                  borderTop: "none", borderRight: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  color: COLORS.textPrimary,
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <MessageSquare
                  size={13}
                  style={{ marginTop: "2px", flexShrink: 0, color: COLORS.textFaint }}
                />
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {c.title}
                  </div>
                  <div style={{
                    ...MONO_LABEL,
                    color: COLORS.textFaint,
                    marginTop: "3px",
                  }}>
                    {c.message_count} MSG · {formatRelative(c.updated_at)}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {showDialog && (
        <NewConversationDialog
          ownerId={ownerId}
          onClose={() => setShowDialog(false)}
          onCreated={async (conv) => {
            setShowDialog(false);
            await onConversationCreated(conv);
          }}
        />
      )}
    </>
  );
}

function formatRelative(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return "JUST NOW";
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}