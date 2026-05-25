import { JSX, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, X } from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  softGlow,
} from "../../../lib/theme";
import {
  listModels,
  type ModelInfo,
  getConfiguredServices,
  isModelAvailable,
  missingKeysFor,
} from "../../router";
import { listDomains, type Domain } from "../../core";
import type { Agent, AgentInput } from "../types";

interface AgentEditorProps {
  ownerId: string;
  // null = creating new; Agent = editing existing
  initial: Agent | null;
  onSave: (input: AgentInput) => Promise<void>;
  onCancel: () => void;
}

export function AgentEditor({
  ownerId,
  initial,
  onSave,
  onCancel,
}: AgentEditorProps): JSX.Element {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);

  const [name, setName] = useState<string>(initial?.name ?? "");
  const [domain, setDomain] = useState<string>(initial?.domain ?? "");
  const [modelId, setModelId] = useState<string>(initial?.model_id ?? "");
  const [systemPrompt, setSystemPrompt] = useState<string>(
    initial?.system_prompt ?? "",
  );
  const [temperature, setTemperature] = useState<string>(
    String(initial?.temperature ?? 0.7),
  );
  const [maxTokens, setMaxTokens] = useState<string>(
    String(initial?.max_tokens ?? 1024),
  );
  const [useVault, setUseVault] = useState<boolean>(
    (initial?.use_vault_context ?? 0) === 1,
  );
  const [vaultTopK, setVaultTopK] = useState<string>(
    String(initial?.vault_top_k ?? 5),
  );
  const [configuredServices, setConfiguredServices] = useState<Set<string>>(
    new Set(),
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, { available: boolean; missing: string[] }>>(new Map());

  async function loadData(): Promise<void> {
    let cancelled = false;
    try {
    const [m, d, s] = await Promise.all([
      listModels(),
      listDomains(ownerId),
      getConfiguredServices(ownerId),
    ]);
    setModels(m);
    setDomains(d);
    setConfiguredServices(s);
    if (cancelled) return;
    const map = new Map<string, { available: boolean; missing: string[] }>();
    for (const model of m) {
      const available = await isModelAvailable(model, s);
      const missing = available ? [] : await missingKeysFor(model, s);
      map.set(model.id, { available, missing });
    }
    if (!cancelled) setAvailabilityMap(map);
        setDomains(d);
        setConfiguredServices(s);
        if (modelId === "" && m.length > 0) {
          const firstAvailable = m.find((mm) => isModelAvailable(mm, s));
          if (firstAvailable !== undefined) setModelId(firstAvailable.id);
        }
      } catch(err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
  }

  useEffect(() => {
    loadData()
    // Only run on mount — we don't want stale data races on edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  async function handleSubmit(): Promise<void> {
    setError(null);
    if (name.trim().length === 0) {
      setError("Name is required.");
      return;
    }
    if (modelId === "") {
      setError("Pick a model.");
      return;
    }
    if (systemPrompt.trim().length === 0) {
      setError("System prompt is required.");
      return;
    }
    const tempNum = Number.parseFloat(temperature);
    if (Number.isNaN(tempNum) || tempNum < 0 || tempNum > 2) {
      setError("Temperature must be between 0 and 2.");
      return;
    }
    const maxNum = Number.parseInt(maxTokens, 10);
    if (Number.isNaN(maxNum) || maxNum < 1) {
      setError("Max tokens must be a positive integer.");
      return;
    }
    const topKNum = Number.parseInt(vaultTopK, 10);
    if (Number.isNaN(topKNum) || topKNum < 1 || topKNum > 20) {
      setError("Vault top-k must be between 1 and 20.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        domain: domain === "" ? null : domain,
        model_id: modelId,
        system_prompt: systemPrompt,
        temperature: tempNum,
        max_tokens: maxNum,
        use_vault_context: useVault ? 1 : 0,
        vault_top_k: topKNum,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const isEditing = initial !== null;
  const nextVersion = isEditing ? initial.version + 1 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
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
            background: `rgba(${COLORS.purpleRgb},0.08)`,
            border: `1px solid rgba(${COLORS.purpleRgb},0.22)`,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: softGlow(COLORS.purpleRgb, 0.1),
          }}
        >
          <Save size={15} color={COLORS.purple} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...MONO_LABEL,
              color: `rgba(${COLORS.purpleRgb},0.55)`,
              marginBottom: "2px",
            }}
          >
            {isEditing ? `EDITING · WILL CREATE v${nextVersion}` : "NEW AGENT"}
          </div>
          <div
            style={{
              color: COLORS.textPrimary,
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            {isEditing ? initial.name : "Define a specialist"}
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            color: COLORS.textFaint,
            background: "transparent",
            border: `1px solid ${COLORS.inputBorder}`,
            borderRadius: "5px",
            padding: "5px 7px",
            cursor: "pointer",
          }}
          aria-label="cancel"
        >
          <X size={13} />
        </button>
      </div>

      <div
        style={{
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* Name + Domain */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "12px",
          }}
        >
          <Field
            label="NAME"
            hint={isEditing ? "Immutable across versions." : undefined}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isEditing}
              placeholder="e.g. code-reviewer"
              style={{ ...inputStyle(), opacity: isEditing ? 0.55 : 1 }}
            />
          </Field>
          <Field label="DOMAIN">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              style={{
                ...inputStyle(),
                paddingRight: "28px",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300d4ff' opacity='.45'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              <option value="">— none —</option>
              {domains.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Model */}
        <Field label="MODEL">
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            style={{
              ...inputStyle(),
              paddingRight: "28px",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300d4ff' opacity='.45'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
            }}
          >
            {models.length === 0 && (
              <option value="">— sync catalog first —</option>
            )}
            {models.map((m) => {
              const availability = availabilityMap.get(m.id);
              const available = availability?.available ?? false;
              const missing = availability?.missing ?? [];
              return (
                <option key={m.id} value={m.id} disabled={!available}>
                  {available ? "" : "○ "}
                  {m.display_name} · {m.id}
                  {!available && ` (needs ${missing.join(" or ")} key)`}
                </option>
              );
            })}
          </select>
        </Field>

        {/* System prompt */}
        <Field
          label="SYSTEM PROMPT"
          hint="What this agent is and how it should behave."
        >
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={8}
            placeholder="You are a senior code reviewer. Focus on correctness and clarity over style preferences…"
            style={{
              ...inputStyle(),
              fontFamily: "monospace",
              resize: "vertical",
              minHeight: "120px",
            }}
          />
        </Field>

        {/* Temperature + Max tokens */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <Field
            label="TEMPERATURE"
            hint="0 = deterministic, 1 = balanced, 2 = chaotic."
          >
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              style={inputStyle()}
            />
          </Field>
          <Field label="MAX TOKENS">
            <input
              type="number"
              min="1"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              style={inputStyle()}
            />
          </Field>
        </div>

        {/* Vault context */}
        <div
          style={{
            border: `1px solid ${COLORS.divider}`,
            borderRadius: "6px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  color: COLORS.textPrimary,
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                Inject vault context
              </div>
              <div
                style={{
                  color: COLORS.textFaint,
                  fontSize: "11px",
                  marginTop: "2px",
                }}
              >
                Retrieve top-k chunks for every prompt and prepend to system
                message.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseVault((v) => !v)}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background: useVault
                  ? `rgba(${COLORS.greenRgb},0.25)`
                  : `rgba(${COLORS.cyanRgb},0.06)`,
                border: `1px solid ${
                  useVault
                    ? `rgba(${COLORS.greenRgb},0.45)`
                    : `rgba(${COLORS.cyanRgb},0.22)`
                }`,
                position: "relative",
                cursor: "pointer",
                transition: "all 0.18s",
              }}
              aria-label="toggle vault context"
            >
              <motion.div
                animate={{ x: useVault ? 20 : 2 }}
                transition={{ ...SPRING }}
                style={{
                  position: "absolute",
                  top: "2px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: useVault ? COLORS.green : COLORS.textFaint,
                }}
              />
            </button>
          </div>
          {useVault && (
            <Field label="TOP-K">
              <input
                type="number"
                min="1"
                max="20"
                value={vaultTopK}
                onChange={(e) => setVaultTopK(e.target.value)}
                style={{ ...inputStyle(), width: "100px" }}
              />
            </Field>
          )}
        </div>

        {/* Error */}
        {error !== null && (
          <div
            style={{
              padding: "10px 12px",
              background: `rgba(${COLORS.redRgb},0.05)`,
              border: `1px solid rgba(${COLORS.redRgb},0.18)`,
              borderRadius: "6px",
              color: COLORS.red,
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.textMuted,
              padding: "8px 14px",
              background: "transparent",
              border: `1px solid ${COLORS.inputBorder}`,
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.purple,
              padding: "8px 14px",
              background: `rgba(${COLORS.purpleRgb},0.1)`,
              border: `1px solid rgba(${COLORS.purpleRgb},0.35)`,
              borderRadius: "5px",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Save size={11} />
            {saving
              ? "SAVING…"
              : isEditing
                ? `SAVE AS v${nextVersion}`
                : "CREATE"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Local helpers ----

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, hint, children }: FieldProps): JSX.Element {
  return (
    <div>
      <div
        style={{
          ...MONO_LABEL,
          color: `rgba(${COLORS.cyanRgb},0.45)`,
          marginBottom: "5px",
        }}
      >
        {label}
      </div>
      {children}
      {hint !== undefined && (
        <div
          style={{
            color: COLORS.textFaint,
            fontSize: "11px",
            marginTop: "4px",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: "6px",
    padding: "8px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };
}
