/**
 * Centralized platform environment.
 *
 * Reads from `import.meta.env` in the browser and `process.env` on the
 * server, so the same helper works in both contexts. Every value is
 * optional — sensible defaults keep the platform running with an empty
 * env file.
 *
 * Convention:
 *   VITE_*  — inlined into the client bundle at build time.
 *   plain   — server-only (server functions, server routes).
 */

export type PlatformEnvironment = "development" | "preview" | "production";

interface RawEnv {
  MODE?: string;
  VITE_APP_ENV?: string;
  VITE_SITE_NAME?: string;
  VITE_SITE_TAGLINE?: string;
  VITE_SITE_DESCRIPTION?: string;
  VITE_SITE_URL?: string;
  VITE_SITE_LOCALE?: string;
  VITE_SITE_TWITTER?: string;
  VITE_CONTACT_EMAIL?: string;
  VITE_FACEBOOK_URL?: string;
  VITE_GA_ID?: string;
  VITE_CLARITY_ID?: string;
  VITE_ADSENSE_ENABLED?: string;
  VITE_ADSENSE_CLIENT?: string;
  VITE_ADSENSE_CLIENT_ID?: string;
}

function readEnv(): RawEnv {
  const out: RawEnv = {};
  if (typeof import.meta !== "undefined" && import.meta.env) {
    Object.assign(out, import.meta.env as RawEnv);
  }
  if (typeof process !== "undefined" && process.env) {
    for (const k of Object.keys(out) as (keyof RawEnv)[]) {
      if (!out[k] && process.env[k]) out[k] = process.env[k];
    }
    // server-only fallbacks
    out.VITE_SITE_URL ||= process.env.SITE_URL;
    out.VITE_APP_ENV ||= process.env.APP_ENV;
  }
  return out;
}

const RAW = readEnv();

export const ENV: PlatformEnvironment = (() => {
  const v = (RAW.VITE_APP_ENV || RAW.MODE || "development").toLowerCase();
  if (v === "production" || v === "prod") return "production";
  if (v === "preview" || v === "staging") return "preview";
  return "development";
})();

export const isProduction = ENV === "production";
export const isPreview = ENV === "preview";
export const isDevelopment = ENV === "development";

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === "true";
}

export const PLATFORM_ENV = {
  env: ENV,
  siteName: RAW.VITE_SITE_NAME,
  siteTagline: RAW.VITE_SITE_TAGLINE,
  siteDescription: RAW.VITE_SITE_DESCRIPTION,
  siteUrl: RAW.VITE_SITE_URL,
  locale: RAW.VITE_SITE_LOCALE,
  twitter: RAW.VITE_SITE_TWITTER,
  contactEmail: RAW.VITE_CONTACT_EMAIL,
  facebookUrl: RAW.VITE_FACEBOOK_URL,
  gaId: RAW.VITE_GA_ID,
  clarityId: RAW.VITE_CLARITY_ID,
  adsenseEnabled: readBoolean(RAW.VITE_ADSENSE_ENABLED, false),
  adsenseClient: RAW.VITE_ADSENSE_CLIENT ?? RAW.VITE_ADSENSE_CLIENT_ID,
} as const;
