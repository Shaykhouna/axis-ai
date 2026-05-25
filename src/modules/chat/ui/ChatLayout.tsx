import { JSX, useEffect, useState } from "react";
import { ConversationList } from "./ConversationList";
import { ConversationView } from "./ConversationView";
import { listConversations } from "../conversations";
import { Owner } from "../../core";
import { COLORS } from "../../../lib/theme";
import type { Conversation } from "../types";

interface ChatLayoutProps {
    owner: Owner
}

export function ChatLayout({owner}: ChatLayoutProps): JSX.Element {
  //const owner = useOwner();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload(): Promise<void> {
    if (owner === null) return;
    const list = await listConversations(owner.id);
    setConversations(list);
    setLoading(false);
    if (activeId === null && list.length > 0) setActiveId(list[0].id);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => { if (!cancelled) await reload(); })();
    return () => { cancelled = true; };
  }, [owner?.id]);

  if (loading || owner === null) {
    return (
      <div style={{ padding: "24px", color: COLORS.textFaint, fontSize: "12px" }}>
        Loading conversations…
      </div>
    );
  }

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 60px)",
      minHeight: 0,
    }}>
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        ownerId={owner.id}
        onSelect={setActiveId}
        onConversationCreated={async (conv) => {
          await reload();
          setActiveId(conv.id);
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeConv === null ? (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            height: "100%", color: COLORS.textFaint, fontSize: "13px",
          }}>
            Select a conversation, or start a new one.
          </div>
        ) : (
          <ConversationView
            key={activeConv.id}
            conversation={activeConv}
            ownerId={owner.id}
            onTurnComplete={reload}
          />
        )}
      </div>
    </div>
  );
}