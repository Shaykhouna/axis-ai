import { JSX, useState } from "react";
import { motion } from "framer-motion";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import { MessageSquarePlus, AlertCircle, Check } from "lucide-react";
import { COLORS, MONO_LABEL_LOOSE } from "../../../lib/theme";
import { Owner } from "../../core";
import { gatherDiagnostics } from "../gather";
import { formatAsMarkdown } from "../format";

const REPO_URL = "https://github.com/Shaykhouna/axis-ai";

type State = "idle" | "opening" | "opened" | "error";

interface FeedbackButtonProps {
    owner: Owner
}

export function FeedbackButton({ owner }: FeedbackButtonProps): JSX.Element {
  //const owner = useOwner();
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function openIssue(): Promise<void> {
    setState("opening");
    setErrorMsg(null);

    let body = `## What were you doing?

(describe the steps that led to the issue)

## What happened?

(describe what went wrong, or what felt off)

## What did you expect?

(optional)`;

    // Append diagnostics if we can gather them. If gather fails, the button
    // still works — we just open a barer template.
    try {
      if (owner !== null) {
        const diag = await gatherDiagnostics(owner);
        body += `\n\n---\n\n${formatAsMarkdown(diag)}`;
      }
    } catch {
      body += "\n\n_(diagnostics unavailable)_";
    }

    try {
      const params = new URLSearchParams({
        title: "[bug] ",
        body,
        labels: "bug,tester-feedback",
      });
      const url = `${REPO_URL}/issues/new?${params.toString()}`;
      // GitHub silently truncates issue URLs over ~8000 chars; keep us safe.
      const safeUrl = url.length > 7000
        ? `${REPO_URL}/issues/new?title=${encodeURIComponent("[bug] ")}&labels=bug,tester-feedback`
        : url;
      await openUrl(safeUrl);
      setState("opened");
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => setState("idle"), 4000);
    }
  }

  const icon = state === "opened" ? <Check size={13} />
             : state === "error" ? <AlertCircle size={13} />
             : <MessageSquarePlus size={13} />;
  const label = state === "opened" ? "OPENED"
              : state === "error"  ? "FAILED"
              : state === "opening" ? "OPENING…"
              : "FEEDBACK";
  const color = state === "opened" ? COLORS.green
              : state === "error"  ? COLORS.red
              : COLORS.cyan;
  const rgb = state === "opened" ? COLORS.greenRgb
            : state === "error"  ? COLORS.redRgb ?? "239,68,68"
            : COLORS.cyanRgb;

  return (
    <motion.button
      type="button"
      onClick={() => void openIssue()}
      disabled={state === "opening"}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 400, damping: 30 }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      title={errorMsg ?? "Send feedback (opens GitHub Issues with diagnostics attached)"}
      style={{
        position: "fixed",
        left: "16px",
        bottom: "60px",       // above "system online" indicator; adjust if needed
        zIndex: 1000,
        ...MONO_LABEL_LOOSE,
        color,
        padding: "9px 14px",
        background: `rgba(${rgb},0.12)`,
        border: `1px solid rgba(${rgb},0.4)`,
        borderRadius: "999px",
        cursor: state === "opening" ? "wait" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "7px",
        boxShadow: `0 6px 24px rgba(0,0,0,0.4), 0 0 18px rgba(${rgb},0.18)`,
        backdropFilter: "blur(8px)",
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}