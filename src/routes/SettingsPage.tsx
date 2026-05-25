import { JSX, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Shield,
  //Database as DatabaseIcon,
  User,
  DollarSign,
  Trash2,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Cpu,
  //Wifi,
  //WifiOff,
  //Download,
} from "lucide-react";
import {
  COLORS,
  PANEL,
  MONO_LABEL,
  MONO_LABEL_LOOSE,
  SPRING,
  glow,
  softGlow,
} from "../lib/theme";
import {
  getSettings,
  updateSettings,
  //listApiKeyRefs,
  setApiKey,
  deleteApiKey,
  type Settings,
  //type ApiKeyRef,
} from "../modules/settings";
import { listDomains, type Owner, type Domain } from "../modules/core";
import {
  CatalogPanel,
  TestCallPanel,
  BalancesPanel,
  listServices,
  //detectOllama,
  //intersectInstalledWithCatalog,
  //listModels,
  //type OllamaStatus,
  type Service,
  getConfiguredServices,
} from "../modules/router";
import { OllamaPanel } from "../modules/settings/ui/SettingsLocalLLM";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

interface SettingsPageProps {
  owner: Owner;
}

export function SettingsPage({ owner }: SettingsPageProps): JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null);
  //const [keyRefs, setKeyRefs] = useState<ApiKeyRef[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Edit-state mirrors for inputs
  const [domainTag, setDomainTag] = useState<string>("");
  const [costCapDollars, setCostCapDollars] = useState<string>("");
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeyInput, setShowKeyInput] = useState<Record<string, boolean>>({});
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [configuredServices, setConfiguredServices] = useState<Set<string>>(
    new Set(),
  );

  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [updateChecking, setUpdateChecking] = useState(false);

  async function loadAll(): Promise<void> {
    try {
      const [s, /*refs,*/ doms, svcs, conf] = await Promise.all([
        getSettings(owner.id),
        //listApiKeyRefs(owner.id),
        listDomains(owner.id),
        listServices(),
        getConfiguredServices(owner.id),
      ]);
      setSettings(s);
      //setKeyRefs(refs);
      setDomains(doms);
      setServices(svcs);
      setConfiguredServices(conf);
      setDomainTag(s.user_domain_tag ?? "");
      setCostCapDollars(String(s.monthly_cost_cap_cents / 100));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void loadAll();
  }, [owner.id]);

  async function handleDomainTagChange(value: string): Promise<void> {
    setDomainTag(value);
    try {
      const updated = await updateSettings(owner.id, {
        user_domain_tag: value === "" ? null : value,
      });
      setSettings(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCostCapSave(): Promise<void> {
    const dollars = Number.parseInt(costCapDollars, 10);
    if (Number.isNaN(dollars) || dollars < 0) {
      setError("Cost cap must be a non-negative integer.");
      return;
    }
    try {
      const updated = await updateSettings(owner.id, {
        monthly_cost_cap_cents: dollars * 100,
      });
      setSettings(updated);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleOptInToggle(): Promise<void> {
    if (settings === null) return;
    try {
      const next = settings.benchmark_opt_in === 1 ? 0 : 1;
      const updated = await updateSettings(owner.id, {
        benchmark_opt_in: next,
      });
      setSettings(updated);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAddKey(service: string): Promise<void> {
    const value = (keyInputs[service] ?? "").trim();
    if (value.length === 0) return;
    try {
      await setApiKey(owner.id, service, value);
      setKeyInputs((prev) => ({ ...prev, [service]: "" }));
      setShowKeyInput((prev) => ({ ...prev, [service]: false }));
      setReveal((prev) => ({ ...prev, [service]: false }));
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDeleteKey(service: string): Promise<void> {
    try {
      await deleteApiKey(owner.id, service);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (settings === null) {
    return (
      <div
        style={{
          color: COLORS.textMuted,
          padding: "20px",
          ...MONO_LABEL_LOOSE,
        }}
      >
        Initialising settings…
      </div>
    );
  }

  async function handleCheckUpdates(): Promise<void> {
    setUpdateChecking(true);
    setUpdateStatus(null);
    try {
      const update = await check();
      if (update === null) {
        setUpdateStatus("You're on the latest version.");
      } else {
        setUpdateStatus(`Update available: v${update.version}. Downloading…`);
        await update.downloadAndInstall();
        setUpdateStatus("Update installed. Restarting…");
        await relaunch();
      }
    } catch (err) {
      setUpdateStatus(
        `Update check failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setUpdateChecking(false);
    }
  }

  // const configuredServices = new Set(keyRefs.map((r) => r.service));

  return (
    <div
      style={{
        maxWidth: "820px",
        display: "flex",
        flexDirection: "column",
        gap: "22px",
      }}
    >
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "5px",
          }}
        >
          <div
            style={{
              width: "3px",
              height: "30px",
              background:
                "linear-gradient(180deg, #00d4ff, rgba(0,212,255,0.1))",
              borderRadius: "2px",
              boxShadow: "0 0 10px rgba(0,212,255,0.55)",
              flexShrink: 0,
            }}
          />
          <h1
            style={{
              color: COLORS.textPrimary,
              fontSize: "22px",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Settings
          </h1>
        </div>
        <p
          style={{
            ...MONO_LABEL_LOOSE,
            color: COLORS.textMuted,
            marginLeft: "15px",
          }}
        >
          OPERATOR CONFIG · KEYCHAIN · PRIVACY
        </p>
      </motion.div>

      {/* Global error banner */}
      <AnimatePresence>
        {error !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              padding: "12px 16px",
              background: `rgba(${COLORS.redRgb},0.05)`,
              border: `1px solid rgba(${COLORS.redRgb},0.18)`,
              borderRadius: "8px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              color: COLORS.red,
              fontSize: "12px",
            }}
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1 — Operator */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, ...SPRING }}
        style={{ ...PANEL }}
      >
        <SectionHeader icon={User} label="OPERATOR" title="Identity" />
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <Field label="DISPLAY NAME">
            <div style={{ color: COLORS.textPrimary, fontSize: "13px" }}>
              {owner.display_name}
            </div>
          </Field>
          <Field label="DOMAIN TAG" hint="Used later for benchmark grouping.">
            <select
              value={domainTag}
              onChange={(e) => void handleDomainTagChange(e.target.value)}
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
      </motion.div>

      {/* SECTION 2 — API Keys */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, ...SPRING }}
        style={{ ...PANEL }}
      >
        <SectionHeader
          icon={Key}
          label="KEYCHAIN"
          title="API Keys"
          hint="Stored in your OS keychain. Never written to the database."
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {services.map((service) => {
            const configured = configuredServices.has(service.id);
            const expanded = showKeyInput[service.id] === true;
            const isComingSoon = service.status === "coming_soon";
            const isDeprecated = service.status === "deprecated";
            const isInactive = isComingSoon || isDeprecated;

            return (
              <div
                key={service.id}
                style={{
                  padding: "14px 18px",
                  borderTop: `1px solid ${COLORS.divider}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  opacity: isComingSoon ? 0.55 : 1,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
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
                      {service.display_name}
                    </div>
                    {service.key_url !== null && !isInactive && (
                      <div
                        style={{
                          color: COLORS.textFaint,
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        Get a key at{" "}
                        {service.key_url.replace(/^https?:\/\//, "")}
                      </div>
                    )}
                    {isComingSoon && (
                      <div
                        style={{
                          color: COLORS.textFaint,
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        Direct integration planned.
                      </div>
                    )}
                    {isDeprecated && (
                      <div
                        style={{
                          color: COLORS.amber,
                          fontSize: "11px",
                          marginTop: "2px",
                        }}
                      >
                        No longer supported. You can delete the stored key if
                        you no longer need it.
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {isComingSoon && !configured && (
                      <span
                        style={{
                          ...MONO_LABEL_LOOSE,
                          color: COLORS.textFaint,
                          padding: "5px 10px",
                          background: `rgba(100,160,200,0.04)`,
                          border: `1px solid rgba(100,160,200,0.18)`,
                          borderRadius: "5px",
                          letterSpacing: "0.14em",
                        }}
                      >
                        COMING SOON
                      </span>
                    )}
                    {configured && (
                      <>
                        <span
                          style={{
                            ...MONO_LABEL_LOOSE,
                            color: COLORS.green,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            background: `rgba(${COLORS.greenRgb},0.07)`,
                            border: `1px solid rgba(${COLORS.greenRgb},0.22)`,
                            borderRadius: "5px",
                          }}
                        >
                          <Check size={10} /> CONFIGURED
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDeleteKey(service.id)}
                          style={iconButtonStyle()}
                          aria-label={`remove ${service.display_name} key`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {!configured && !isComingSoon && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowKeyInput((prev) => ({
                            ...prev,
                            [service.id]: !expanded,
                          }))
                        }
                        style={{
                          ...MONO_LABEL_LOOSE,
                          color: COLORS.cyan,
                          padding: "5px 10px",
                          background: `rgba(${COLORS.cyanRgb},0.06)`,
                          border: `1px solid rgba(${COLORS.cyanRgb},0.22)`,
                          borderRadius: "5px",
                          cursor: "pointer",
                        }}
                      >
                        {expanded ? "CANCEL" : "ADD KEY"}
                      </button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expanded && !configured && !isComingSoon && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ display: "flex", gap: "8px" }}
                    >
                      <input
                        type={reveal[service.id] === true ? "text" : "password"}
                        value={keyInputs[service.id] ?? ""}
                        onChange={(e) =>
                          setKeyInputs((prev) => ({
                            ...prev,
                            [service.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          service.key_prefix_hint !== null
                            ? `${service.key_prefix_hint}…`
                            : "paste key"
                        }
                        style={{ ...inputStyle(), flex: 1 }}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setReveal((prev) => ({
                            ...prev,
                            [service.id]: !(prev[service.id] ?? false),
                          }))
                        }
                        style={iconButtonStyle()}
                        aria-label="toggle reveal"
                      >
                        {reveal[service.id] === true ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAddKey(service.id)}
                        style={{
                          ...MONO_LABEL_LOOSE,
                          color: COLORS.cyan,
                          padding: "6px 12px",
                          background: `rgba(${COLORS.cyanRgb},0.08)`,
                          border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
                          borderRadius: "5px",
                          cursor: "pointer",
                        }}
                      >
                        SAVE
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      <BalancesPanel ownerId={owner.id} />

      {/* SECTION — Local LLM */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, ...SPRING }}
        style={{ ...PANEL }}
      >
        <SectionHeader
          icon={Cpu}
          label="LOCAL LLM"
          title="Ollama"
          hint="Local preprocessor for chat. Refines prompts before they reach cloud agents."
        />
        {settings !== null && (
          <OllamaPanel
            ownerId={owner.id}
            currentDefault={settings.default_preprocessor_model_id}
            onChange={async (modelId) => {
              await updateSettings(owner.id, {
                default_preprocessor_model_id: modelId,
              });
              const fresh = await getSettings(owner.id);
              setSettings(fresh);
            }}
          />
        )}
      </motion.div>

      {/* SECTION 3 — Cost cap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...SPRING }}
        style={{ ...PANEL }}
      >
        <SectionHeader
          icon={DollarSign}
          label="COST CONTROL"
          title="Monthly Cap"
          hint="Hard ceiling. Lab runs blocked once exceeded (Router enforces in next module)."
        />
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <span style={{ color: COLORS.textMuted, fontSize: "13px" }}>$</span>
          <input
            type="number"
            min={0}
            value={costCapDollars}
            onChange={(e) => setCostCapDollars(e.target.value)}
            onBlur={() => void handleCostCapSave()}
            style={{ ...inputStyle(), width: "100px" }}
          />
          <span style={{ ...MONO_LABEL_LOOSE, color: COLORS.textFaint }}>
            / MONTH
          </span>
        </div>
      </motion.div>

      {/* SECTION 4 — Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, ...SPRING }}
        style={{ ...PANEL }}
      >
        <SectionHeader
          icon={Shield}
          label="PRIVACY"
          title="Benchmark Sharing"
        />
        <div
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              color: COLORS.textSecondary,
              fontSize: "12px",
              lineHeight: 1.55,
            }}
          >
            Your vault, prompts, and outputs{" "}
            <strong style={{ color: COLORS.textPrimary }}>
              never leave your device
            </strong>
            . If you enable sharing, we receive only anonymised task type, model
            used, score, and an output embedding. Never the text. Off by
            default.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span style={{ color: COLORS.textPrimary, fontSize: "13px" }}>
              Share anonymised benchmark votes
            </span>
            <button
              type="button"
              onClick={() => void handleOptInToggle()}
              style={{
                width: "44px",
                height: "24px",
                borderRadius: "12px",
                background:
                  settings.benchmark_opt_in === 1
                    ? `rgba(${COLORS.greenRgb},0.25)`
                    : `rgba(${COLORS.cyanRgb},0.06)`,
                border: `1px solid ${
                  settings.benchmark_opt_in === 1
                    ? `rgba(${COLORS.greenRgb},0.45)`
                    : `rgba(${COLORS.cyanRgb},0.22)`
                }`,
                position: "relative",
                cursor: "pointer",
                transition: "all 0.18s",
                boxShadow:
                  settings.benchmark_opt_in === 1
                    ? glow(COLORS.greenRgb, 0.2)
                    : "none",
              }}
              aria-label="toggle benchmark opt-in"
            >
              <motion.div
                animate={{ x: settings.benchmark_opt_in === 1 ? 20 : 2 }}
                transition={{ ...SPRING }}
                style={{
                  position: "absolute",
                  top: "2px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background:
                    settings.benchmark_opt_in === 1
                      ? COLORS.green
                      : COLORS.textFaint,
                  boxShadow:
                    settings.benchmark_opt_in === 1
                      ? glow(COLORS.greenRgb, 0.6)
                      : "none",
                }}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* SECTION 5 — Model catalog */}
      <CatalogPanel ownerId={owner.id} />
      <TestCallPanel ownerId={owner.id} />

      {/* DEV / RECOVERY: re-run the onboarding wizard */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...SPRING }}
        style={{ ...PANEL, padding: "16px 18px", marginTop: "12px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
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
              Re-run setup
            </div>
            <div
              style={{
                color: COLORS.textFaint,
                fontSize: "11px",
                marginTop: "2px",
              }}
            >
              Walk through the onboarding wizard again. Won't delete existing
              data.
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await updateSettings(owner.id, { onboarding_completed: 0 });
              window.location.reload();
            }}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.textPrimary,
              padding: "7px 14px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${COLORS.divider}`,
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            RUN AGAIN
          </button>
        </div>
      </motion.div>

      {/* CHECKING FOR NEW UPDATES */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, ...SPRING }}
        style={{ ...PANEL, padding: "16px 18px", marginTop: "12px" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
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
              Updates
            </div>
            <div
              style={{
                color: COLORS.textFaint,
                fontSize: "11px",
                marginTop: "2px",
              }}
            >
              Axis-AI checks for updates on launch. You can also check manually.
            </div>
            {updateStatus !== null && (
              <div
                style={{
                  color: COLORS.cyan,
                  fontSize: "11px",
                  marginTop: "6px",
                }}
              >
                {updateStatus}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleCheckUpdates()}
            disabled={updateChecking}
            style={{
              ...MONO_LABEL_LOOSE,
              color: COLORS.cyan,
              padding: "7px 14px",
              background: `rgba(${COLORS.cyanRgb},0.08)`,
              border: `1px solid rgba(${COLORS.cyanRgb},0.3)`,
              borderRadius: "5px",
              cursor: updateChecking ? "wait" : "pointer",
              opacity: updateChecking ? 0.5 : 1,
            }}
          >
            {updateChecking ? "CHECKING…" : "CHECK FOR UPDATES"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---- Small inline helpers (private to this file) ----

interface SectionHeaderProps {
  icon: typeof Key;
  label: string;
  title: string;
  hint?: string;
}

function SectionHeader({
  icon: Icon,
  label,
  title,
  hint,
}: SectionHeaderProps): JSX.Element {
  return (
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
          flexShrink: 0,
        }}
      >
        <Icon size={15} color={COLORS.cyan} />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            ...MONO_LABEL,
            color: `rgba(${COLORS.cyanRgb},0.5)`,
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: COLORS.textPrimary,
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {title}
        </div>
        {hint !== undefined && (
          <div
            style={{
              color: COLORS.textFaint,
              fontSize: "11px",
              marginTop: "2px",
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

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
    padding: "6px 10px",
    color: COLORS.textPrimary,
    fontSize: "13px",
    outline: "none",
    fontFamily: "inherit",
    appearance: "none",
    WebkitAppearance: "none",
  };
}

function iconButtonStyle(): React.CSSProperties {
  return {
    color: COLORS.textFaint,
    background: "transparent",
    border: `1px solid ${COLORS.inputBorder}`,
    borderRadius: "5px",
    padding: "4px 6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
}
