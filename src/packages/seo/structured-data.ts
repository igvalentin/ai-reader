/**
 * JSON-LD builders for schema.org structured data.
 *
 * Each helper returns a plain object; pass it through `jsonLdScript()`
 * to produce the `scripts` entry TanStack Router's `head()` expects.
 */

import { SITE } from "@/packages/shared";

export type JsonLd = Record<string, unknown>;

export function jsonLdScript(data: JsonLd | JsonLd[]) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify(data),
  };
}

export function organizationSchema(input?: {
  url?: string;
  logo?: string;
  sameAs?: string[];
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    description: SITE.description,
    ...(input?.url ? { url: input.url } : {}),
    ...(input?.logo ? { logo: input.logo } : {}),
    ...(input?.sameAs?.length ? { sameAs: input.sameAs } : {}),
  };
}

export function websiteSchema(input?: { url?: string; searchUrl?: string }): JsonLd {
  const base: JsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    description: SITE.description,
    ...(input?.url ? { url: input.url } : {}),
  };
  if (input?.searchUrl) {
    base.potentialAction = {
      "@type": "SearchAction",
      target: `${input.searchUrl}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    };
  }
  return base;
}

export function articleSchema(input: {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    author: input.authorName
      ? { "@type": "Person", name: input.authorName }
      : { "@type": "Organization", name: `Echipa editorială ${SITE.name}` },
    publisher: { "@type": "Organization", name: SITE.name },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function softwareAppSchema(input: {
  name: string;
  description: string;
  url: string;
  category?: string;
  price?: string;
  priceCurrency?: string;
}): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: input.category ?? "WebApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: input.price ?? "0",
      priceCurrency: input.priceCurrency ?? "USD",
    },
  };
}
