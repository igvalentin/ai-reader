import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const { uploadImageForOcrMock } = vi.hoisted(() => ({ uploadImageForOcrMock: vi.fn() }))

vi.mock('./ocrClient', async () => {
  const actual = await vi.importActual<typeof import('./ocrClient')>('./ocrClient')
  return { ...actual, uploadImageForOcr: uploadImageForOcrMock }
})

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import { useImageOcr } from './useImageOcr'
import { OcrRequestError } from './ocrClient'

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function makePngFile(): File {
  return new File([new Uint8Array(PNG_HEADER)], 'poza.png', { type: 'image/png' })
}

describe('useImageOcr', () => {
  beforeEach(() => {
    uploadImageForOcrMock.mockReset()
  })

  it('trece prin stările ready -> success și livrează textul (inclusiv diacritice) la extragere reușită', async () => {
    uploadImageForOcrMock.mockResolvedValue({
      text: 'Primul paragraf cu diacritice: ă, â, î, ș, ț.\n\nAl doilea paragraf.',
    })
    const onTextExtracted = vi.fn()
    const { result } = renderHook(() => useImageOcr({ onTextExtracted }))

    await act(async () => {
      await result.current.selectFile(makePngFile())
    })
    expect(result.current.status).toBe('ready')
    expect(result.current.previewUrl).not.toBeNull()

    await act(async () => {
      await result.current.startOcr()
    })

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(onTextExtracted).toHaveBeenCalledWith(
      'Primul paragraf cu diacritice: ă, â, î, ș, ț.\n\nAl doilea paragraf.',
    )
  })

  it('marchează fișierul ca invalid pentru un tip de imagine neacceptat', async () => {
    const onTextExtracted = vi.fn()
    const { result } = renderHook(() => useImageOcr({ onTextExtracted }))
    const badFile = new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' })

    await act(async () => {
      await result.current.selectFile(badFile)
    })

    expect(result.current.status).toBe('invalid')
    expect(result.current.errorMessage).toMatch(/JPEG, PNG sau WebP/i)
    expect(onTextExtracted).not.toHaveBeenCalled()
  })

  it('trece în starea error și afișează mesajul când cererea OCR eșuează', async () => {
    uploadImageForOcrMock.mockRejectedValue(new OcrRequestError('Eroare furnizor OCR.'))
    const onTextExtracted = vi.fn()
    const { result } = renderHook(() => useImageOcr({ onTextExtracted }))

    await act(async () => {
      await result.current.selectFile(makePngFile())
    })
    await act(async () => {
      await result.current.startOcr()
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMessage).toBe('Eroare furnizor OCR.')
    expect(onTextExtracted).not.toHaveBeenCalled()
  })

  it('trece în starea error cu mesaj dedicat când OCR nu găsește text (rezultat gol)', async () => {
    uploadImageForOcrMock.mockResolvedValue({ text: '   ' })
    const onTextExtracted = vi.fn()
    const { result } = renderHook(() => useImageOcr({ onTextExtracted }))

    await act(async () => {
      await result.current.selectFile(makePngFile())
    })
    await act(async () => {
      await result.current.startOcr()
    })

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMessage).toMatch(/nu am găsit text/i)
    expect(onTextExtracted).not.toHaveBeenCalled()
  })

  it('elimină imaginea și resetează starea la removeImage', async () => {
    const onTextExtracted = vi.fn()
    const { result } = renderHook(() => useImageOcr({ onTextExtracted }))

    await act(async () => {
      await result.current.selectFile(makePngFile())
    })
    expect(result.current.status).toBe('ready')

    act(() => {
      result.current.removeImage()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.previewUrl).toBeNull()
    expect(result.current.file).toBeNull()
  })
})
