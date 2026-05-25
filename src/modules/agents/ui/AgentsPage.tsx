import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Plus, Edit2, Trash2, AlertTriangle, Layers } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
} from "../../../lib/theme";
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
} from "../agents";
import { AgentEditor } from "./AgentEditor";
import { AgentRunPanel } from "./AgentRunPanel";
import type { Owner } from "../../core";
import type { Agent, AgentInput } from "../types";

interface AgentsPageProps {
  owner: Owner;
}

type EditorMode =
  | { kind: "closed" }
  | { kind: "creating" }
  | { kind: "editing"; agent: Agent };

export function AgentsPage({ owner }: AgentsPageProps): JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>({ kind: "closed" });
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      const list = await listAgents(owner.id);
      setAgents(list);
      // If selected agent was deleted/renamed away, clear selection
      if (selectedId !== null && !list.some((a) => a.id === selectedId)) {
        setSelectedId(null);
      }
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner.id]);

  async function handleCreate(input: AgentInput): Promise<void> {
    const created = await createAgent(owner.id, input);
    setEditorMode({ kind: "closed" });
    setSelectedId(created.id);
    await refresh();
  }

  async function handleUpdate(agentId: string, input: AgentInput): Promise<void> {
    const updated = await updateAgent(owner.id, agentId, input);
    setEditorMode({ kind: "closed" });
    setSelectedId(updated.id);
    await refresh();
  }

  async function handleDelete(agentId: string): Promise<void> {
    if (!confirm("Delete this agent and all its versions?")) return;
    try {
      await deleteAgent(owner.id, agentId);
      if (selectedId === agentId) setSelectedId(null);
      if (editorMode.kind === "editing" && editorMode.agent.id === agentId) {
        setEditorMode({ kind: "closed" });
      }
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const selected = agents.find((a) => a.id === selectedId) ?? null;

  return (
    <div style={{ maxWidth: "820px", display: "flex", flexDirection: "column", gap: "22px" }}>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "5px" }}>
          <div style={{
            width: "3px", height: "30px",
            background: "linear-gradient(180deg, #00d4ff, rgba(0,212,255,0.1))",
            borderRadius: "2px",
            boxShadow: "0 0 10px rgba(0,212,255,0.55)",
          }} />
          <h1 style={{ color: COLORS.textPrimary, fontSize: "22px", fontWeight: 600, letterSpacing: "0.05em" }}>
            Agents
          </h1>
        </div>
        <p style={{ ...MONO_LABEL_LOOSE, color: COLORS.textMuted, marginLeft: "15px" }}>
          SPECIALISTS · {agents.length} REGISTERED
        </p>
      </motion.div>

      <AnimatePresence>
        {error !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "12px 16px",
              background: `rgba(${COLORS.redRgb},0.05)`,
              border: `1px solid rgba(${COLORS.redRgb},0.18)`,
              borderRadius: "8px",
              display: "flex", gap: "10px", alignItems: "center",
              color: COLORS.red,
              fontSize: "12px",
            }}
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agents list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.08 }}
        style={{ ...PANEL }}
      >
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
            <Bot size={15} color={COLORS.cyan} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.5)`, marginBottom: "2px" }}>
              REGISTRY
            </div>
            <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
              Active agents (latest version)
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditorMode({ kind: "creating" })}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              padding: "6px 12px",
              background: `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <Plus size={11} /> NEW
          </button>
        </div>

        {agents.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: COLORS.textFaint, fontSize: "12px" }}>
            No agents yet. Click NEW to define your first specialist.
          </div>
        ) : (
          agents.map((agent) => {
            const isSelected = selectedId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedId(isSelected ? null : agent.id)}
                style={{
                  padding: "12px 18px",
                  borderTop: `1px solid ${COLORS.divider}`,
                  cursor: "pointer",
                  background: isSelected ? `rgba(${COLORS.cyanRgb},0.04)` : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                  transition: "background 0.18s",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: COLORS.textPrimary, fontSize: "13px", fontWeight: 500 }}>
                      {agent.name}
                    </span>
                    <span style={{
                      ...MONO_LABEL_LOOSE,
                      color: COLORS.textFaint,
                      padding: "1px 6px",
                      background: `rgba(${COLORS.cyanRgb},0.05)`,
                      borderRadius: "3px",
                      display: "inline-flex", alignItems: "center", gap: "3px",
                    }}>
                      <Layers size={9} /> v{agent.version}
                    </span>
                    {agent.domain !== null && (
                      <span style={{ ...MONO_LABEL_LOOSE, color: COLORS.textMuted }}>
                        {agent.domain}
                      </span>
                    )}
                    {agent.use_vault_context === 1 && (
                      <span style={{
                        ...MONO_LABEL_LOOSE,
                        color: COLORS.green,
                        opacity: 0.7,
                      }}>
                        VAULT·{agent.vault_top_k}
                      </span>
                    )}
                  </div>
                  <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint, marginTop: "3px" }}>
                    {agent.model_id} · temp {agent.temperature} · {agent.max_tokens}tok
                  </div>
                </div>
                <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditorMode({ kind: "editing", agent });
                      setSelectedId(agent.id);
                    }}
                    style={{
                      color: COLORS.textFaint,
                      background: "transparent",
                      border: `1px solid ${COLORS.inputBorder}`,
                      borderRadius: "5px",
                      padding: "4px 6px",
                      cursor: "pointer",
                    }}
                    aria-label={`edit ${agent.name}`}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(agent.id);
                    }}
                    style={{
                      color: COLORS.textFaint,
                      background: "transparent",
                      border: `1px solid ${COLORS.inputBorder}`,
                      borderRadius: "5px",
                      padding: "4px 6px",
                      cursor: "pointer",
                    }}
                    aria-label={`delete ${agent.name}`}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </motion.div>

      {/* Editor (create or edit) */}
      <AnimatePresence mode="wait">
        {editorMode.kind === "creating" && (
          <AgentEditor
            key="create"
            ownerId={owner.id}
            initial={null}
            onSave={handleCreate}
            onCancel={() => setEditorMode({ kind: "closed" })}
          />
        )}
        {editorMode.kind === "editing" && (
          <AgentEditor
            key={`edit-${editorMode.agent.id}`}
            ownerId={owner.id}
            initial={editorMode.agent}
            onSave={(input) => handleUpdate(editorMode.agent.id, input)}
            onCancel={() => setEditorMode({ kind: "closed" })}
          />
        )}
      </AnimatePresence>

      {/* Run panel (when an agent is selected and editor not open) */}
      <AnimatePresence>
        {selected !== null && editorMode.kind === "closed" && (
          <AgentRunPanel
            key={selected.id}
            ownerId={owner.id}
            agent={selected}
          />
        )}
      </AnimatePresence>
    </div>
  );
}