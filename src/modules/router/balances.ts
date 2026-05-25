import { readApiKeyValue } from "../settings";
import { getService } from "./services";

export interface ServiceBalance {
  service: string;
  service_display_name?: string;
  source: "api" | "manual" | "disabled";
  fetched_at: number;
  usage_dollars?: number;
  limit_dollars?: number | null;
  remaining_dollars?: number | null;
  is_free_tier?: boolean;
  manual_url?: string;
  reason?: string;
  error?: string;
}

interface OpenRouterAuthResponse {
  data?: {
    label?: string;
    usage?: number;
    limit?: number | null;
    is_free_tier?: boolean;
  };
  error?: { message: string };
}

const MANUAL_USAGE_URLS: Record<string, string> = {
  openai: "https://platform.openai.com/usage",
  anthropic: "https://console.anthropic.com/settings/billing",
  groq: "https://console.groq.com/settings/billing",
};

export async function fetchServiceBalance(
  ownerId: string,
  serviceId: string
): Promise<ServiceBalance> {
  const now = Math.floor(Date.now() / 1000);
  const service = await getService(serviceId);
  if (service === null) {
    return {
      service: serviceId,
      service_display_name: serviceId,
      source: "disabled",
      fetched_at: now,
      reason: "Service not in catalog",
    };
  }

  const apiKey = await readApiKeyValue(ownerId, serviceId);
  if (apiKey === null || apiKey.length === 0) {
    return {
      service: serviceId,
      service_display_name: service.display_name,
      source: "disabled",
      fetched_at: now,
      reason: "Key not configured",
    };
  }

  // If service has a balance endpoint, call it
  if (service.endpoints.balance !== null && service.auth_pattern !== null) {
    try {
      const res = await fetch(service.endpoints.balance, {
        method: "GET",
        headers: {
          Authorization: service.auth_pattern.replace("{key}", apiKey),
          ...(service.auth_extra_headers ?? {}),
        },
      });
      const data = (await res.json()) as OpenRouterAuthResponse;
      if (!res.ok || data.error !== undefined) {
        return {
          service: serviceId,
          service_display_name: service.display_name,
          source: "api",
          fetched_at: now,
          error: data.error?.message ?? `HTTP ${res.status}`,
        };
      }
      const usage = data.data?.usage ?? 0;
      const limit = data.data?.limit ?? null;
      return {
        service: serviceId,
        service_display_name: service.display_name,
        source: "api",
        fetched_at: now,
        usage_dollars: usage,
        limit_dollars: limit,
        remaining_dollars: limit !== null ? limit - usage : null,
        is_free_tier: data.data?.is_free_tier,
      };
    } catch (err) {
      return {
        service: serviceId,
        service_display_name: service.display_name,
        source: "api",
        fetched_at: now,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // No balance endpoint; offer manual link
  return {
    service: serviceId,
    service_display_name: service.display_name,
    source: "manual",
    fetched_at: now,
    manual_url: MANUAL_USAGE_URLS[serviceId],
  };
}


// export function getManualBalance(service: string): ServiceBalance {
//   return {
//     service,
//     source: "manual",
//     fetched_at: Math.floor(Date.now() / 1000),
//     manual_url: MANUAL_URLS[service],
//   };
// }