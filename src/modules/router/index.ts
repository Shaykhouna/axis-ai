export { syncCatalog, listModels, getModel } from "./catalog";
export type { SyncResult } from "./catalog";
export { chat } from "./chat";
export { embed, DEFAULT_EMBEDDING_MODEL } from "./embed";
export { estimateCostCents, getBudgetStatus, assertBudgetAvailable } from "./billing";
export { logCall, listRecentCalls } from "./calls";
export { BudgetExceededError } from "./types";
export { listServices, getService, pickServiceForModel, upsertServicesFromManifest,modelIdForService } from "./services";
export { fetchServiceBalance } from "./balances";
export { getConfiguredServices, isModelAvailable, missingKeysFor } from "./availability";
export { CatalogPanel } from "./ui/CatalogPanel";
export { TestCallPanel } from "./ui/TestCallPanel";
export { BalancesPanel } from "./ui/BalancesPanel";
export { detectOllama, intersectInstalledWithCatalog, autoRegisterInstalledModels } from "./local"

export type { OllamaStatus, OllamaModel } from "./local";
export type { ServiceBalance } from "./balances";
export type {
  Service,
  ServiceEndpoints,
  ServiceStatus,
  ModelInfo,
  ModelType,
  ChatMessage,
  ChatParams,
  ChatResult,
  EmbedParams,
  EmbedResult,
  //SupportedVia,
  RouterCall,
  BudgetStatus,
} from "./types";