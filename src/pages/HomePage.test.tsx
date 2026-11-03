import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const mocks = vi.hoisted(() => ({ requestSpeech: vi.fn() }))

vi.mock('../lib/tts/ttsClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/tts/ttsClient')>()
  return { ...actual, requestSpeech: mocks.requestSpeech }
})

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => new Promise(() => undefined),
      getSession: () => new Promise(() => undefined),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
  },
}))

import { TtsRequestError } from '../lib/tts/ttsClient'
import HomePage from './HomePage'

beforeEach(() => {
  mocks.requestSpeech.mockReset().mockRejectedValue(
    new TtsRequestError('Lectura gratuită a fost folosită.', 'SUBSCRIPTION_REQUIRED', 402),
  )
})

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('afișează titlul principal și mesajul despre lectura gratuită', () => {
    renderHomePage()

    expect(
      screen.getByRole('heading', { level: 1, name: /ascultă orice text/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/lectură gratuit/i)).toBeInTheDocument()
  })

  it('dezactivează butonul de citire cu voce tare', () => {
    renderHomePage()

    expect(screen.getByRole('button', { name: /citește cu voce tare/i })).toBeDisabled()
  })

  it('actualizează numărul de caractere la introducerea textului', async () => {
    renderHomePage()
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/lipește sau scrie textul/i)

    await user.type(textarea, 'Salut!')
    await user.clear(textarea)
    await user.click(textarea)
    await user.paste('Text lipit')

    expect(screen.getByText('10 caractere')).toBeInTheDocument()
  })

  it('shows account between subscription and OCR&TTS after the server confirms a paywall', async () => {
    const user = userEvent.setup()
    renderHomePage()
    const originalText = 'Textul meu rămâne disponibil.'
    const textarea = screen.getByLabelText(/lipește sau scrie textul/i)

    await user.type(textarea, originalText)
    await user.click(screen.getByRole('button', { name: /citește cu voce tare/i }))
    await screen.findByRole('heading', { name: 'Lectura gratuită a fost folosită' })

    const subscriptionHeading = screen.getByRole('heading', { name: 'Abonament' })
    const accountHeading = screen.getByRole('heading', { name: 'Cont și ajutor' })
    const readerHeading = screen.getByRole('heading', { name: 'OCR&TTS' })
    const follows = (first: HTMLElement, second: HTMLElement) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

    expect(follows(subscriptionHeading, accountHeading)).toBe(true)
    expect(follows(accountHeading, readerHeading)).toBe(true)
    expect(screen.getByLabelText(/lipește sau scrie textul/i)).toHaveValue(originalText)
  })
})
