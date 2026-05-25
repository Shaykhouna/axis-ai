import { JSX, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  COLORS,
  MONO_LABEL_LOOSE,
  SPRING,
} from "../../../lib/theme";
import { TaskForm } from "./TaskForm";
import { ResultsGrid } from "./ResultsGrid";
import { PromotePanel } from "./PromotePanel";
import {
  createTask,
  scoreRun,
  setWinner,
  promoteToProcess,
  runLabTask,
} from "../index";
import type { Owner } from "../../core";
import type { RunResult, ProcessRow } from "../types";

interface LabPageProps {
  owner: Owner;
}

export function LabPage({ owner }: LabPageProps): JSX.Element {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<string>("");
  const [results, setResults] = useState<RunResult[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [promoting, setPromoting] = useState<boolean>(false);
  const [promoted, setPromoted] = useState<ProcessRow | null>(null);

  async function handleRun(
    type: string,
    prompt: string,
    agentIds: string[]
  ): Promise<void> {
    setError(null);
    setRunning(true);
    setPromoted(null);
    setResults([]);
    setTaskType(type);

    try {
      const task = await createTask(owner.id, type, prompt);
      setTaskId(task.id);

      await runLabTask({
        ownerId: owner.id,
        taskId: task.id,
        prompt,
        agentIds,
        onProgress: (current) => setResults([...current]),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  async function handleScore(runId: string, score: number): Promise<void> {
    try {
      await scoreRun(owner.id, runId, score);
      setResults((prev) =>
        prev.map((r) => (r.runId === runId ? { ...r, score } : r))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSetWinner(runId: string): Promise<void> {
    try {
      await setWinner(owner.id, runId);
      setResults((prev) =>
        prev.map((r) => ({ ...r, isWinner: r.runId === runId }))
      );
      setPromoted(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handlePromote(): Promise<void> {
    const winner = results.find((r) => r.isWinner === true);
    if (winner === undefined || winner.runId === undefined) return;
    setPromoting(true);
    try {
      const p = await promoteToProcess(owner.id, winner.runId);
      setPromoted(p);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPromoting(false);
    }
  }

  function handleReset(): void {
    setTaskId(null);
    setTaskType("");
    setResults([]);
    setPromoted(null);
    setError(null);
  }

  const winner = results.find((r) => r.isWinner === true);
  const hasResults = results.length > 0;
  const allSettled = hasResults && results.every((r) => r.status !== "running");

  return (
    <div style={{ maxWidth: "1000px", display: "flex", flexDirection: "column", gap: "22px" }}>

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
            Lab
          </h1>
          {hasResults && (
            <button
              type="button"
              onClick={handleReset}
              style={{
                marginLeft: "auto",
                ...MONO_LABEL_LOOSE,
                color: COLORS.textMuted,
                padding: "5px 11px",
                background: "transparent",
                border: `1px solid ${COLORS.inputBorder}`,
                borderRadius: "5px",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "5px",
              }}
            >
              <RotateCcw size={10} /> NEW EXPERIMENT
            </button>
          )}
        </div>
        <p style={{ ...MONO_LABEL_LOOSE, color: COLORS.textMuted, marginLeft: "15px" }}>
          PARALLEL EXPERIMENT · VOTE · FREEZE
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

      <TaskForm
        ownerId={owner.id}
        disabled={running}
        onRun={handleRun}
      />

      <AnimatePresence>
        {hasResults && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING }}
          >
            <ResultsGrid
              results={results}
              onScore={handleScore}
              onSetWinner={handleSetWinner}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {allSettled && winner !== undefined && taskType.length > 0 && (
          <PromotePanel
            ownerId={owner.id}
            taskType={taskType}
            winner={winner}
            onPromote={handlePromote}
            promoted={promoted}
            promoting={promoting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}