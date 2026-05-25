import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Workflow, Archive, AlertTriangle, ChevronDown } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
} from "../../../lib/theme";
import {
  listActiveProcesses,
  listRetiredProcesses,
  retireProcess,
  deleteProcess,
} from "../processes";
import { ProcessCard } from "./ProcessCard";
import type { Owner } from "../../core";
import type { ProcessRow } from "../types";

interface ProcessesPageProps {
  owner: Owner;
}

export function ProcessesPage({ owner }: ProcessesPageProps): JSX.Element {
  const [active, setActive] = useState<ProcessRow[]>([]);
  const [retired, setRetired] = useState<ProcessRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      const [a, r] = await Promise.all([
        listActiveProcesses(owner.id),
        listRetiredProcesses(owner.id),
      ]);
      setActive(a);
      setRetired(r);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void refresh();
    /*let cancelled = false;

    (async () => {
      try {
        const [a, r] = await Promise.all([
          listActiveProcesses(owner.id),
          listRetiredProcesses(owner.id),
        ]);
        if (cancelled) return;
        setActive(a);
        setRetired(r);
        setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };*/
  }, [owner.id]);

/*  async function refresh(): Promise<void> {
  // Used by handlers (retire/delete) after a mutation. Not cancellation-guarded
  // because it's user-initiated; if the user navigates away mid-call,
  // setState on an unmounted component is just a no-op warning.
  try {
    const [a, r] = await Promise.all([
      listActiveProcesses(owner.id),
      listRetiredProcesses(owner.id),
    ]);
    setActive(a);
    setRetired(r);
    setError(null);
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : String(err));
  }
} */

  async function handleRetire(processId: string): Promise<void> {
    if (
      !confirm(
        "Retire this process? You can re-Lab and promote a new winner anytime.",
      )
    )
      return;
    try {
      await retireProcess(owner.id, processId);
      if (expandedId === processId) setExpandedId(null);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(processId: string): Promise<void> {
    if (!confirm("Permanently delete this retired process?")) return;
    try {
      await deleteProcess(owner.id, processId);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      style={{
        maxWidth: "900px",
        display: "flex",
        flexDirection: "column",
        gap: "22px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "5px",
          }}
        >
          <div
            style={{
              width: "3px",
              height: "30px",
              background:
                "linear-gradient(180deg, #00d4ff, rgba(0,212,255,0.1))",
              borderRadius: "2px",
              boxShadow: "0 0 10px rgba(0,212,255,0.55)",
            }}
          />
          <h1
            style={{
              color: COLORS.textPrimary,
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Processes
          </h1>
        </div>
        <p
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.textMuted,
            marginLeft: "15px",
          }}
        >
          {active.length} ACTIVE · {retired.length} RETIRED
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
              display: "flex",
              gap: "10px",
              alignItems: "center",
              color: COLORS.red,
              fontSize: "12px",
            }}
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active processes */}
      {active.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING }}
          style={{
            ...PANEL,
            padding: "40px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              margin: "0 auto 14px",
              background: `rgba(${COLORS.cyanRgb},0.05)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.18)`,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: softGlow(COLORS.cyanRgb, 0.06),
            }}
          >
            <Workflow size={20} color={COLORS.cyan} />
          </div>
          <div
            style={{
              color: COLORS.textPrimary,
              fontSize: "14px",
              fontWeight: 500,
              marginBottom: "5px",
            }}
          >
            No active processes yet
          </div>
          <div style={{ color: COLORS.textFaint, fontSize: "12px" }}>
            Run an experiment in the Lab and promote a winner to freeze it here.
          </div>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {active.map((p) => (
            <ProcessCard
              key={p.id}
              ownerId={owner.id}
              process={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onRetire={() => handleRetire(p.id)}
            />
          ))}
        </div>
      )}

      {/* Retired section (collapsible) */}
      {retired.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.1 }}
        >
          <button
            type="button"
            onClick={() => setShowRetired((v) => !v)}
            style={{
              ...MONO_LABEL,
              color: COLORS.textMuted,
              background: "transparent",
              border: "none",
              padding: "6px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              letterSpacing: "0.2em",
            }}
          >
            <Archive size={11} />
            RETIRED ({retired.length})
            <ChevronDown
              size={12}
              style={{
                transform: showRetired ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.18s",
              }}
            />
          </button>

          <AnimatePresence>
            {showRetired && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                {retired.map((p) => (
                  <ProcessCard
                    key={p.id}
                    ownerId={owner.id}
                    process={p}
                    expanded={false}
                    onToggle={() => {
                      /* retired cards don't expand */
                    }}
                    onDelete={() => handleDelete(p.id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
