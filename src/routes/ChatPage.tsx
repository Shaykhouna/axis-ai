import { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { /*MessageSquare, Cpu,*/ Lock, ArrowRight } from "lucide-react";
import {
  COLORS, PANEL, MONO_LABEL, MONO_LABEL_LOOSE, SPRING,
} from "../lib/theme";
import { Owner } from "../modules/core";
import { getSettings, type Settings } from "../modules/settings";
import { detectOllama, type OllamaStatus } from "../modules/router";
import { ChatLayout } from "../modules/chat";

interface GateState {
  ollama: OllamaStatus | null;
  settings: Settings | null;
  ready: boolean;
  reasonsBlocked: string[];
}

interface ChatPageProps {
  owner: Owner;
}

export function ChatPage({ owner }: ChatPageProps): JSX.Element {
  //const owner = provisionOwner();
  const [state, setState] = useState<GateState>({
    ollama: null, settings: null, ready: false, reasonsBlocked: [],
  });
  const [loading, setLoading] = useState(true);

  async function check(): Promise<void> {
    setLoading(true);
    if (owner === null) { setLoading(false); return; }
    const [ollama, settings] = await Promise.all([
      detectOllama(),
      getSettings(owner.id),
    ]);
    const reasons: string[] = [];
    if (!ollama.reachable) reasons.push("Ollama not running");
    if (ollama.reachable && ollama.installed_models.length === 0) {
      reasons.push("No Ollama models installed");
    }
    if (settings.default_preprocessor_model_id === null
        || settings.default_preprocessor_model_id === "") {
      reasons.push("No preprocessor model selected");
    }
    setState({
      ollama, settings,
      ready: reasons.length === 0,
      reasonsBlocked: reasons,
    });
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => { if (!cancelled) await check(); })();
    return () => { cancelled = true; };
  }, [owner?.id]);

  if (loading) {
    return (
      <div style={{ padding: "24px", color: COLORS.textFaint, fontSize: "12px" }}>
        Checking chat readiness…
      </div>
    );
  }

  if (!state.ready) {
    return (
      <div style={{ padding: "24px", maxWidth: "640px" }}>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          style={{ ...PANEL, padding: "24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Lock size={18} style={{ color: COLORS.amber }} />
            <div style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.amber,
              letterSpacing: "0.16em",
            }}>
              ADVANCED FEATURE · NOT READY
            </div>
          </div>
          <h1 style={{
            color: COLORS.textPrimary,
            fontSize: "22px",
            fontWeight: 500,
            margin: "0 0 12px 0",
          }}>
            Chat needs a local LLM
          </h1>
          <p style={{
            color: COLORS.textSecondary,
            fontSize: "13px",
            lineHeight: 1.7,
            margin: "0 0 20px 0",
          }}>
            Chat in Axis-AI uses a local model to refine your input before sending
            it to your chosen cloud agent. The local model handles intent extraction,
            context selection, and prompt shaping — so the cloud call stays cheap
            and precise.
          </p>

          <div style={{
            background: "rgba(0,0,0,0.25)",
            border: `1px solid ${COLORS.divider}`,
            borderRadius: "6px",
            padding: "14px 16px",
            marginBottom: "20px",
          }}>
            <div style={{
              ...MONO_LABEL,
              color: COLORS.textFaint,
              marginBottom: "10px",
            }}>
              BLOCKED BY
            </div>
            <ul style={{
              margin: 0,
              padding: "0 0 0 20px",
              color: COLORS.textPrimary,
              fontSize: "13px",
              lineHeight: 1.9,
            }}>
              {state.reasonsBlocked.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>

          <div style={{
            ...MONO_LABEL,
            color: COLORS.textFaint,
            marginBottom: "8px",
          }}>
            SETUP
          </div>
          <ol style={{
            color: COLORS.textSecondary,
            fontSize: "13px",
            lineHeight: 1.9,
            margin: "0 0 20px 0",
            paddingLeft: "20px",
          }}>
            <li>Install Ollama:
              <div style={{ fontFamily: "monospace", fontSize: "11px",
                            padding: "6px 10px", background: "rgba(0,0,0,0.4)",
                            borderRadius: "4px", marginTop: "6px",
                            color: COLORS.cyan }}>
                curl -fsSL https://ollama.com/install.sh | sh
              </div>
            </li>
            <li style={{ marginTop: "10px" }}>Pull the recommended model:
              <div style={{ fontFamily: "monospace", fontSize: "11px",
                            padding: "6px 10px", background: "rgba(0,0,0,0.4)",
                            borderRadius: "4px", marginTop: "6px",
                            color: COLORS.cyan }}>
                ollama pull llama3.2:3b
              </div>
            </li>
            <li style={{ marginTop: "10px" }}>
              In Settings → Local LLM, pick that model as your default preprocessor.
            </li>
            <li style={{ marginTop: "10px" }}>
              Come back here.
            </li>
          </ol>

          <button
            type="button"
            onClick={() => void check()}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              padding: "8px 14px",
              background: `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
              borderRadius: "5px",
              cursor: "pointer",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            RECHECK <ArrowRight size={12} />
          </button>
        </motion.div>
      </div>
    );
  }

  // Ready — Pass B will build the chat UI here.
  return <ChatLayout owner={owner} />
  {/*return (
    <div style={{ padding: "24px" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        style={{ ...PANEL, padding: "32px", textAlign: "center" }}
      >
        <Cpu size={32} style={{ color: COLORS.green, margin: "0 auto 12px" }} />
        <div style={{
          ...MONO_LABEL_LOOSE,
          color: COLORS.green,
          letterSpacing: "0.16em",
          marginBottom: "8px",
        }}>
          READY
        </div>
        <h2 style={{ color: COLORS.textPrimary, fontSize: "18px", margin: "0 0 8px" }}>
          Chat is configured
        </h2>
        <div style={{ color: COLORS.textSecondary, fontSize: "13px", marginBottom: "4px" }}>
          Preprocessor:{" "}
          <span style={{ color: COLORS.cyan, fontFamily: "monospace" }}>
            {state.settings?.default_preprocessor_model_id}
          </span>
        </div>
        <div style={{ color: COLORS.textFaint, fontSize: "12px", marginTop: "16px" }}>
          Conversation UI ships in the next pass.
        </div>
      </motion.div>
    </div>
  );*/}
}