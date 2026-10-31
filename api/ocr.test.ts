import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { parseMultipartImageMock } = vi.hoisted(() => ({
  parseMultipartImageMock: vi.fn(),
}))
const { getOcrProviderMock } = vi.hoisted(() => ({
  getOcrProviderMock: vi.fn(),
}))

vi.mock('../src/server/ocr/parseMultipartImage', async () => {
  const actual = await vi.importActual<typeof import('../src/server/ocr/parseMultipartImage')>(
    '../src/server/ocr/parseMultipartImage',
  )
  return {
    ...actual,
    parseMultipartImage: parseMultipartImageMock,
  }
})

vi.mock('../src/server/ocr/ocrProviderFactory', () => ({
  getOcrProvider: getOcrProviderMock,
}))

import handler from './ocr'
import { MultipartParseError } from '../src/server/ocr/parseMultipartImage'
import { OcrProviderError } from '../src/server/ocr/ocrProvider'

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

function createMockReqRes(overrides: { method?: string; contentType?: string } = {}) {
  const req = {
    method: overrides.method ?? 'POST',
    headers: {
      'content-type': overrides.contentType ?? 'multipart/form-data; boundary=----test',
    },
  } as unknown as VercelRequest

  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value
      return this
    },
    json(body: unknown) {
      this.jsonBody = body
      return this
    },
  }

  return { req, res: res as unknown as VercelResponse & typeof res }
}

describe('POST /api/ocr', () => {
  beforeEach(() => {
    parseMultipartImageMock.mockReset()
    getOcrProviderMock.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('respinge metode HTTP diferite de POST', async () => {
    const { req, res } = createMockReqRes({ method: 'GET' })

    await handler(req, res)

    expect(res.statusCode).toBe(405)
  })

  it('respinge cereri fără Content-Type multipart/form-data', async () => {
    const { req, res } = createMockReqRes({ contentType: 'application/json' })

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Cererea trebuie să fie de tip multipart/form-data.' })
  })

  it('extrage și normalizează textul pentru o imagine validă (încarcăre validă)', async () => {
    parseMultipartImageMock.mockResolvedValue({
      buffer: PNG_HEADER,
      declaredMimeType: 'image/png',
      fieldName: 'image',
    })
    getOcrProviderMock.mockReturnValue({
      recognizeText: vi.fn().mockResolvedValue('Bună ziua!\nA doua linie.\n\nAl doilea paragraf.'),
    })

    const { req, res } = createMockReqRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.headers['Cache-Control']).toBe('private, no-store')
    expect(res.jsonBody).toEqual({
      text: 'Bună ziua! A doua linie.\n\nAl doilea paragraf.',
    })
  })

  it('respinge conținut care nu este o imagine reală (semnătură binară invalidă)', async () => {
    parseMultipartImageMock.mockResolvedValue({
      buffer: Buffer.from('nu este o imagine'),
      declaredMimeType: 'image/png',
      fieldName: 'image',
    })

    const { req, res } = createMockReqRes()
    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res.jsonBody).toEqual({
      error: 'Conținutul fișierului nu pare a fi o imagine JPEG, PNG sau WebP validă.',
    })
    expect(getOcrProviderMock).not.toHaveBeenCalled()
  })

  it('respinge imagini supradimensionate propagate de parserul multipart (413)', async () => {
    parseMultipartImageMock.mockRejectedValue(
      new MultipartParseError('Imaginea depășește limita admisă.', 413),
    )

    const { req, res } = createMockReqRes()
    await handler(req, res)

    expect(res.statusCode).toBe(413)
    expect(res.jsonBody).toEqual({ error: 'Imaginea depășește limita admisă.' })
  })

  it('returnează 502 și loghează diagnostic sanitizat când furnizorul OCR eșuează', async () => {
    const errorLog = vi.spyOn(console, 'error')
    errorLog.mockClear()
    parseMultipartImageMock.mockResolvedValue({
      buffer: PNG_HEADER,
      declaredMimeType: 'image/png',
      fieldName: 'image',
    })
    getOcrProviderMock.mockReturnValue({
      recognizeText: vi.fn().mockRejectedValue(new OcrProviderError('Invalid API key: private-token')),
    })

    const { req, res } = createMockReqRes()
    await handler(req, res)

    expect(res.statusCode).toBe(502)
    expect(res.jsonBody).toEqual({
      error: 'Serviciul de recunoaștere text nu a putut procesa imaginea.',
    })
    expect(errorLog).toHaveBeenCalledTimes(1)
    const loggedEntry = JSON.parse(errorLog.mock.calls[0][0] as string) as {
      event: string
      provider: string
      providerMessage: string
    }
    expect(loggedEntry).toEqual({
      event: 'ocr_provider_failed',
      provider: 'ocr.space',
      providerMessage: 'Invalid [redacted]',
    })
    expect(JSON.stringify(loggedEntry)).not.toContain('private-token')
  })

  it('returnează text gol când OCR nu găsește niciun text în imagine (rezultat OCR gol)', async () => {
    parseMultipartImageMock.mockResolvedValue({
      buffer: PNG_HEADER,
      declaredMimeType: 'image/png',
      fieldName: 'image',
    })
    getOcrProviderMock.mockReturnValue({
      recognizeText: vi.fn().mockResolvedValue('   \n\n  '),
    })

    const { req, res } = createMockReqRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.jsonBody).toEqual({ text: '' })
  })

  it('returnează 500 pentru o eroare neprevăzută în timpul procesării', async () => {
    parseMultipartImageMock.mockResolvedValue({
      buffer: PNG_HEADER,
      declaredMimeType: 'image/png',
      fieldName: 'image',
    })
    getOcrProviderMock.mockReturnValue({
      recognizeText: vi.fn().mockRejectedValue(new Error('eroare neașteptată')),
    })

    const { req, res } = createMockReqRes()
    await handler(req, res)

    expect(res.statusCode).toBe(500)
    expect(res.jsonBody).toEqual({ error: 'A apărut o eroare la procesarea imaginii.' })
  })
})
