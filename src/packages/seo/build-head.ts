import { SITE } from "@/packages/shared";
import { jsonLdScript, type JsonLd } from "./structured-data";

interface BuildHeadInput {
  title: string;
  description: string;
  /** Relative path for canonical + og:url (e.g. "/salary"). */
  path?: string;
  /** Absolute URL for og:image + twitter:image. */
  image?: string;
  /** Set true on non-indexable routes (auth, dashboards). */
  noindex?: boolean;
  /** og:type override — defaults to "website". Use "article" on posts. */
  ogType?: string;
  /** JSON-LD payload(s) rendered into scripts. */
  structuredData?: JsonLd | JsonLd[];
}

interface HeadMetaEntry {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
  charSet?: string;
}

interface HeadLinkEntry {
  rel: string;
  href: string;
}

interface HeadScriptEntry {
  type: "application/ld+json";
  children: string;
}

/**
 * Build a consistent `head()` payload for a route: title / description /
 * open-graph / twitter tags + optional canonical, og:url, robots, and
 * JSON-LD. Every content route uses this helper so no page silently
 * inherits generic root metadata.
 */
export function buildHead(input: BuildHeadInput): {
  meta: HeadMetaEntry[];
  links?: HeadLinkEntry[];
  scripts?: HeadScriptEntry[];
} {
  const fullTitle = `${input.title} — ${SITE.name}`;
  const ogType = input.ogType ?? "website";

  const meta: HeadMetaEntry[] = [
    { title: fullTitle },
    { name: "description", content: input.description },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: input.description },
    { property: "og:type", content: ogType },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: input.description },
  ];

  const absolute = input.path
    ? `${SITE.url.replace(/\/$/, "")}${input.path === "/" ? "/" : input.path}`
    : undefined;

  if (absolute) {
    meta.push({ property: "og:url", content: absolute });
  }

  if (input.image) {
    meta.push({ property: "og:image", content: input.image });
    meta.push({ name: "twitter:image", content: input.image });
  }

  if (input.noindex) {
    meta.push({ name: "robots", content: "noindex, nofollow" });
  }

  const links: HeadLinkEntry[] = [];
  if (absolute) links.push({ rel: "canonical", href: absolute });

  const scripts: HeadScriptEntry[] = [];
  if (input.structuredData) scripts.push(jsonLdScript(input.structuredData));

  return {
    meta,
    ...(links.length ? { links } : {}),
    ...(scripts.length ? { scripts } : {}),
  };
}
