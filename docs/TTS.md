# Configurarea text-to-speech

Aplicația folosește un contract `TtsProvider` server-side, astfel încât playerul și endpoint-ul nu depind de furnizorul concret. Implementarea inițială este `GoogleCloudTtsProvider`, apelată numai din funcția Vercel `/api/tts`.

## Variabile de mediu

Adaugă în mediul serverului (local `.env`, Vercel Environment Variables):

```env
GOOGLE_CLOUD_TTS_API_KEY=cheia-server-side
```

Nu folosi prefixul `VITE_`; cheia nu trebuie ajunsă în bundle-ul browserului. Activează Cloud Text-to-Speech în proiectul Google Cloud și verifică în consola Google Cloud prețurile și disponibilitatea vocilor `ro-RO-Standard-A`, `en-US-Neural2-C` și `en-GB-Neural2-A` înainte de producție. Nu se face deploy fără aprobare.

## Flux și limite

`POST /api/tts` primește `{ text, language? }`, detectează limba dacă nu există override, normalizează determinist textul românesc, păstrează limitele de 4.000 de caractere și împarte textul pe paragrafe/propoziții în cereri de cel mult 4.500 de caractere. Răspunsul conține fragmente MP3 base64, care sunt concatenate local pentru player.

Răspunsurile sunt memorate în cache doar în memoria procesului server, timp de 15 minute, după text și limbă. Nu sunt persistate și nu sunt partajate între utilizatori. Evenimentele de succes/eșec raportează doar limbă, număr de fragmente, lungime și caracterul retryable; nu loghează textul.

Rate-limit-urile și timeout-urile furnizorului sunt mapate la 503 când pot fi retrimise. Restul erorilor sunt 502. Pentru un volum de producție, adaugă înainte de lansare un contor durabil server-side și autentificare/entitlement, aliniate cu schema Supabase din `ARCHITECTURE.md`.

## Extinderea limbilor

Adaugă limba în configurația `VOICES` a providerului și în lista UI din `src/constants/languages.ts`. Playerul nu trebuie modificat. Pentru alt furnizor, implementează `TtsProvider` și schimbă doar fabrica.
