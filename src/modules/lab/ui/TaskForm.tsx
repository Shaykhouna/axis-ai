import { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Play, Check } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
  glow,
} from "../../../lib/theme";
import { listAgents, type Agent } from "../../agents";
import { listTaskTypes } from "../tasks";
import { listModels, getConfiguredServices, isModelAvailable, ModelInfo } from "../../router";

interface TaskFormProps {
  ownerId: string;
  disabled: boolean;
  onRun: (taskType: string, prompt: string, agentIds: string[]) => Promise<void>;
}

export function TaskForm({ ownerId, disabled, onRun }: TaskFormProps): JSX.Element {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [taskTypes, setTaskTypes] = useState<string[]>([]);

  const [taskType, setTaskType] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [modelMap, setModelMap] = useState<Map<string, ModelInfo>>(new Map());
  const [configuredServices, setConfiguredServices] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAgents(ownerId), listTaskTypes(ownerId), listModels(), getConfiguredServices(ownerId)])
      .then(([a, t, m, s]) => {
        if (cancelled) return;
        setAgents(a);
        setTaskTypes(t);
        setModelMap(new Map(m.map((mm) => [mm.id, mm])));
        setConfiguredServices(s);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => { cancelled = true; };
  }, [ownerId]);

  function toggleAgent(id: string): void {
    setSelectedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (taskType.trim().length === 0) {
      setError("Task type is required.");
      return;
    }
    if (prompt.trim().length === 0) {
      setError("Prompt is required.");
      return;
    }
    if (selectedAgents.size < 2) {
      setError("Pick 2-5 agents to compare.");
      return;
    }
    try {
      await onRun(taskType.trim(), prompt.trim(), Array.from(selectedAgents));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
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
          background: `rgba(${COLORS.cyanRgb},0.06)`,
          border: `1px solid rgba(${COLORS.cyanRgb},0.18)`,
          borderRadius: "8px",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: softGlow(COLORS.cyanRgb, 0.1),
        }}>
          <FlaskConical size={15} color={COLORS.cyan} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.5)`, marginBottom: "2px" }}>
            EXPERIMENT
          </div>
          <div style={{ color: COLORS.textPrimary, fontSize: "14px", fontWeight: 500 }}>
            New parallel run
          </div>
          <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
            Pick 2-5 agents. Each runs the same prompt; you vote and freeze the winner.
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Task type */}
        <div>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)`, marginBottom: "5px" }}>
            TASK TYPE
          </div>
          <input
            type="text"
            list="task-types"
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            placeholder="e.g. code-review, daily-summary, draft-email"
            spellCheck={false}
            style={{
              background: COLORS.inputBg,
              border: `1px solid ${COLORS.inputBorder}`,
              borderRadius: "6px",
              padding: "8px 10px",
              color: COLORS.textPrimary,
              fontSize: "13px",
              width: "100%",
              outline: "none",
              fontFamily: "monospace",
            }}
          />
          <datalist id="task-types">
            {taskTypes.map((t) => <option key={t} value={t} />)}
          </datalist>
          <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "4px" }}>
            Free-text key. Processes you freeze are scoped to this type.
          </div>
        </div>

        {/* Prompt */}
        <div>
          <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)`, marginBottom: "5px" }}>
            PROMPT
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="The task all agents will receive…"
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
        </div>

        {/* Agent picker */}
        <div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: "5px",
          }}>
            <div style={{ ...MONO_LABEL, color: `rgba(${COLORS.cyanRgb},0.45)` }}>
              AGENTS · {selectedAgents.size}/5
            </div>
            <div style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint }}>
              click to toggle
            </div>
          </div>
          {agents.length === 0 ? (
            <div style={{
              padding: "12px",
              border: `1px dashed ${COLORS.inputBorder}`,
              borderRadius: "6px",
              color: COLORS.textFaint,
              fontSize: "12px",
              textAlign: "center",
            }}>
              No agents yet. Create at least 2 in the Agents page first.
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {agents.map((agent) => {
                const selected = selectedAgents.has(agent.id);
                const model = modelMap.get(agent.model_id);
                const available = model !== undefined && isModelAvailable(model, configuredServices);
                return (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                    disabled={!available}
                    title={!available ? `${agent.model_id}: required key not configured` : undefined}
                    style={{
                      padding: "5px 11px",
                      borderRadius: "20px",
                      background: selected
                        ? `rgba(${COLORS.cyanRgb},0.1)`
                        : `rgba(${COLORS.cyanRgb},0.025)`,
                      border: `1px solid ${selected
                        ? `rgba(${COLORS.cyanRgb},0.4)`
                        : COLORS.inputBorder}`,
                      color: !available ? COLORS.cyan : COLORS.textSecondary,
                      opacity: available ? 1 : 0.45,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "5px",
                      boxShadow: selected && available ? glow(COLORS.cyanRgb, 0.12) : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected && <Check size={10} />}
                    {agent.name}
                    <span style={{ opacity: 0.5, fontSize: "10px" }}>v{agent.version}</span>
                    {!available && <span style={{ fontSize: "9px", opacity: 0.7 }}>· no key</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error !== null && (
          <div style={{
            padding: "10px 12px",
            background: `rgba(${COLORS.redRgb},0.05)`,
            border: `1px solid rgba(${COLORS.redRgb},0.18)`,
            borderRadius: "6px",
            color: COLORS.red,
            fontSize: "12px",
          }}>
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={disabled || selectedAgents.size < 2}
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.cyan,
            padding: "10px 16px",
            background: `rgba(${COLORS.cyanRgb},0.1)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.35)`,
            borderRadius: "6px",
            cursor: (disabled || selectedAgents.size < 2) ? "not-allowed" : "pointer",
            opacity: (disabled || selectedAgents.size < 2) ? 0.5 : 1,
            display: "flex", alignItems: "center", gap: "8px",
            alignSelf: "flex-start",
            boxShadow: disabled ? "none" : glow(COLORS.cyanRgb, 0.18),
          }}
        >
          <Play size={12} />
          {disabled ? "RUNNING…" : `RUN ${selectedAgents.size} AGENTS IN PARALLEL`}
        </button>
      </div>
    </motion.div>
  );
}