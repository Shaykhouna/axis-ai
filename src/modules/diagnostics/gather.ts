import { getVersion } from "@tauri-apps/api/app";
import { platform, version, arch, type as osType } from "@tauri-apps/plugin-os";
//import { getDb } from "../core";
import type { Owner } from "../core";
import { getSettings } from "../settings";
import { listApiKeyRefs } from "../settings";
import { detectOllama } from "../router";
import { listSources } from "../vault";

export interface Diagnostics {
  app: {
    name: string;
    version: string;
  };
  os: {
    platform: string;
    type: string;
    arch: string;
    version: string;
  };
  owner: {
    id: string;
    displayName: string;
  };
  config: {
    onboardingCompleted: boolean;
    monthlyCostCapCents: number;
    catalogUrl: string;
    domainTag: string | null;
    preprocessorModel: string | null;
  };
  services: {
    configuredKeys: string[];
    ollamaReachable: boolean;
    ollamaModelCount: number;
  };
  vault: {
    sourcesCount: number;
    paths: string[];
  };
  timestamp: number;
}

export async function gatherDiagnostics(owner: Owner): Promise<Diagnostics> {
  const [appVersion, plat, ver, ar, typ, settings, keyRefs, ollama, vaultSources] =
    await Promise.all([
      getVersion(),
      platform(),
      version(),
      arch(),
      osType(),
      getSettings(owner.id),
      listApiKeyRefs(owner.id),
      detectOllama(),
      listSources(owner.id),
    ]);

  return {
    app: {
      name: "Axis-AI",
      version: appVersion,
    },
    os: {
      platform: plat,
      type: typ,
      arch: ar,
      version: ver,
    },
    owner: {
      id: owner.id,
      displayName: owner.display_name,
    },
    config: {
      onboardingCompleted: settings.onboarding_completed === 1,
      monthlyCostCapCents: settings.monthly_cost_cap_cents,
      catalogUrl: settings.model_catalog_url,
      domainTag: settings.user_domain_tag,
      preprocessorModel: settings.default_preprocessor_model_id,
    },
    services: {
      configuredKeys: keyRefs.map((r) => r.service),
      ollamaReachable: ollama.reachable,
      ollamaModelCount: ollama.installed_models.length,
    },
    vault: {
      sourcesCount: vaultSources.length,
      paths: vaultSources.map((v) => v.path),
    },
    timestamp: Math.floor(Date.now() / 1000),
  };
}