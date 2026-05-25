import { readApiKeyValue } from "../settings";
import { getModel } from "./catalog";
import { pickServiceForModel, modelIdForService } from "./services";
import { assertBudgetAvailable } from "./billing";
import { logCall } from "./calls";
import { BudgetExceededError, type EmbedParams, type EmbedResult } from "./types";
import { getConfiguredServices } from "../router"

interface OpenAICompatEmbedResponse {
    data?: Array<{ embedding: number[]; index: number }>;
    usage?: { prompt_tokens: number; total_tokens: number };
    error?: { message: string };
}

const BATCH_SIZE = 96;

export const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function embed(params: EmbedParams): Promise<EmbedResult> {
    if (params.texts.length === 0) {
        return {
            vectors: [], tokensIn: 0, costCents: 0, latencyMs: 0,
            modelId: params.modelId, via: "", embeddingDim: 0,
        };
    }

    const model = await getModel(params.modelId);
    if (model === null) {
        throw new Error(`Model not in catalog: ${params.modelId}. Sync catalog first.`);
    }
    if (model.type !== "embedding") {
        throw new Error(`Model ${params.modelId} is type='${model.type}', not embedding.`);
    }

    const configured = await getConfiguredServices(params.ownerId);
    const service = await pickServiceForModel(model.available_via, configured);
    if (service === null) {
        throw new Error(
            `No usable service for ${params.modelId}. Configure a key for one of: ${model.available_via.join(", ")}.`
        );
    }
    if (service.endpoints.embed === null) {
        throw new Error(`Service ${service.id} doesn't expose an embed endpoint.`);
    }
    // if (service.auth_pattern === null) {
    //   throw new Error(`Service ${service.id} is misconfigured (no auth_pattern).`);
    // }

    const needsAuth = service.auth_pattern !== null && service.auth_pattern.length > 0;
    let apiKey: string | null = null;
    if (needsAuth) {
        apiKey = await readApiKeyValue(params.ownerId, service.id);
        if (apiKey === null || apiKey.length === 0) {
            throw new Error(`${service.display_name} key not configured.`);
        }
    }

    // const apiKey = await readApiKeyValue(params.ownerId, service.id);
    // if (apiKey === null || apiKey.length === 0) {
    //     throw new Error(`${service.display_name} key not configured.`);
    // }

    const isFreeModel =
        model.input_cost_per_million === 0 && model.output_cost_per_million === 0;
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

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        //Authorization: service.auth_pattern.replace("{key}", apiKey),
        ...(service.auth_extra_headers ?? {}),
    };
    if (needsAuth && apiKey !== null && service.auth_pattern !== null) {
        headers.Authorization = service.auth_pattern.replace("{key}", apiKey);
    }

    const allVectors: number[][] = [];
    let totalTokens = 0;
    let totalLatencyMs = 0;

    for (let i = 0; i < params.texts.length; i += BATCH_SIZE) {
        const batch = params.texts.slice(i, i + BATCH_SIZE);
        const startedAt = performance.now();

        let response: OpenAICompatEmbedResponse;
        try {
            const res = await fetch(service.endpoints.embed, {
                method: "POST",
                headers,
                body: JSON.stringify({ model: modelIdForService(params.modelId, service.id), input: batch }),
            });
            response = (await res.json()) as OpenAICompatEmbedResponse;
            if (!res.ok || response.error !== undefined) {
                throw new Error(`${service.display_name}: ${response.error?.message ?? `HTTP ${res.status}`}`);
            }
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

        const latencyMs = Math.floor(performance.now() - startedAt);
        totalLatencyMs += latencyMs;

        if (response.data === undefined) {
            throw new Error(`${service.display_name}: malformed response (no data)`);
        }
        response.data.sort((a, b) => a.index - b.index);
        allVectors.push(...response.data.map((d) => d.embedding));

        const batchTokens = response.usage?.prompt_tokens ?? 0;
        totalTokens += batchTokens;
        const batchCostCents = (batchTokens * model.input_cost_per_million) / 1_000_000;

        await logCall({
            ownerId: params.ownerId, modelId: params.modelId, service: service.id,
            tokensIn: batchTokens, tokensOut: 0, costCents: batchCostCents, latencyMs,
            status: "success", errorMessage: null,
        });
    }

    const totalCostCents = (totalTokens * model.input_cost_per_million) / 1_000_000;
    return {
        vectors: allVectors,
        tokensIn: totalTokens,
        costCents: totalCostCents,
        latencyMs: totalLatencyMs,
        modelId: params.modelId,
        via: service.id,
        embeddingDim: model.embedding_dim ?? allVectors[0]?.length ?? 0,
    };
}