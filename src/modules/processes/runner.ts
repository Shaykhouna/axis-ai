import { getProcessById } from "./processes";
import { runAgent, getAgent } from "../agents";
import type { ProcessRunResult } from "./types";

// Executes a frozen process.
// IMPORTANT: agent_id is pinned to the EXACT version that was promoted
// in Lab (each agent version has its own row/id). This is by design —
// editing the agent creates a new version row with a new id; the process
// continues to use the validated version until you re-Lab and re-promote.
export async function runProcess(
  ownerId: string,
  processId: string,
  userPrompt: string
): Promise<ProcessRunResult> {
  const proc = await getProcessById(processId);
  if (proc === null) throw new Error("Process not found.");
  if (proc.owner_id !== ownerId) throw new Error("Forbidden.");
  if (proc.status !== "active") throw new Error("Process is not active.");
  if (proc.agent_id === null) {
    throw new Error("Process has no agent reference (orphaned). Retire and re-promote.");
  }

  const agent = await getAgent(proc.agent_id);
  if (agent === null) {
    throw new Error(
      `Agent "${proc.agent_name}" v${proc.agent_version} no longer exists. Retire this process and re-promote via Lab.`
    );
  }

  const result = await runAgent(ownerId, agent.id, userPrompt);

  return {
    output: result.output,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costCents: result.costCents,
    latencyMs: result.latencyMs,
    vaultChunksUsed: result.vaultContextUsed,
    modelId: result.modelId,
  };
}