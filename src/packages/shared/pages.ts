/**
 * Pagini publice statice (non-aplicații) — folosite de footer și sitemap.
 * ImoIndex nu are încă pagini statice publice; paginile legale se adaugă
 * după confirmarea datelor operatorului.
 */
export interface StaticPageMeta {
  path: string;
  label: string;
  title: string;
  description: string;
  /** Prioritate sitemap. */
  priority: string;
}

export const STATIC_PAGES: readonly StaticPageMeta[] = [] as const;

export const getStaticPage = (path: string): StaticPageMeta | undefined =>
  STATIC_PAGES.find((p) => p.path === path);
