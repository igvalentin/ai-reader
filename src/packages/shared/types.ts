/**
 * Shared cross-package types for the starter platform.
 *
 * Every app in the platform describes itself with an `AppMeta`
 * so shared surfaces (home directory, nav, sitemap, SEO helpers,
 * breadcrumbs, search) can render it without knowing anything about
 * the app itself. Adding a new app is one registry entry — nothing
 * else needs to change.
 */
import type { LucideIcon } from "lucide-react";

export type AppId = "catalog" | "home";

export type AppCategoryId = "resources" | "platform";

export type AppStatus = "live" | "beta" | "planned" | "deprecated";
export type AppVisibility = "public" | "private";

/** SEO overrides consumed by `@/packages/seo`. */
export interface AppSeo {
  /** `<title>` — falls back to `name`. */
  title?: string;
  /** `<meta name="description">` — falls back to `tagline`. */
  description?: string;
  /** Absolute or root-relative og/twitter image URL. */
  image?: string;
  /** Extra keywords beyond `AppMeta.keywords`. */
  keywords?: readonly string[];
}

export interface AppTheme {
  /** Brand accent as a CSS color (hex, hsl, css var). */
  accent?: string;
  /** Optional gradient used on hero surfaces. */
  gradient?: string;
}

export interface AppMeta {
  // ---- identity ----
  id: AppId;
  /** Short human name shown in nav, cards, and breadcrumbs. */
  name: string;
  /** One-line pitch used on cards and og:description. */
  tagline: string;
  /** Longer description used on the app's landing surface. */
  description: string;
  /** Optional long-form marketing copy for the app's own landing page. */
  longDescription?: string;

  // ---- taxonomy ----
  category: AppCategoryId;
  /** Free-form tags used for filtering / related-apps hints. */
  tags: readonly string[];
  /** Search keywords — the search index concatenates these with name/tagline. */
  keywords: readonly string[];

  // ---- presentation ----
  /** Icon component (lucide-react). Rendered by shared UI, no per-app work. */
  icon: LucideIcon;
  /** URL path this app is mounted at, e.g. "/catalog". "/" for home. */
  route: string;
  /** Optional per-app theme overrides consumed by shared UI. */
  theme?: AppTheme;
  /** Absolute or root-relative feature/hero image used on cards. */
  featureImage?: string;

  // ---- lifecycle ----
  status: AppStatus;
  /** Master switch — if false the app is hidden from every shared surface. */
  enabled: boolean;
  visibility: AppVisibility;

  // ---- access ----
  /** Requires the premium tier to open. */
  premium: boolean;
  /** Requires an authenticated session to open. */
  requiresLogin?: boolean;

  // ---- monetization ----
  /** Show ad slots on the app's own pages. */
  showAds: boolean;
  /** App accepts donations (surfaces donation CTAs). */
  donationsEnabled?: boolean;

  // ---- discovery ----
  /** Appears in the global search index. */
  searchable: boolean;
  /** Pinned to the top of the directory / home hero. */
  featured: boolean;
  /** Appears in the Home directory (defaults true when visible). */
  showInHome?: boolean;
  /** Sort key for directory + nav (ascending). Ties break on name. */
  order: number;

  // ---- contact ----
  /** Per-app contact email — falls back to platform SITE.contactEmail. */
  contactEmail?: string;

  // ---- SEO ----
  seo?: AppSeo;
  /** Absolute OpenGraph image URL (leaf-only). Falls back to seo.image. */
  ogImage?: string;
}

export interface AppCategory {
  id: AppCategoryId;
  label: string;
  /** Sort key for category sections (ascending). */
  order: number;
  /** Optional one-line description shown above the section. */
  description?: string;
}

/** A breadcrumb node — rendered by `@/packages/ui`'s `Breadcrumbs`. */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** Search hit shape returned by the registry's search helper. */
export interface AppSearchHit {
  app: AppMeta;
  /** Higher = better match. Callers can trim or threshold. */
  score: number;
}
