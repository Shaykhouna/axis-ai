import { chat } from "../router";
import type { Message } from "./types";

export interface PreprocessorParams {
  ownerId: string;
  preprocessorModelId: string;
  taskType: string;
  recentHistory: Message[];
  conversationSummary: string | null;
  newUserMessage: string;
}

export interface PreprocessorResult {
  intent: string;
  refinedPrompt: string;
  latencyMs: number;
  costCents: number;
  tokensIn: number;
  tokensOut: number;
  rawOutput: string;
  parsedOk: boolean;
}

const SYSTEM_PROMPT_TEMPLATE = `You are a preprocessor for Axis-AI, a personal AI lab.

The user is talking to a specialized AI agent. Your job: take the user's casual input plus conversation history, and produce a precise, self-contained prompt for that specialized agent.

The specialized agent is designed for the task: {{task_type}}

Output STRICT JSON only — no markdown fences, no preamble, no commentary. Format:
{
  "intent": "one sentence describing what the user wants",
  "refined_prompt": "the prompt to send to the specialized agent"
}

Rules:
- The specialized agent will NOT see the conversation history, so refined_prompt must be self-contained.
- Resolve pronouns and references using the history ("that", "it", "the one we discussed").
- Drop filler, social acknowledgments, meta-commentary.
- Preserve the user's specific details (names, numbers, code snippets) verbatim.
- Do NOT add information the user did not provide.
- Do NOT answer the user — only refine.
- If the user's input is already a clear, self-contained task, refined_prompt may be nearly identical to it.`;


function buildSystemPrompt(taskType: string): string {
  return SYSTEM_PROMPT_TEMPLATE.replace("{{task_type}}", taskType);
}

function buildHistoryMessages(
  history: Message[],
  summary: string | null
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const msgs: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
  if (summary !== null && summary.length > 0) {
    msgs.push({
      role: "system",
      content: `Conversation summary so far:\n${summary}`,
    });
  }
  for (const m of history) {
    if (m.role === "user") {
      msgs.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      msgs.push({ role: "assistant", content: m.content });
    }
    // 'refined' and 'summary' roles are not replayed
  }
  return msgs;
}

function parsePreprocessorOutput(
  raw: string
): { intent: string; refined_prompt: string } | null {
  let cleaned = raw.trim();
  // Strip markdown code fences if the local model wrapped its output
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  // Extract the outermost JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  cleaned = cleaned.slice(start, end + 1);
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (typeof parsed.refined_prompt !== "string") return null;
    return {
      intent: typeof parsed.intent === "string" ? parsed.intent : "",
      refined_prompt: parsed.refined_prompt,
    };
  } catch {
    return null;
  }
}

export async function preprocess(
  params: PreprocessorParams
): Promise<PreprocessorResult> {
  const systemPrompt = buildSystemPrompt(params.taskType);
  const historyMsgs = buildHistoryMessages(params.recentHistory, params.conversationSummary);
  const messages = [
    ...historyMsgs,
    { role: "user" as const, content: params.newUserMessage },
  ];

  const result = await chat({
    ownerId: params.ownerId,
    modelId: params.preprocessorModelId,
    messages,
    systemPrompt,
    temperature: 0.2,
    maxTokens: 800,
  });

  const parsed = parsePreprocessorOutput(result.output);

  if (parsed === null) {
    // Fallback: use raw user input as refined prompt. Lets the conversation
    // continue instead of dead-ending on bad local LLM output.
    return {
      intent: "(preprocessor output unparseable — using raw input)",
      refinedPrompt: params.newUserMessage,
      latencyMs: result.latencyMs,
      costCents: result.costCents,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      rawOutput: result.output,
      parsedOk: false,
    };
  }

  return {
    intent: parsed.intent,
    refinedPrompt: parsed.refined_prompt,
    latencyMs: result.latencyMs,
    costCents: result.costCents,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
    rawOutput: result.output,
    parsedOk: true,
  };
}