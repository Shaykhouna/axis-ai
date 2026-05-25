import { Wifi, WifiOff } from "lucide-react"
//import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, JSX } from "react"
import { COLORS, MONO_LABEL, MONO_LABEL_LOOSE } from "../../../lib/theme";
import { detectOllama, listModels, intersectInstalledWithCatalog, type OllamaStatus } from "../../router";

interface OllamaPanelProps {
  ownerId: string;
  currentDefault: string | null;
  onChange: (modelId: string) => Promise<void>;
}

export function OllamaPanel({ ownerId: _ownerId, currentDefault, onChange }: OllamaPanelProps): JSX.Element {
  const [status, setStatus] = useState<OllamaStatus | null>(null);
  const [catalogChoices, setCatalogChoices] = useState
    <Array<{ id: string; display_name: string; context_window: number; installed: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function refresh(): Promise<void> {
    setLoading(true);
    const [s, models] = await Promise.all([detectOllama(), listModels("chat")]);
    const choices = intersectInstalledWithCatalog(s.installed_models, models);
    setStatus(s);
    setCatalogChoices(choices);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) await refresh();
    })();
    return () => { cancelled = true; };
  }, []);

  const installedChoices = catalogChoices.filter((c) => c.installed);

  function inputStyle(): React.CSSProperties {
  return {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: "6px",
    padding: "6px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };
}

  async function handlePick(modelId: string): Promise<void> {
    setSaving(true);
    try { await onChange(modelId); } finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div style={{ padding: "18px", color: COLORS.textFaint, fontSize: "12px" }}>
        Detecting Ollama…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Status row */}
      <div style={{
        padding: "14px 18px",
        borderTop: `1px solid ${COLORS.divider}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {status?.reachable === true ? (
            <Wifi size={14} style={{ color: COLORS.green }} />
          ) : (
            <WifiOff size={14} style={{ color: COLORS.textFaint }} />
          )}
          <div>
            <div style={{ color: COLORS.textPrimary, fontSize: "13px", fontWeight: 500 }}>
              {status?.reachable === true ? "Running" : "Not detected"}
            </div>
            <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "2px" }}>
              {status?.reachable === true
                ? `${status.installed_models.length} model(s) installed at localhost:11434`
                : status?.error ?? "Ollama is not reachable"}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.cyan,
            padding: "5px 10px",
            background: `rgba(${COLORS.cyanRgb},0.06)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.22)`,
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          TEST CONNECTION
        </button>
      </div>

      {/* If not reachable, show install instructions */}
      {status?.reachable !== true && (
        <div style={{
          padding: "14px 18px",
          borderTop: `1px solid ${COLORS.divider}`,
          fontSize: "12px",
          color: COLORS.textSecondary,
          lineHeight: 1.7,
        }}>
          <div style={{ marginBottom: "10px", color: COLORS.textPrimary, fontWeight: 500 }}>
            Install Ollama
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", padding: "8px 10px",
                        background: "rgba(0,0,0,0.3)", borderRadius: "4px", marginBottom: "10px" }}>
            curl -fsSL https://ollama.com/install.sh | sh
          </div>
          <div style={{ marginBottom: "6px" }}>Then pull the recommended preprocessor model:</div>
          <div style={{ fontFamily: "monospace", fontSize: "11px", padding: "8px 10px",
                        background: "rgba(0,0,0,0.3)", borderRadius: "4px" }}>
            ollama pull llama3.2:3b
          </div>
          <div style={{ marginTop: "10px", color: COLORS.textFaint, fontSize: "11px" }}>
            Once installed, Ollama runs as a background service. Click TEST CONNECTION above.
          </div>
        </div>
      )}

      {/* If reachable, show model picker */}
      {status?.reachable === true && (
        <div style={{
          padding: "14px 18px",
          borderTop: `1px solid ${COLORS.divider}`,
        }}>
          <div style={{
            ...MONO_LABEL,
            color: COLORS.textFaint,
            marginBottom: "8px",
          }}>
            DEFAULT PREPROCESSOR MODEL
          </div>
          {installedChoices.length === 0 ? (
            <div style={{ color: COLORS.amber, fontSize: "12px", lineHeight: 1.6 }}>
              No supported models installed. Pull one with:
              <div style={{ fontFamily: "monospace", fontSize: "11px", padding: "8px 10px",
                            background: "rgba(0,0,0,0.3)", borderRadius: "4px", marginTop: "8px" }}>
                ollama pull llama3.2:3b
              </div>
              <div style={{ marginTop: "6px", color: COLORS.textFaint, fontSize: "11px" }}>
                Supported: {catalogChoices.map((c) => c.id.slice("ollama/".length)).join(", ")}
              </div>
            </div>
          ) : (
            <>
              <select
                value={currentDefault ?? ""}
                onChange={(e) => void handlePick(e.target.value)}
                disabled={saving}
                style={{
                  ...inputStyle(),
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                <option value="">— pick a model —</option>
                {installedChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}{" "}({c.context_window.toLocaleString()} ctx)
                  </option>
                ))}
              </select>
              {currentDefault !== null && currentDefault !== "" && (
                <div style={{ color: COLORS.textFaint, fontSize: "11px", marginTop: "6px" }}>
                  Used for new chat conversations. Per-conversation override coming soon.
                </div>
              )}
            </>
          )}

          {/* List of all installed models (informational) */}
          {status.installed_models.length > 0 && (
            <details style={{ marginTop: "14px" }}>
              <summary style={{
                ...MONO_LABEL,
                color: COLORS.textFaint,
                cursor: "pointer",
              }}>
                ALL INSTALLED MODELS ({status.installed_models.length})
              </summary>
              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {status.installed_models.map((m) => (
                  <div key={m.name} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: "11px", fontFamily: "monospace",
                    color: COLORS.textSecondary,
                    padding: "4px 8px",
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: "3px",
                  }}>
                    <span>{m.name}</span>
                    <span style={{ color: COLORS.textFaint }}>
                      {m.parameter_size} · {(m.size_bytes / 1e9).toFixed(2)}GB
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}