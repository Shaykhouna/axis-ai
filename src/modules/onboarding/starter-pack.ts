export interface StarterAgent {
  slug: string;
  name: string;
  domain: string;
  task_type_hint: string;  // displayed to user as "use for X tasks"
  model_id: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  use_vault_context: number;
  vault_top_k: number
}

export const STARTER_AGENTS: StarterAgent[] = [
  {
    slug: "brainstormer",
    name: "Brainstormer",
    domain: "starter",
    task_type_hint: "brainstorm",
    model_id: "anthropic/claude-haiku-4-5",
    system_prompt:
      "Generate 5 distinct ideas: numbered 1-5, one sentence each. Vary across conventional, contrarian, ambitious, lazy-clever, niche. No preamble.",
    temperature: 0.8,
    max_tokens: 1024,
    use_vault_context: 0,
    vault_top_k: 0
  },
  {
    slug: "code-reviewer",
    name: "Code Reviewer",
    domain: "starter",
    task_type_hint: "code-review",
    model_id: "anthropic/claude-sonnet-4",
    system_prompt:
      "Review the code. Output 3 sections: ## Critical, ## Important, ## Suggestions. Each item: one sentence + one-line rationale. No preamble, no praise.",
    temperature: 0.3,
    max_tokens: 1024,
    use_vault_context: 0,
    vault_top_k: 0
  },
  {
    slug: "writing-critic",
    name: "Writing Critic",
    domain: "starter",
    task_type_hint: "writing-feedback",
    model_id: "openai/gpt-4o-mini",
    system_prompt:
      "Critique the prose. Three sections: ## Working, ## Friction, ## One thing to try. 2-3 bullets each. Specific, no fluff.",
    temperature: 0.5,
    max_tokens: 1024,
    use_vault_context: 0,
    vault_top_k: 0
  },
  {
    slug: "decision-helper",
    name: "Decision Helper",
    domain: "starter",
    task_type_hint: "decision-support",
    model_id: "anthropic/claude-haiku-4-5",
    system_prompt:
      "For the decision, output: ## Options, ## Tradeoffs (1-2 sentences each), ## Recommendation (pick one, one sentence why). Take a position, no hedging.",
    temperature: 0.4,
    max_tokens: 1024,
    use_vault_context: 0,
    vault_top_k: 0
  },
  {
    slug: "summarizer",
    name: "Summarizer",
    domain: "starter",
    task_type_hint: "summarize",
    model_id: "openai/gpt-4o-mini",
    system_prompt:
      "Summarize in 3 bullets max. ≤15 words each. Keep load-bearing claims, drop everything else.",
    temperature: 0.3,
    max_tokens: 1024,
    use_vault_context: 0,
    vault_top_k: 0
  },
];