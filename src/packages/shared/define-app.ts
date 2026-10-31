import type { AppMeta } from "./types";

/**
 * Typed identity helper for authoring an app registry entry.
 *
 * Using `defineApp({...})` instead of a bare object literal gives
 * autocomplete + validation for every configurable field without any
 * runtime cost. Optional platform fields default to sensible values so
 * callers only spell out what differs.
 *
 *   defineApp({
 *     id: "salary",
 *     name: "Salary",
 *     tagline: "...",
 *     description: "...",
 *     category: "finance",
 *     icon: Wallet,
 *     route: "/salary",
 *     tags: ["calculator"],
 *     keywords: ["salary", "net"],
 *   });
 */
export function defineApp(
  input: Partial<AppMeta> &
    Pick<
      AppMeta,
      | "id"
      | "name"
      | "tagline"
      | "description"
      | "category"
      | "icon"
      | "route"
    >,
): AppMeta {
  return {
    tags: [],
    keywords: [],
    status: "live",
    enabled: true,
    visibility: "public",
    premium: false,
    showAds: true,
    searchable: true,
    featured: false,
    showInHome: true,
    requiresLogin: false,
    donationsEnabled: false,
    order: 100,
    ...input,
  } as AppMeta;
}
