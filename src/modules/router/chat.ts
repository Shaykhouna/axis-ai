import { readApiKeyValue } from "../settings";
import { getModel } from "./catalog";
import { pickServiceForModel, modelIdForService } from "./services";
import { estimateCostCents, assertBudgetAvailable } from "./billing";
import { logCall } from "./calls";
import { getConfiguredServices } from "./availability"
import {
  BudgetExceededError,
  type ChatMessage,
  type ChatParams,
  type ChatResult,
} from "./types";

interface OpenAICompatResponse {
  choices?: Array<{ message: { role: string; content: string } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
  error?: { message: string };
}

// const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// interface OpenRouterResponse {
//   choices?: Array<{
//     message: { role: string; content: string };
//     finish_reason?: string;
//   }>;
//   usage?: {
//     prompt_tokens: number;
//     completion_tokens: number;
//     total_tokens: number;
//   };
//   error?: { message: string; code?: number };
// }

export async function chat(params: ChatParams): Promise<ChatResult> {
  const model = await getModel(params.modelId);
  if (model === null) {
    throw new Error(`Model not in catalog: ${params.modelId}. Sync catalog first.`);
  }
  if (model.type !== "chat") {
    throw new Error(`Model ${params.modelId} is type='${model.type}', not chat.`);
  }

  //const refs = await listApiKeyRefs(params.ownerId);
  const configured = await getConfiguredServices(params.ownerId);
  const service = await pickServiceForModel(model.available_via, configured);
  if (service === null) {
    throw new Error(
      `No usable service for ${params.modelId}. Configure a key for one of: ${model.available_via.join(", ")}.`
    );
  }
  if (service.endpoints.chat === null) {
    throw new Error(`Service ${service.id} doesn't expose a chat endpoint.`);
  }
  //if (service.auth_pattern === null) {
  //  throw new Error(`Service ${service.id} is misconfigured (no auth_pattern).`);
  //}

  const needsAuth = service.auth_pattern !== null && service.auth_pattern.length > 0;
  let apiKey: string | null = null;
  if (needsAuth) {
    apiKey = await readApiKeyValue(params.ownerId, service.id);
    if (apiKey === null || apiKey.length === 0) {
      throw new Error(`${service.display_name} key not configured.`);
    }
  }

  //const apiKey = await readApiKeyValue(params.ownerId, service.id);
  //if (apiKey === null || apiKey.length === 0) {
  //  throw new Error(`${service.display_name} key not configured.`);
  //}

  // 3. Budget gate
  const isFreeModel = model.input_cost_per_million === 0 && model.output_cost_per_million === 0;
  if (!isFreeModel) {
    try {
      await assertBudgetAvailable(params.ownerId);
    } catch (err) {
      if (err instanceof BudgetExceededError) {
        await logCall({
          ownerId: params.ownerId, modelId: params.modelId, service: service.id,
          tokensIn: 0, tokensOut: 0, costCents: 0, latencyMs: 0,
          status: "blocked_by_cap", errorMessage: err.message,
        });
      }
      throw err;
    }
  }

  // 4. Build the message list
  const messages: ChatMessage[] = params.systemPrompt !== undefined
    ? [{ role: "system", content: params.systemPrompt }, ...params.messages]
    : params.messages;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    //Authorization: service.auth_pattern.replace("{key}", apiKey),
    ...(service.auth_extra_headers ?? {}),
  };
  if (needsAuth && apiKey !== null && service.auth_pattern !== null) {
    headers.Authorization = service.auth_pattern.replace("{key}", apiKey);
  }

  // 5. HTTP
  const startedAt = performance.now();
  let response: OpenAICompatResponse;
  try {
    const res = await fetch(service.endpoints.chat, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelIdForService(params.modelId, service.id),
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 1024,
      }),
    });
    const json = (await res.json()) as OpenAICompatResponse;
    if (!res.ok || json.error !== undefined) {
      throw new Error(`${service.display_name}: ${json.error?.message ?? `HTTP ${res.status}`}`);
    }
    response = json;
  } catch (err) {
    const latencyMs = Math.floor(performance.now() - startedAt);
    const msg = err instanceof Error ? err.message : String(err);
    await logCall({
      ownerId: params.ownerId, modelId: params.modelId, service: service.id,
      tokensIn: 0, tokensOut: 0, costCents: 0, latencyMs,
      status: "error", errorMessage: msg,
    });
    throw err;
  }

  // 6. Parse + cost + log success
  const latencyMs = Math.floor(performance.now() - startedAt);
  const output = response.choices?.[0]?.message.content ?? "";
  const tokensIn = response.usage?.prompt_tokens ?? 0;
  const tokensOut = response.usage?.completion_tokens ?? 0;
  const costCents = estimateCostCents(model, tokensIn, tokensOut);

  await logCall({
    ownerId: params.ownerId, modelId: params.modelId, service: service.id,
    tokensIn, tokensOut, costCents, latencyMs,
    status: "success", errorMessage: null,
  });

  return {
    output, tokensIn, tokensOut, costCents, latencyMs,
    modelId: params.modelId, via: service.id,
  };
}