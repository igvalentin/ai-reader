import { describe, expect, it, vi } from 'vitest'
import { OcrProviderError } from './ocrProvider'
import {
  TesseractOcrProvider,
  type LocalOcrWorker,
  type LocalOcrWorkerFactory,
} from './tesseractOcrProvider'

const IMAGE_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

describe('TesseractOcrProvider', () => {
  it('recognizes Romanian text and reuses the worker for later images', async () => {
    const worker: LocalOcrWorker = {
      recognize: vi.fn().mockResolvedValue({ data: { text: 'Bună ziua.' } }),
      terminate: vi.fn().mockResolvedValue(undefined),
    }
    const workerFactory: LocalOcrWorkerFactory = vi.fn().mockResolvedValue(worker)
    const provider = new TesseractOcrProvider(workerFactory)

    await expect(provider.recognizeText(IMAGE_BYTES, 'image/png')).resolves.toBe('Bună ziua.')
    await expect(provider.recognizeText(IMAGE_BYTES, 'image/png')).resolves.toBe('Bună ziua.')

    expect(workerFactory).toHaveBeenCalledTimes(1)
    expect(worker.recognize).toHaveBeenCalledTimes(2)
    expect(worker.recognize).toHaveBeenCalledWith(IMAGE_BYTES)
  })

  it('wraps worker failures and releases the failed worker so a later request can retry', async () => {
    const failedWorker: LocalOcrWorker = {
      recognize: vi.fn().mockRejectedValue(new Error('recognition failed')),
      terminate: vi.fn().mockResolvedValue(undefined),
    }
    const recoveredWorker: LocalOcrWorker = {
      recognize: vi.fn().mockResolvedValue({ data: { text: 'Text recunoscut.' } }),
      terminate: vi.fn().mockResolvedValue(undefined),
    }
    const workerFactory: LocalOcrWorkerFactory = vi
      .fn<LocalOcrWorkerFactory>()
      .mockResolvedValueOnce(failedWorker)
      .mockResolvedValueOnce(recoveredWorker)
    const provider = new TesseractOcrProvider(workerFactory)

    await expect(provider.recognizeText(IMAGE_BYTES, 'image/png')).rejects.toBeInstanceOf(
      OcrProviderError,
    )
    expect(failedWorker.terminate).toHaveBeenCalledOnce()
    await expect(provider.recognizeText(IMAGE_BYTES, 'image/png')).resolves.toBe('Text recunoscut.')
    expect(workerFactory).toHaveBeenCalledTimes(2)
  })
})
