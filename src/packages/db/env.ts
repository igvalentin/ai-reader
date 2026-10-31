/**
 * Centralized environment configuration for the data layer.
 *
 * Browser code reads `VITE_EXTERNAL_SUPABASE_*` at build time. Server code
 * (server functions, server routes) reads the same pair from `process.env`
 * — never from `import.meta.env`, which is undefined inside the Worker
 * runtime. The pair must be complete and matching; there is no fallback
 * to any inherited project.
 */

export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

/**
 * Resolves the external Supabase URL/publishable-key pair for the current
 * context. Pass `import.meta.env` with `browser: true` from client code and
 * `process.env` with `browser: false` from server code.
 */
export function resolveExternalPair(
  env: Record<string, string | undefined>,
  browser: boolean,
): SupabaseEnv {
  const url = env[browser ? "VITE_EXTERNAL_SUPABASE_URL" : "EXTERNAL_SUPABASE_URL"];
  const key = env[browser ? "VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY" : "EXTERNAL_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Configurația Supabase este incompletă (lipsesc URL-ul sau cheia publicabilă).");
  }
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("Adresa Supabase configurată este invalidă.");
  }
  return { url: parsed.origin, publishableKey: key };
}
