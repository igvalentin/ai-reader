# Autentificare, abonamente și administrare

Acest document descrie configurarea externă necesară pentru funcțiile de autentificare, Stripe și dashboard-ul admin. Codul nu configurează automat proiectele Supabase/Stripe și nu a fost aplicat/deployat în producție.

Testele API sunt în `src/server/api-tests/`, în afara directorului `api/` folosit pentru funcții Vercel. Acum există **8 funcții runtime**, sub plafonul Hobby de 12.

## Supabase Auth și OTP

În proiectul Supabase folosit de `VITE_EXTERNAL_SUPABASE_URL`:

1. În **Authentication → URL Configuration**, setează **Site URL** la domeniul Vercel de producție, de exemplu `https://ai-reader-lac.vercel.app`.
2. Adaugă la **Redirect URLs** domeniul live (`https://ai-reader-lac.vercel.app/**`) și numai originile locale folosite efectiv pentru dezvoltare. Linkul trimis de client folosește `window.location.origin`; domeniul live trebuie permis explicit.
3. În **Authentication → Email Templates → Magic Link**, păstrează URL-ul de confirmare Supabase (`{{ .ConfirmationURL }}`); nu hardcoda `localhost` sau `SiteURL` în linkul de confirmare.
4. Verifică limita de trimitere email OTP din setările Auth. Interfața are lock/cooldown de 60 s și nu face retry automat; cooldown-ul client nu înlocuiește limita Supabase.
5. Pentru livrare de producție, configurează un SMTP propriu în **Authentication → SMTP Settings**, cu sender verificat și SPF/DKIM configurate la furnizorul domeniului. Nu salva parolele SMTP în repository. SMTP-ul implicit Supabase poate avea limite restrictive.

Setări Supabase și SMTP se fac manual în dashboard; repository-ul nu le poate inspecta sau modifica. După schimbări, cere un link nou și testează-l o singură dată, deoarece OTP-ul expiră și este de unică folosință.

## Variabile Vercel

Setează variabilele în **Project → Settings → Environment Variables** pentru mediile folosite:

- `SUPABASE_URL` și `SUPABASE_ANON_KEY` — server-side pentru validarea tokenului bearer (`SUPABASE_ANON_KEY` trebuie să provină din același proiect ca URL-ul client).
- `SUPABASE_SERVICE_ROLE_KEY` — numai server-side pentru entitlement, webhook și admin.
- `ANONYMOUS_USAGE_SECRET` — secret aleatoriu server-side pentru semnarea cookie-ului anonim. Rotația lui invalidează cookie-urile anonime existente.
- `APP_URL` — origin-ul aplicației Vercel, folosit la întoarcerea din Stripe.
- `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION=germanywestcentral` și opțional `AZURE_SPEECH_VOICE` — numai server-side, conform [`TTS.md`](./TTS.md).
- `ADMIN_USER_IDS` — UUID-uri Supabase Auth separate prin virgulă; doar aceste ID-uri sunt autorizate. Nu există endpoint client pentru a acorda roluri.
- `CRON_SECRET` — secret aleatoriu separat, cerut de jobul de retenție Vercel.

Nu prefixa niciun secret cu `VITE_`. În special, cheia service-role nu ajunge niciodată în bundle-ul browserului.

## Stripe: produse și prețuri recurente

Integrarea existentă Stripe folosea `mode: subscription`, Billing Portal și webhooks pentru statusul abonamentului. Păstrez această integrare și configurația cu reînnoire automată; interfața precizează reînnoirea și portalul permite anularea. Nu am creat produse/prețuri live și nu am inițiat plăți.

În **Stripe Dashboard → Test mode → Product catalog**, creează câte un produs și un preț recurring:

| Produs                  | Sumă    | Interval Stripe exact |
| ----------------------- | ------- | --------------------- |
| Citește-mi — 7 zile     | 5 RON   | `week`, count `1`     |
| Citește-mi — 30 de zile | 10 RON  | `day`, count `30`     |
| Citește-mi — 1 an       | 100 RON | `year`, count `1`     |

Stripe stochează `unit_amount` în bani: valorile așteptate sunt `500`, `1000` și `10000`.

Varianta recomandată este să configurezi în Vercel ID-urile **Price** (prefix `price_`):

- `STRIPE_PRICE_ID_7_DAYS`
- `STRIPE_PRICE_ID_30_DAYS`
- `STRIPE_PRICE_ID_1_YEAR`

Dacă ai deja configurat ID-uri **Product** (prefix `prod_`), backend-ul acceptă și:

- `STRIPE_PRICE_PLAN_1` — produsul pentru 7 zile
- `STRIPE_PRICE_PLAN_2` — produsul pentru 30 de zile
- `STRIPE_PRICE_PLAN_3` — produsul anual

Dacă sunt setate ambele variante, `STRIPE_PRICE_ID_*` are prioritate. Pentru planul de 7 zile, backend-ul acceptă recurență `week × 1` sau echivalent `day × 7`; celelalte intervale trebuie să corespundă exact planului. În modul Product ID, serverul caută în Stripe un singur Price activ care corespunde sumei, monedei RON și intervalului așteptat; zero sau mai multe potriviri înseamnă refuzarea Checkout-ului. Pentru configurația Vercel folosește valorile din Production și redeployează codul după actualizarea variabilelor. Trecerea în Live mode se face numai după aprobarea explicită și verificarea prețurilor.

În Stripe, configurează webhook-ul către `https://ai-reader-lac.vercel.app/api/stripe-webhook` și abonează-te la:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Setează signing secret-ul webhook-ului Stripe în `STRIPE_WEBHOOK_SECRET`. Webhook-ul verifică semnătura și actualizează Supabase printr-un RPC tranzacțional/idempotent; redirect-ul de succes din browser nu acordă acces. Stripe Billing Portal trebuie configurat pentru anularea abonamentului și administrarea metodelor de plată.

## Migrare Supabase

Schema existentă de bază este [`../supabase/schema.sql`](../supabase/schema.sql). Migrarea nouă este [`../supabase/migrations/20261101000000_billing_usage_admin.sql`](../supabase/migrations/20261101000000_billing_usage_admin.sql). Este aditivă: adaugă metadate de plan, contori pseudonimizați, RPC-uri de metrici și actualizarea atomică/idempotentă a abonamentului; nu șterge sau rescrie rânduri existente.

Ordine recomandată:

1. Fă backup și aplică migrarea într-un proiect Supabase de test.
2. Verifică tabelele, RLS și funcțiile `record_usage_metric`, `merge_anonymous_usage_metrics`, `claim_free_reading` și `apply_stripe_subscription_event`.
3. Configurează Stripe Test mode, env vars Preview și endpoint-ul webhook de test.
4. După verificare și aprobare, aplică migrarea pe proiectul Supabase de producție, configurează env vars Production și abia apoi deployează codul. Nu aplica migrarea în producție automat din CI.

Free-use este revendicat doar după sinteză reușită prin `claim_free_reading`, care verifică din nou abonamentul neexpirat și efectuează claim-ul atomic. Cererile concurente nu pot revendica de două ori aceeași lectură gratuită. Un abonament activ fără `current_period_end` nu este considerat activ.

## Dashboard admin și confidențialitate

`ADMIN_USER_IDS` este allowlist server-side. Endpoint-ul `/api/admin/users` verifică bearer token-ul Supabase și allowlist-ul înainte să citească emailuri ori date; utilizatorii neautorizați primesc `403`. RLS pentru `usage_metrics` nu permite acces browserului; service-role-ul este folosit numai din server.

Pentru utilizatorii anonimi se folosește cookie-ul first-party semnat `ai_reader_anon` (valabil 365 de zile). În tabele se păstrează hash-ul HMAC și contoare/timestamp-uri: încercări OCR, încercări audio, generații audio reușite, prima/ultima activitate și consumul lecturii gratuite. Metricile de attempt și succes sunt distincte. Nu se stochează text, imagini sau audio.

Jobul Vercel `api/cron/usage-retention` rulează zilnic și elimină metricile și ledger-ul anonim expirate după 365 de zile. Este protejat de `CRON_SECRET`. Nu l-am executat și nu am făcut deploy; verifică perioada și aprobă migrarea/deploy-ul înainte ca politica de retenție să ruleze pe date reale.
