import type { AppCategory } from "./types";

/**
 * Canonical taxonomy. Every `AppMeta.category` must reference an id here.
 */
export const CATEGORIES: readonly AppCategory[] = [
  {
    id: "resources",
    label: "Resurse",
    order: 0,
    description: "Catalogul demonstrativ de resurse al platformei.",
  },
  {
    id: "platform",
    label: "Platformă",
    order: 90,
    description: "Pagina principală și unelte comune între aplicații.",
  },
] as const;

export const getCategory = (id: AppCategory["id"]): AppCategory | undefined =>
  CATEGORIES.find((c) => c.id === id);
