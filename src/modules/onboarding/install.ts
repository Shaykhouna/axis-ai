import { createAgent } from "../agents";
import { STARTER_AGENTS, type StarterAgent } from "./starter-pack";

export interface ApiKeyTestResult {
  ok: boolean;
  error: string | null;
  latencyMs: number;
}

export async function testApiKey(
  service: string,
  key: string
): Promise<ApiKeyTestResult> {
  const trimmed = key.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Key is empty", latencyMs: 0 };
  }
  const startedAt = performance.now();
  try {
    let res: Response;
    if (service === "openrouter") {
      res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
    } else if (service === "openai") {
      res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${trimmed}` },
      });
    } else {
      return { ok: false, error: `Unknown service: ${service}`, latencyMs: 0 };
    }
    const latencyMs = Math.floor(performance.now() - startedAt);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "Key rejected (unauthorized)", latencyMs };
    }
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}`, latencyMs };
    }
    return { ok: true, error: null, latencyMs };
  } catch (err) {
    const latencyMs = Math.floor(performance.now() - startedAt);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs,
    };
  }
}

export async function installStarterAgents(
  ownerId: string,
  selectedSlugs: Set<string>
): Promise<{ installed: number; failed: Array<{ slug: string; error: string }> }> {
  const failed: Array<{ slug: string; error: string }> = [];
  let installed = 0;
  for (const agent of STARTER_AGENTS) {
    if (!selectedSlugs.has(agent.slug)) continue;
    try {
      await installOne(ownerId, agent);
      installed++;
    } catch (err) {
      failed.push({
        slug: agent.slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { installed, failed };
}

async function installOne(ownerId: string, agent: StarterAgent): Promise<void> {
  await createAgent(
    ownerId, 
    {
      name: agent.name,
      domain: agent.domain,
      model_id: agent.model_id,
      system_prompt: agent.system_prompt,
      temperature: agent.temperature,
      max_tokens: 1024,
      use_vault_context: agent.use_vault_context,
      vault_top_k: 0
    }
  );
}