import { describe, expect, it } from 'vitest'
import { normalizeOcrText } from './normalizeOcrText'

describe('normalizeOcrText', () => {
  it('păstrează diacriticele românești (ă, â, î, ș, ț) neschimbate', () => {
    const raw = 'Ăsta e un test cu diacritice: ă, â, î, ș, ț.'
    expect(normalizeOcrText(raw)).toBe(raw)
  })

  it('păstrează separarea în paragrafe când există linii goale între blocuri', () => {
    const raw =
      'Primul paragraf, prima linie.\nPrimul paragraf, a doua linie.\n\nAl doilea paragraf.'
    expect(normalizeOcrText(raw)).toBe(
      'Primul paragraf, prima linie. Primul paragraf, a doua linie.\n\nAl doilea paragraf.',
    )
  })

  it('unește liniile răzlețe din același paragraf cu spațiu, păstrând o ordine de citire rezonabilă', () => {
    const raw = 'Acesta\neste\nun\nsingur\nparagraf.'
    expect(normalizeOcrText(raw)).toBe('Acesta este un singur paragraf.')
  })

  it('elimină spațiile multiple și liniile goale în exces (3+ între paragrafe)', () => {
    const raw = 'Paragraf unu.\n\n\n\nParagraf  doi   cu spații.'
    expect(normalizeOcrText(raw)).toBe('Paragraf unu.\n\nParagraf doi cu spații.')
  })

  it('returnează șir gol pentru text brut gol sau doar spații', () => {
    expect(normalizeOcrText('')).toBe('')
    expect(normalizeOcrText('   \n\n   ')).toBe('')
  })

  it('normalizează terminatoarele de linie Windows (CRLF) la fel ca LF', () => {
    const raw = 'Linia 1\r\nLinia 2\r\n\r\nParagraf nou.'
    expect(normalizeOcrText(raw)).toBe('Linia 1 Linia 2\n\nParagraf nou.')
  })
})
