# Citește-mi

Aplicație web instalabilă (PWA), mobile-first, care permite utilizatorilor să lipească/scrie text,
să încarce imagini cu text (OCR — în curând) și să asculte textul citit cu voce tare, în română și
alte limbi (text-to-speech — în curând). Prima lectură este gratuită, apoi este necesar un abonament.

> Această versiune conține doar fundația aplicației (Prompt 1): structură, UI și configurare.
> OCR, text-to-speech, facturarea și impunerea abonamentului vor fi adăugate în etape ulterioare.
> Detalii complete despre arhitectură și planul de implementare: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

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
   > `VITE_` — acestea sunt expuse în codul client. Secretele de server vor fi configurate direct în
   > variabilele de mediu ale proiectului Vercel, în etapele următoare (OCR/TTS/facturare).

3. Pornește serverul de dezvoltare:

   ```bash
   npm run dev
   ```

   Aplicația va fi disponibilă la adresa afișată în terminal (implicit `http://localhost:5173`).

## Scripturi disponibile

| Comandă | Descriere |
| --- | --- |
| `npm run dev` | Pornește serverul de dezvoltare Vite |
| `npm run build` | Verifică tipurile și construiește aplicația pentru producție |
| `npm run preview` | Previzualizează local build-ul de producție |
| `npm run lint` | Rulează ESLint |
| `npm run format` | Formatează codul cu Prettier |
| `npm run format:check` | Verifică formatarea fără a modifica fișierele |
| `npm run typecheck` | Verifică tipurile TypeScript fără a genera build |
| `npm test` | Rulează testele cu Vitest |

## Deploy pe Vercel

Proiectul este deja legat la Vercel (`ai-reader-lac.vercel.app`). Fiecare push pe branch-ul principal
va declanșa automat un build (`npm run build`, ieșire statică Vite servită ca SPA, vezi `vercel.json`).

Variabile de mediu necesare în proiectul Vercel (Production):

- `VITE_EXTERNAL_SUPABASE_URL`
- `VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY`

> Nu există un mediu de staging — conform cerințelor de producție, se folosește doar proiectul
> Vercel și Supabase de producție existente, fără duplicate.

## Configurări rămase (de documentat, nu de inventat)

- Furnizorul de OCR (ex. Tesseract.js sau API extern) — neales încă.
- Furnizorul de text-to-speech cu voce română de calitate — neales încă.
- Furnizorul de plăți/abonamente — neales încă.
- Iconițe PWA reale (192x192, 512x512, maskable) — momentan se folosește doar `favicon.svg` ca
  placeholder în `manifest.webmanifest`.
- Schema de bază de date Supabase descrisă în `docs/ARCHITECTURE.md` nu a fost încă aplicată.
