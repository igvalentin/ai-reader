import type { OcrProvider } from './ocrProvider'
import { OcrSpaceProvider } from './ocrSpaceProvider'

let cachedProvider: OcrProvider | null = null

/**
 * Returnează instanța furnizorului OCR configurat prin variabile de mediu server-side.
 * Separarea printr-o fabrică permite înlocuirea furnizorului (sau injectarea unui dublu de
 * test) fără a modifica handler-ul `/api/ocr`.
 */
export function getOcrProvider(): OcrProvider {
  if (cachedProvider) return cachedProvider

  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) {
    throw new Error('Variabila de mediu OCR_SPACE_API_KEY lipsește din configurația serverului.')
  }

  cachedProvider = new OcrSpaceProvider(apiKey)
  return cachedProvider
}

/** Folosit doar în teste, pentru a reseta instanța memorată între cazuri de test. */
export function resetOcrProviderCacheForTests(): void {
  cachedProvider = null
}
