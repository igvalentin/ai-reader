import type { VercelRequest, VercelResponse } from '@vercel/node'
import { detectImageMimeTypeFromBytes } from '../src/lib/image/imageSignature'
import { normalizeOcrText } from '../src/server/ocr/normalizeOcrText'
import { getOcrProvider } from '../src/server/ocr/ocrProviderFactory'
import { OcrProviderError } from '../src/server/ocr/ocrProvider'
import { MultipartParseError, parseMultipartImage } from '../src/server/ocr/parseMultipartImage'

export const config = {
  api: {
    bodyParser: false,
  },
}

/**
 * Endpoint server-side pentru extragerea textului dintr-o imagine (OCR).
 *
 * Securitate și confidențialitate:
 * - răspunsul este returnat sincron, direct către solicitant, și nu este niciodată stocat sau
 *   accesibil altui utilizator — nu există nicio formă de persistență sau partajare;
 *   NOTĂ: impunerea autentificării obligatorii (sesiune Supabase) pe acest endpoint este
 *   planificată pentru etapa de contorizare a lecturii gratuite / entitlement (vezi
 *   `docs/ARCHITECTURE.md`, secțiunea 7, pasul 4), când ecranul de autentificare va exista și
 *   în interfață; helper-ul `verifySupabaseUser` este deja pregătit în `src/server/auth/` pentru
 *   acel moment;
 * - acceptă doar un fișier încărcat direct în corpul cererii (`multipart/form-data`) — nu există
 *   niciun parametru de tip URL care ar putea fi folosit pentru a prelua o resursă arbitrară
 *   (prevenirea SSRF);
 * - validează conținutul real al fișierului după semnătura binară (magic bytes), nu după
 *   extensia sau `Content-Type`-ul declarat de client;
 * - imaginea este păstrată doar în memorie, pe durata cererii, și nu este niciodată scrisă pe
 *   disc sau stocată într-un serviciu extern — este eliminată odată cu răspunsul;
 * - nu se loghează conținutul imaginii, textul extras sau alte date cu caracter personal; în caz
 *   de eroare se loghează doar un mesaj tehnic generic, fără payload.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'Metodă nepermisă.' })
    return
  }

  const contentType = req.headers['content-type']
  if (!contentType || !contentType.includes('multipart/form-data')) {
    res.status(400).json({ error: 'Cererea trebuie să fie de tip multipart/form-data.' })
    return
  }

  let imageBuffer: Buffer
  try {
    const parsed = await parseMultipartImage(req, contentType)
    imageBuffer = parsed.buffer
  } catch (error) {
    if (error instanceof MultipartParseError) {
      res.status(error.statusCode).json({ error: error.message })
      return
    }
    console.error('Eroare necunoscută la citirea cererii OCR.')
    res.status(400).json({ error: 'Cerere invalidă.' })
    return
  }

  const detectedMimeType = detectImageMimeTypeFromBytes(imageBuffer)
  if (!detectedMimeType) {
    res
      .status(400)
      .json({ error: 'Conținutul fișierului nu pare a fi o imagine JPEG, PNG sau WebP validă.' })
    return
  }

  try {
    const provider = getOcrProvider()
    const rawText = await provider.recognizeText(new Uint8Array(imageBuffer), detectedMimeType)
    const text = normalizeOcrText(rawText)
    res.status(200).json({ text })
  } catch (error) {
    if (error instanceof OcrProviderError) {
      console.error('Furnizorul OCR a eșuat procesarea cererii.')
      res.status(502).json({ error: 'Serviciul de recunoaștere text nu a putut procesa imaginea.' })
      return
    }
    console.error('Eroare neprevăzută la procesarea OCR.')
    res.status(500).json({ error: 'A apărut o eroare la procesarea imaginii.' })
  }
  // Nicio referință la `imageBuffer` nu este păstrată dincolo de acest handler — imaginea nu este
  // niciodată scrisă pe disc sau stocată, fiind eligibilă pentru colectarea gunoiului imediat
  // după trimiterea răspunsului.
}
