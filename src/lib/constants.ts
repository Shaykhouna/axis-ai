// SQLite path. Tauri resolves "sqlite:<name>.db" to the app's data dir per OS.
export const DB_URL = "sqlite:axisai.db";

// Seeded on first launch. User can add, remove, or rename later.
export const DEFAULT_DOMAINS = [
  { name: "software", description: "Code, architecture, debugging" },
  { name: "research", description: "Synthesis, summarisation, literature" },
  { name: "writing", description: "Drafting, editing, communication" },
  { name: "design", description: "UX, visual, product design" },
  { name: "other", description: "Uncategorised" },
] as const;