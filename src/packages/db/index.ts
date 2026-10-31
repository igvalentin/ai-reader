/**
 * `@/packages/db` — the shared data layer.
 *
 * Features import the typed client from here — never the raw Supabase
 * client — so the underlying driver can be swapped in one place.
 */
export * from "./client";
export * from "./errors";
export * from "./query-helpers";
export * from "./env";
