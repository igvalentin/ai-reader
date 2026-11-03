import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  requestSpeech: vi.fn(),
  loadChunks: vi.fn(),
  onTextExtracted: vi.fn(),
  useImageOcr: vi.fn(),
}))

vi.mock('../../lib/tts/ttsClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/tts/ttsClient')>()
  return { ...actual, requestSpeech: mocks.requestSpeech }
})

vi.mock('../../lib/tts/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    state: { status: 'idle', error: null, currentTime: 0, duration: 0, playing: false },
    loadChunks: mocks.loadChunks,
    toggle: vi.fn(),
    seek: vi.fn(),
    setPlaybackRate: vi.fn(),
  }),
}))

vi.mock('../../lib/image/useImageOcr', () => ({ useImageOcr: mocks.useImageOcr }))

import { TtsRequestError } from '../../lib/tts/ttsClient'
import { ReaderCard } from './ReaderCard'

beforeEach(() => {
  cleanup()
  mocks.requestSpeech
    .mockReset()
    .mockRejectedValue(new TtsRequestError('Lectura gratuită a fost folosită.', 'PAYWALL', 402))
  mocks.loadChunks.mockReset().mockResolvedValue(undefined)
  mocks.onTextExtracted.mockReset()
  mocks.useImageOcr.mockReset().mockImplementation(({ onTextExtracted }) => {
    mocks.onTextExtracted.mockImplementation(onTextExtracted)
    return {
      previewUrl: null,
      status: 'idle',
      errorMessage: null,
      uploadProgress: 0,
      selectFile: vi.fn(),
      removeImage: vi.fn(),
      startOcr: vi.fn(),
    }
  })
})

describe('ReaderCard entitlement journey', () => {
  it('autoplays OCR text by default and keeps the extracted text editable', async () => {
    mocks.requestSpeech.mockResolvedValueOnce({
      chunks: ['QQ=='],
      audioContentType: 'audio/mpeg',
    })
    render(<ReaderCard />)

    expect(screen.getByRole('radio', { name: 'Autoplay' })).toBeChecked()
    act(() => mocks.onTextExtracted('Text extras din imagine.'))

    await waitFor(() =>
      expect(mocks.requestSpeech).toHaveBeenCalledWith('Text extras din imagine.', ''),
    )
    expect(mocks.loadChunks).toHaveBeenCalledWith(['QQ=='], 'audio/mpeg', true)
    expect(screen.getByLabelText('Lipește sau scrie textul')).toHaveValue(
      'Text extras din imagine.',
    )
  })

  it('does not generate audio automatically when manual mode is selected', async () => {
    const user = userEvent.setup()
    render(<ReaderCard />)

    await user.click(screen.getByRole('radio', { name: 'Redare manuală' }))
    act(() => mocks.onTextExtracted('Text OCR pentru pornire manuală.'))

    expect(mocks.requestSpeech).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Lipește sau scrie textul')).toHaveValue(
      'Text OCR pentru pornire manuală.',
    )
    await user.click(screen.getByRole('button', { name: /citește cu voce tare/i }))
    expect(mocks.requestSpeech).toHaveBeenCalledWith('Text OCR pentru pornire manuală.', '')
  })

  it('shows the server paywall on an attempted reading after a page remount', async () => {
    const user = userEvent.setup()
    const firstRender = render(<ReaderCard />)

    await user.type(screen.getByLabelText('Lipește sau scrie textul'), 'Text românesc pentru citire.')
    await user.click(screen.getByRole('button', { name: /citește cu voce tare/i }))
    expect(
      await screen.findByRole('heading', { name: 'Lectura gratuită a fost folosită' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /abonament necesar pentru a continua/i }),
    ).toBeDisabled()

    firstRender.unmount()
    render(<ReaderCard />)
    await user.type(
      screen.getByLabelText('Lipește sau scrie textul'),
      'A second reading after reload.',
    )
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
    const textArea = screen.getByLabelText('Lipește sau scrie textul')
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
