import { z } from "zod";

/**
 * Environment configuration. Validated once at boot.
 *
 * Secrets are read from the process environment — in production these are
 * injected by Doppler (locally via `doppler run --`, on Railway via the
 * Doppler integration). The app never reads a secrets file itself.
 */
const envSchema = z.object({
  // Anthropic
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  MODEL: z.string().min(1).default("claude-sonnet-4-6"),
  EFFORT: z.enum(["low", "medium", "high", "xhigh", "max"]).default("high"),
  MAX_AGENT_STEPS: z.coerce.number().int().positive().max(50).default(10),
  SYSTEM_PROMPT: z.string().optional(),

  // Supabase (optional — the agent runs statelessly when these are absent)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();

export const supabaseConfigured = Boolean(
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY,
);
