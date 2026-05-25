import { JSX, useEffect, useState } from "react";
import {
  listDomains,
  createDomain,
  deleteDomain,
  type Owner,
  type Domain,
} from "../modules/core";
import { Trash2, Plus, Database, RefreshCw, AlertTriangle, Layers, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardProps {
  owner: Owner;
}

const cardVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
  exit: { opacity: 0, x: -18, scale: 0.96, transition: { duration: 0.16 } },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

const glowPanel = {
  background: "rgba(6,14,32,0.82)",
  border: "1px solid rgba(0,212,255,0.11)",
  borderRadius: "10px",
  backdropFilter: "blur(6px)",
} as const;

export function Dashboard({ owner }: DashboardProps): JSX.Element {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);

  async function refresh(): Promise<void> {
    try {
      const list = await listDomains(owner.id);
      setDomains(list);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    //console.log("processes refresh", owner.id)
    void refresh();
    // owner.id is stable per session
  }, [owner.id]);

  async function handleAdd(): Promise<void> {
    const name = newName.trim();
    if (name.length === 0) return;
    setAdding(true);
    try {
      await createDomain(owner.id, name, newDesc.trim() || null);
      setNewName("");
      setNewDesc("");
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteDomain(owner.id, id);
      await refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const statCards = [
    {
      label: "DOMAINS",
      value: loading ? "…" : String(domains.length),
      sub: "registered nodes",
      icon: Database,
      color: "#00d4ff",
      rgb: "0,212,255",
    },
    {
      label: "MODULES",
      value: "6",
      sub: "1 active",
      icon: Layers,
      color: "#7c3aed",
      rgb: "124,58,237",
    },
    {
      label: "ENGINE",
      value: "LIVE",
      sub: "core online",
      icon: Zap,
      color: "#00ff88",
      rgb: "0,255,136",
    },
  ];

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
            flexShrink: 0,
          }} />
          <h1 style={{
            color: "#c8e6ff",
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "0.05em",
          }}>
            Dashboard
          </h1>
        </div>
        <p style={{
          color: "rgba(100,160,210,0.45)",
          fontSize: "11px",
          marginLeft: "15px",
          fontFamily: "monospace",
          letterSpacing: "0.06em",
        }}>
          CORE MODULE ACTIVE — Lab · Processes · Agents · Vault · Settings pending init.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 300, damping: 26 }}
            style={{
              ...glowPanel,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
              boxShadow: `0 0 20px rgba(${stat.rgb},0.04)`,
            }}
          >
            <div style={{
              width: "38px", height: "38px",
              background: `rgba(${stat.rgb},0.07)`,
              border: `1px solid rgba(${stat.rgb},0.22)`,
              borderRadius: "9px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 12px rgba(${stat.rgb},0.12)`,
            }}>
              <stat.icon size={16} color={stat.color} />
            </div>
            <div>
              <div style={{ color: `rgba(${stat.rgb},0.45)`, fontSize: "9px", fontFamily: "monospace", letterSpacing: "0.18em" }}>
                {stat.label}
              </div>
              <div style={{
                color: stat.color,
                fontSize: "22px",
                fontWeight: 700,
                lineHeight: 1.15,
                textShadow: `0 0 14px rgba(${stat.rgb},0.4)`,
              }}>
                {stat.value}
              </div>
              <div style={{ color: "rgba(100,160,200,0.38)", fontSize: "9px", fontFamily: "monospace" }}>
                {stat.sub}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Domains panel */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.36 }}
        style={{ ...glowPanel, overflow: "hidden" }}
      >
        {/* Panel header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: "1px solid rgba(0,212,255,0.07)",
        }}>
          <div>
            <div style={{
              color: "rgba(0,212,255,0.5)",
              fontSize: "9px",
              fontFamily: "monospace",
              letterSpacing: "0.22em",
              marginBottom: "3px",
            }}>
              DATA NODES
            </div>
            <div style={{ color: "#c8e6ff", fontSize: "14px", fontWeight: 500 }}>Domains</div>
            <div style={{ color: "rgba(100,160,200,0.4)", fontSize: "11px", marginTop: "2px" }}>
              Self-declared categories for process templates and benchmarking.
            </div>
          </div>
          <div style={{
            padding: "3px 10px",
            background: "rgba(0,212,255,0.05)",
            border: "1px solid rgba(0,212,255,0.14)",
            borderRadius: "5px",
            color: "rgba(0,212,255,0.55)",
            fontSize: "10px",
            fontFamily: "monospace",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}>
            {loading ? "…" : domains.length} nodes
          </div>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {error !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                padding: "10px 18px",
                background: "rgba(255,59,92,0.05)",
                borderBottom: "1px solid rgba(255,59,92,0.18)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "rgba(255,110,130,0.9)",
                fontSize: "12px",
              }}
            >
              <AlertTriangle size={13} style={{ flexShrink: 0 }} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        {loading ? (
          <div style={{ padding: "36px 18px", textAlign: "center" }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
              style={{ display: "inline-block" }}
            >
              <RefreshCw size={18} color="rgba(0,212,255,0.38)" />
            </motion.div>
            <div style={{
              color: "rgba(0,212,255,0.28)",
              fontSize: "10px",
              fontFamily: "monospace",
              marginTop: "10px",
              letterSpacing: "0.12em",
            }}>
              LOADING NODES…
            </div>
          </div>
        ) : (
          <motion.ul variants={listVariants} initial="hidden" animate="show">
            <AnimatePresence mode="popLayout">
              {domains.length === 0 ? (
                <motion.li
                  key="empty"
                  variants={cardVariants}
                  style={{
                    padding: "32px 18px",
                    textAlign: "center",
                    color: "rgba(80,140,180,0.35)",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    letterSpacing: "0.1em",
                  }}
                >
                  NO NODES REGISTERED
                </motion.li>
              ) : (
                domains.map((d) => (
                  <motion.li
                    key={d.id}
                    variants={cardVariants}
                    exit={cardVariants.exit}
                    layout
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 18px",
                      borderBottom: "1px solid rgba(0,212,255,0.045)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <motion.div
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: Math.random() * 2 }}
                        style={{
                          width: "6px", height: "6px",
                          borderRadius: "50%",
                          background: "#00d4ff",
                          boxShadow: "0 0 7px rgba(0,212,255,0.7)",
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ color: "#c8e6ff", fontSize: "13px", fontWeight: 500 }}>{d.name}</div>
                        {d.description !== null && (
                          <div style={{ color: "rgba(100,160,200,0.45)", fontSize: "11px", marginTop: "1px", fontFamily: "monospace" }}>
                            {d.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      onClick={() => void handleDelete(d.id)}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.88 }}
                      aria-label={`delete domain ${d.name}`}
                      style={{
                        width: "28px", height: "28px",
                        background: "rgba(255,59,92,0.04)",
                        border: "1px solid rgba(255,59,92,0.1)",
                        borderRadius: "6px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "rgba(255,100,120,0.38)",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "color 0.2s, border-color 0.2s, background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.color = "rgba(255,59,92,0.9)";
                        el.style.borderColor = "rgba(255,59,92,0.35)";
                        el.style.background = "rgba(255,59,92,0.09)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.color = "rgba(255,100,120,0.38)";
                        el.style.borderColor = "rgba(255,59,92,0.1)";
                        el.style.background = "rgba(255,59,92,0.04)";
                      }}
                    >
                      <Trash2 size={12} />
                    </motion.button>
                  </motion.li>
                ))
              )}
            </AnimatePresence>
          </motion.ul>
        )}

        {/* Add form */}
        <div style={{
          padding: "14px 18px",
          borderTop: "1px solid rgba(0,212,255,0.07)",
          background: "rgba(0,212,255,0.015)",
        }}>
          <div style={{
            color: "rgba(0,212,255,0.38)",
            fontSize: "9px",
            fontFamily: "monospace",
            letterSpacing: "0.18em",
            marginBottom: "10px",
          }}>
            INITIALIZE NEW NODE
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
              placeholder="node name"
              style={{
                width: "150px",
                padding: "7px 11px",
                background: "rgba(0,212,255,0.04)",
                border: "1px solid rgba(0,212,255,0.14)",
                borderRadius: "6px",
                color: "#c8e6ff",
                fontSize: "12px",
                outline: "none",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(0,212,255,0.42)";
                e.target.style.boxShadow = "0 0 0 2px rgba(0,212,255,0.07)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(0,212,255,0.14)";
                e.target.style.boxShadow = "none";
              }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
              placeholder="description (optional)"
              style={{
                flex: 1,
                padding: "7px 11px",
                background: "rgba(0,212,255,0.04)",
                border: "1px solid rgba(0,212,255,0.14)",
                borderRadius: "6px",
                color: "#c8e6ff",
                fontSize: "12px",
                outline: "none",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(0,212,255,0.42)";
                e.target.style.boxShadow = "0 0 0 2px rgba(0,212,255,0.07)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(0,212,255,0.14)";
                e.target.style.boxShadow = "none";
              }}
            />
            <motion.button
              type="button"
              onClick={() => void handleAdd()}
              disabled={adding || newName.trim().length === 0}
              whileHover={newName.trim().length > 0 && !adding ? { scale: 1.03 } : {}}
              whileTap={newName.trim().length > 0 && !adding ? { scale: 0.96 } : {}}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "7px 14px",
                background: adding || newName.trim().length === 0
                  ? "rgba(0,212,255,0.03)"
                  : "rgba(0,212,255,0.1)",
                border: "1px solid rgba(0,212,255,0.24)",
                borderRadius: "6px",
                color: adding || newName.trim().length === 0
                  ? "rgba(0,212,255,0.28)"
                  : "#00d4ff",
                fontSize: "12px",
                fontWeight: 600,
                cursor: adding || newName.trim().length === 0 ? "not-allowed" : "pointer",
                fontFamily: "monospace",
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
                boxShadow: adding || newName.trim().length === 0
                  ? "none"
                  : "0 0 14px rgba(0,212,255,0.14)",
                transition: "all 0.2s",
              }}
            >
              {adding ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  style={{ display: "flex" }}
                >
                  <RefreshCw size={12} />
                </motion.span>
              ) : (
                <Plus size={12} />
              )}
              {adding ? "INIT…" : "INIT"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
