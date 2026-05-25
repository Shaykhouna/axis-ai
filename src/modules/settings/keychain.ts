// Thin typed wrapper over the Rust keychain commands.
// Never logs values. Never stores in app state longer than needed.
import { invoke } from "@tauri-apps/api/core";

export async function keychainSet(key: string, value: string): Promise<void> {
  await invoke("keyring_set", { key, value });
}

export async function keychainGet(key: string): Promise<string | null> {
  const result = await invoke<string | null>("keyring_get", { key });
  return result;
}

export async function keychainDelete(key: string): Promise<void> {
  await invoke("keyring_delete", { key });
}