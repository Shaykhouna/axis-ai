import type { Diagnostics } from "./gather";

// Renders diagnostics as Markdown — fits cleanly into a GitHub issue body.
export function formatAsMarkdown(d: Diagnostics): string {
  return `## Diagnostics

**App**
- Name: ${d.app.name}
- Version: \`${d.app.version}\`

**OS**
- Platform: \`${d.os.platform}\` (${d.os.type})
- Architecture: \`${d.os.arch}\`
- Version: ${d.os.version}

**Owner**
- ID: \`${d.owner.id}\`
- Name: ${d.owner.displayName}

**Configuration**
- Onboarding completed: ${d.config.onboardingCompleted ? "yes" : "no"}
- Monthly cost cap: $${(d.config.monthlyCostCapCents / 100).toFixed(2)}
- Catalog URL: \`${d.config.catalogUrl}\`
- Domain tag: ${d.config.domainTag ?? "(none)"}
- Preprocessor model: \`${d.config.preprocessorModel ?? "(none)"}\`

**Services**
- Configured keys: ${d.services.configuredKeys.length > 0 ? d.services.configuredKeys.map((s) => `\`${s}\``).join(", ") : "(none)"}
- Ollama: ${d.services.ollamaReachable ? `running, ${d.services.ollamaModelCount} model(s)` : "not running"}

**Vault**
- Sources: ${d.vault.sourcesCount}
${d.vault.paths.map((p) => `  - \`${p}\``).join("\n")}

_Generated: ${new Date(d.timestamp * 1000).toISOString()}_`;
}

// One-line human-readable version for headers/labels.
export function formatAsLine(d: Diagnostics): string {
  return `${d.app.name} v${d.app.version} · ${d.os.platform} ${d.os.arch} · ${d.os.version}`;
}