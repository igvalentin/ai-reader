import type { OcrProvider } from './ocrProvider.js'
import { TesseractOcrProvider } from './tesseractOcrProvider.js'

let cachedProvider: OcrProvider | null = null

/**
 * Returnează instanța OCR locală Tesseract.js folosită de funcția server-side.
 * Separarea printr-o fabrică permite înlocuirea furnizorului (sau injectarea unui dublu de
 * test) fără a modifica handler-ul `/api/ocr`.
 */
export function getOcrProvider(): OcrProvider {
  if (cachedProvider) return cachedProvider

  cachedProvider = new TesseractOcrProvider()
  return cachedProvider
}

/** Folosit doar în teste, pentru a reseta instanța memorată între cazuri de test. */
export function resetOcrProviderCacheForTests(): void {
  cachedProvider = null
}
