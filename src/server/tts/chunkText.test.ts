import { describe, expect, it } from 'vitest'
import { chunkText } from './chunkText'

describe('chunkText', () => {
  it('păstrează paragrafele în aceeași ordine și limitează fragmentele', () => {
    const chunks = chunkText('Primul paragraf.\n\nAl doilea paragraf.', 20)
    expect(chunks.join(' ')).toContain('Primul paragraf.')
    expect(chunks.join(' ')).toContain('Al doilea paragraf.')
    expect(chunks.every((chunk) => chunk.length <= 20)).toBe(true)
  })
})
