import type { JSX, ReactNode } from "react";
import { Nav } from "./Nav";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Activity, Zap } from "lucide-react";

interface LayoutProps {
  ownerName: string;
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1, y: 0,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0, y: -8,
    transition: { duration: 0.16 },
  },
};

function getPageLabel(pathname: string): string {
  if (pathname === "/") return "DASHBOARD";
  return pathname.replace("/", "").toUpperCase();
}

export function Layout({ ownerName, children }: LayoutProps): JSX.Element {
  const location = useLocation();

  return (
    <div style={{
      display: "flex",
      height: "100%",
      background: "#03060f",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Dot grid */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "radial-gradient(rgba(0,212,255,0.07) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        pointerEvents: "none",
        zIndex: 0,
      }} />

      {/* Ambient glow — top left */}
      <div style={{
        position: "absolute",
        top: "-140px", left: "-60px",
        width: "420px", height: "420px",
        background: "radial-gradient(circle, rgba(0,80,220,0.07) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Ambient glow — bottom right */}
      <div style={{
        position: "absolute",
        bottom: "-120px", right: "80px",
        width: "520px", height: "520px",
        background: "radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 65%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <Nav />

      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Top header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.38 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: "46px",
            flexShrink: 0,
            borderBottom: "1px solid rgba(0,212,255,0.09)",
            background: "rgba(3,8,20,0.97)",
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "rgba(0,212,255,0.28)", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.1em" }}>
              AXIS
            </span>
            <span style={{ color: "rgba(0,212,255,0.18)", fontSize: "11px" }}>/</span>
            <motion.span
              key={location.pathname}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              style={{ color: "rgba(0,212,255,0.65)", fontSize: "11px", fontFamily: "monospace", letterSpacing: "0.1em" }}
            >
              {getPageLabel(location.pathname)}
            </motion.span>
          </div>

          {/* Status indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Activity size={11} color="rgba(0,212,255,0.38)" />
              <span style={{ color: "rgba(0,212,255,0.38)", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.06em" }}>ACTIVE</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Zap size={11} color="rgba(0,255,136,0.45)" />
              <span style={{ color: "rgba(0,255,136,0.45)", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.06em" }}>CORE v0.1</span>
            </div>
            <div style={{
              padding: "3px 9px",
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.14)",
              borderRadius: "4px",
              fontSize: "10px",
              fontFamily: "monospace",
              color: "rgba(0,212,255,0.55)",
              letterSpacing: "0.06em",
            }}>
              {ownerName}
            </div>
          </div>
        </motion.header>

        {/* Page area */}
        <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ padding: "28px", minHeight: "100%" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
