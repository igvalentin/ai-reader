import { describe, expect, it } from 'vitest'
import { normalizeRomanianText } from './normalizeRomanianText'

describe('normalizeRomanianText', () => {
  it('normalizează bani, procente, date și abrevieri determinist', () => {
    expect(normalizeRomanianText('Dr. Popescu a plătit 125,50 lei la 12.05.2024. TVA este 19%.')).toBe('doctor Popescu a plătit 125 virgulă 50 lei la 12 slash 05 slash 2024. t v a este 19 la sută.')
  })
  it('înlocuiește URL-urile și emailurile fără a modifica engleza', () => {
    expect(normalizeRomanianText('Contactează ana@example.com sau https://exemplu.ro')).toBe('Contactează adresă de e-mail sau link web')
    expect(normalizeRomanianText('This is a test.', 'en-US')).toBe('This is a test.')
  })
})
