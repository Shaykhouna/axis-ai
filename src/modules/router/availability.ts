import { listApiKeyRefs } from "../settings";
import { getService, listServices } from "./services";
import type { ModelInfo } from "./types";

export async function getConfiguredServices(ownerId: string): Promise<Set<string>> {
  const [refs, allServices] = await Promise.all([
    listApiKeyRefs(ownerId),
    listServices(),
  ]);
  const set = new Set(refs.map((r) => r.service));
  // Keyless active services (Ollama and future local providers) count as
  // configured by virtue of needing no credential to use.
  for (const svc of allServices) {
    if (svc.status === "active" && svc.auth_pattern === null) {
      set.add(svc.id);
    }
  }
  return set;
}

// A model is available if at least one of its `available_via` services:
//  (1) exists in the catalog
//  (2) is status='active'
//  (3) has a configured key for this owner
export async function isModelAvailable(
  model: ModelInfo,
  configuredServices: Set<string>
): Promise<boolean> {
  for (const via of model.available_via) {
    if (!configuredServices.has(via)) continue;
    const svc = await getService(via);
    if (svc !== null && svc.status === "active") return true;
  }
  return false;
}

export async function missingKeysFor(
  model: ModelInfo,
  configuredServices: Set<string>
): Promise<string[]> {
  const missing: string[] = [];
  for (const via of model.available_via) {
    if (configuredServices.has(via)) continue;
    const svc = await getService(via);
    if (svc !== null && svc.status === "active") missing.push(via);
  }
  return missing;
}