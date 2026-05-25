export type ApiKeySource = "byok" | "platform_proxy";

export interface Settings {
  owner_id: string;
  benchmark_opt_in: number;             // SQLite 0|1
  monthly_cost_cap_cents: number;
  api_key_source: ApiKeySource;
  model_catalog_url: string;
  model_catalog_last_synced_at: number | null;
  user_domain_tag: string | null;
  created_at: number;
  updated_at: number;
  default_preprocessor_model_id: string | null;
}

export interface ApiKeyRef {
  id: string;
  owner_id: string;
  service: string;
  keychain_key: string;
  created_at: number;
}