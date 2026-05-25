import { getProcessById, runProcess } from "../processes";
import { getConversation, bumpConversation } from "./conversations";
import { listMessages, createMessage } from "./messages";
import { preprocess } from "./preprocessor";
import type { Message } from "./types";

export interface TurnParams {
  ownerId: string;
  conversationId: string;
  userInput: string;
}

export interface TurnResult {
  userMessage: Message;
  refinedMessage: Message;
  assistantMessage: Message;
  preprocessorLatencyMs: number;
  cloudLatencyMs: number;
  totalCostCents: number;
  preprocessorOk: boolean;
}

const HISTORY_WINDOW = 12;

export async function runChatTurn(params: TurnParams): Promise<TurnResult> {
  const conversation = await getConversation(params.conversationId);
  if (conversation === null) {
    throw new Error("Conversation not found");
  }
  if (conversation.process_id === null) {
    throw new Error("Conversation has no bound Process. Raw chat not supported in v1.");
  }

  const process = await getProcessById(conversation.process_id);
  if (process === null) {
    throw new Error(`Process ${conversation.process_id} not found.`);
  }

  // 1. Persist user message first. If the rest fails, the user sees what they
  //    sent and can retry, instead of losing their input to a transient error.
  const userMessage = await createMessage({
    conversationId: params.conversationId,
    ownerId: params.ownerId,
    role: "user",
    content: params.userInput,
  });

  try {
    // 2. Gather conversational history (user + assistant only, capped)
    const allMessages = await listMessages(params.conversationId);
    const history = allMessages
      .filter((m) => m.id !== userMessage.id)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-HISTORY_WINDOW);

    // 3. Preprocess locally via Ollama (free, no budget gate)
    const preprocResult = await preprocess({
      ownerId: params.ownerId,
      preprocessorModelId: conversation.preprocessor_model_id,
      taskType: process.task_type,
      recentHistory: history,
      conversationSummary: conversation.summary,
      newUserMessage: params.userInput,
    });

    const refinedMessage = await createMessage({
      conversationId: params.conversationId,
      ownerId: params.ownerId,
      role: "refined",
      content: preprocResult.refinedPrompt,
      parentMessageId: userMessage.id,
      tokensIn: preprocResult.tokensIn,
      tokensOut: preprocResult.tokensOut,
      costCents: preprocResult.costCents,
      latencyMs: preprocResult.latencyMs,
    });

    // 4. Run the bound Process. runProcess handles agent lookup internally.
    const processResult = await runProcess(params.ownerId, conversation.process_id, preprocResult.refinedPrompt);

    // Adapt to the ProcessRunResult shape. If your fields are snake_case, see
    // the note below this code block to swap the keys.
    const assistantMessage = await createMessage({
      conversationId: params.conversationId,
      ownerId: params.ownerId,
      role: "assistant",
      content: processResult.output,
      parentMessageId: refinedMessage.id,
      tokensIn: processResult.tokensIn,
      tokensOut: processResult.tokensOut,
      costCents: processResult.costCents,
      latencyMs: processResult.latencyMs,
    });

    await bumpConversation(params.conversationId, 3);

    return {
      userMessage,
      refinedMessage,
      assistantMessage,
      preprocessorLatencyMs: preprocResult.latencyMs,
      cloudLatencyMs: processResult.latencyMs,
      totalCostCents: preprocResult.costCents + processResult.costCents,
      preprocessorOk: preprocResult.parsedOk,
    };
  } catch (err) {
    await bumpConversation(params.conversationId, 1);
    throw err;
  }
}