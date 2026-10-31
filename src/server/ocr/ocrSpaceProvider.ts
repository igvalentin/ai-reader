import { OcrProviderError, type OcrProvider } from './ocrProvider'

const OCR_SPACE_ENDPOINT = 'https://api.ocr.space/parse/image'

/** Codul de limbă OCR.space pentru română, folosit pentru o recunoaștere mai bună a diacriticelor. */
const OCR_LANGUAGE = 'rum'

interface OcrSpaceParsedResult {
  ParsedText?: string
}

interface OcrSpaceApiResponse {
  IsErroredOnProcessing?: boolean
  ErrorMessage?: string | string[]
  ParsedResults?: OcrSpaceParsedResult[]
}

function extensionForMimeType(mimeType: string): string {
  const subtype = mimeType.split('/')[1]
  return subtype === 'jpeg' ? 'jpg' : (subtype ?? 'bin')
}

/**
 * Furnizor OCR server-side bazat pe API-ul OCR.space. Cheia API rămâne exclusiv pe server
 * (variabila de mediu `OCR_SPACE_API_KEY`) și nu este niciodată trimisă către client.
 */
export class OcrSpaceProvider implements OcrProvider {
  constructor(private readonly apiKey: string) {}

  async recognizeText(imageBytes: Uint8Array, mimeType: string): Promise<string> {
    const formData = new FormData()
    const blob = new Blob([imageBytes], { type: mimeType })
    formData.append('file', blob, `upload.${extensionForMimeType(mimeType)}`)
    formData.append('language', OCR_LANGUAGE)
    formData.append('OCREngine', '2')
    formData.append('scale', 'true')
    formData.append('isTable', 'false')
    formData.append('detectOrientation', 'true')

    let response: Response
    try {
      response = await fetch(OCR_SPACE_ENDPOINT, {
        method: 'POST',
        headers: { apikey: this.apiKey },
        body: formData,
      })
    } catch {
      throw new OcrProviderError('Nu s-a putut contacta serviciul de recunoaștere text.')
    }

    if (!response.ok) {
      throw new OcrProviderError(`Serviciul OCR a răspuns cu starea ${response.status}.`)
    }

    let payload: OcrSpaceApiResponse
    try {
      payload = (await response.json()) as OcrSpaceApiResponse
    } catch {
      throw new OcrProviderError('Răspuns invalid de la serviciul OCR.')
    }

    if (payload.IsErroredOnProcessing) {
      const message = Array.isArray(payload.ErrorMessage)
        ? payload.ErrorMessage.join('; ')
        : payload.ErrorMessage
      throw new OcrProviderError(message || 'Procesarea OCR a eșuat.')
    }

    const parsedResults = payload.ParsedResults ?? []
    return parsedResults
      .map((result) => result.ParsedText ?? '')
      .join('\n\n')
  }
}
