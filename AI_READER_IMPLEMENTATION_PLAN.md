# AI Reader — Repository Discovery and Implementation Plan

## Executive Summary

This document provides a comprehensive analysis of the existing repository (originally Alevanta/ImoIndex platform) and proposes a minimal, staged implementation plan for transforming it into **AI Reader**, a mobile-first multilingual text-to-speech web application.

---

## 1. Repository Architecture Summary

### Framework and Core Technologies

| Component | Technology | Version |
|-----------|------------|----------|
| **Framework** | TanStack Start | v1.168.60 |
| **React** | React 19 | v19.2.0 |
| **Build Tool** | Vite | v8.0.16 |
| **Language** | TypeScript | v5.8.3 |
| **Package Manager** | Bun | Latest |
| **Routing** | TanStack Router | v1.170.41 |
| **State Management** | TanStack Query | v5.101.1 |
| **Styling** | Tailwind CSS | v4.2.1 |
| **UI Components** | Radix UI + shadcn/ui | Latest |

### Infrastructure

- **Deployment**: Vercel (production at `https://alevanta.info` for current project)
- **Database**: Supabase (external project: `njoksyesteoagkkktlam`)
- **Authentication**: Supabase Auth with Google OAuth
- **Development**: Lovable → GitHub → Vercel pipeline

### Architecture Patterns

**1. File-based Routing (TanStack Router)**
- Routes defined in `src/routes/`
- Auto-generated route tree in `src/routeTree.gen.ts`
- SSR support via `src/server.ts`

**2. Package-based Organization**
```
src/packages/
├── auth/          Authentication facade (Supabase-backed)
├── db/            Database client and helpers
├── admin/         Admin role checking
├── seo/           SEO utilities (head, structured data)
├── ui/            Shared UI components (nav, footer, layout)
└── shared/        Platform constants and types
```

**3. Database Layer**
- **Browser client**: `@/integrations/supabase/client` (RLS-protected)
- **Server client**: `@/integrations/supabase/client.server` (service role, bypasses RLS)
- **Typed client**: `@/packages/db/client` (abstraction layer)
- **Environment**: External Supabase project configured via `EXTERNAL_SUPABASE_URL` and `EXTERNAL_SUPABASE_PUBLISHABLE_KEY`

**4. Authentication**
- `useAuth()` hook provides `{ status, user, session }`
- `useProfile()` for user profile management
- Actions: `signInWithEmail`, `signInWithGoogle`, `signOut`, etc.
- Auth state synced across tabs via Supabase listener

**5. Server Functions**
- TanStack Start server functions (pattern: `createServerFn`)
- Used for authenticated data operations
- RLS policies enforce data isolation

### Existing Reusable Components

**UI Components** (all from `@/components/ui/`):
- Form controls: `input`, `textarea`, `button`, `select`, `checkbox`, `radio-group`
- Layout: `card`, `separator`, `container`, `sheet`, `dialog`
- Feedback: `alert`, `toast` (sonner), `progress`, `skeleton`
- Navigation: `tabs`, `breadcrumb`, `dropdown-menu`
- Data display: `table`, `badge`, `avatar`

**Shared UI** (`@/packages/ui/`):
- `SiteNav` — responsive header with auth integration
- `SiteFooter` — platform footer
- `Container`, `Section`, `PageHeader` — layout primitives

**Utilities**:
- `cn()` — Tailwind class merging (`@/lib/utils`)
- Error reporting (`@/lib/lovable-error-reporting`)
- SEO helpers (`@/packages/seo`)

### Current Database Schema

**Platform Foundation** (from `202610180000_platform.sql`):
```sql
-- Roles
CREATE TYPE app_role AS ENUM ('free','premium','donor','admin');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, role)
);

-- Helper function
CREATE FUNCTION has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN;
```

**ImoIndex-specific tables** (real estate domain):
- Properties, saved searches, sources, etc. (not relevant to AI Reader)

### Environment Variables

**Current** (`.env.example`):
```bash
VITE_APP_ENV=development
VITE_SITE_NAME=Alevanta
VITE_SITE_TAGLINE=...
VITE_SITE_URL=https://alevanta.info
VITE_GA_ID=
VITE_CLARITY_ID=
VITE_ADSENSE_ENABLED=false
```

**Supabase** (configured via external project):
- `EXTERNAL_SUPABASE_URL`
- `EXTERNAL_SUPABASE_PUBLISHABLE_KEY`
- `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` (server-only)

### PWA Configuration

**Existing** (`public/manifest.webmanifest`):
- Name: "ImoIndex"
- Icons: 192px, 512px
- Display: standalone
- Theme color: `#4F46E5`
- Orientation: portrait

**Service Worker**: Not currently implemented

---

## 2. Conflicts Between Starter Kit and AI Reader Requirements

### Major Conflicts

1. **Domain-Specific Code**
   - Current: ImoIndex real estate platform with property search, saved searches, admin
   - Required: Complete removal or isolation of ImoIndex-specific features
   - **Resolution**: Create new routes, remove/archive old routes, update navigation

2. **Branding and Identity**
   - Current: "ImoIndex — Piața imobiliară, mai clară"
   - Required: "AI Reader" with TTS-focused branding
   - **Resolution**: Update `SITE` constants, manifest, meta tags, and all UI text

3. **Database Schema**
   - Current: Real estate tables (properties, sources, etc.)
   - Required: AI Reader tables (readings, subscriptions, usage tracking)
   - **Resolution**: Add new migrations, preserve `profiles` and `user_roles` tables

### Minor Conflicts

1. **Navigation Structure**
   - Current: Search, Saved Searches, Admin
   - Required: Simple single-page app with optional account/subscription pages
   - **Resolution**: Simplify `SiteNav`, remove unnecessary links

2. **Romanian-First Content**
   - Current: All UI text in Romanian
   - Required: Multilingual UI (Romanian + English minimum)
   - **Resolution**: Keep Romanian as default, add i18n later if needed

### Non-Conflicts (Reusable)

✅ Authentication system (Supabase Auth)
✅ Profile management
✅ Role-based access (for subscription tiers)
✅ UI component library
✅ Responsive layout patterns
✅ PWA foundation
✅ Vercel + Supabase infrastructure

---

## 3. Proposed Implementation Plan

### Stage 0: Repository Cleanup and Foundation (PREREQUISITE)

**Goal**: Prepare the repository for AI Reader implementation without breaking existing infrastructure.

**Tasks**:
1. Archive ImoIndex-specific code:
   - Move `src/packages/imobiliare/` to `archive/` or delete
   - Remove ImoIndex routes (keep `__root.tsx`, `auth.tsx`, `reset-password.tsx`)
   - Remove ImoIndex migrations (keep platform foundation)
2. Update branding:
   - Modify `SITE` constants in `src/packages/shared/index.ts`
   - Update `public/manifest.webmanifest`
   - Update `README.md`
3. Verify build:
   - Run `bun run build`
   - Ensure no TypeScript errors
   - Verify Supabase connection still works

**Deliverables**:
- Clean repository with only platform foundation
- Updated branding
- Successful build

**Duration**: 1 hour

---

### Stage 1: Product Foundation and Mobile-First UI (Prompt 1)

**Goal**: Implement the core AI Reader interface without OCR or TTS.

**New Routes**:
- `src/routes/index.tsx` — Main AI Reader page

**New Components**:
- `src/components/ai-reader/text-input.tsx` — Multiline text editor
- `src/components/ai-reader/image-upload.tsx` — Image upload control
- `src/components/ai-reader/language-selector.tsx` — Language picker with auto-detect
- `src/components/ai-reader/audio-player.tsx` — Placeholder player
- `src/components/ai-reader/privacy-notice.tsx` — Privacy statement

**UI Requirements**:
- Mobile-first responsive design
- Accessible form controls
- Loading, empty, and error states
- No authentication required yet
- No actual OCR or TTS (placeholders only)

**Reused Components**:
- `Button`, `Card`, `Input`, `Textarea` from `@/components/ui/`
- `Container`, `Section` from `@/packages/ui/`

**Deliverables**:
- Working responsive UI
- Reusable AI Reader components
- Updated documentation

**Duration**: 3-4 hours

---

### Stage 2: Image Upload and OCR (Prompt 2)

**Goal**: Implement image upload, validation, and text extraction.

**OCR Provider Selection**:
- **Option 1**: Google Cloud Vision API (server-side, excellent Romanian support)
- **Option 2**: Tesseract.js (browser-based, free, decent Romanian support)
- **Recommendation**: Start with Tesseract.js for MVP, upgrade to Google Vision if quality insufficient

**New Files**:
- `src/packages/ocr/index.ts` — OCR provider interface
- `src/packages/ocr/tesseract-provider.ts` — Tesseract implementation
- `src/packages/ocr/types.ts` — OCR types

**Server Functions** (if using Google Vision):
- `src/lib/ocr.functions.ts` — `extractText(imageData)` server function

**Features**:
- File validation (MIME type, size)
- Image preview
- OCR progress indicator
- Editable extracted text
- Romanian diacritics preservation

**Security**:
- File size limit: 5MB
- Allowed types: `image/jpeg`, `image/png`, `image/webp`
- Server-side validation
- Transient processing (no permanent storage unless required)

**Tests**:
- Valid image upload
- Invalid file type rejection
- Oversized image rejection
- Romanian text extraction

**Deliverables**:
- Working OCR pipeline
- Provider abstraction
- Tests

**Duration**: 4-6 hours

---

### Stage 3: Multilingual Text-to-Speech (Prompt 3)

**Goal**: Implement complete TTS pipeline with Romanian and English support.

**TTS Provider Selection**:
- **Option 1**: Google Cloud Text-to-Speech (excellent Romanian voices, pay-per-use)
- **Option 2**: ElevenLabs (high quality, expensive)
- **Option 3**: Browser Web Speech API (free, limited voices)
- **Recommendation**: Google Cloud TTS (best Romanian quality, reasonable pricing)

**New Files**:
- `src/packages/tts/index.ts` — TTS provider interface
- `src/packages/tts/google-provider.ts` — Google TTS implementation
- `src/packages/tts/language-detector.ts` — Auto language detection
- `src/packages/tts/text-normalizer.ts` — Romanian text preprocessing
- `src/packages/tts/types.ts` — TTS types

**Server Functions**:
- `src/lib/tts.functions.ts`:
  - `detectLanguage(text)` — Language detection
  - `synthesizeSpeech(text, language, voice)` — Audio generation

**Audio Player Features**:
- Play/Pause
- Progress bar with seek
- Playback speed (0.5x, 1x, 1.5x, 2x)
- Duration display
- Mobile-friendly controls

**Romanian Normalization**:
- Numbers → words ("123" → "o sută douăzeci și trei")
- Dates → spoken format
- Currency → "123 EUR" → "o sută douăzeci și trei euro"
- Abbreviations → full words
- URLs/emails → skip or spell out

**Languages**:
- Romanian (ro-RO) — priority
- English (en-US, en-GB)
- Extensible for future languages

**Deliverables**:
- Working multilingual TTS
- Provider abstraction
- Audio player component
- Romanian normalization
- Tests

**Duration**: 6-8 hours

---

### Stage 4: Free Reading and Subscription Paywall (Prompt 4)

**Goal**: Implement business model with free reading and Stripe subscriptions.

**Database Migrations** (new file: `supabase/migrations/YYYYMMDDHHMMSS_ai_reader.sql`):

```sql
-- AI Reader usage tracking
CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT, -- Signed token for anonymous users
  text_length INT NOT NULL,
  language TEXT NOT NULL,
  audio_duration_seconds INT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_anon ON reading_sessions(anonymous_id);

ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reading_sessions_owner_read ON reading_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Subscription management
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_owner_read ON subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Stripe webhook events (idempotency)
CREATE TABLE stripe_events (
  id TEXT PRIMARY KEY, -- Stripe event ID
  type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Free Usage Tracking**:
- Anonymous users: Generate signed JWT with device fingerprint
- Store in `localStorage` + verify server-side
- Track successful readings in `reading_sessions`
- First successful reading is free

**Stripe Integration**:
- Product: "AI Reader Subscription"
- Price: Configurable (e.g., €4.99/month)
- Checkout flow: `createCheckoutSession` server function
- Webhook: `/api/public/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**New Files**:
- `src/packages/subscription/index.ts` — Subscription hooks and types
- `src/packages/subscription/use-subscription.ts` — `useSubscription()` hook
- `src/packages/subscription/use-can-read.ts` — `useCanRead()` entitlement check
- `src/lib/subscription.functions.ts` — Server functions
- `src/routes/api/public/webhooks/stripe.ts` — Webhook handler
- `src/components/ai-reader/paywall.tsx` — Paywall UI

**Paywall UI**:
- Clear explanation of free vs. paid
- Subscription price and benefits
- "Subscribe" CTA → Stripe Checkout
- "Manage Subscription" → Stripe Customer Portal

**Deliverables**:
- Database schema
- Free usage tracking
- Stripe integration
- Paywall UI
- Webhook processing
- Tests

**Duration**: 8-10 hours

---

### Stage 5: PWA, Mobile Installation, and Browser Instructions (Prompt 5)

**Goal**: Make AI Reader installable as a PWA.

**Manifest Updates** (`public/manifest.webmanifest`):
```json
{
  "name": "AI Reader — Text to Speech",
  "short_name": "AI Reader",
  "description": "Listen to text and images with high-quality multilingual text-to-speech.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#4F46E5",
  "categories": ["utilities", "productivity", "education"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Service Worker**:
- Cache static assets (HTML, CSS, JS, icons)
- **Do NOT cache**:
  - User text content
  - Generated audio
  - Authenticated API responses
- Offline fallback page

**Installation Instructions**:
- `src/components/ai-reader/install-instructions.tsx`
- Device-specific instructions (iOS Safari, Android Chrome)
- Dismissible help section
- Show only when PWA not installed

**Mobile Testing Checklist**:
- [ ] Layout on iPhone SE (375px)
- [ ] Layout on iPhone 14 Pro (393px)
- [ ] Layout on Android (360px)
- [ ] Safe area spacing (notch, home indicator)
- [ ] Touch target sizes (min 44x44px)
- [ ] Text input behavior
- [ ] Image upload from camera
- [ ] Audio playback controls
- [ ] Install prompt (iOS Safari, Android Chrome)

**Deliverables**:
- Updated manifest
- Service worker
- Installation instructions
- Mobile testing report

**Duration**: 4-6 hours

---

### Stage 6: Production Readiness and Final QA (Prompt 6)

**Goal**: Complete production-readiness review.

**Functional QA**:
1. [ ] Paste Romanian text → Generate audio → Verify free reading consumed
2. [ ] Reload page → Attempt second reading → Verify paywall appears
3. [ ] Complete test subscription (Stripe test mode)
4. [ ] Verify subscription unlocks reading
5. [ ] Upload image → Verify OCR → Generate audio
6. [ ] Test English text
7. [ ] Test playback controls (play, pause, seek, speed)
8. [ ] Test error recovery (network failure, OCR failure, TTS failure)
9. [ ] Verify PWA installation (iOS, Android)

**Security Review**:
- [ ] Supabase RLS policies verified
- [ ] Authentication flows tested
- [ ] Anonymous entitlement abuse prevention
- [ ] Stripe webhook signature verification
- [ ] Server-side secrets never exposed to client
- [ ] File upload validation (MIME type, size, content)
- [ ] Rate limiting on TTS/OCR endpoints
- [ ] API request validation (Zod schemas)
- [ ] Cross-user data isolation verified
- [ ] No PII in logs

**Performance**:
- [ ] Lighthouse score > 90 (mobile)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Image optimization
- [ ] Audio streaming (if supported)
- [ ] Bundle size < 500KB (gzipped)

**Production Constraints**:
- ✅ Use existing production Supabase project
- ❌ Do NOT create separate dev/staging Supabase project
- ❌ Do NOT run destructive migrations without approval
- ❌ Do NOT deploy to production without approval

**Final Deliverables**:
1. Feature summary
2. Files changed report
3. Database migrations (SQL files)
4. Environment variables list
5. Test results
6. Known limitations
7. Manual setup steps
8. Deployment checklist

**Duration**: 4-6 hours

---

## 4. Required Environment Variables

### Existing (Preserve)
```bash
# Supabase
EXTERNAL_SUPABASE_URL=https://xxx.supabase.co
EXTERNAL_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
EXTERNAL_SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Server-only

# Platform
VITE_APP_ENV=production
VITE_SITE_URL=https://ai-reader.example.com
```

### New (AI Reader)
```bash
# Site Identity
VITE_SITE_NAME=AI Reader
VITE_SITE_TAGLINE=Listen to text with AI
VITE_SITE_DESCRIPTION=Multilingual text-to-speech with OCR support
VITE_CONTACT_EMAIL=support@ai-reader.example.com

# OCR (if using Google Vision)
GOOGLE_VISION_API_KEY=xxx # Server-only

# TTS (Google Cloud)
GOOGLE_TTS_API_KEY=xxx # Server-only
GOOGLE_TTS_PROJECT_ID=xxx # Server-only

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx # Server-only
STRIPE_WEBHOOK_SECRET=whsec_xxx # Server-only
STRIPE_PRICE_ID=price_xxx # Subscription price ID

# Anonymous Usage Tracking
JWT_SECRET=xxx # Server-only, for signing anonymous tokens

# Analytics (Optional)
VITE_GA_ID=G-XXXXXXXXXX
VITE_CLARITY_ID=xxx
```

---

## 5. Proposed Database Tables and Migrations

### Migration 1: Platform Foundation (EXISTING — PRESERVE)

**File**: `supabase/starter-migrations/202610180000_platform.sql`

**Tables**:
- `profiles` — User profiles
- `user_roles` — Role assignments

**Functions**:
- `has_role(uuid, app_role)` — Role checking
- `create_profile()` — Auto-create profile on signup

**Status**: ✅ Already applied, do not modify

---

### Migration 2: AI Reader Schema (NEW)

**File**: `supabase/migrations/YYYYMMDDHHMMSS_ai_reader.sql`

**Tables**:

1. **`reading_sessions`** — Usage tracking
   - `id` (UUID, PK)
   - `user_id` (UUID, nullable, FK to auth.users)
   - `anonymous_id` (TEXT, nullable) — Signed token for anonymous users
   - `text_length` (INT) — Character count
   - `language` (TEXT) — Detected language code
   - `audio_duration_seconds` (INT, nullable)
   - `status` (TEXT) — 'pending' | 'completed' | 'failed'
   - `created_at` (TIMESTAMPTZ)
   - `completed_at` (TIMESTAMPTZ, nullable)
   - **RLS**: Users can only read their own sessions

2. **`subscriptions`** — Stripe subscription status
   - `id` (UUID, PK)
   - `user_id` (UUID, FK to auth.users, unique)
   - `stripe_customer_id` (TEXT)
   - `stripe_subscription_id` (TEXT)
   - `status` (TEXT) — 'active' | 'canceled' | 'past_due' | 'incomplete'
   - `current_period_end` (TIMESTAMPTZ)
   - `cancel_at_period_end` (BOOLEAN)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)
   - **RLS**: Users can only read their own subscription

3. **`stripe_events`** — Webhook idempotency
   - `id` (TEXT, PK) — Stripe event ID
   - `type` (TEXT) — Event type
   - `processed_at` (TIMESTAMPTZ)
   - **No RLS** (service role only)

**Indexes**:
- `idx_reading_sessions_user` on `reading_sessions(user_id)`
- `idx_reading_sessions_anon` on `reading_sessions(anonymous_id)`

**Status**: ⏳ To be created in Stage 4

---

## 6. Security, Privacy, and Production Deployment Considerations

### Security

1. **Authentication**
   - ✅ Supabase Auth with email + Google OAuth
   - ✅ RLS policies on all user tables
   - ✅ Server-side session validation
   - ⚠️ Anonymous usage tracking requires signed tokens (prevent replay attacks)

2. **File Upload**
   - ✅ MIME type validation (server-side)
   - ✅ File size limits (5MB)
   - ✅ Content validation (magic bytes check)
   - ✅ Transient processing (delete after OCR)
   - ❌ No permanent storage of uploaded images (privacy)

3. **API Security**
   - ✅ Rate limiting on OCR/TTS endpoints (prevent abuse)
   - ✅ API keys stored server-side only
   - ✅ Stripe webhook signature verification
   - ✅ Idempotent webhook processing

4. **Data Isolation**
   - ✅ RLS policies prevent cross-user data access
   - ✅ Anonymous sessions isolated by signed token
   - ✅ Subscription status verified server-side

### Privacy

1. **User Data**
   - ❌ Do NOT permanently store user text (unless user explicitly saves)
   - ❌ Do NOT permanently store uploaded images
   - ✅ Store only metadata (text length, language, duration)
   - ✅ Allow users to delete reading history

2. **Logging**
   - ❌ Do NOT log user text content
   - ❌ Do NOT log PII in error messages
   - ✅ Log only technical errors (OCR failures, TTS errors)

3. **Analytics**
   - ✅ Aggregate usage metrics only
   - ❌ No individual text content tracking

### Production Deployment

**Prerequisites**:
1. ✅ Verify Supabase project connection
2. ✅ Apply database migrations (via Supabase CLI or dashboard)
3. ✅ Configure environment variables in Vercel
4. ✅ Set up Google Cloud TTS API (enable API, create service account)
5. ✅ Set up Stripe (create product, price, webhook endpoint)
6. ✅ Update DNS (if using custom domain)
7. ✅ Configure PWA icons and manifest

**Deployment Checklist**:
- [ ] Database migrations applied
- [ ] Environment variables set in Vercel
- [ ] Google TTS API enabled and tested
- [ ] Stripe webhook endpoint configured
- [ ] Stripe test mode verified
- [ ] PWA manifest updated
- [ ] Service worker tested
- [ ] Mobile testing completed (iOS Safari, Android Chrome)
- [ ] Lighthouse audit passed (score > 90)
- [ ] Security review completed
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] GDPR compliance verified (if targeting EU)
- [ ] Production build tested
- [ ] Rollback plan prepared

**Manual Setup Steps**:

1. **Google Cloud TTS**:
   - Create GCP project
   - Enable Cloud Text-to-Speech API
   - Create service account with TTS permissions
   - Download JSON key
   - Add `GOOGLE_TTS_API_KEY` to Vercel secrets

2. **Stripe**:
   - Create Stripe account
   - Create product: "AI Reader Subscription"
   - Create price: €4.99/month (or configurable)
   - Create webhook endpoint: `https://ai-reader.example.com/api/public/webhooks/stripe`
   - Add webhook secret to Vercel: `STRIPE_WEBHOOK_SECRET`
   - Test in Stripe test mode

3. **Supabase**:
   - Verify connection to existing project
   - Apply migrations via Supabase CLI:
     ```bash
     supabase db push
     ```
   - Verify RLS policies in Supabase dashboard

4. **Vercel**:
   - Connect GitHub repository
   - Configure environment variables
   - Set up custom domain (optional)
   - Deploy to production

---

## 7. Known Limitations and Future Enhancements

### MVP Limitations

1. **Languages**: Only Romanian and English initially
2. **OCR Quality**: Tesseract.js may struggle with handwriting or low-quality images
3. **TTS Voices**: Limited to Google TTS voices (upgrade to ElevenLabs for premium users?)
4. **Offline Support**: PWA caches assets but requires network for OCR/TTS
5. **Audio Caching**: No caching of generated audio (regenerate on each playback)

### Future Enhancements

1. **Features**:
   - Save reading history (optional, user-controlled)
   - Bookmark favorite texts
   - Share generated audio
   - Download audio files
   - Multi-voice support (narrator, characters)
   - SSML support (emphasis, pauses, pronunciation)

2. **Languages**:
   - Spanish, French, German, Italian
   - Eastern European languages (Polish, Hungarian, Czech)

3. **OCR**:
   - Upgrade to Google Cloud Vision for better quality
   - Support for PDF documents
   - Batch image processing

4. **TTS**:
   - ElevenLabs integration (premium tier)
   - Voice cloning (premium feature)
   - Emotion and tone control

5. **Subscription Tiers**:
   - Free: 1 reading
   - Basic: Unlimited readings, standard voices
   - Premium: Unlimited readings, premium voices, voice cloning, audio download

6. **Accessibility**:
   - Keyboard shortcuts
   - Screen reader optimization
   - High contrast mode
   - Dyslexia-friendly fonts

---

## 8. Summary and Next Steps

### Repository is Ready

✅ **Framework**: TanStack Start (React 19, Vite, TypeScript) — modern, SSR-capable
✅ **Infrastructure**: Vercel + Supabase — production-ready
✅ **Authentication**: Supabase Auth — reusable
✅ **UI Components**: Radix UI + shadcn/ui — accessible, customizable
✅ **Database**: Postgres with RLS — secure, scalable
✅ **PWA Foundation**: Manifest and icons already present

### Conflicts are Manageable

⚠️ **Domain Code**: ImoIndex-specific code can be archived/removed
⚠️ **Branding**: Simple find-replace for site identity
⚠️ **Navigation**: Simplify to single-page app structure

### Implementation is Feasible

📋 **6 Stages**: Each stage is independently verifiable
📋 **30-40 hours total**: Realistic for a solo developer
📋 **No infrastructure changes**: Reuse existing Vercel + Supabase setup
📋 **No new dependencies**: Minimal additions (Tesseract.js, Stripe SDK)

### Recommended Approach

1. **Start with Stage 0** (cleanup) — 1 hour
2. **Implement Stages 1-3** (UI, OCR, TTS) — 15-20 hours
3. **Pause for user testing** — Verify core functionality
4. **Implement Stage 4** (subscriptions) — 8-10 hours
5. **Implement Stage 5** (PWA) — 4-6 hours
6. **Final QA and deploy** (Stage 6) — 4-6 hours

### External Services Required

1. **Google Cloud TTS** — €0-€16/month (1M characters free, then $4/1M chars)
2. **Stripe** — 2.9% + €0.30 per transaction
3. **Supabase** — Free tier sufficient for MVP (upgrade at 500+ users)
4. **Vercel** — Free tier sufficient for MVP

**Total estimated cost**: €0-€20/month for MVP (scales with usage)

---

## 9. Approval Required

Before proceeding to **Prompt 1** (implementation), please confirm:

1. ✅ **Architecture**: Approve the proposed TanStack Start + Supabase architecture
2. ✅ **Cleanup**: Approve removal/archiving of ImoIndex-specific code
3. ✅ **Stages**: Approve the 6-stage implementation plan
4. ✅ **OCR Provider**: Approve Tesseract.js for MVP (upgrade to Google Vision later if needed)
5. ✅ **TTS Provider**: Approve Google Cloud TTS (requires GCP account setup)
6. ✅ **Stripe**: Approve Stripe for subscriptions (requires Stripe account setup)
7. ✅ **Database**: Approve new migrations (will not affect existing `profiles` and `user_roles` tables)
8. ✅ **Production**: Confirm no deployment to production without explicit approval

**Questions**:
1. What should the subscription price be? (Suggestion: €4.99/month)
2. Should we support annual subscriptions? (Suggestion: €49.99/year, 17% discount)
3. Do you have a Google Cloud account? (Required for TTS)
4. Do you have a Stripe account? (Required for payments)
5. Should we keep the existing Supabase project or create a new one? (Recommendation: keep existing)

---

## Appendix: File Structure After Implementation

```
ai-reader/
├── public/
│   ├── manifest.webmanifest          # Updated for AI Reader
│   ├── icon-192.png                  # AI Reader icon
│   ├── icon-512.png                  # AI Reader icon
│   └── sw.js                         # Service worker (new)
├── src/
│   ├── components/
│   │   ├── ui/                       # Existing shadcn/ui components
│   │   └── ai-reader/                # New AI Reader components
│   │       ├── text-input.tsx
│   │       ├── image-upload.tsx
│   │       ├── language-selector.tsx
│   │       ├── audio-player.tsx
│   │       ├── paywall.tsx
│   │       ├── privacy-notice.tsx
│   │       └── install-instructions.tsx
│   ├── packages/
│   │   ├── auth/                     # Existing (reused)
│   │   ├── db/                       # Existing (reused)
│   │   ├── ui/                       # Existing (reused)
│   │   ├── shared/                   # Existing (updated branding)
│   │   ├── ocr/                      # New OCR package
│   │   │   ├── index.ts
│   │   │   ├── tesseract-provider.ts
│   │   │   └── types.ts
│   │   ├── tts/                      # New TTS package
│   │   │   ├── index.ts
│   │   │   ├── google-provider.ts
│   │   │   ├── language-detector.ts
│   │   │   ├── text-normalizer.ts
│   │   │   └── types.ts
│   │   └── subscription/             # New subscription package
│   │       ├── index.ts
│   │       ├── use-subscription.ts
│   │       └── use-can-read.ts
│   ├── routes/
│   │   ├── __root.tsx                # Existing (updated branding)
│   │   ├── index.tsx                 # New AI Reader main page
│   │   ├── auth.tsx                  # Existing (reused)
│   │   ├── reset-password.tsx        # Existing (reused)
│   │   └── api/
│   │       └── public/
│   │           └── webhooks/
│   │               └── stripe.ts     # New Stripe webhook
│   ├── lib/
│   │   ├── ocr.functions.ts          # New OCR server functions
│   │   ├── tts.functions.ts          # New TTS server functions
│   │   └── subscription.functions.ts # New subscription server functions
│   └── styles.css                    # Existing (may add AI Reader-specific styles)
├── supabase/
│   ├── migrations/
│   │   └── YYYYMMDDHHMMSS_ai_reader.sql  # New AI Reader schema
│   └── starter-migrations/
│       └── 202610180000_platform.sql     # Existing (preserved)
├── .env.example                      # Updated with AI Reader variables
├── README.md                         # Updated for AI Reader
└── package.json                      # Updated dependencies (Tesseract.js, Stripe SDK)
```

---

**End of Repository Discovery and Implementation Plan**

**Status**: ✅ Ready for approval

**Next Step**: Await user approval to proceed with **Prompt 1** (Product Foundation and Mobile-First UI)
