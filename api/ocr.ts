import type { VercelRequest, VercelResponse } from '@vercel/node'
import { detectImageMimeTypeFromBytes } from '../src/lib/image/imageSignature.js'
import { normalizeOcrText } from '../src/server/ocr/normalizeOcrText.js'
import { getOcrProvider } from '../src/server/ocr/ocrProviderFactory.js'
import { OcrProviderError } from '../src/server/ocr/ocrProvider.js'
import { MultipartParseError, parseMultipartImage } from '../src/server/ocr/parseMultipartImage.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

function sanitizeOcrDiagnosticMessage(message: string): string {
  return message
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/(?:api[\s_-]?key|authorization|bearer)\s*[:=]?\s*[^\s,;]+/gi, '[redacted]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .slice(0, 200)
}

/**
 * Server-side OCR for the anonymous reading flow.
 *
 * The endpoint validates image magic bytes, accepts no user-supplied URL, and keeps the upload
 * in memory rather than persisting it. The image is forwarded over HTTPS to OCR.space for
 * recognition; the provider's retention and processing terms are outside this application and
 * must be reviewed separately. OCR is intentionally unauthenticated for guest access and no
 * distributed rate limit is configured here, so production deployment requires an external
 * abuse/cost control. Response bodies are no-store and logs exclude image and extracted text.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
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
      console.error(JSON.stringify({
        event: 'ocr_provider_failed',
        provider: 'ocr.space',
        providerMessage: sanitizeOcrDiagnosticMessage(error.message),
      }))
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
