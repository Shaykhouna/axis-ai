import { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import {
  COLORS, PANEL, MONO_LABEL, MONO_LABEL_LOOSE, SPRING,
} from "../../../lib/theme";
import { listActiveProcesses } from "../../processes";
import type { ProcessRow } from "../../processes";
import { createConversation } from "../conversations";
import type { Conversation } from "../types";

interface Props {
  ownerId: string;
  onClose: () => void;
  onCreated: (conv: Conversation) => Promise<void>;
}

export function NewConversationDialog({
  ownerId, onClose, onCreated,
}: Props): JSX.Element {
  const [processes, setProcesses] = useState<ProcessRow[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const procs = await listActiveProcesses(ownerId);
      if (cancelled) return;
      setProcesses(procs);
      if (procs.length > 0) setSelectedProcessId(procs[0].id);
      setLoading(false);
      //const active = procs.filter((p) => p.status === "active");
      //setProcesses(active);
      //if (active.length > 0) setSelectedProcessId(active[0].id);
      //setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ownerId]);

  async function handleCreate(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const finalTitle = title.trim().length > 0 ? title.trim() : "Untitled conversation";
      const conv = await createConversation({
        ownerId,
        title: finalTitle,
        processId: selectedProcessId,
      });
      await onCreated(conv);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const inputStyle = {
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLORS.divider}`,
    borderRadius: "4px",
    padding: "8px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    width: "100%",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        style={{ ...PANEL, width: "440px", padding: 0 }}
      >
        <div style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${COLORS.divider}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.textPrimary,
            letterSpacing: "0.16em",
          }}>
            NEW CONVERSATION
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              color: COLORS.textFaint, cursor: "pointer", padding: "4px",
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{
          padding: "20px",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          {loading ? (
            <div style={{ color: COLORS.textFaint, fontSize: "12px" }}>
              Loading processes…
            </div>
          ) : processes.length === 0 ? (
            <div style={{
              color: COLORS.amber, fontSize: "12px", lineHeight: 1.6,
            }}>
              No active Processes. Promote a Lab winner to a Process before starting a chat.
            </div>
          ) : (
            <>
              <div>
                <label style={{
                  ...MONO_LABEL, color: COLORS.textFaint,
                  marginBottom: "6px", display: "block",
                }}>
                  PROCESS
                </label>
                <select
                  value={selectedProcessId}
                  onChange={(e) => setSelectedProcessId(e.target.value)}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.task_type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{
                  ...MONO_LABEL, color: COLORS.textFaint,
                  marginBottom: "6px", display: "block",
                }}>
                  TITLE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled conversation"
                  style={inputStyle}
                />
              </div>

              {error !== null && (
                <div style={{ color: COLORS.red, fontSize: "12px" }}>
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={submitting || selectedProcessId === ""}
                style={{
                  ...MONO_LABEL_LOOSE,
                  color: COLORS.cyan,
                  padding: "10px 16px",
                  background: `rgba(${COLORS.cyanRgb},0.08)`,
                  border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
                  borderRadius: "5px",
                  cursor: submitting ? "wait" : "pointer",
                  opacity: submitting || selectedProcessId === "" ? 0.5 : 1,
                }}
              >
                {submitting ? "CREATING…" : "CREATE"}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}