import { getDb } from "../core";
import { getSettings } from "../settings";
import { BudgetExceededError, type BudgetStatus, type ModelInfo } from "./types";

// First-of-month timestamp in UTC seconds. Budget windows align to calendar month, UTC.
function startOfCurrentMonthSec(): number {
  const now = new Date();
  const utcStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0);
  return Math.floor(utcStart / 1000);
}

export function estimateCostCents(
  model: ModelInfo,
  tokensIn: number,
  tokensOut: number
): number {
  const inCost = (tokensIn * model.input_cost_per_million) / 1_000_000;
  const outCost = (tokensOut * model.output_cost_per_million) / 1_000_000;
  return inCost + outCost;
}

export async function getBudgetStatus(ownerId: string): Promise<BudgetStatus> {
  const db = await getDb();
  const settings = await getSettings(ownerId);
  const monthStart = startOfCurrentMonthSec();

  const rows = await db.select<{ total: number | null }[]>(
    `SELECT COALESCE(SUM(cost_cents), 0) AS total
     FROM router_calls
     WHERE owner_id = ? AND created_at >= ? AND status = 'success'`,
    [ownerId, monthStart]
  );
  const mtd = rows[0]?.total ?? 0;
  const cap = settings.monthly_cost_cap_cents;

  return {
    mtd_cents: mtd,
    cap_cents: cap,
    remaining_cents: Math.max(0, cap - mtd),
    exceeded: mtd >= cap,
  };
}

// Called before every chat() request. Throws BudgetExceededError if over the cap.
export async function assertBudgetAvailable(ownerId: string): Promise<void> {
  const status = await getBudgetStatus(ownerId);
  if (status.exceeded) {
    throw new BudgetExceededError(status.mtd_cents, status.cap_cents);
  }
}