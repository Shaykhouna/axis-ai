import { JSX, useEffect, useRef, useState } from "react";
import { Send, Cpu, AlertTriangle } from "lucide-react";
import { COLORS, MONO_LABEL, MONO_LABEL_LOOSE } from "../../../lib/theme";
import { MessageBubble } from "./MessageBubble";
import { listMessages } from "../messages";
import { runChatTurn } from "../orchestrator";
import { getProcessById } from "../../processes";
import type { Conversation, Message } from "../types";

interface Props {
  conversation: Conversation;
  ownerId: string;
  onTurnComplete: () => Promise<void>;
}

type Stage = "idle" | "preprocessing" | "running";

export function ConversationView({
  conversation, ownerId, onTurnComplete,
}: Props): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [processTaskType, setProcessTaskType] = useState<string>("");
  const threadRef = useRef<HTMLDivElement>(null);

  async function loadMessages(): Promise<void> {
    const msgs = await listMessages(conversation.id);
    setMessages(msgs);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await loadMessages();
      if (conversation.process_id !== null) {
        const p = await getProcessById(conversation.process_id);
        if (!cancelled && p !== null) setProcessTaskType(p.task_type);
      }
    })();
    return () => { cancelled = true; };
  }, [conversation.id]);

  useEffect(() => {
    if (threadRef.current !== null) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, stage]);

  async function handleSend(): Promise<void> {
    const trimmed = input.trim();
    if (trimmed.length === 0 || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    setStage("preprocessing");
    try {
      await loadMessages();  // reflect any external changes
      // Brief UI lie: we flip to "running" after a fixed delay so user sees
      // both stages. Real instrumentation requires streaming, deferred.
      setTimeout(() => { setStage("running"); }, 1500);
      await runChatTurn({
        ownerId,
        conversationId: conversation.id,
        userInput: trimmed,
      });
      await loadMessages();
      await onTurnComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await loadMessages();  // user message persisted even on failure
    } finally {
      setSending(false);
      setStage("idle");
    }
  }

  const inputStyle = {
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLORS.divider}`,
    borderRadius: "4px",
    padding: "10px 12px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: `1px solid ${COLORS.divider}`,
      }}>
        <div style={{
          color: COLORS.textPrimary,
          fontSize: "14px",
          fontWeight: 500,
        }}>
          {conversation.title}
        </div>
        <div style={{
          ...MONO_LABEL,
          color: COLORS.textFaint,
          marginTop: "3px",
        }}>
          PROCESS: {processTaskType || "—"} · PREP: {conversation.preprocessor_model_id.replace(/^ollama\//, "")}
        </div>
      </div>

      {/* Thread */}
      <div
        ref={threadRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {messages.length === 0 && (
          <div style={{
            color: COLORS.textFaint,
            fontSize: "12px",
            textAlign: "center",
            margin: "40px 0",
          }}>
            Send a message to get started.
          </div>
        )}
        {groupIntoTurns(messages).map((turn, i) => (
          <MessageBubble key={turn.user?.id ?? `t${i}`} turn={turn} />
        ))}
        {sending && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: COLORS.cyan,
            fontSize: "12px",
            marginLeft: "36px",
          }}>
            <Cpu size={12} />
            {stage === "preprocessing"
              ? "Refining input locally…"
              : "Running cloud agent…"}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        padding: "14px 20px",
        borderTop: `1px solid ${COLORS.divider}`,
      }}>
        {error !== null && (
          <div style={{
            color: COLORS.red,
            fontSize: "12px",
            marginBottom: "8px",
            display: "flex", alignItems: "center", gap: "6px",
          }}>
            <AlertTriangle size={12} /> {error}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="Type your message…   (Enter to send, Shift+Enter for newline)"
            rows={3}
            disabled={sending}
            style={{
              ...inputStyle,
              flex: 1,
              resize: "none",
              opacity: sending ? 0.6 : 1,
            }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || input.trim().length === 0}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              padding: "0 18px",
              height: "70px",
              background: `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
              borderRadius: "5px",
              cursor: sending ? "wait" : "pointer",
              opacity: sending || input.trim().length === 0 ? 0.5 : 1,
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            <Send size={12} /> SEND
          </button>
        </div>
      </div>
    </div>
  );
}

interface Turn {
  user: Message | null;
  refined: Message | null;
  assistant: Message | null;
}

function groupIntoTurns(messages: Message[]): Turn[] {
  const turns: Turn[] = [];
  let current: Turn = { user: null, refined: null, assistant: null };
  for (const m of messages) {
    if (m.role === "user") {
      if (current.user !== null) {
        turns.push(current);
        current = { user: null, refined: null, assistant: null };
      }
      current.user = m;
    } else if (m.role === "refined") {
      current.refined = m;
    } else if (m.role === "assistant") {
      current.assistant = m;
      turns.push(current);
      current = { user: null, refined: null, assistant: null };
    }
  }
  if (current.user !== null) turns.push(current);
  return turns;
}