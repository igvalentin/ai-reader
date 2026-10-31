import { describe, expect, it } from 'vitest'
import { detectImageMimeTypeFromBytes, isAcceptedMimeType } from './imageSignature'

function bytes(values: number[]): Uint8Array {
  return new Uint8Array(values)
}

describe('detectImageMimeTypeFromBytes', () => {
  it('detectează semnătura JPEG', () => {
    expect(detectImageMimeTypeFromBytes(bytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))).toBe(
      'image/jpeg',
    )
  })

  it('detectează semnătura PNG', () => {
    expect(
      detectImageMimeTypeFromBytes(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('image/png')
  })

  it('detectează semnătura WebP (RIFF....WEBP)', () => {
    const riffWebp = bytes([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50])
    expect(detectImageMimeTypeFromBytes(riffWebp)).toBe('image/webp')
  })

  it('returnează null pentru conținut care nu este o imagine acceptată (ex. PDF)', () => {
    const pdfSignature = bytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34])
    expect(detectImageMimeTypeFromBytes(pdfSignature)).toBeNull()
  })

  it('returnează null pentru un buffer gol sau prea scurt', () => {
    expect(detectImageMimeTypeFromBytes(bytes([]))).toBeNull()
    expect(detectImageMimeTypeFromBytes(bytes([0xff, 0xd8]))).toBeNull()
  })
})

describe('isAcceptedMimeType', () => {
  it('acceptă doar JPEG, PNG și WebP', () => {
    expect(isAcceptedMimeType('image/jpeg')).toBe(true)
    expect(isAcceptedMimeType('image/png')).toBe(true)
    expect(isAcceptedMimeType('image/webp')).toBe(true)
    expect(isAcceptedMimeType('image/gif')).toBe(false)
    expect(isAcceptedMimeType('application/pdf')).toBe(false)
  })
})
