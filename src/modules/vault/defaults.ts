import { documentDir, join } from "@tauri-apps/api/path";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { listSources, createSource } from "./sources";

const DEFAULT_VAULT_FOLDER = "AxisAI-Vault";

const WELCOME_CONTENT = `# Welcome to your Axis-AI vault

This folder is your default knowledge base. Drop notes, docs, or excerpts here, then sync from the Vault page to make them retrievable by your agents.

## How retrieval works

Agents marked **"use vault context"** automatically query this index when they run. Relevant chunks get attached to the prompt.

## Want to point at your Obsidian / Notion / other folder?

Settings → Vault → add another source. You can have multiple vaults. Each gets its own sync.
`;

export interface DefaultVaultResult {
  created: boolean;          // true if folder was newly created
  registered: boolean;       // true if vault source was newly added
  path: string;
}

// Ensures the user has a default vault on first launch. Safe to call on every
// startup — does nothing if any vault source already exists for this owner.
export async function ensureDefaultVault(
  ownerId: string
): Promise<DefaultVaultResult | null> {
  // If the user has already configured at least one vault source, leave alone.
  // They may have pointed at their Obsidian vault during a previous session.
  const existing = await listSources(ownerId);
  if (existing.length > 0) return null;

  const docDir = await documentDir();
  const vaultPath = await join(docDir, DEFAULT_VAULT_FOLDER);

  const dirExists = await exists(vaultPath);
  let created = false;
  if (!dirExists) {
    await mkdir(vaultPath, { recursive: true });
    const welcomePath = await join(vaultPath, "WELCOME.md");
    await writeTextFile(welcomePath, WELCOME_CONTENT);
    created = true;
  }

  await createSource(
    ownerId,
    vaultPath,
    "Default Vault",);

  return { created, registered: true, path: vaultPath };
}