import { JSX } from "react";
import { motion } from "framer-motion";
import { Lock, Clock, Radio } from "lucide-react";

interface ComingSoonProps {
  module: string;
}

export function ComingSoon({ module }: ComingSoonProps): JSX.Element {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "62vh",
    }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        style={{ textAlign: "center" }}
      >
        {/* Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 28px",
            background: "rgba(6,14,32,0.9)",
            border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 24px rgba(0,212,255,0.08)",
          }}
        >
          <Lock size={26} color="rgba(0,212,255,0.45)" />
        </motion.div>

        {/* Labels */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div style={{
            color: "rgba(0,212,255,0.35)",
            fontSize: "9px",
            fontFamily: "monospace",
            letterSpacing: "0.28em",
            marginBottom: "8px",
          }}>
            MODULE OFFLINE
          </div>

          <h1 style={{
            color: "#c8e6ff",
            fontSize: "26px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "12px",
          }}>
            {module}
          </h1>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "14px",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              color: "rgba(100,160,200,0.4)",
              fontSize: "10px",
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}>
              <Clock size={10} />
              <span>PENDING INIT</span>
            </div>
            <div style={{ width: "1px", height: "10px", background: "rgba(0,212,255,0.12)" }} />
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              color: "rgba(100,160,200,0.4)",
              fontSize: "10px",
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}>
              <Radio size={10} />
              <span>BUILD QUEUE</span>
            </div>
          </div>
        </motion.div>

        {/* Static progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.32, duration: 0.3 }}
          style={{ marginTop: "32px", width: "200px", margin: "32px auto 0" }}
        >
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "5px",
          }}>
            <span style={{
              color: "rgba(0,212,255,0.28)",
              fontSize: "9px",
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}>
              INITIALIZATION PROGRESS
            </span>
            <span style={{
              color: "rgba(0,212,255,0.28)",
              fontSize: "9px",
              fontFamily: "monospace",
            }}>
              0%
            </span>
          </div>
          <div style={{
            height: "2px",
            background: "rgba(0,212,255,0.07)",
            borderRadius: "1px",
          }} />
        </motion.div>
      </motion.div>
    </div>
  );
}
