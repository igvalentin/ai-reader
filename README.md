# Citește-mi

Aplicație web instalabilă (PWA), mobile-first, care permite utilizatorilor să lipească/scrie text,
să încarce imagini cu text și să-l extragă prin OCR și să asculte textul citit cu voce tare, în
română și engleză. Prima lectură audio reușită este gratuită, apoi este necesar un abonament.

> TTS și paywall-ul sunt implementate, dar schema Supabase și configurarea Stripe trebuie aplicate
> separat, cu aprobare explicită. Detalii despre arhitectură: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Stack tehnic

- **React 19 + TypeScript**, construit cu **Vite**
- **Tailwind CSS v4** pentru stilizare (sistem de design restrâns prin variabile de temă)
- **React Router** pentru rutare
- **Supabase** (`@supabase/supabase-js`) pentru autentificare/date, folosind doar cheia publică anon în client
- **Vitest** + **React Testing Library** pentru testare
- **ESLint** + **Prettier** pentru calitate și formatare cod
- Deploy pe **Vercel**

## Cerințe

- Node.js 20+
- npm (vine cu Node.js)

## Configurare locală

1. Instalează dependențele:

   ```bash
   npm install
   ```

2. Copiază fișierul de variabile de mediu și completează valorile publice Supabase:

   ```bash
   cp .env.example .env
   ```

   Variabile necesare (valori publice/anon, sigure pentru client):
   - `VITE_EXTERNAL_SUPABASE_URL`
   - `VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY`

   > Nu adăuga niciodată cheia `service_role` Supabase sau alte secrete în fișiere cu prefixul
   > `VITE_` — acestea sunt expuse în codul client. Secretele serverului (`SUPABASE_SERVICE_ROLE_KEY`,
   > `ANONYMOUS_USAGE_SECRET`, Stripe și furnizorii OCR/TTS) se configurează doar în runtime-ul serverului.

3. Pornește serverul de dezvoltare:

   ```bash
   npm run dev
   ```

   Aplicația va fi disponibilă la adresa afișată în terminal (implicit `http://localhost:5173`).

## Scripturi disponibile

| Comandă                | Descriere                                                    |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Pornește serverul de dezvoltare Vite                         |
| `npm run build`        | Verifică tipurile și construiește aplicația pentru producție |
| `npm run preview`      | Previzualizează local build-ul de producție                  |
| `npm run lint`         | Rulează ESLint                                               |
| `npm run format`       | Formatează codul cu Prettier                                 |
| `npm run format:check` | Verifică formatarea fără a modifica fișierele                |
| `npm run typecheck`    | Verifică tipurile TypeScript fără a genera build             |
| `npm test`             | Rulează testele cu Vitest                                    |

## Deploy pe Vercel

Deploy-ul nu face parte din această implementare și necesită aprobare explicită. Înainte de orice
activare, aplică [`supabase/schema.sql`](./supabase/schema.sql) într-un mediu aprobat și configurează
valorile Stripe în test mode. Funcțiile server folosesc `api/checkout.ts`, `api/portal.ts`,
`api/subscription.ts` și `api/stripe-webhook.ts`; nu configura chei live sau webhook-uri de producție
fără aprobare.

Variabile publice necesare pentru client:

- `VITE_EXTERNAL_SUPABASE_URL`
- `VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY`

Variabile server-only necesare pentru entitlement/billing:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANONYMOUS_USAGE_SECRET`, `APP_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`

## OCR (extragere text din imagini)

- Browserul trimite imaginea prin `multipart/form-data` către `api/ocr.ts`; Tesseract.js/WASM rulează
  local în funcția Vercel, folosind traineddata românesc (`ron`) inclus în deployment. Imaginea nu
  este transmisă unui furnizor OCR extern.
- Imaginea este validată după conținutul binar real (semnătura/magic bytes), apoi procesată în
  memoria funcției și nu este stocată.
- Limita aplicației este de 4 MiB; tipurile acceptate sunt JPEG, PNG și WebP. Limita request-ului
  Vercel rămâne aplicabilă.
- OCR nu necesită cheie API sau variabilă de mediu.
- Impunerea autentificării obligatorii pe acest endpoint este planificată pentru etapa de
  entitlement/abonament (vezi `docs/ARCHITECTURE.md`), când va exista și un ecran de login.

## Text-to-speech

Pipeline-ul TTS cu Azure AI Speech este documentat în [`docs/TTS.md`](./docs/TTS.md). Configurează `AZURE_SPEECH_KEY` și `AZURE_SPEECH_REGION=germanywestcentral` numai server-side; `AZURE_SPEECH_VOICE` este opțional. Endpoint-ul `/api/tts` detectează sau primește limba, păstrează diacriticele românești și returnează audio MP3. Cheia nu este expusă browserului, iar textul rămâne disponibil dacă sinteza eșuează. Deploy-ul în producție necesită aprobare explicită.

## Configurări rămase (de documentat, nu de inventat)

- Verificarea prețurilor și disponibilității vocilor Azure AI Speech înainte de deploy.
- Furnizorul de plăți/abonamente — neales încă.
- Ecranul de autentificare (login cu Google prin Supabase) — neconstruit încă în interfață.
- Iconițe PWA reale (192x192, 512x512, maskable) — momentan se folosește doar `favicon.svg` ca
  placeholder în `manifest.webmanifest`.
- Schema de bază de date Supabase descrisă în `docs/ARCHITECTURE.md` nu a fost încă aplicată.
