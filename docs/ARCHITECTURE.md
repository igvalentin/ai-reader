# Arhitectură și plan de implementare — Citește-mi

Acest document consolidează decizia de arhitectură aprobată (Prompt 0) și jurnalul de execuție al
fundației aplicației (Prompt 1). Este păstrat în `docs/` ca document de referință viu, actualizat pe
măsură ce proiectul avansează prin etape.

## 1. Obiectivul produsului

O aplicație web instalabilă (PWA), mobile-first, care permite utilizatorilor:

- să lipească sau să scrie text;
- să încarce imagini cu text și să-l extragă prin OCR;
- să asculte textul extras sau lipit, cu sinteză vocală multilingvă (inclusiv română);
- să folosească o lectură reușită gratuit, apoi să se aboneze pentru a continua.

## 2. Starea repository-ului (la momentul Prompt 0)

Repository-ul era gol din punct de vedere al codului aplicației: conținea doar `.env` (cu URL-ul și
cheia publică Supabase) și fișiere interne ale agentului. Proiectul Vercel (`ai-reader-lac.vercel.app`)
și proiectul Supabase (cu autentificare Google activată) erau deja create și legate, dar fără nicio
aplicație efectivă implementată. Concluzie: proiect greenfield, fără niciun starter kit de preluat.

## 3. Stack tehnic ales și motivație

| Decizie              | Alegere                        | Motivație                                                                                        |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| Framework            | React 19 + TypeScript          | Ecosistem matur, tipări statice pentru fiabilitate, suport excelent pe Vercel                    |
| Bundler              | Vite                           | Pornire și build rapide, configurare minimă, integrare nativă cu Vitest                          |
| Manager de pachete   | npm                            | Standard, fără dependințe suplimentare de instalat                                               |
| Stilizare            | Tailwind CSS v4                | Sistem de design restrâns prin variabile de temă, fără CSS redundant, accesibil                  |
| Rutare               | React Router v7                | Nevoi simple de rutare (pagină principală + 404), API matur                                      |
| Backend-as-a-service | Supabase                       | Deja legat la proiect; oferă Postgres, autentificare (Google) și storage într-un singur serviciu |
| Foundăie             | Vercel                         | Deja legat la repository; build static Vite fără configurare suplimentară                        |
| Teste                | Vitest + React Testing Library | Integrare nativă cu Vite, API familiar (Jest-like)                                               |
| Calitate cod         | ESLint + Prettier + `tsc`      | Standard în ecosistemul React/TypeScript                                                         |

## 4. Arhitectură și fluxuri de date (plan țintă)

```
[Browser (PWA)]
   │  paste/typing text ──────────────► stare locală (React)
   │  upload imagine ─────────────────► (etapa OCR) funcție server sau client (ex. Tesseract.js / API OCR)
   │  solicită citire cu voce tare ──► (etapa TTS) API server-side care verifică entitlement
   │                                      │
   │                                      ▼
   │                               [Vercel Functions]
   │                                 │ verifică sesiunea Supabase (JWT)
   │                                 │ verifică numărul de lecturi gratuite folosite
   │                                 │ apelează furnizorul TTS, returnează audio
   │                                 ▼
   │                               [Supabase Postgres]
   │                                 │ tabele: profiles, reading_usage, subscriptions
   │                                 ▼
   ▼
[Audio player în browser] ◄──────── flux audio / URL semnat
```

- **Client (Vercel static/Vite SPA):** interfață, stare UI, apeluri către Supabase (doar cheia
  publică anon) pentru autentificare și citire de date proprii (RLS).
- **Server (Vercel Functions, etapă viitoare):** orchestrează OCR/TTS, verifică entitlement-ul și
  folosește cheia `service_role` Supabase **doar** server-side, niciodată în client.
- **Supabase:** stochează profiluri, contorul lecturilor gratuite folosite, starea abonamentului și
  (opțional) imaginile încărcate, cu politici RLS stricte per utilizator.

## 5. Schemă de bază de date propusă (etapă viitoare, neimplementată încă)

```sql
-- profiles: 1:1 cu auth.users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- reading_usage: numără lectura gratuită folosită
create table reading_usage (
  user_id uuid primary key references profiles(id) on delete cascade,
  free_reading_used boolean not null default false,
  free_reading_used_at timestamptz
);

-- subscriptions: stare abonament (sincronizată cu furnizorul de plăți)
create table subscriptions (
  user_id uuid primary key references profiles(id) on delete cascade,
  status text not null check (status in ('none', 'active', 'past_due', 'canceled')),
  provider_customer_id text,
  current_period_end timestamptz
);

-- Politici RLS (exemplu): fiecare utilizator își vede/modifică doar propriile rânduri
alter table profiles enable row level security;
alter table reading_usage enable row level security;
alter table subscriptions enable row level security;

create policy "users read own profile" on profiles for select using (auth.uid() = id);
create policy "users read own usage" on reading_usage for select using (auth.uid() = user_id);
create policy "users read own subscription" on subscriptions for select using (auth.uid() = user_id);
-- Scrierile pe reading_usage/subscriptions se fac doar din server (service_role), nu din client.
```

> Această schemă **nu** a fost aplicată încă în Supabase — va fi creată într-o etapă viitoare dedicată,
> cu aprobare explicită, pentru a evita orice operațiune pe mediul de producție fără acord.

## 6. Servicii externe și secrete necesare (fără valori expuse)

| Serviciu                                             | Scop                                   | Unde se folosește                                                    |
| ---------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| Supabase URL + cheie anon                            | Autentificare, citire date proprii     | Client (`VITE_*`)                                                    |
| Supabase `service_role`                              | Scriere entitlement, verificări server | Doar server (Vercel Functions), niciodată `VITE_*`                   |
| Motor OCR local (Tesseract.js/WASM)                  | Extragere text din imagini             | Server Vercel Function, model `ron` inclus în deployment             |
| Furnizor TTS cu voce română de calitate              | Conversie text-în-vorbire              | Server (apel API cu cheie secretă)                                   |
| Furnizor de plăți/abonamente (ex. Stripe)            | Facturare și webhook-uri               | Server, chei secrete, webhook secret                                 |

## 7. Plan de implementare pe etape

1. **Prompt 1 — Fundația aplicației (acest document + cod):** structură curată, UI responsive în
   limba română, configurare Supabase/Vercel prin variabile de mediu, lint/format/type-check/teste.
   _Criteriu de acceptare:_ aplicația pornește local, ecranul principal e funcțional vizual, testele
   și verificările de calitate trec.
2. **OCR:** integrare extragere text din imagini (client sau server), stări de încărcare/eroare.
   _Depinde de:_ etapa 1. _Criteriu:_ textul extras apare în zona de text, cu gestionare erori.
3. **Text-to-Speech:** integrare sinteză vocală multilingvă (inclusiv română), activare buton
   „Citește cu voce tare”, player audio funcțional (play/pause/resume/seek/viteză).
   _Depinde de:_ etapa 1. _Criteriu:_ o lectură completă poate fi ascultată de la capăt la capăt.
4. **Contorizare lectură gratuită și entitlement server-side:** schemă Supabase (secțiunea 5),
   politici RLS, funcție server care decide dacă utilizatorul mai are dreptul la o lectură gratuită.
   _Depinde de:_ etapele 1–3. _Criteriu:_ a doua lectură fără abonament este blocată corect.
5. **Facturare și abonament:** integrare furnizor de plăți, webhook-uri, sincronizare stare în
   `subscriptions`. _Depinde de:_ etapa 4. _Criteriu:_ un abonament activ deblochează lecturi
   nelimitate; anularea îl blochează din nou.
6. **PWA completă:** iconițe reale (192/512/maskable), service worker (`vite-plugin-pwa`),
   instrucțiuni de instalare pentru iOS Safari și Android Chrome. _Depinde de:_ etapa 1.

## 8. Riscuri identificate

- **Securitate:** expunerea accidentală a cheii `service_role` în cod client ar compromite toată
  baza de date — mitigat prin convenția strictă „cheile fără prefix `VITE_` nu ajung în client”.
- **Confidențialitate:** imaginile încărcate pot conține date personale — necesită politică de
  retenție și ștergere clară înainte de activarea OCR.
- **Accesibilitate:** sinteza vocală și controalele audio trebuie să fie utilizabile cu tastatura și
  cititoare de ecran — de validat în etapa TTS.
- **Cost:** furnizorii externi de OCR/TTS/plăți pot genera costuri variabile pe utilizator — necesită
  limite și monitorizare înainte de lansarea publică.
- **Mediu de producție unic:** fără staging, orice schimbare de schemă trebuie testată local/în
  preview înainte de a fi aplicată în Supabase de producție.

## 9. Asumări și decizii care necesită aprobare

- Numele aplicației în interfață a fost ales „Citește-mi” (provizoriu) — de confirmat sau înlocuit.
- Limita de 4000 de caractere per lectură este o valoare inițială arbitrară — de confirmat înainte
  de etapa TTS, în funcție de costul furnizorului vocal.
- OCR-ul este local prin Tesseract.js/WASM cu modelul românesc `ron`; nu necesită furnizor extern sau cheie OCR. Furnizorul TTS și calitatea vocii românești rămân de confirmat înainte de etapa 3.
- Furnizorul de plăți pentru abonament nu a fost ales încă — necesar înainte de etapa 5.

## 10. Jurnal de execuție — Prompt 1 (fundația aplicației)

- Scaffold React 19 + TypeScript + Vite, fără niciun starter kit extern, generat direct în
  repository (`npm create vite@latest . -- --template react-ts`), cu `typescript` fixat la `~5.6.2`
  pentru compatibilitate cu `typescript-eslint`.
- Instalate: `@supabase/supabase-js`, `react-router-dom`, `tailwindcss` + `@tailwindcss/vite`,
  `prettier`, `eslint-config-prettier`, `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitest/ui`.
- Creat sistem de design restrâns prin variabile de temă Tailwind v4 (`@theme`): paletă „hârtie și
  cerneală” (fundal rece, deschis) cu accent auriu-chihlimbar pentru acțiunea principală și un
  turcoaz închis pentru acțiuni secundare/linkuri; tipografie Fraunces (titluri) + IBM Plex Sans
  (text/UI), ambele cu suport complet pentru diacritice românești.
- Construite componente conform Atomic Design: `atoms` (`Button`, `Spinner`, `PageLoader`),
  `molecules` (`FreeTrialNotice`, `LanguageSelector`, `ImageUploadControl`,
  `AudioPlayerPlaceholder`), `organisms` (`AppHeader`, `ReaderCard`), `templates`
  (`MainScreenLayout`), `pages` (`HomePage`, `NotFoundPage`).
- Ecranul principal include: nume aplicație + navigare, zonă de text (funcțională, cu numărătoare
  de caractere și validare de stare goală/eroare), control de încărcare imagine (vizual, dezactivat),
  selector de limbă (vizual, dezactivat), buton principal „Citește cu voce tare” (dezactivat),
  placeholder player audio și mesaj despre lectura gratuită înainte de abonament.
- Rutare cu `react-router-dom`, încărcare leneșă (`React.lazy` + `Suspense`) cu stare de încărcare
  vizibilă (`PageLoader`), rută 404 dedicată.
- Client Supabase (`src/lib/supabaseClient.ts`) configurat exclusiv prin variabile de mediu publice
  (`VITE_EXTERNAL_SUPABASE_URL`, `VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY`); nicio cheie `service_role`
  în cod.
- Adăugate `.env.example` (doar placeholder-uri), `vercel.json` (rewrite SPA), `manifest.webmanifest`
  și `robots.txt` ca placeholder-uri de metadate/PWA.
- Configurate ESLint (+ `eslint-config-prettier`), Prettier, verificare de tipuri (`tsc -b`) și teste
  Vitest + React Testing Library pentru `HomePage`.
- **Nu s-a atins:** OCR, TTS, facturare, impunerea abonamentului, schema Supabase din secțiunea 5,
  crearea unui mediu de staging sau orice operațiune pe datele de producție Supabase.

## 11. Jurnal de execuție — Prompt 2 (încărcare imagine și OCR)

- **Alegere OCR inițială (înlocuită ulterior):** OCR.space (API server-side), motor 2 și limba
  `rum`. După atingerea limitei de upload a planului gratuit, integrarea a fost înlocuită cu
  Tesseract.js/WASM rulat local în funcția Vercel, cu traineddata românesc `ron` inclus în deployment.
- **Endpoint nou:** `api/ocr.ts` — funcție Vercel (`@vercel/node`), `POST /api/ocr`,
  `multipart/form-data`, fără body parser automat (`bodyParser: false`), parsare manuală cu
  `busboy` direct în memorie (fără scriere pe disc).
- **Abstracție OCR:** `src/server/ocr/ocrProvider.ts` definește interfața `OcrProvider`; `TesseractOcrProvider` rulează motorul WASM și factory-ul îl selectează pentru `/api/ocr`. Modelul românesc este inclus explicit prin `vercel.json`.
- **Normalizare text:** `src/server/ocr/normalizeOcrText.ts` unește liniile răzlețe din același
  paragraf (artefact comun al motoarelor OCR) și păstrează separarea în paragrafe acolo unde există
  linii goale în textul brut, păstrând diacriticele românești neschimbate.
- **Securitate și confidențialitate:**
  - validare în două straturi a imaginii: client (`src/lib/image/validateImageFile.ts`, folosit de
    `useImageOcr`) și server (`api/ocr.ts`), ambele verificând semnătura binară reală (magic
    bytes) din `src/lib/image/imageSignature.ts`, nu doar extensia sau `Content-Type`-ul declarat;
  - limită de dimensiune de 4 MB impusă atât client-side cât și prin limita `fileSize` a `busboy`
    pe server (respinsă cu status 413, fără a consuma restul fluxului);
  - parserul multipart acceptă exclusiv un câmp de fișier (`image`) și ignoră explicit orice alt
    câmp — nu există niciun parametru de tip URL care ar putea fi folosit pentru a prelua o
    resursă arbitrară (prevenirea SSRF);
  - imaginea este păstrată doar în memorie, pe durata cererii, și nu este niciodată stocată (nici
    pe disc, nici într-un bucket Supabase) — eliminată imediat după generarea răspunsului;
  - nu se loghează conținutul imaginii, textul extras sau alte date cu caracter personal; erorile
    sunt logate doar ca mesaje tehnice generice;
  - rezultatul OCR este livrat sincron, exclusiv solicitantului — fără nicio formă de stocare sau
    partajare între utilizatori, deci nu există risc de acces încrucișat între conturi;
  - a fost pregătit un helper de verificare a sesiunii Supabase
    (`src/server/auth/verifySupabaseUser.ts`) pentru etapa viitoare de entitlement, când
    autentificarea va deveni obligatorie pe acest endpoint și va exista un ecran de login în
    interfață; **decizie explicită, aprobată de utilizator**, de a nu impune încă autentificarea
    obligatorie în această etapă, dat fiind că nu există stocare și deci niciun risc de expunere
    între utilizatori.
- **UI client:** `ImageUploadControl` a fost transformat dintr-un control static în unul complet
  funcțional (selectare prin click sau drag & drop, previzualizare, stare de încărcare cu bară de
  progres, stare de procesare OCR, eliminare/înlocuire imagine), orchestrat de hook-ul
  `useImageOcr` (`src/lib/image/useImageOcr.ts`) care gestionează ciclul de viață al URL-ului de
  previzualizare (`URL.createObjectURL`/`revokeObjectURL`, cu curățare la demontare). Textul extras
  este adăugat în zona de text existentă din `ReaderCard`, rămânând complet editabil înainte de
  citirea cu voce tare.
- **Teste adăugate:** detectarea semnăturii binare (JPEG/PNG/WebP + conținut nevalid), validarea
  fișierului (tip, dimensiune, fișier gol, conținut fals), normalizarea textului OCR (diacritice
  românești, păstrarea paragrafelor, CRLF), și handler-ul `/api/ocr` (încărcare validă, metodă
  nepermisă, Content-Type invalid, imagine falsificată, depășire dimensiune, eșec furnizor OCR,
  rezultat OCR gol, eroare neprevăzută).
- **Nu s-a atins:** TTS, facturare, impunerea abonamentului/autentificării, schema Supabase din
  secțiunea 5, ecran de login, crearea unui mediu de staging sau orice operațiune pe datele de
  producție Supabase.
