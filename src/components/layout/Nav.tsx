import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Workflow,
  Bot,
  Database,
  Settings as SettingsIcon,
  Cpu,
  ShieldQuestionMark,
  //icons,
  MessageSquare,
} from "lucide-react";
import { JSX } from "react";
import { motion } from "framer-motion";
//import { label } from "framer-motion/client";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/lab", label: "Lab", icon: FlaskConical },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/processes", label: "Processes", icon: Workflow },
  { to: "/vault", label: "Vault", icon: Database },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  //{ to: "/Feedback", label: "Feedbacks", icon: ShieldQuestionMark },
  { to: "/coming-soon", label: "Coming Soon", icon: ShieldQuestionMark },
] as const;

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.065, delayChildren: 0.3 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 320, damping: 26 } },
};

export function Nav(): JSX.Element {
  return (
    <motion.nav
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 28 }}
      style={{
        width: "220px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, rgba(3,8,20,0.99) 0%, rgba(4,11,26,0.99) 100%)",
        borderRight: "1px solid rgba(0,212,255,0.11)",
        position: "relative",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* Top-left corner bracket */}
      <div style={{
        position: "absolute",
        top: 0, left: 0,
        width: "36px", height: "36px",
        borderTop: "1px solid rgba(0,212,255,0.4)",
        borderLeft: "1px solid rgba(0,212,255,0.4)",
        pointerEvents: "none",
      }} />

      {/* Right edge glow */}
      <motion.div
        animate={{ opacity: [0.25, 0.7, 0.25] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          right: 0, top: "18%", bottom: "18%",
          width: "1px",
          background: "linear-gradient(180deg, transparent, rgba(0,212,255,0.55), transparent)",
          filter: "blur(1px)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div style={{ padding: "22px 18px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            style={{
              width: "36px", height: "36px",
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.32)",
              borderRadius: "8px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 0 14px rgba(0,212,255,0.18), inset 0 0 8px rgba(0,212,255,0.05)",
            }}
          >
            <Cpu size={16} color="#00d4ff" />
          </motion.div>
          <div>
            <div style={{
              color: "#00d4ff",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.2em",
              fontFamily: "monospace",
              lineHeight: 1.2,
              textShadow: "0 0 10px rgba(0,212,255,0.5)",
            }}>
              AXIS
            </div>
            <div style={{
              color: "rgba(0,212,255,0.32)",
              fontSize: "8px",
              letterSpacing: "0.22em",
              fontFamily: "monospace",
            }}>
              HYPER·INTELLIGENCE
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div style={{
        height: "1px",
        background: "linear-gradient(90deg, rgba(0,212,255,0.28), rgba(0,212,255,0.03))",
        margin: "0 18px 10px",
      }} />

      {/* Nav items */}
      <motion.ul
        variants={listVariants}
        initial="hidden"
        animate="show"
        style={{ flex: 1, padding: "4px 8px" }}
      >
        {NAV_ITEMS.map((navItem) => (
          <motion.li key={navItem.to} variants={itemVariants}>
            <NavLink
              to={navItem.to}
              end={navItem.to === "/"}
              style={{ display: "block", textDecoration: "none", marginBottom: "2px" }}
            >
              {({ isActive }) => (
                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "#00d4ff" : "rgba(140,190,220,0.52)",
                    background: isActive ? "rgba(0,212,255,0.07)" : "transparent",
                    border: `1px solid ${isActive ? "rgba(0,212,255,0.18)" : "transparent"}`,
                    position: "relative",
                    cursor: "pointer",
                    transition: "color 0.2s, background 0.2s, border-color 0.2s",
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-bar"
                      style={{
                        position: "absolute",
                        left: "1px", top: "20%", bottom: "20%",
                        width: "2px",
                        background: "linear-gradient(180deg, transparent, #00d4ff, transparent)",
                        borderRadius: "0 2px 2px 0",
                        boxShadow: "0 0 8px rgba(0,212,255,0.8), 0 0 16px rgba(0,212,255,0.3)",
                      }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <navItem.icon
                    size={14}
                    style={{
                      opacity: isActive ? 1 : 0.42,
                      flexShrink: 0,
                      filter: isActive ? "drop-shadow(0 0 4px rgba(0,212,255,0.9))" : "none",
                    }}
                  />
                  <span style={{ letterSpacing: "0.04em" }}>{navItem.label}</span>
                </motion.div>
              )}
            </NavLink>
          </motion.li>
        ))}
      </motion.ul>

      {/* Bottom status */}
      <div style={{
        padding: "14px 18px",
        borderTop: "1px solid rgba(0,212,255,0.07)",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <motion.div
          animate={{ opacity: [1, 0.25, 1], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          style={{
            width: "5px", height: "5px",
            borderRadius: "50%",
            background: "#00ff88",
            boxShadow: "0 0 7px rgba(0,255,136,0.8)",
            flexShrink: 0,
          }}
        />
        <span style={{
          color: "rgba(0,255,136,0.38)",
          fontSize: "9px",
          fontFamily: "monospace",
          letterSpacing: "0.14em",
        }}>
          SYSTEM ONLINE
        </span>
      </div>
    </motion.nav>
  );
}
