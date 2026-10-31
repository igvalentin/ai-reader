# Text-to-speech cu Azure AI Speech

`POST /api/tts` păstrează autentificarea și entitlement-ul server-side, sintetizează prin `TtsProvider` și returnează fragmente MP3 în JSON. Browserul apelează doar aplicația; cheia Azure nu este transmisă clientului. Providerul Azure poate fi înlocuit sau mock-uit independent.

## Configurare

Configurează aceste variabile numai în runtime-ul serverului local și în Environment Variables pentru Vercel (Development, Preview și Production, după caz):

```env
AZURE_SPEECH_KEY=your-server-side-speech-key
AZURE_SPEECH_REGION=germanywestcentral
# Opțional; implicit este ro-RO-AlinaNeural.
AZURE_SPEECH_VOICE=ro-RO-AlinaNeural
```

Valorile de mai sus sunt exemple-placeholder, nu chei. Nu adăuga prefixul `VITE_`, nu pune cheia în frontend și nu o comite în repository. Pentru dezvoltare locală, rulează funcția API cu Vercel CLI (`npx vercel dev`) și furnizează variabilele în mediul local securizat ori cu mecanismul `vercel env pull`; `npm run dev` pornește doar Vite și nu servește funcțiile `/api`. În deployment, setează variabilele în configurarea proiectului Vercel și redeployează funcțiile după actualizare.

Nu este necesară o variabilă endpoint. Endpoint-ul TTS REST este derivat din regiunea resursei:

`https://{AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`

Pentru Germania West Central, valoarea este `https://germanywestcentral.tts.speech.microsoft.com/cognitiveservices/v1`. Endpoint-ul afișat pentru resursă (`https://germanywestcentral.api.cognitive.microsoft.com/`) nu este endpoint-ul final de sinteză TTS.

## Voci și format

Vocea română implicită este `ro-RO-AlinaNeural`; `ro-RO-EmilNeural` poate fi setată prin `AZURE_SPEECH_VOICE`. Sunt configurate și vocile `en-US-JennyNeural` și `en-GB-SoniaNeural`. Verifică disponibilitatea vocilor și tarifele pentru regiunea și abonamentul Azure înainte de lansare.

Serverul trimite SSML cu escaping XML pentru textul utilizatorului și cere `audio-24khz-48kbitrate-mono-mp3`. Răspunsul JSON include `audioContentType: "audio/mpeg"`, iar clientul validează acest tip și concatenează fragmentele base64 pentru player.

## Limite, erori și confidențialitate

- Endpoint-ul acceptă maximum 4.000 de caractere de text; fragmentele de sinteză sunt limitate la 4.500 de octeți UTF-8.
- Fiecare cerere Azure are timeout de 15 secunde. Nu se fac retry-uri automate, pentru a evita costuri duplicate.
- Erorile upstream sunt transformate în coduri JSON stabile și mesaje sigure. La indisponibilitate/timeout, textul rămâne în textarea și poate fi ascultat din nou ulterior.
- Textul nu este logat și nu este păstrat de server; logurile conțin doar limbă, număr de fragmente, număr de caractere, codul erorii și retryability.
- O lectură gratuită este contorizată numai după sinteza cu succes. Erorile TTS nu afectează OCR-ul sau textul introdus.

Providerul este în `src/server/tts/azureSpeechTtsProvider.ts`; selecția și configurarea lui se află în `src/server/tts/ttsProviderFactory.ts`. Pentru alt furnizor, implementează interfața `TtsProvider` și schimbă factory-ul fără a modifica UI-ul sau contractul endpoint-ului.
