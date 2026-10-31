export type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp'

export const ACCEPTED_IMAGE_MIME_TYPES: readonly SupportedImageMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

/**
 * Limita trebuie să rămână sub limita de 4.5 MB impusă corpului cererilor pentru Vercel
 * Functions, lăsând loc pentru antetele multipart.
 */
export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024 // 4 MB

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function matchesSignature(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false
  return signature.every((byte, index) => bytes[index] === byte)
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
  const isWebpTag =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  return isRiff && isWebpTag
}

/**
 * Detectează tipul real al imaginii pe baza semnăturii binare (magic bytes), nu a extensiei
 * fișierului sau a antetului `Content-Type` declarat de client — previne încărcarea unor
 * fișiere mascate ca imagini.
 */
export function detectImageMimeTypeFromBytes(bytes: Uint8Array): SupportedImageMimeType | null {
  if (matchesSignature(bytes, JPEG_SIGNATURE)) return 'image/jpeg'
  if (matchesSignature(bytes, PNG_SIGNATURE)) return 'image/png'
  if (isWebp(bytes)) return 'image/webp'
  return null
}

export function isAcceptedMimeType(mimeType: string): mimeType is SupportedImageMimeType {
  return (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
}
