import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ requestSpeech: vi.fn() }))

vi.mock('../../lib/tts/ttsClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/tts/ttsClient')>()
  return { ...actual, requestSpeech: mocks.requestSpeech }
})

import { TtsRequestError } from '../../lib/tts/ttsClient'
import { ReaderCard } from './ReaderCard'

beforeEach(() => {
  cleanup()
  mocks.requestSpeech
    .mockReset()
    .mockRejectedValue(new TtsRequestError('Lectura gratuită a fost folosită.', 'PAYWALL', 402))
})

describe('ReaderCard entitlement journey', () => {
  it('shows the server paywall on an attempted reading after a page remount', async () => {
    const user = userEvent.setup()
    const firstRender = render(<ReaderCard />)

    await user.type(screen.getByLabelText('Textul tău'), 'Text românesc pentru citire.')
    await user.click(screen.getByRole('button', { name: /citește cu voce tare/i }))
    expect(
      await screen.findByRole('heading', { name: 'Lectura gratuită a fost folosită' }),
    ).toBeInTheDocument()

    firstRender.unmount()
    render(<ReaderCard />)
    await user.type(screen.getByLabelText('Textul tău'), 'A second reading after reload.')
    await user.click(screen.getByRole('button', { name: /citește cu voce tare/i }))

    expect(
      await screen.findByRole('heading', { name: 'Lectura gratuită a fost folosită' }),
    ).toBeInTheDocument()
    expect(mocks.requestSpeech).toHaveBeenCalledTimes(2)
  })

  it('keeps the typed text available and reports a TTS timeout separately', async () => {
    const user = userEvent.setup()
    mocks.requestSpeech.mockRejectedValueOnce(
      new TtsRequestError(
        'Generarea audio a durat prea mult. Textul este în continuare disponibil; încearcă din nou.',
        'TTS_TIMEOUT',
        503,
      ),
    )
    render(<ReaderCard />)
    const textArea = screen.getByLabelText('Textul tău')
    const originalText = 'Bună ziua, acesta este textul meu.'

    await user.type(textArea, originalText)
    await user.click(screen.getByRole('button', { name: /citește cu voce tare/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Textul este în continuare disponibil',
    )
    expect(textArea).toHaveValue(originalText)
    expect(textArea).toHaveAttribute('aria-invalid', 'false')
  })
})
