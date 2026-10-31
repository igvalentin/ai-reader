import { LibraryBig } from "lucide-react";
import type { AppId, AppMeta, AppSearchHit } from "./types";
import { CATEGORIES } from "./categories";

/**
 * Canonical registry of the apps hosted on the platform.
 *
 * Every shared surface (nav, footer, sitemap, SEO) reads from this
 * registry — never hard-code app metadata in a component. The catalog
 * below is the demo app; replace or extend it for your own product.
 */
export const APPS: readonly AppMeta[] = [
  {
    id: "catalog",
    name: "Catalog",
    tagline: "Resurse și instrumente recomandate.",
    description:
      "Catalog demonstrativ de resurse, cu căutare text și filtrare pe categorii.",
    category: "resources",
    tags: ["resurse", "instrumente", "demo"],
    keywords: ["catalog", "resurse", "starter"],
    icon: LibraryBig,
    route: "/",
    status: "live",
    enabled: true,
    visibility: "public",
    premium: false,
    showAds: false,
    searchable: true,
    featured: true,
    order: 0,
  },
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export const getAppById = (id: AppId): AppMeta | undefined =>
  APPS.find((app) => app.id === id);

export const getAppByRoute = (route: string): AppMeta | undefined =>
  APPS.find((app) => app.route === route);

// ---------------------------------------------------------------------------
// Filters — the only APIs shared UI should use
// ---------------------------------------------------------------------------

const byOrder = (a: AppMeta, b: AppMeta): number =>
  a.order - b.order || a.name.localeCompare(b.name);

/** Apps eligible to appear in any shared surface (enabled + public). */
export const listVisibleApps = (): AppMeta[] =>
  APPS.filter((a) => a.enabled && a.visibility === "public").sort(byOrder);

/** Apps that appear in the public directory (everything except the platform shell). */
export const listDirectoryApps = (): AppMeta[] =>
  listVisibleApps().filter((a) => a.id !== "home" && a.showInHome !== false);

/** Featured apps — pinned at the top of the home hero. */
export const listFeaturedApps = (): AppMeta[] =>
  listDirectoryApps().filter((a) => a.featured);

/** Directory apps grouped by category, in category order. */
export function listAppsByCategory(): Array<{
  category: (typeof CATEGORIES)[number];
  apps: AppMeta[];
}> {
  const dir = listDirectoryApps();
  return [...CATEGORIES]
    .filter((c) => c.id !== "platform")
    .sort((a, b) => a.order - b.order)
    .map((category) => ({
      category,
      apps: dir.filter((a) => a.category === category.id),
    }))
    .filter((section) => section.apps.length > 0);
}

// ---------------------------------------------------------------------------
// Search — small, deterministic, no external dep
// ---------------------------------------------------------------------------

/**
 * Ranked substring search across name/tagline/keywords/tags for every
 * `searchable` app. Empty query returns an empty array so consumers
 * can decide what to render (e.g. the full directory).
 */
export function searchApps(query: string, limit = 8): AppSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const hits: AppSearchHit[] = [];
  for (const app of APPS) {
    if (!app.enabled || app.visibility !== "public" || !app.searchable) continue;

    const haystacks: Array<{ text: string; weight: number }> = [
      { text: app.name.toLowerCase(), weight: 5 },
      { text: app.tagline.toLowerCase(), weight: 2 },
      { text: app.description.toLowerCase(), weight: 1 },
      { text: app.keywords.join(" ").toLowerCase(), weight: 3 },
      { text: app.tags.join(" ").toLowerCase(), weight: 2 },
    ];

    let score = 0;
    for (const token of tokens) {
      for (const { text, weight } of haystacks) {
        if (text.includes(token)) score += weight;
      }
    }
    if (score > 0) hits.push({ app, score });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
