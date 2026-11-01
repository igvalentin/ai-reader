# Citește-mi

Aplicație web instalabilă (PWA), mobile-first, care permite utilizatorilor să lipească/scrie text,
să încarce imagini cu text și să-l extragă prin OCR și să asculte textul citit cu voce tare, în
română și engleză. Prima lectură audio reușită este gratuită, apoi este necesar un abonament.

> TTS, entitlement și Stripe Checkout/Portal sunt implementate. Schema de bază a fost aplicată
> manual; migrarea aditivă nouă, prețurile Stripe și setările Auth rămân pași manuali. Nu se fac
> deploy-uri sau schimbări în producție fără aprobare. Vezi
> [`docs/AUTH_BILLING_ADMIN.md`](./docs/AUTH_BILLING_ADMIN.md) și [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

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

Nu s-a făcut deploy și nu s-a aplicat migrarea nouă în producție. Schema de bază
[`supabase/schema.sql`](./supabase/schema.sql) a fost aplicată manual; testează acum migrarea aditivă
[`supabase/migrations/20261101000000_billing_usage_admin.sql`](./supabase/migrations/20261101000000_billing_usage_admin.sql)
într-un mediu aprobat. Configurează produsele/prețurile și webhook-ul Stripe în Test mode înainte de
orice activare; pașii sunt în [`docs/AUTH_BILLING_ADMIN.md`](./docs/AUTH_BILLING_ADMIN.md).

Variabile publice necesare pentru client:

- `VITE_EXTERNAL_SUPABASE_URL`
- `VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY`

Variabile server-only necesare pentru entitlement/billing:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANONYMOUS_USAGE_SECRET`, `APP_URL`
- `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `AZURE_SPEECH_VOICE` (opțional)
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_7_DAYS`, `STRIPE_PRICE_ID_30_DAYS`, `STRIPE_PRICE_ID_1_YEAR`, `STRIPE_WEBHOOK_SECRET`
- `ADMIN_USER_IDS` (UUID-uri autorizate) și `CRON_SECRET`

## OCR (extragere text din imagini)

- Browserul trimite imaginea prin `multipart/form-data` către `api/ocr.ts`; Tesseract.js/WASM rulează
  local în funcția Vercel, folosind traineddata românesc (`ron`) inclus în deployment. Imaginea nu
  este transmisă unui furnizor OCR extern.
- Imaginea este validată după conținutul binar real (semnătura/magic bytes), apoi procesată în
  memoria funcției și nu este stocată.
- Limita aplicației este de 4 MiB; tipurile acceptate sunt JPEG, PNG și WebP. Limita request-ului
  Vercel rămâne aplicabilă.
- OCR nu necesită cheie API sau variabilă de mediu.
- OCR rămâne accesibil și vizitatorilor anonimi; când există o sesiune validă, serverul asociază
  încercarea cu utilizatorul verificat. Contoarele nu includ imaginea sau textul extras.

## Text-to-speech

Pipeline-ul TTS cu Azure AI Speech este documentat în [`docs/TTS.md`](./docs/TTS.md). Configurează `AZURE_SPEECH_KEY` și `AZURE_SPEECH_REGION=germanywestcentral` numai server-side; `AZURE_SPEECH_VOICE` este opțional. Endpoint-ul `/api/tts` detectează sau primește limba, păstrează diacriticele românești și returnează audio MP3. Cheia nu este expusă browserului, iar textul rămâne disponibil dacă sinteza eșuează. Deploy-ul în producție necesită aprobare explicită.

## Pași manuali înainte de producție

- Configurează Supabase Auth URL/redirect allowlist, limita email OTP și SMTP conform
  [`docs/AUTH_BILLING_ADMIN.md`](./docs/AUTH_BILLING_ADMIN.md).
- Creează cele trei prețuri recurring în Stripe Test mode și setează ID-urile în Vercel; webhook-ul
  trebuie să fie activ și semnătura validată înainte de a testa entitlement-ul plătit.
- Adaugă UUID-urile administratorilor în `ADMIN_USER_IDS`; fără allowlist configurat, admin API
  refuză accesul pentru toți.
- Aplică migrarea aditivă numai după backup și aprobare. Nu s-a făcut deploy sau operațiune în
  mediul de producție.
