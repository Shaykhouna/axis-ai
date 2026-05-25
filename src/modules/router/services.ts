import { getDb } from "../core";
import type { Service, ServiceEndpoints, ServiceStatus } from "./types";

interface ServiceRow {
  id: string;
  display_name: string;
  status: string;
  endpoints: string;
  auth_pattern: string | null;
  auth_extra_headers: string | null;
  key_url: string | null;
  key_prefix_hint: string | null;
  synced_at: number;
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    display_name: row.display_name,
    status: row.status as ServiceStatus,
    endpoints: JSON.parse(row.endpoints) as ServiceEndpoints,
    auth_pattern: row.auth_pattern,
    auth_extra_headers: row.auth_extra_headers !== null
      ? (JSON.parse(row.auth_extra_headers) as Record<string, string>)
      : null,
    key_url: row.key_url,
    key_prefix_hint: row.key_prefix_hint,
    synced_at: row.synced_at,
  };
}

export async function listServices(): Promise<Service[]> {
  const db = await getDb();
  const rows = await db.select<ServiceRow[]>(
    "SELECT * FROM services ORDER BY status ASC, id ASC"
  );
  return rows.map(rowToService);
}

export async function getService(id: string): Promise<Service | null> {
  const db = await getDb();
  const rows = await db.select<ServiceRow[]>(
    "SELECT * FROM services WHERE id = ? LIMIT 1",
    [id]
  );
  return rows.length === 0 ? null : rowToService(rows[0]);
}

export interface ServiceManifestEntry {
  id: string;
  display_name: string;
  status?: ServiceStatus;
  endpoints?: Partial<ServiceEndpoints>;
  auth_pattern?: string;
  auth_extra_headers?: Record<string, string>;
  key_url?: string;
  key_prefix_hint?: string;
}

export async function upsertServicesFromManifest(
  entries: ServiceManifestEntry[]
): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  for (const e of entries) {
    const endpoints: ServiceEndpoints = {
      chat: e.endpoints?.chat ?? null,
      embed: e.endpoints?.embed ?? null,
      balance: e.endpoints?.balance ?? null,
    };
    await db.execute(
      `INSERT INTO services
         (id, display_name, status, endpoints, auth_pattern, auth_extra_headers,
          key_url, key_prefix_hint, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         status = excluded.status,
         endpoints = excluded.endpoints,
         auth_pattern = excluded.auth_pattern,
         auth_extra_headers = excluded.auth_extra_headers,
         key_url = excluded.key_url,
         key_prefix_hint = excluded.key_prefix_hint,
         synced_at = excluded.synced_at`,
      [
        e.id,
        e.display_name,
        e.status ?? "active",
        JSON.stringify(endpoints),
        e.auth_pattern ?? null,
        e.auth_extra_headers !== undefined ? JSON.stringify(e.auth_extra_headers) : null,
        e.key_url ?? null,
        e.key_prefix_hint ?? null,
        now,
      ]
    );
  }
}

// Picks a usable service for a given model from the user's perspective.
// Returns the first available_via that: (1) exists as a service, (2) is active,
// (3) has a configured key for this owner. Returns null if none qualify.
export async function pickServiceForModel(
  availableVia: string[],
  configuredServices: Set<string>
): Promise<Service | null> {
  for (const serviceId of availableVia) {
    if (!configuredServices.has(serviceId)) continue;
    const svc = await getService(serviceId);
    if (svc === null) continue;
    if (svc.status !== "active") continue;
    return svc;
  }
  return null;
}

// Translates a catalog model ID into the wire format expected by a specific service.
// Convention: catalog IDs are namespaced "{provider}/{model}". Gateway services
// (OpenRouter) accept the namespaced form as-is. Direct provider APIs want the
// bare model name without the namespace. We strip the prefix iff it matches the
// service ID.
//
// Examples:
//   modelIdForService("openai/text-embedding-3-small", "openai")     -> "text-embedding-3-small"
//   modelIdForService("openai/text-embedding-3-small", "openrouter") -> "openai/text-embedding-3-small"
//   modelIdForService("anthropic/claude-sonnet-4", "anthropic")      -> "claude-sonnet-4"
//   modelIdForService("anthropic/claude-sonnet-4", "openrouter")     -> "anthropic/claude-sonnet-4"
export function modelIdForService(modelId: string, serviceId: string): string {
  const slashIdx = modelId.indexOf("/");
  if (slashIdx === -1) return modelId;
  const prefix = modelId.slice(0, slashIdx);
  if (prefix === serviceId) {
    return modelId.slice(slashIdx + 1);
  }
  return modelId;
}