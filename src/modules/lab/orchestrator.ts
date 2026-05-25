import { runAgent, getAgent } from "../agents";
import { insertLabRun } from "./runs";
import type { RunResult } from "./types";

export interface RunLabTaskParams {
  ownerId: string;
  taskId: string;
  prompt: string;
  agentIds: string[];
  onProgress?: (results: RunResult[]) => void;
}

// Runs N agents in parallel against the same prompt. Each call's progress
// streams back via onProgress. Persists each run to lab_runs on completion.
// Promise.all here is correct: failures don't cancel siblings because the
// per-agent try/catch handles errors locally.
export async function runLabTask(params: RunLabTaskParams): Promise<RunResult[]> {
  const agents = await Promise.all(
    params.agentIds.map((id) => getAgent(id))
  );

  const results: RunResult[] = agents.map((agent, i) => {
    if (agent === null) {
      return {
        agentId: params.agentIds[i],
        agentName: "unknown",
        agentVersion: 0,
        modelId: "unknown",
        status: "error",
        error: "Agent not found (was it deleted?).",
      };
    }
    return {
      agentId: agent.id,
      agentName: agent.name,
      agentVersion: agent.version,
      modelId: agent.model_id,
      status: "running",
    };
  });
  params.onProgress?.([...results]);

  await Promise.all(
    agents.map(async (agent, i) => {
      if (agent === null) return;

      try {
        const r = await runAgent(params.ownerId, agent.id, params.prompt);
        const runId = await insertLabRun({
          ownerId: params.ownerId,
          taskId: params.taskId,
          agentId: agent.id,
          agentName: agent.name,
          agentVersion: agent.version,
          modelId: r.modelId,
          output: r.output,
          tokensIn: r.tokensIn,
          tokensOut: r.tokensOut,
          costCents: r.costCents,
          latencyMs: r.latencyMs,
          vaultChunksUsed: r.vaultContextUsed,
          status: "success",
          errorMessage: null,
        });
        results[i] = {
          ...results[i],
          status: "success",
          output: r.output,
          tokensIn: r.tokensIn,
          tokensOut: r.tokensOut,
          costCents: r.costCents,
          latencyMs: r.latencyMs,
          vaultChunksUsed: r.vaultContextUsed,
          runId,
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const runId = await insertLabRun({
          ownerId: params.ownerId,
          taskId: params.taskId,
          agentId: agent.id,
          agentName: agent.name,
          agentVersion: agent.version,
          modelId: agent.model_id,
          output: null,
          tokensIn: 0,
          tokensOut: 0,
          costCents: 0,
          latencyMs: 0,
          vaultChunksUsed: 0,
          status: "error",
          errorMessage: msg,
        });
        results[i] = {
          ...results[i],
          status: "error",
          error: msg,
          runId,
        };
      }

      params.onProgress?.([...results]);
    })
  );

  return results;
}