import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { open as openUrl } from "@tauri-apps/plugin-shell";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Shield,
  Lock,
  Cpu,
  Sparkles,
  KeyRound,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader,
} from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
} from "../../../lib/theme";
import { Owner, updateOwnerName } from "../../core";
import { getSettings, updateSettings, setApiKey } from "../../settings";
import {
  detectOllama,
  type OllamaStatus,
  intersectInstalledWithCatalog,
  listModels,
} from "../../router";
import { STARTER_AGENTS } from "../starter-pack";
import {
  testApiKey,
  installStarterAgents,
  type ApiKeyTestResult,
} from "../install";

interface Props {
  onComplete: () => Promise<void>;
  owner: Owner;
}

type ApiService = "openrouter" | "openai";

export function OnboardingWizard({ onComplete, owner }: Props): JSX.Element {
  //const owner = useOwner();
  const [step, setStep] = useState(1);

  // Step 2 — Profile
  const [displayName, setDisplayName] = useState("");
  const [domain, setDomain] = useState("");

  // Step 3 — API key
  const [service, setService] = useState<ApiService>("openrouter");
  const [apiKey, setApiKeyValue] = useState("");
  const [revealKey, setRevealKey] = useState(false);
  const [testResult, setTestResult] = useState<ApiKeyTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // Step 4 — Ollama
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [ollamaCheck, setOllamaCheck] = useState(false);
  const [preprocessorModelId, setPreprocessorModelId] = useState<string>("");
  const [installedLocalModels, setInstalledLocalModels] = useState<
    Array<{ id: string; display_name: string; installed: boolean }>
  >([]);

  // Step 5 — Starter pack
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(
    new Set(STARTER_AGENTS.map((a) => a.slug)),
  );
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<{
    installed: number;
    failed: Array<{ slug: string; error: string }>;
  } | null>(null);

  // Step 6 / global
  const [finishing, setFinishing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Preload display name from owner row if present
  useEffect(() => {
    if (owner !== null && displayName === "") {
      setDisplayName(owner.display_name ?? "");
    }
  }, [owner]);

  function next(): void {
    setStep((s) => Math.min(s + 1, 6));
  }
  function back(): void {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function skipAll(): Promise<void> {
    if (owner === null) return;
    setFinishing(true);
    try {
      await updateSettings(owner.id, { onboarding_completed: 1 });
      await onComplete();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : String(err));
      setFinishing(false);
    }
  }

  async function commitProfileAndAdvance(): Promise<void> {
    if (owner === null) return;
    const trimmedName = displayName.trim();
    if (trimmedName.length > 0 && trimmedName !== owner.display_name) {
      await updateOwnerName(owner.id, trimmedName);
    }
    if (domain.trim().length > 0) {
      await updateSettings(owner.id, { user_domain_tag: domain.trim() });
    }
    next();
  }

  async function handleTestKey(): Promise<void> {
    setTesting(true);
    setTestResult(null);
    const result = await testApiKey(service, apiKey);
    setTestResult(result);
    setTesting(false);
  }

  async function commitApiKeyAndAdvance(skipKey: boolean): Promise<void> {
    if (owner === null) return;
    if (!skipKey && apiKey.trim().length > 0) {
      await setApiKey(owner.id, service, apiKey.trim());
    }
    next();
  }

  async function refreshOllama(): Promise<void> {
    setOllamaCheck(true);
    const [status, models] = await Promise.all([
      detectOllama(),
      listModels("chat"),
    ]);
    const choices = intersectInstalledWithCatalog(
      status.installed_models,
      models,
    );
    setOllamaStatus(status);
    setInstalledLocalModels(choices);
    // Auto-pick first installed model if any
    const firstInstalled = choices.find((c) => c.installed);
    if (firstInstalled !== undefined && preprocessorModelId === "") {
      setPreprocessorModelId(firstInstalled.id);
    }
    setOllamaCheck(false);
  }

  useEffect(() => {
    if (step === 4 && ollamaStatus === null) {
      void refreshOllama();
    }
  }, [step]);

  async function commitOllamaAndAdvance(skipOllama: boolean): Promise<void> {
    if (owner === null) return;
    if (!skipOllama && preprocessorModelId.length > 0) {
      await updateSettings(owner.id, {
        default_preprocessor_model_id: preprocessorModelId,
      });
    }
    next();
  }

  async function commitStarterPack(): Promise<void> {
    if (owner === null) return;
    setInstalling(true);
    const result = await installStarterAgents(owner.id, selectedAgents);
    setInstallResult(result);
    setInstalling(false);
    next();
  }

  async function finish(): Promise<void> {
    if (owner === null) return;
    setFinishing(true);
    try {
      await updateSettings(owner.id, { onboarding_completed: 1 });
      await onComplete();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : String(err));
      setFinishing(false);
    }
  }

  // Visual primitives
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    //background: COLORS.bgDeep ?? "#0a0e14",
    background: COLORS.purpleRgb ?? "#0a0e14",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  };

  const cardStyle: React.CSSProperties = {
    ...PANEL,
    width: "100%",
    maxWidth: "560px",
    padding: 0,
    overflow: "hidden",
  };

  return (
    <div style={containerStyle}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        style={cardStyle}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: `1px solid ${COLORS.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ProgressDots step={step} total={6} />
            <div
              style={{
                ...MONO_LABEL,
                color: COLORS.textFaint,
                marginLeft: "6px",
              }}
            >
              {step} / 6
            </div>
          </div>
          <button
            type="button"
            //onClick={() => void skipAll()}
            onClick={() => setShowSkipConfirm(true)}
            disabled={finishing}
            style={{
              ...MONO_LABEL,
              color: COLORS.textFaint,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 6px",
            }}
          >
            SKIP SETUP →
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "32px 32px 24px 32px", minHeight: "320px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -14 }}
              transition={{ duration: 0.18 }}
            >
              {step === 1 && <StepWelcome />}
              {step === 2 && (
                <StepProfile
                  displayName={displayName}
                  setDisplayName={setDisplayName}
                  domain={domain}
                  setDomain={setDomain}
                />
              )}
              {step === 3 && (
                <StepApiKey
                  service={service}
                  setService={setService}
                  apiKey={apiKey}
                  setApiKey={setApiKeyValue}
                  revealKey={revealKey}
                  setRevealKey={setRevealKey}
                  testing={testing}
                  testResult={testResult}
                  onTestKey={() => void handleTestKey()}
                />
              )}
              {step === 4 && (
                <StepOllama
                  status={ollamaStatus}
                  checking={ollamaCheck}
                  installedLocalModels={installedLocalModels}
                  preprocessorModelId={preprocessorModelId}
                  setPreprocessorModelId={setPreprocessorModelId}
                  onRecheck={() => void refreshOllama()}
                />
              )}
              {step === 5 && (
                <StepStarterPack
                  selected={selectedAgents}
                  setSelected={setSelectedAgents}
                  installing={installing}
                />
              )}
              {step === 6 && (
                <StepDone
                  apiKeyConfigured={
                    testResult?.ok === true || apiKey.trim().length > 0
                  }
                  ollamaConfigured={preprocessorModelId.length > 0}
                  installResult={installResult}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER NAV */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: `1px solid ${COLORS.divider}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          <div>
            {step > 1 && step < 6 && (
              <button type="button" onClick={back} style={ghostButton()}>
                <ArrowLeft size={12} /> BACK
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {globalError !== null && (
              <div
                style={{
                  color: COLORS.red,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertTriangle size={12} /> {globalError}
              </div>
            )}
            {step === 1 && (
              <button type="button" onClick={next} style={cyanButton()}>
                GET STARTED <ArrowRight size={12} />
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={() => void commitProfileAndAdvance()}
                style={cyanButton()}
              >
                NEXT <ArrowRight size={12} />
              </button>
            )}
            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => void commitApiKeyAndAdvance(true)}
                  style={ghostButton()}
                >
                  SKIP FOR NOW
                </button>
                <button
                  type="button"
                  onClick={() => void commitApiKeyAndAdvance(false)}
                  disabled={apiKey.trim().length === 0}
                  style={cyanButton(apiKey.trim().length === 0)}
                >
                  NEXT <ArrowRight size={12} />
                </button>
              </>
            )}
            {step === 4 && (
              <>
                <button
                  type="button"
                  onClick={() => void commitOllamaAndAdvance(true)}
                  style={ghostButton()}
                >
                  {ollamaStatus?.reachable === true &&
                  preprocessorModelId === ""
                    ? "SKIP"
                    : "I'LL INSTALL LATER"}
                </button>
                {ollamaStatus?.reachable === true &&
                  preprocessorModelId.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void commitOllamaAndAdvance(false)}
                      style={cyanButton()}
                    >
                      NEXT <ArrowRight size={12} />
                    </button>
                  )}
                {ollamaStatus?.reachable !== true && (
                  <button
                    type="button"
                    onClick={() => void commitOllamaAndAdvance(true)}
                    style={cyanButton()}
                  >
                    NEXT <ArrowRight size={12} />
                  </button>
                )}
              </>
            )}
            {step === 5 && (
              <button
                type="button"
                onClick={() => void commitStarterPack()}
                disabled={installing}
                style={cyanButton(installing)}
              >
                {installing
                  ? "INSTALLING…"
                  : selectedAgents.size === 0
                    ? "SKIP"
                    : `INSTALL ${selectedAgents.size} AGENT${selectedAgents.size === 1 ? "" : "S"}`}
                {!installing && <ArrowRight size={12} />}
              </button>
            )}
            {step === 6 && (
              <button
                type="button"
                onClick={() => void finish()}
                disabled={finishing}
                style={cyanButton(finishing)}
              >
                {finishing ? "FINISHING…" : "GO TO LAB →"}
              </button>
            )}
            {showSkipConfirm && (
              <SkipConfirmModal
                onCancel={() => setShowSkipConfirm(false)}
                onConfirm={() => {
                  setShowSkipConfirm(false);
                  void skipAll();
                }}
                finishing={finishing}
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// STEP COMPONENTS
// ─────────────────────────────────────────────────────────────

function StepWelcome(): JSX.Element {
  return (
    <div>
      <h1
        style={{
          color: COLORS.textPrimary,
          fontSize: "24px",
          fontWeight: 500,
          margin: "0 0 8px 0",
          letterSpacing: "-0.01em",
        }}
      >
        Welcome to Axis-AI
      </h1>
      <p
        style={{
          color: COLORS.textSecondary,
          fontSize: "13px",
          marginBottom: "28px",
        }}
      >
        Your personal AI lab. Quick setup, then you're in.
      </p>
      <ValueBullet
        icon={<Sparkles size={14} style={{ color: COLORS.cyan }} />}
        title="Your AI lab"
        body="Test agents in parallel, freeze the winners as reusable Processes."
      />
      <ValueBullet
        icon={<KeyRound size={14} style={{ color: COLORS.cyan }} />}
        title="Your keys, your data"
        body="API keys live in your OS keychain. Everything else stays on this machine."
      />
      <ValueBullet
        icon={<Shield size={14} style={{ color: COLORS.cyan }} />}
        title="No tracking"
        body="No telemetry by default. You opt into crash reports if you want."
      />
    </div>
  );
}

function ValueBullet({
  icon,
  title,
  body,
}: {
  icon: JSX.Element;
  title: string;
  body: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        marginBottom: "14px",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "26px",
          height: "26px",
          borderRadius: "5px",
          background: `rgba(${COLORS.cyanRgb},0.08)`,
          border: `1px solid rgba(${COLORS.cyanRgb},0.22)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "1px",
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            color: COLORS.textPrimary,
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: COLORS.textSecondary,
            fontSize: "12px",
            marginTop: "2px",
            lineHeight: 1.55,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}

interface StepProfileProps {
  displayName: string;
  setDisplayName: (v: string) => void;
  domain: string;
  setDomain: (v: string) => void;
}

function StepProfile({
  displayName,
  setDisplayName,
  domain,
  setDomain,
}: StepProfileProps): JSX.Element {
  return (
    <div>
      <StepHeader
        title="Your profile"
        subtitle="Used locally. Never sent anywhere."
      />
      <FormField label="DISPLAY NAME">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How should we refer to you?"
          autoFocus
          style={fieldStyle()}
        />
      </FormField>
      <FormField
        label="DOMAIN TAG (OPTIONAL)"
        hint="e.g. research · engineering · writing. Tags your work if you ever opt into benchmark sharing."
      >
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="research"
          style={fieldStyle()}
        />
      </FormField>
    </div>
  );
}

interface StepApiKeyProps {
  service: ApiService;
  setService: (v: ApiService) => void;
  apiKey: string;
  setApiKey: (v: string) => void;
  revealKey: boolean;
  setRevealKey: (v: boolean) => void;
  testing: boolean;
  testResult: ApiKeyTestResult | null;
  onTestKey: () => void;
}

function StepApiKey(props: StepApiKeyProps): JSX.Element {
  const keyUrl =
    props.service === "openrouter"
      ? "https://openrouter.ai/keys"
      : "https://platform.openai.com/api-keys";
  const prefix = props.service === "openrouter" ? "sk-or-v1-" : "sk-";

  return (
    <div>
      <StepHeader
        title="Add an API key"
        subtitle="One key is enough to start. You can add more later in Settings."
      />
      <FormField label="SERVICE">
        <select
          value={props.service}
          onChange={(e) => props.setService(e.target.value as ApiService)}
          style={{
            //...fieldStyle(),
            ...inputStyle(),
            paddingRight: "28px",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300d4ff' opacity='.45'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            cursor: "pointer",
          }}
        >
          <option value="openrouter">OpenRouter (recommended)</option>
          <option value="openai">OpenAI Direct</option>
        </select>
      </FormField>
      <FormField label="API KEY">
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            type={props.revealKey ? "text" : "password"}
            value={props.apiKey}
            onChange={(e) => props.setApiKey(e.target.value)}
            placeholder={`${prefix}...`}
            autoComplete="off"
            spellCheck={false}
            style={{ ...fieldStyle(), flex: 1 }}
          />
          <button
            type="button"
            onClick={() => props.setRevealKey(!props.revealKey)}
            style={iconBtn()}
          >
            {props.revealKey ? "HIDE" : "SHOW"}
          </button>
        </div>
      </FormField>

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginTop: "4px",
        }}
      >
        <button
          type="button"
          onClick={() => void openUrl(keyUrl)}
          style={{
            ...MONO_LABEL,
            color: COLORS.cyan,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          DON'T HAVE ONE? GET A KEY →
        </button>
      </div>

      <div
        style={{
          marginTop: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={props.onTestKey}
          disabled={props.testing || props.apiKey.trim().length === 0}
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.textPrimary,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.divider}`,
            padding: "7px 14px",
            borderRadius: "5px",
            cursor: props.testing ? "wait" : "pointer",
            opacity: props.apiKey.trim().length === 0 ? 0.4 : 1,
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {props.testing ? <Loader size={12} /> : <Check size={12} />}
          {props.testing ? "TESTING…" : "TEST KEY"}
        </button>
        {props.testResult !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: props.testResult.ok ? COLORS.green : COLORS.red,
            }}
          >
            {props.testResult.ok ? <Check size={12} /> : <X size={12} />}
            {props.testResult.ok
              ? `Verified in ${props.testResult.latencyMs}ms`
              : `Failed: ${props.testResult.error}`}
          </div>
        )}
      </div>
    </div>
  );
}

interface StepOllamaProps {
  status: OllamaStatus | null;
  checking: boolean;
  installedLocalModels: Array<{
    id: string;
    display_name: string;
    installed: boolean;
  }>;
  preprocessorModelId: string;
  setPreprocessorModelId: (v: string) => void;
  onRecheck: () => void;
}

function StepOllama(props: StepOllamaProps): JSX.Element {
  const usable = props.installedLocalModels.filter((m) => m.installed);
  const reachable = props.status?.reachable === true;

  return (
    <div>
      <StepHeader
        title="Local LLM (optional)"
        subtitle="Enables Chat. A small local model refines prompts before they hit the cloud — cheaper, more aligned. Skip if you don't want this."
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 14px",
          background: "rgba(0,0,0,0.25)",
          border: `1px solid ${COLORS.divider}`,
          borderRadius: "5px",
          marginBottom: "16px",
        }}
      >
        {props.checking ? (
          <Loader size={14} style={{ color: COLORS.textFaint }} />
        ) : reachable ? (
          <Wifi size={14} style={{ color: COLORS.green }} />
        ) : (
          <WifiOff size={14} style={{ color: COLORS.textFaint }} />
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: COLORS.textPrimary,
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            {props.checking
              ? "Checking…"
              : reachable
                ? "Ollama detected"
                : "Ollama not detected"}
          </div>
          <div
            style={{
              color: COLORS.textFaint,
              fontSize: "11px",
              marginTop: "2px",
            }}
          >
            {reachable
              ? `${props.status?.installed_models.length ?? 0} model(s) installed at localhost:11434`
              : "Optional — chat feature stays locked until you install it"}
          </div>
        </div>
        <button type="button" onClick={props.onRecheck} style={iconBtn()}>
          RECHECK
        </button>
      </div>

      {!reachable && (
        <>
          <div
            style={{
              ...MONO_LABEL,
              color: COLORS.textFaint,
              marginBottom: "6px",
            }}
          >
            INSTALL (LINUX / MAC)
          </div>
          <CodeBlock>curl -fsSL https://ollama.com/install.sh | sh</CodeBlock>
          <div
            style={{
              ...MONO_LABEL,
              color: COLORS.textFaint,
              margin: "12px 0 6px 0",
            }}
          >
            THEN PULL THE RECOMMENDED MODEL
          </div>
          <CodeBlock>ollama pull llama3.2:1b</CodeBlock>
        </>
      )}

      {reachable && (
        <>
          {usable.length === 0 ? (
            <div
              style={{ color: COLORS.amber, fontSize: "12px", lineHeight: 1.6 }}
            >
              No supported models installed. Pull one:
              <CodeBlock>ollama pull llama3.2:1b</CodeBlock>
              Then click RECHECK above.
            </div>
          ) : (
            <FormField label="DEFAULT PREPROCESSOR MODEL">
              <select
                value={props.preprocessorModelId}
                onChange={(e) => props.setPreprocessorModelId(e.target.value)}
                style={{
                  //...fieldStyle(),
                  ...inputStyle(),
                  paddingRight: "28px",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2300d4ff' opacity='.45'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  cursor: "pointer",
                }}
              >
                <option value="">— pick a model —</option>
                {usable.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </>
      )}
    </div>
  );
}

interface StepStarterPackProps {
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  installing: boolean;
}

function StepStarterPack({
  selected,
  setSelected,
  installing,
}: StepStarterPackProps): JSX.Element {
  function toggle(slug: string): void {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelected(next);
  }

  return (
    <div>
      <StepHeader
        title="Starter pack"
        subtitle="Five sample agents covering common task types. Run them, fork them, or delete them — they're yours."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {STARTER_AGENTS.map((a) => {
          const checked = selected.has(a.slug);
          return (
            <button
              key={a.slug}
              type="button"
              disabled={installing}
              onClick={() => toggle(a.slug)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 12px",
                background: checked
                  ? `rgba(${COLORS.cyanRgb},0.05)`
                  : "rgba(255,255,255,0.02)",
                border: `1px solid ${checked ? `rgba(${COLORS.cyanRgb},0.3)` : COLORS.divider}`,
                borderRadius: "5px",
                textAlign: "left",
                cursor: installing ? "wait" : "pointer",
                color: COLORS.textPrimary,
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "3px",
                  background: checked ? COLORS.cyan : "transparent",
                  border: `1px solid ${checked ? COLORS.cyan : COLORS.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {checked && <Check size={11} style={{ color: "#0a0e14" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>
                  {a.name}
                </div>
                <div
                  style={{
                    ...MONO_LABEL,
                    color: COLORS.textFaint,
                    marginTop: "2px",
                  }}
                >
                  {a.task_type_hint.toUpperCase()} ·{" "}
                  {a.model_id.split("/").pop()}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepDone({
  apiKeyConfigured,
  ollamaConfigured,
  installResult,
}: {
  apiKeyConfigured: boolean;
  ollamaConfigured: boolean;
  installResult: {
    installed: number;
    failed: Array<{ slug: string; error: string }>;
  } | null;
}): JSX.Element {
  return (
    <div>
      <StepHeader title="You're set." subtitle="Here's what's ready:" />
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <StatusLine ok={apiKeyConfigured} label="API key configured" />
        <StatusLine ok={ollamaConfigured} label="Local LLM (chat unlocks)" />
        <StatusLine
          ok={(installResult?.installed ?? 0) > 0}
          label={`${installResult?.installed ?? 0} starter agent${installResult?.installed === 1 ? "" : "s"} installed`}
        />
      </div>
      {installResult !== null && installResult.failed.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            color: COLORS.amber,
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          {installResult.failed.length} agent(s) failed to install:{" "}
          {installResult.failed.map((f) => f.slug).join(", ")}. You can create
          them manually from the Agents page.
        </div>
      )}
      <div
        style={{
          marginTop: "20px",
          padding: "12px 14px",
          background: `rgba(${COLORS.cyanRgb},0.05)`,
          border: `1px solid rgba(${COLORS.cyanRgb},0.2)`,
          borderRadius: "5px",
          fontSize: "12px",
          color: COLORS.textSecondary,
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: COLORS.cyan }}>Next:</strong> Go to Lab, create
        a brainstorm task, pick 2-3 agents{" "}
        {installResult?.installed === 0
          ? " (install them through Agents section)"
          : ""}
        , run them in parallel. That's the core loop.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared UI helpers
// ─────────────────────────────────────────────────────────────

function StepHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): JSX.Element {
  return (
    <div style={{ marginBottom: "20px" }}>
      <h2
        style={{
          color: COLORS.textPrimary,
          fontSize: "18px",
          fontWeight: 500,
          margin: "0 0 6px 0",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          color: COLORS.textSecondary,
          fontSize: "12px",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label
        style={{
          ...MONO_LABEL,
          color: COLORS.textFaint,
          display: "block",
          marginBottom: "6px",
        }}
      >
        {label}
      </label>
      {children}
      {hint !== undefined && (
        <div
          style={{
            color: COLORS.textFaint,
            fontSize: "11px",
            marginTop: "4px",
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function ProgressDots({
  step,
  total,
}: {
  step: number;
  total: number;
}): JSX.Element {
  return (
    <div style={{ display: "flex", gap: "5px" }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i + 1 === step ? "12px" : "6px",
            height: "6px",
            borderRadius: "3px",
            background: i + 1 <= step ? COLORS.cyan : COLORS.divider,
            transition: "all 200ms ease",
          }}
        />
      ))}
    </div>
  );
}

function StatusLine({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "13px",
        color: ok ? COLORS.textPrimary : COLORS.textFaint,
      }}
    >
      {ok ? (
        <Check size={14} style={{ color: COLORS.green }} />
      ) : (
        <X size={14} style={{ color: COLORS.textFaint }} />
      )}
      {label}
    </div>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: "11px",
        padding: "8px 12px",
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${COLORS.divider}`,
        borderRadius: "4px",
        color: COLORS.cyan,
        whiteSpace: "pre",
        overflow: "auto",
      }}
    >
      {children}
    </div>
  );
}

function fieldStyle(): React.CSSProperties {
  return {
    background: "rgba(0,0,0,0.3)",
    border: `1px solid ${COLORS.divider}`,
    borderRadius: "4px",
    padding: "8px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    width: "100%",
    fontFamily: "inherit",
  };
}

function iconBtn(): React.CSSProperties {
  return {
    ...MONO_LABEL,
    color: COLORS.textFaint,
    background: "rgba(255,255,255,0.03)",
    border: `1px solid ${COLORS.divider}`,
    padding: "8px 10px",
    borderRadius: "4px",
    cursor: "pointer",
  };
}

function cyanButton(disabled: boolean = false): React.CSSProperties {
  return {
    ...MONO_LABEL_LOOSE,
    color: COLORS.cyan,
    padding: "8px 16px",
    background: `rgba(${COLORS.cyanRgb},0.08)`,
    border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
    borderRadius: "5px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };
}

function ghostButton(): React.CSSProperties {
  return {
    ...MONO_LABEL_LOOSE,
    color: COLORS.textFaint,
    padding: "8px 14px",
    background: "transparent",
    border: `1px solid ${COLORS.divider}`,
    borderRadius: "5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    background: COLORS.inputBg,
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: "6px",
    padding: "6px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };
}

interface SkipConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  finishing: boolean;
}

function SkipConfirmModal({
  onCancel,
  onConfirm,
  finishing,
}: SkipConfirmModalProps): JSX.Element {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING}
        style={{
          ...PANEL,
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
        }}
      >
        <h3
          style={{
            color: COLORS.textPrimary,
            fontSize: "16px",
            fontWeight: 500,
            margin: "0 0 10px 0",
          }}
        >
          Skip setup?
        </h3>
        <p
          style={{
            color: COLORS.textSecondary,
            fontSize: "13px",
            lineHeight: 1.6,
            margin: "0 0 18px 0",
          }}
        >
          You can re-run this anytime from{" "}
          <strong style={{ color: COLORS.cyan }}>
            Settings → Re-run setup
          </strong>
          . Your existing data isn't touched.
        </p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={finishing}
            style={ghostButton()}
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={finishing}
            style={cyanButton(finishing)}
          >
            {finishing ? "SKIPPING…" : "SKIP ANYWAY"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
