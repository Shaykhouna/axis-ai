import { useState, useEffect, JSX } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./routes/Dashboard";
import { ComingSoon } from "./routes/ComingSoon";
import { provisionOwner, type Owner } from "./modules/core";
import { SettingsPage } from "./routes/SettingsPage";
import { VaultPage } from "./modules/vault";
import { AgentsPage } from "./modules/agents";
import { LabPage } from "./modules/lab";
import { ProcessesPage } from "./modules/processes";
import { ChatPage } from "./routes/ChatPage"
import { MessageSquare } from "lucide-react"

export default function App(): JSX.Element {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    provisionOwner()
      .then((o) => {
        if (!cancelled) setOwner(o);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error !== null) {
    return (
      <div style={{
        padding: "40px",
        background: "#03060f",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{ color: "rgba(255,59,92,0.8)", fontSize: "14px", fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.1em" }}>
          STARTUP ERROR
        </div>
        <pre style={{ color: "rgba(255,100,120,0.7)", fontSize: "12px", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          {error}
        </pre>
      </div>
    );
  }

  if (owner === null) {
    return (
      <div style={{
        height: "100%",
        background: "#03060f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{
          width: "32px", height: "32px",
          border: "1px solid rgba(0,212,255,0.18)",
          borderTopColor: "rgba(0,212,255,0.65)",
          borderRadius: "50%",
          animation: "spin 0.9s linear infinite",
        }} />
        <div style={{ color: "rgba(0,212,255,0.3)", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.18em" }}>
          INITIALISING…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout ownerName={owner.display_name}>
        <Routes>
          <Route path="/" element={<Dashboard owner={owner} />} />
          <Route path="/lab" element={<LabPage owner={owner} />} />
          <Route path="/processes" element={<ProcessesPage owner={owner} />} />
          <Route path="/agents" element={<AgentsPage owner={owner} />} />
          <Route path="/vault" element={<VaultPage owner={owner} />} />
          <Route path="/settings" element={<SettingsPage owner={owner}/>} />
          <Route path="/coming-soon" element={<ComingSoon module="Coming Soon" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/chat" element={<ChatPage owner={owner}/>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}