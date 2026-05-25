import type { CSSProperties } from "react";

export const COLORS = {
  // Primary
  cyan: "#00d4ff",
  cyanRgb: "0,212,255",

  // Accents
  purple: "#7c3aed",
  purpleRgb: "124,58,237",
  green: "#00ff88",
  greenRgb: "0,255,136",
  red: "#ff3b5c",
  redRgb: "255,59,92",
  amber: "#ffb547",
  amberRgb: "255,181,71",

  // Text
  textPrimary: "#c8e6ff",
  textSecondary: "rgba(140,190,220,0.52)",
  textMuted: "rgba(100,160,210,0.45)",
  textFaint: "rgba(100,160,200,0.38)",

  // Surfaces
  panelBg: "rgba(6,14,32,0.82)",
  panelBorder: "rgba(0,212,255,0.11)",
  divider: "rgba(0,212,255,0.07)",

  // Inputs
  inputBg: "rgba(0,0,0,0.28)",
  inputBorder: "rgba(0,212,255,0.14)",
  inputBorderFocus: "rgba(0,212,255,0.35)",
} as const;

export const PANEL: CSSProperties = {
  background: COLORS.panelBg,
  border: `1px solid ${COLORS.panelBorder}`,
  borderRadius: "10px",
  backdropFilter: "blur(6px)",
};

export const MONO_LABEL: CSSProperties = {
  fontFamily: "monospace",
  fontSize: "9px",
  letterSpacing: "0.22em",
};

export const MONO_LABEL_LOOSE: CSSProperties = {
  fontFamily: "monospace",
  fontSize: "10px",
  letterSpacing: "0.1em",
};

export const SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 28,
} as const;

export function glow(rgb: string, opacity: number = 0.4): string {
  return `0 0 14px rgba(${rgb},${opacity})`;
}

export function softGlow(rgb: string, opacity: number = 0.08): string {
  return `0 0 20px rgba(${rgb},${opacity})`;
}