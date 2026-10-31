# packages/

Shared, reusable modules consumed by every app under `src/routes/*`.
Nothing in `packages/*` may import from `src/routes/*` or from a
specific app — dependency direction is one-way.

| Package | Purpose |
| --- | --- |
| `shared` | App registry (`APPS`), cross-cutting types, site constants |
| `ui` | Presentational primitives (Container, Section, AppCard, SiteNav, SiteFooter) |
| `seo` | `buildHead()` — consistent title/og/twitter meta per route |
| `analytics` | Vendor-agnostic `track()` façade |
| `ads` | `<AdSlot />` placeholder wired for future ad providers |
| `email` | Client-safe email helpers (`buildMailto`, addresses) |
| `premium` | Premium gating helpers + `<PremiumBadge />` |
| `auth` | `useAuth()` façade + `<SignInCTA />` — stubbed in the public phase |

## Adding a new app

1. Append an `AppMeta` entry to `packages/shared/apps.ts`.
2. Create the route file in `src/routes/<id>.tsx`.
3. Use `buildHead()` from `@/packages/seo` for the route's `head()`.
4. Compose the page from `@/packages/ui` primitives.

That's it — nav, footer, home directory, and premium badging pick the
new app up automatically from the registry.
