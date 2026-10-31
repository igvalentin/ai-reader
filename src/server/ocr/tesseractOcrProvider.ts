import { createRequire } from 'node:module'
import { OcrProviderError, type OcrProvider } from './ocrProvider.js'

export interface LocalOcrWorker {
  recognize(image: Uint8Array): Promise<{ data: { text: string } }>
  terminate(): Promise<unknown>
}

export type LocalOcrWorkerFactory = () => Promise<LocalOcrWorker>

interface RomanianLanguageData {
  code: string
  gzip: boolean
  langPath: string
}

interface TesseractRuntime {
  createWorker(
    languages: string,
    oem?: number,
    options?: { langPath: string; gzip: boolean; cachePath: string },
  ): Promise<LocalOcrWorker>
}

function createRomanianWorker(): Promise<LocalOcrWorker> {
  const require = createRequire(import.meta.url)
  const tesseract = require('tesseract.js') as TesseractRuntime
  const languageData = require('@tesseract.js-data/ron') as RomanianLanguageData

  return tesseract.createWorker(languageData.code, undefined, {
    langPath: languageData.langPath,
    gzip: languageData.gzip,
    cachePath: '/tmp/ai-reader-tesseract',
  })
}

/** Runs Romanian OCR with a local Tesseract.js WASM engine and bundled traineddata. */
export class TesseractOcrProvider implements OcrProvider {
  private workerPromise: Promise<LocalOcrWorker> | null = null
  private recognitionQueue: Promise<void> = Promise.resolve()

  constructor(private readonly workerFactory: LocalOcrWorkerFactory = createRomanianWorker) {}

  recognizeText(imageBytes: Uint8Array, mimeType: string): Promise<string> {
    void mimeType
    const recognition = this.recognitionQueue.then(async () => {
      const worker = await this.getWorker()
      try {
        const result = await worker.recognize(imageBytes)
        return result.data.text
      } catch (error) {
        this.workerPromise = null
        await worker.terminate().catch(() => undefined)
        throw error
      }
    })

    this.recognitionQueue = recognition.then(
      () => undefined,
      () => undefined,
    )

    return recognition.catch((error: unknown) => {
      if (error instanceof OcrProviderError) throw error
      const message =
        error instanceof Error ? `${error.name}: ${error.message}` : 'unknown engine error'
      throw new OcrProviderError(`Local Tesseract OCR failed (${message}).`)
    })
  }

  private getWorker(): Promise<LocalOcrWorker> {
    if (!this.workerPromise) {
      this.workerPromise = this.workerFactory().catch((error: unknown) => {
        this.workerPromise = null
        throw error
      })
    }

    return this.workerPromise
  }
}
