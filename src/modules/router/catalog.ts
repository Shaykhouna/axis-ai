import { getDb } from "../core";
import { getSettings, updateSettings } from "../settings";
import { upsertServicesFromManifest, type ServiceManifestEntry } from "./services";
import type { ModelInfo, ModelType } from "./types";


interface ManifestEntry {
  id: string;
  type?: ModelType;
  provider: string;
  display_name: string;
  context_window: number;
  input_cost_per_million: number;
  output_cost_per_million: number;
  capabilities: string[];
  available_via: string[];
  status?: "active" | "deprecated" | "experimental";
  embedding_dim?: number;
}

interface Manifest {
  version: string;
  services?: ServiceManifestEntry[];
  models: ManifestEntry[];
}

export interface SyncResult {
  count: number;
  services_count: number;
  source: "remote" | "fallback";
  fallbackReason: string | null;
}

// Bundled fallback used when the remote manifest is unreachable on first sync.
// Keeps the app usable on first launch before the user has pushed their own manifest.
const EMBEDDED_FALLBACK_MODELS: ManifestEntry[] = [
  {
    id: "anthropic/claude-sonnet-4", type: "chat", provider: "anthropic",
    display_name: "Claude Sonnet 4",
    context_window: 200000,
    input_cost_per_million: 300, output_cost_per_million: 1500,
    capabilities: ["tools", "vision", "long-context"],
    available_via: ["openrouter"], status: "active",
  },
  {
    id: "anthropic/claude-haiku-4-5", type: "chat", provider: "anthropic",
    display_name: "Claude Haiku 4.5",
    context_window: 200000,
    input_cost_per_million: 100, output_cost_per_million: 500,
    capabilities: ["tools"],
    available_via: ["openrouter"], status: "active",
  },
  {
    id: "openai/gpt-4o-mini", type: "chat", provider: "openai",
    display_name: "GPT-4o Mini",
    context_window: 128000,
    input_cost_per_million: 15, output_cost_per_million: 60,
    capabilities: ["tools", "vision"],
    available_via: ["openrouter"], status: "active",
  },
  {
    id: "google/gemini-2.0-flash-exp", type: "chat", provider: "google",
    display_name: "Gemini 2.0 Flash",
    context_window: 1000000,
    input_cost_per_million: 10, output_cost_per_million: 40,
    capabilities: ["tools", "vision", "long-context"],
    available_via: ["openrouter"], status: "active",
  },
  {
    id: "openai/text-embedding-3-small", type: "embedding", provider: "openai",
    display_name: "OpenAI Embedding · Small",
    context_window: 8191,
    input_cost_per_million: 2, output_cost_per_million: 0,
    capabilities: [],
    available_via: ["openai"], status: "active",
    embedding_dim: 1536,
  },
];

export async function syncCatalog(ownerId: string): Promise<SyncResult> {
  const settings = await getSettings(ownerId);
  let manifest: Manifest;
  let source: "remote" | "fallback";
  let fallbackReason: string | null = null;

  try {
    const res = await fetch(settings.model_catalog_url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as Manifest;
    if (!Array.isArray(json.models)) {
      throw new Error("Invalid manifest: missing 'models' array");
    }
    manifest = json;
    source = "remote";
  } catch (err) {
    manifest = { version: "embedded", models: EMBEDDED_FALLBACK_MODELS };
    source = "fallback";
    fallbackReason = err instanceof Error ? err.message : String(err);
  }

  // Sync services if present in manifest (new format). Old-format manifests
  // rely on the migration-seeded service rows.
  let servicesCount = 0;
  if (Array.isArray(manifest.services) && manifest.services.length > 0) {
    await upsertServicesFromManifest(manifest.services);
    servicesCount = manifest.services.length;
  }

  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);

  for (const e of manifest.models) {
    await db.execute(
      `INSERT INTO models (id, provider, display_name, context_window,
         input_cost_per_million, output_cost_per_million, capabilities,
         available_via, status, synced_at, type, embedding_dim)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         provider = excluded.provider,
         display_name = excluded.display_name,
         context_window = excluded.context_window,
         input_cost_per_million = excluded.input_cost_per_million,
         output_cost_per_million = excluded.output_cost_per_million,
         capabilities = excluded.capabilities,
         available_via = excluded.available_via,
         status = excluded.status,
         synced_at = excluded.synced_at,
         type = excluded.type,
         embedding_dim = excluded.embedding_dim`,
      [
        e.id, e.provider, e.display_name, e.context_window,
        e.input_cost_per_million, e.output_cost_per_million,
        JSON.stringify(e.capabilities), JSON.stringify(e.available_via),
        e.status ?? "active", now,
        e.type ?? "chat",
        e.embedding_dim ?? null,
      ]
    );
  }

  await updateSettings(ownerId, { model_catalog_last_synced_at: now });
  return { count: manifest.models.length, services_count: servicesCount, source, fallbackReason };
}

interface ModelRow {
  id: string;
  provider: string;
  display_name: string;
  context_window: number;
  input_cost_per_million: number;
  output_cost_per_million: number;
  capabilities: string;
  available_via: string;
  status: "active" | "deprecated" | "experimental";
  synced_at: number;
  type: ModelType;
  embedding_dim: number | null;
}

function rowToModel(row: ModelRow): ModelInfo {
  return {
    id: row.id,
    provider: row.provider,
    display_name: row.display_name,
    context_window: row.context_window,
    input_cost_per_million: row.input_cost_per_million,
    output_cost_per_million: row.output_cost_per_million,
    capabilities: JSON.parse(row.capabilities) as string[],
    available_via: JSON.parse(row.available_via) as string[],
    status: row.status,
    synced_at: row.synced_at,
    type: row.type,
    embedding_dim: row.embedding_dim,
  };
}

export async function listModels(modelType: ModelType | "all" = "chat"): Promise<ModelInfo[]> {
  const db = await getDb();
  const sql = modelType === "all"
    ? "SELECT * FROM models WHERE status = 'active' ORDER BY provider, id"
    : "SELECT * FROM models WHERE status = 'active' AND type = ? ORDER BY provider, id";
  const params = modelType === "all" ? [] : [modelType];
  const rows = await db.select<ModelRow[]>(sql, params);
  const catalogModels = rows.map(rowToModel);

  // Also include installed Ollama models not in catalog
  if (modelType === "chat" || modelType === "all") {
    try {
      const { detectOllama } = await import("./local");
      const ollamaStatus = await detectOllama();
      if (ollamaStatus.reachable && ollamaStatus.installed_models.length > 0) {
        const catalogIds = new Set(catalogModels.map((m) => m.id));
        const uncatalogedOllama = ollamaStatus.installed_models
          .filter((m) => !catalogIds.has(`ollama/${m.name}`))
          .map((m): ModelInfo => ({
            id: `ollama/${m.name}`,
            provider: "ollama",
            display_name: m.name,
            context_window: 0,
            input_cost_per_million: 0,
            output_cost_per_million: 0,
            capabilities: [],
            available_via: ["ollama"],
            status: "active",
            synced_at: Date.now(),
            type: "chat",
            embedding_dim: null,
          }));
        catalogModels.push(...uncatalogedOllama);
      }
    } catch {
      // Ollama detection failed or unavailable, continue with catalog models only
    }
  }

  return catalogModels;
}

export async function getModel(id: string): Promise<ModelInfo | null> {
  const db = await getDb();
  const rows = await db.select<ModelRow[]>(
    "SELECT * FROM models WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length === 0 ? null : rowToModel(rows[0]);
}