import { getDb } from "../core";

function formatLocalDisplayName(m: OllamaModel): string {
  const parts = m.name.split(":");
  const base = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  const variant = parts[1] !== undefined ? ` ${parts[1].toUpperCase()}` : "";
  return `${base}${variant} (Local)`;
}

export interface OllamaModel {
  name: string;
  size_bytes: number;
  family: string;
  parameter_size: string;
}

export interface OllamaStatus {
  reachable: boolean;
  base_url: string;
  installed_models: OllamaModel[];
  error: string | null;
}

const OLLAMA_BASE_URL = "http://localhost:11434";
const DETECTION_TIMEOUT_MS = 2000;

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    size?: number;
    details?: { family?: string; parameter_size?: string };
  }>;
}

function estimateContextWindow(m: OllamaModel): number {
  const name = m.name.toLowerCase();
  if (name.startsWith("llama3.2")) return 131072;
  if (name.startsWith("llama3.1")) return 131072;
  if (name.startsWith("llama3")) return 8192;
  if (name.startsWith("qwen2.5")) return 32768;
  if (name.startsWith("qwen3")) return 32768;
  if (name.startsWith("phi3")) return 128000;
  if (name.startsWith("phi4")) return 16384;
  if (name.startsWith("gemma2")) return 8192;
  if (name.startsWith("gemma3")) return 131072;
  if (name.startsWith("mistral")) return 32768;
  return 8192;
}

// Upsert installed Ollama models into the catalog so the Router and pickers
// recognize them. Cost = 0, available_via = ["ollama"]. Idempotent.
export async function autoRegisterInstalledModels(
  installed: OllamaModel[]
): Promise<number> {
  if (installed.length === 0) return 0;
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  let count = 0;
  for (const m of installed) {
    const modelId = `ollama/${m.name}`;
    const displayName = formatLocalDisplayName(m);
    const ctx = estimateContextWindow(m);
    const provider = m.family !== "unknown" ? m.family : "ollama";
    await db.execute(
      `INSERT INTO models
         (id, provider, display_name, context_window,
          input_cost_per_million, output_cost_per_million,
          capabilities, available_via, status, synced_at, type, embedding_dim)
       VALUES (?, ?, ?, ?, 0, 0, '[]', '["ollama"]', 'active', ?, 'chat', NULL)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         context_window = excluded.context_window,
         synced_at = excluded.synced_at`,
      [modelId, provider, displayName, ctx, now]
    );
    count++;
  }
  return count;
}

export async function detectOllama(): Promise<OllamaStatus> {
  const result: OllamaStatus = {
    reachable: false,
    base_url: OLLAMA_BASE_URL,
    installed_models: [],
    error: null,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DETECTION_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      result.error = `HTTP ${res.status}`;
      return result;
    }

    const json = (await res.json()) as OllamaTagsResponse;
    result.reachable = true;
    result.installed_models = (json.models ?? []).map((m) => ({
      name: m.name ?? "unknown",
      size_bytes: m.size ?? 0,
      family: m.details?.family ?? "unknown",
      parameter_size: m.details?.parameter_size ?? "?",
    }));
    
    // Auto-register installed models so the catalog reflects local reality.
    await autoRegisterInstalledModels(result.installed_models);

    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    result.error = msg.includes("aborted")
      ? "Connection timed out (Ollama not running?)"
      : msg;
    return result;
  }
}

// Models the user can pick as preprocessor: union of catalog entries and installed models.
// Catalog gives us display names and context windows; installed models are always included
// even if they have no catalog entry.
export function intersectInstalledWithCatalog(
  installed: OllamaModel[],
  catalogModels: Array<{ id: string; display_name: string; context_window: number }>
): Array<{ id: string; display_name: string; context_window: number; installed: boolean }> {
  const installedNames = new Set(installed.map((m) => m.name));

  const catalogEntries = catalogModels
    .filter((m) => m.id.startsWith("ollama/"))
    .map((m) => ({
      id: m.id,
      display_name: m.display_name,
      context_window: m.context_window,
      installed: installedNames.has(m.id.slice("ollama/".length)),
    }));

  const catalogIds = new Set(catalogEntries.map((e) => e.id));

  // Add installed models that have no catalog entry
  const uncataloged = installed
    .filter((m) => !catalogIds.has(`ollama/${m.name}`))
    .map((m) => ({
      id: `ollama/${m.name}`,
      display_name: m.name,
      context_window: 0,
      installed: true,
    }));

  return [...catalogEntries, ...uncataloged];
}