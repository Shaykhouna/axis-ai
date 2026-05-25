import { getAgent } from "./agents";
import { chat } from "../router";
import { searchSimilar, SearchResult } from "../vault";
import type { AgentRunResult } from "./types";

// Composes the system prompt with optional vault context, calls Router.
// Router handles cost cap, key lookup, and call logging.
export async function runAgent(
  ownerId: string,
  agentId: string,
  userPrompt: string
): Promise<AgentRunResult> {
  const agent = await getAgent(agentId);
  if (agent === null) throw new Error("Agent not found.");
  if (agent.owner_id !== ownerId) throw new Error("Forbidden.");

  let systemPrompt = agent.system_prompt;
  let vaultChunks: SearchResult[] = [];

  if (agent.use_vault_context === 1 && userPrompt.trim().length > 0) {
    vaultChunks = await searchSimilar(ownerId, userPrompt, agent.vault_top_k);
    if (vaultChunks.length > 0) {
      const contextBlock = vaultChunks
        .map((r, i) => {
          const source = r.chunk.heading ?? r.chunk.source_path.split("/").pop() ?? "note";
          return `[${i + 1}] ${source}\n${r.chunk.content}`;
        })
        .join("\n\n---\n\n");
      systemPrompt = `${systemPrompt}\n\n# Context from your vault\n\n${contextBlock}`;
    }
  }

  const result = await chat({
    ownerId,
    modelId: agent.model_id,
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    temperature: agent.temperature,
    maxTokens: agent.max_tokens,
  });

  return {
    output: result.output,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    costCents: result.costCents,
    latencyMs: result.latencyMs,
    modelId: result.modelId,
    vaultContextUsed: vaultChunks.length,
    vaultChunks,
  };
}