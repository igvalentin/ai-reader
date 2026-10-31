import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  detectImageMimeTypeFromBytes,
  isAcceptedMimeType,
} from './imageSignature'

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

const SIGNATURE_SAMPLE_BYTES = 12

/**
 * Validează un fișier imagine ales de utilizator: tipul MIME declarat, dimensiunea și, cel mai
 * important, semnătura binară reală a conținutului (nu doar extensia/`Content-Type`-ul). Rulează
 * în browser, înainte de încărcare, ca primă linie de apărare — validarea definitivă se face și
 * pe server.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (!isAcceptedMimeType(file.type)) {
    return {
      valid: false,
      error: 'Formatul fișierului nu este acceptat. Folosește JPEG, PNG sau WebP.',
    }
  }

  if (file.size <= 0) {
    return { valid: false, error: 'Fișierul selectat este gol.' }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const maxMb = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0)
    return { valid: false, error: `Imaginea depășește limita de ${maxMb} MB.` }
  }

  const headerBuffer = await file.slice(0, SIGNATURE_SAMPLE_BYTES).arrayBuffer()
  const detectedType = detectImageMimeTypeFromBytes(new Uint8Array(headerBuffer))

  if (!detectedType || !ACCEPTED_IMAGE_MIME_TYPES.includes(detectedType)) {
    return {
      valid: false,
      error: 'Conținutul fișierului nu pare a fi o imagine JPEG, PNG sau WebP validă.',
    }
  }

  return { valid: true }
}
