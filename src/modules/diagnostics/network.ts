import { getDb } from "../core";
import { listApiKeyRefs, getSettings } from "../settings";
import { detectOllama } from "../router";

export type NetworkCategory = "required" | "user-configured" | "auto-update" | "local";

export interface NetworkEntry {
  id: string;
  domain: string;
  category: NetworkCategory;
  purpose: string;
  triggeredBy: string;
  canDisable: boolean;
  disableHow: string | null;
  configuredKey?: string;       // which service key controls this
}

// All outbound calls Axis-AI ever makes. Anything not here, we don't make.
export const NETWORK_MANIFEST: NetworkEntry[] = [
  {
    id: "openrouter",
    domain: "openrouter.ai",
    category: "user-configured",
    purpose: "LLM API calls (chat completions, balance check)",
    triggeredBy: "Running an agent or Process configured to use an OpenRouter model",
    canDisable: true,
    disableHow: "Remove OpenRouter key in Settings → API Keys",
    configuredKey: "openrouter",
  },
  {
    id: "openai",
    domain: "api.openai.com",
    category: "user-configured",
    purpose: "LLM API calls (chat completions, embeddings)",
    triggeredBy: "Running an agent on an OpenAI model, or syncing the vault",
    canDisable: true,
    disableHow: "Remove OpenAI key in Settings → API Keys",
    configuredKey: "openai",
  },
  {
    id: "catalog",
    domain: "raw.githubusercontent.com",
    category: "user-configured",
    purpose: "Fetching the model catalog manifest (which models exist + their pricing)",
    triggeredBy: "Clicking SYNC NOW in Settings → Catalog, or app first launch",
    canDisable: true,
    disableHow: "Sync is manual. App works offline with bootstrapped catalog if you never sync.",
  },
  {
    id: "updater-manifest",
    domain: "github.com",
    category: "auto-update",
    purpose: "Checking for new Axis-AI releases (latest.json)",
    triggeredBy: "App launch, or Settings → Updates → Check for Updates",
    canDisable: false,
    disableHow: null,
  },
  {
    id: "updater-binary",
    domain: "github.com (release assets)",
    category: "auto-update",
    purpose: "Downloading update installers",
    triggeredBy: "User accepts an update prompt",
    canDisable: true,
    disableHow: "Decline the update dialog when it appears",
  },
  {
    id: "ollama",
    domain: "localhost:11434",
    category: "local",
    purpose: "Local LLM inference (preprocessor for Chat). Never leaves your machine.",
    triggeredBy: "Sending a message in a chat conversation",
    canDisable: true,
    disableHow: "Don't install Ollama, or don't use the Chat feature",
  },
];

export interface NetworkUsageStats {
  service: string;
  totalCalls: number;
  recentCallsLast24h: number;
  lastCallAt: number | null;
}

// Real call counts from router_calls — proof of what actually got called.
export async function getNetworkUsageStats(): Promise<NetworkUsageStats[]> {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  const dayAgo = now - 86400;
  const rows = await db.select<Array<{
    service: string;
    total: number;
    recent: number;
    last_at: number | null;
  }>>(
    `SELECT
       service,
       COUNT(*) AS total,
       SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS recent,
       MAX(created_at) AS last_at
     FROM router_calls
     GROUP BY service
     ORDER BY total DESC`,
    [dayAgo]
  );
  return rows.map((r) => ({
    service: r.service,
    totalCalls: r.total,
    recentCallsLast24h: r.recent,
    lastCallAt: r.last_at,
  }));
}

export interface NetworkSummary {
  totalUniqueDomains: number;
  manifestEntries: NetworkEntry[];
  enabledServices: Set<string>;
  usage: Map<string, NetworkUsageStats>;
  telemetry: false;  // const — there is none
}

export async function buildNetworkSummary(ownerId: string): Promise<NetworkSummary> {
  const [keyRefs, settings, ollamaStatus, usage] = await Promise.all([
    listApiKeyRefs(ownerId),
    getSettings(ownerId),
    detectOllama(),
    getNetworkUsageStats(),
  ]);
  const configured = new Set(keyRefs.map((r) => r.service));
  if (ollamaStatus.reachable) configured.add("ollama");
  // Catalog is "enabled" if user has ever synced (model_catalog_last_synced_at not null)
  if (settings.model_catalog_last_synced_at !== null) configured.add("catalog");
  // Updater is always enabled
  configured.add("updater-manifest");

  const usageMap = new Map<string, NetworkUsageStats>();
  for (const u of usage) {
    usageMap.set(u.service, u);
  }

  return {
    totalUniqueDomains: NETWORK_MANIFEST.length,
    manifestEntries: NETWORK_MANIFEST,
    enabledServices: configured,
    usage: usageMap,
    telemetry: false,
  };
}