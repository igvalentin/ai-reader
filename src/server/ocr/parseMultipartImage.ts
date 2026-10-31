import Busboy from 'busboy'
import type { IncomingMessage } from 'node:http'
import { MAX_IMAGE_SIZE_BYTES } from '../../lib/image/imageSignature.js'

export class MultipartParseError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message)
  }
}

export interface ParsedImageFile {
  buffer: Buffer
  declaredMimeType: string
  fieldName: string
}

/**
 * Parsează o cerere `multipart/form-data` care conține exact un fișier imagine (câmpul
 * `image`), fără a scrie niciodată conținutul pe disc — totul rămâne în memorie și este
 * eliberat după procesare. Respinge cererile care depășesc `MAX_IMAGE_SIZE_BYTES` imediat ce
 * limita este atinsă, fără a consuma restul fluxului.
 *
 * Nu acceptă niciun câmp de tip URL/link către o resursă externă — singura sursă de date este
 * fișierul încărcat direct în corpul cererii, ceea ce elimină orice vector de SSRF prin
 * preluarea unei imagini de la o adresă arbitrară furnizată de client.
 */
export function parseMultipartImage(
  req: IncomingMessage,
  contentType: string,
): Promise<ParsedImageFile> {
  return new Promise((resolve, reject) => {
    let busboy: Busboy.Busboy
    try {
      busboy = Busboy({
        headers: { 'content-type': contentType },
        limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: 1 },
      })
    } catch {
      reject(new MultipartParseError('Cerere multipart invalidă.', 400))
      return
    }

    let fileFound = false
    let sizeLimitExceeded = false
    const chunks: Buffer[] = []
    let declaredMimeType = ''
    let fieldName = ''

    busboy.on('file', (name, stream, info) => {
      fileFound = true
      fieldName = name
      declaredMimeType = info.mimeType

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      stream.on('limit', () => {
        sizeLimitExceeded = true
        stream.resume()
      })
    })

    busboy.on('field', () => {
      // Ignorăm explicit orice alte câmpuri (ex. URL-uri) pentru a preveni SSRF prin preluarea
      // unei resurse de la o adresă furnizată de client.
    })

    busboy.on('error', () => {
      reject(new MultipartParseError('Nu s-a putut citi cererea.', 400))
    })

    busboy.on('finish', () => {
      if (sizeLimitExceeded) {
        reject(new MultipartParseError('Imaginea depășește limita admisă.', 413))
        return
      }

      if (!fileFound || chunks.length === 0) {
        reject(new MultipartParseError('Nicio imagine nu a fost trimisă.', 400))
        return
      }

      resolve({ buffer: Buffer.concat(chunks), declaredMimeType, fieldName })
    })

    req.pipe(busboy)
  })
}
