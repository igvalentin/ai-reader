import { describe, expect, it } from 'vitest'
import { chunkText } from './chunkText'

describe('chunkText', () => {
  it('păstrează paragrafele în aceeași ordine și limitează fragmentele', () => {
    const chunks = chunkText('Primul paragraf.\n\nAl doilea paragraf.', 20)
    expect(chunks.join(' ')).toContain('Primul paragraf.')
    const paragraphs = Array.from({ length: 400 }, (_, index) => `p${index}`).join('\n\n')
    const packed = chunkText(paragraphs, 100)
    expect(packed.length).toBeLessThan(50)
    expect(packed.every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 100)).toBe(true)
    expect(packed.join('').replace(/\n/g, '')).toBe(paragraphs.replace(/\n/g, ''))
    const accentedText = 'ă'.repeat(100)
    const accentedChunks = chunkText(accentedText, 50)
    expect(accentedChunks.every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 50)).toBe(true)
    expect(accentedChunks.join('')).toBe(accentedText)
    expect(chunks.join(' ')).toContain('Al doilea paragraf.')
    expect(chunks.every((chunk) => Buffer.byteLength(chunk, 'utf8') <= 20)).toBe(true)
  })
})
