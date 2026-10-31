
# Business Platform Extension

Extend the current foundation (routes, `@/packages/*`, Supabase-backed data layer) with five reusable platform services. No existing code is rewritten — every new capability lives in new packages under `src/packages/*`, following the existing repository → service → hook layering.

## Architecture Overview

```text
src/packages/
├── premium/        (extended)  tier logic, gates, hooks, middleware
├── donations/      (new)       Stripe checkout, webhook, history
├── email/          (extended)  Resend + React Email templates + service
├── notifications/  (new)       in-app, banners, maintenance, email bridge
└── feature-flags/  (new)       registry, evaluator, hooks
```

All persistence goes through new repositories in `src/packages/db/repositories/*` and services in `src/packages/db/services/*`, matching the current pattern (`favorites`, `history`, etc.). Server logic uses `createServerFn` (`@tanstack/react-start`); webhooks use `src/routes/api/public/*`.

## 1. Premium Platform

**Database (new migration):**
- `app_role` enum: `free | premium | donor | admin`
- `user_roles(user_id, role, granted_at, expires_at)` + `has_role(uuid, app_role)` security-definer function
- `premium_subscriptions(user_id, status, source, current_period_end)`

**Package `@/packages/premium` (extended):**
- `useTier()` → `'free' | 'premium' | 'donor'` (donor implies premium benefits)
- `useEntitlements()` → `{ noAds, unlimitedFavorites, unlimitedSaved, unlimitedHistory, earlyAccess }`
- `<PremiumGate feature="...">` component + `withPremium()` HOC
- `enforceLimit(kind, currentCount)` shared helper — favorites/history/saved hooks call this instead of hard-coding caps
- Ads provider reads `useEntitlements().noAds` and short-circuits when true

## 2. Donations (Stripe)

**Prereq:** enable Lovable-managed Stripe payments (`enable_stripe_payments`). Ask the user to confirm before enabling.

**Database:**
- `donations(user_id nullable, stripe_session_id, amount_cents, currency, kind: one_time|monthly, status, created_at)`
- Trigger on successful donation grants `donor` role (and refreshes `expires_at` for monthly).

**Package `@/packages/donations`:**
- `<DonateButton amount kind="one_time|monthly">` + `<DonationForm>` (preset amounts + custom)
- `createDonationCheckout` server fn → Stripe Checkout session
- `/api/public/webhooks/stripe` route → verifies signature, upserts donation, grants donor role, triggers confirmation email
- `useDonationHistory()` hook

## 3. Email Platform (Resend)

**Prereq:** connect Resend via `standard_connectors--connect` (gateway-backed).

**Package `@/packages/email` (extended):**
- `sendEmail({ template, to, data })` server-only helper routed through Resend gateway
- React Email templates in `src/packages/email/templates/`: `welcome`, `password-reset`, `email-verification`, `contact-form`, `newsletter`, `premium-confirmation`, `donation-confirmation`
- Template registry with typed props per template
- Server fns: `sendWelcomeEmail`, `sendContactFormEmail`, `sendNewsletterEmail`, etc.
- Auth email hook (welcome / reset / verify) wired via Supabase auth email hook edge function → forwards to `sendEmail`

## 4. Notifications

**Database:**
- `notifications(user_id nullable, kind: info|announcement|maintenance, title, body, link, starts_at, ends_at, dismissible)`
- `notification_reads(user_id, notification_id, read_at)` for unread counts
- `has_role`-gated policies so admins insert announcements

**Package `@/packages/notifications`:**
- `useNotifications()` → list + `unreadCount`
- `useMarkRead(id)`, `useDismiss(id)`
- `<NotificationBell>` (dropdown), `<AnnouncementBanner>` (site-wide, top of `__root`), `<MaintenanceBanner>`
- `sendNotification({ userId?, kind, title, body, email? })` server fn — optionally also dispatches via email platform

## 5. Feature Flags

**Database:**
- `feature_flags(key PK, description, enabled, rollout_percentage, premium_only, starts_at, ends_at)`
- `feature_flag_overrides(flag_key, scope: app|user, scope_id, enabled)`

**Package `@/packages/feature-flags`:**
- `useFlag(key)` → boolean (evaluates: schedule window → user override → app override → premium gate → percentage rollout via stable hash of user id + key → global default)
- `useFlags(keys[])` for batch
- `<FeatureFlag flag="..." fallback={...}>` component
- `<FeatureFlagAdmin>` panel (admin-only) for toggling
- Server fn `evaluateFlag(key, ctx)` used inside loaders

## Wiring Into Existing Apps

- `AppScope` extended: pulls `useEntitlements()` and passes `showAds: !entitlements.noAds` into `AdsProvider`.
- `useFavorites` / `useHistory` / `useSavedCalculations` call `enforceLimit()` from premium package before insert.
- `__root.tsx` renders `<AnnouncementBanner />` and `<MaintenanceBanner />` above `<Outlet />`.
- `SiteNav` gains `<NotificationBell />` when signed in.

## Deliverables Order

1. Migration: roles, premium_subscriptions, donations, notifications, notification_reads, feature_flags, feature_flag_overrides + RLS + grants + triggers.
2. `premium` package extension + rewire ads/limits.
3. `feature-flags` package.
4. `notifications` package + wire into `__root` and `SiteNav`.
5. Resend connector + `email` package templates + service.
6. Stripe enable + `donations` package + webhook + donor-role trigger + confirmation email.
7. Build + typecheck + smoke test in preview.

## Confirmations Needed Before Building

1. **Stripe:** OK to enable Lovable-managed Stripe payments (test mode first, live after your account claim)?
2. **Resend:** OK to connect Resend as the email provider (I'll open the connector dialog)? Sender domain must be verified there for user-facing emails.
3. **Admin role:** Which email should get initial `admin` role for managing flags/notifications/announcements?

Once you confirm 1–3 I'll execute steps 1–7 end to end.
