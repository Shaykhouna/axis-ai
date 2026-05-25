import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
} from "../../../lib/theme";
import { fetchServiceBalance } from "../balances";
import { getConfiguredServices } from "../availability";
import type { ServiceBalance } from "../balances";
import { open as openUrl } from "@tauri-apps/plugin-shell";

interface BalancesPanelProps {
  ownerId: string;
}

const SERVICE_LABELS: Record<string, string> = {
  openrouter: "OpenRouter",
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "Groq",
};

export function BalancesPanel({ ownerId }: BalancesPanelProps): JSX.Element {
  const [balances, setBalances] = useState<ServiceBalance[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    setRefreshing(true);
    try {
      const configured = await getConfiguredServices(ownerId);
      const results: ServiceBalance[] = [];
      if (configured.has("openrouter")) {
        results.push(await fetchServiceBalance(ownerId, "openrouter"));
      }
      if (configured.has("openai")) {
        results.push(await fetchServiceBalance(ownerId, "openai"));
      }
      setBalances(results);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const configured = await getConfiguredServices(ownerId);
        const results: ServiceBalance[] = [];
        if (configured.has("openrouter")) {
          results.push(await fetchServiceBalance(ownerId, "openrouter"));
        }
        if (configured.has("openai")) {
          results.push(await fetchServiceBalance(ownerId, "openai"));
        }
        if (cancelled) return;
        setBalances(results);
        setError(null);
      } catch (err: unknown) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING }}
      style={{ ...PANEL }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 18px",
          borderBottom: `1px solid ${COLORS.divider}`,
        }}
      >
        <div
          style={{
            width: "34px",
            height: "34px",
            background: `rgba(${COLORS.cyanRgb},0.06)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.18)`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: softGlow(COLORS.cyanRgb, 0.1),
          }}
        >
          <DollarSign size={15} color={COLORS.cyan} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...MONO_LABEL,
              color: `rgba(${COLORS.cyanRgb},0.5)`,
              marginBottom: "2px",
            }}
          >
            BALANCES
          </div>
          <div
            style={{
              color: COLORS.textPrimary,
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Service credit
          </div>
          <div
            style={{
              color: COLORS.textFaint,
              fontSize: "11px",
              marginTop: "2px",
            }}
          >
            BYOK — live balance shown when the provider exposes it.
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.cyan,
            padding: "6px 12px",
            background: `rgba(${COLORS.cyanRgb},0.08)`,
            border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
            borderRadius: "5px",
            cursor: refreshing ? "not-allowed" : "pointer",
            opacity: refreshing ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={
              refreshing
                ? { duration: 1, repeat: Infinity, ease: "linear" }
                : { duration: 0 }
            }
            style={{ display: "inline-flex" }}
          >
            <RefreshCw size={11} />
          </motion.span>
          REFRESH
        </button>
      </div>

      <AnimatePresence>
        {error !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "10px 18px",
              background: `rgba(${COLORS.redRgb},0.05)`,
              borderBottom: `1px solid rgba(${COLORS.redRgb},0.18)`,
              color: COLORS.red,
              fontSize: "11px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <AlertTriangle size={12} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {balances.length === 0 ? (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: COLORS.textFaint,
            fontSize: "12px",
          }}
        >
          {refreshing
            ? "Checking…"
            : "No services configured. Add a key above."}
        </div>
      ) : (
        balances.map((b) => <BalanceRow key={b.service} balance={b} />)
      )}
    </motion.div>
  );
}

function BalanceRow({ balance }: { balance: ServiceBalance }): JSX.Element {
  const label = SERVICE_LABELS[balance.service] ?? balance.service;
  return (
    <div
      style={{
        padding: "12px 18px",
        borderTop: `1px solid ${COLORS.divider}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: COLORS.textPrimary,
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.textFaint,
            marginTop: "2px",
          }}
        >
          {balance.source === "api" &&
            balance.error === undefined &&
            balance.usage_dollars !== undefined && (
              <>
                ${balance.usage_dollars.toFixed(2)} used
                {balance.limit_dollars !== null &&
                  balance.limit_dollars !== undefined && (
                    <> / ${balance.limit_dollars.toFixed(2)} limit</>
                  )}
                {balance.is_free_tier === true && <> · free tier</>}
              </>
            )}
          {balance.source === "api" && balance.error !== undefined && (
            <span style={{ color: COLORS.red }}>{balance.error}</span>
          )}
          {balance.source === "manual" && <>balance API not available</>}
          {balance.source === "disabled" && <>{balance.reason}</>}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {balance.source === "api" &&
          balance.remaining_dollars !== null &&
          balance.remaining_dollars !== undefined && (
            <div
              style={{
                color:
                  balance.remaining_dollars < 1 ? COLORS.red : COLORS.green,
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              ${balance.remaining_dollars.toFixed(2)}
            </div>
          )}
        {balance.source === "manual" && balance.manual_url !== undefined && (
          <button
            type="button"
            onClick={() => void openUrl(balance.manual_url as string)}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              textDecoration: "none",
            }}
          >
            CHECK <ExternalLink size={10} />
          </button>
        )}
      </div>
    </div>
  );
}
