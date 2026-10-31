import { describe, expect, it } from 'vitest'
import { validateImageFile } from './validateImageFile'
import { MAX_IMAGE_SIZE_BYTES } from './imageSignature'

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0]

function makeFile(bytesArray: number[], options: { type: string; size?: number }): File {
  const body = new Uint8Array(bytesArray)
  const blob = new Blob([body], { type: options.type })

  if (options.size !== undefined && options.size !== blob.size) {
    // Simulează un fișier de o dimensiune anume păstrând semnătura binară la început.
    const padding = new Uint8Array(Math.max(0, options.size - body.length))
    return new File([body, padding], 'upload', { type: options.type })
  }

  return new File([blob], 'upload', { type: options.type })
}

describe('validateImageFile', () => {
  it('acceptă o imagine PNG validă (tip MIME + semnătură binară corecte)', async () => {
    const file = makeFile(PNG_HEADER, { type: 'image/png' })
    const result = await validateImageFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('respinge un tip de fișier neacceptat (ex. PDF)', async () => {
    const file = makeFile([0x25, 0x50, 0x44, 0x46], { type: 'application/pdf' })
    const result = await validateImageFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/JPEG, PNG sau WebP/i)
  })

  it('respinge o imagine care depășește dimensiunea maximă', async () => {
    const file = makeFile(JPEG_HEADER, {
      type: 'image/jpeg',
      size: MAX_IMAGE_SIZE_BYTES + 1,
    })
    const result = await validateImageFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/depășește limita/i)
  })

  it('respinge un fișier gol', async () => {
    const file = new File([], 'empty.png', { type: 'image/png' })
    const result = await validateImageFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/gol/i)
  })

  it('respinge un fișier cu extensie/Content-Type de imagine dar conținut fals (magic bytes greșite)', async () => {
    const fakeContent = new TextEncoder().encode('acesta nu este o imagine')
    const file = new File([fakeContent], 'fals.png', { type: 'image/png' })
    const result = await validateImageFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/nu pare a fi o imagine/i)
  })
})
