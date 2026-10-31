export * from "./types";
export * from "./categories";
export * from "./apps";
export * from "./pages";
export * from "./env";
export { defineApp } from "./define-app";

import { PLATFORM_ENV } from "./env";

/**
 * Site-wide constants shared by every app. Values fall back to
 * build-time defaults so the platform runs with an empty env file,
 * and can be overridden per environment via `VITE_SITE_*` variables.
 */
export const SITE = {
  name: "AI Reader",
  /** Sloganul principal al brandului. */
  tagline: "Ascultă text cu AI",
  /** Poziționarea de sprijin, folosită sub slogan. */
  positioning: "Text-to-speech multilingv cu suport OCR pentru imagini.",
  description:
    "AI Reader — aplicație web mobilă pentru transformarea textului și imaginilor în vorbire naturală, cu suport pentru limba română și alte limbi.",

  url: PLATFORM_ENV.siteUrl ?? "https://ai-reader.lovable.app",
  locale: "ro",
  twitter: PLATFORM_ENV.twitter ?? "",
  contactEmail: PLATFORM_ENV.contactEmail ?? "",
  facebookUrl: PLATFORM_ENV.facebookUrl || "",
  adsenseEnabled: false,
  adsenseClient: "",
  env: PLATFORM_ENV.env,
} as const;
