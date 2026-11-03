import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { requestSpeech, TtsRequestError } from '../../lib/tts/ttsClient'
import { useAudioPlayer } from '../../lib/tts/useAudioPlayer'
import { Button } from '../atoms/Button'
import { AudioPlayer } from '../molecules/AudioPlayer'
import { FreeTrialNotice } from '../molecules/FreeTrialNotice'
import { PaywallNotice } from '../molecules/PaywallNotice'
import { ImageUploadControl } from '../molecules/ImageUploadControl'
import { LanguageSelector } from '../molecules/LanguageSelector'
import { useImageOcr } from '../../lib/image/useImageOcr'

const MAX_CHARACTERS = 4000

interface ReaderCardProps {
  onPaywallChange?: (required: boolean) => void
  subscriptionActive?: boolean
}

export function ReaderCard({ onPaywallChange, subscriptionActive = false }: ReaderCardProps = {}) {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('auto')
  const [error, setError] = useState<string | null>(null)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true)
  const textareaId = useId()
  const errorId = useId()
  const autoPlayId = useId()
  const manualPlayId = useId()
  const currentTextRef = useRef('')
  const autoPlayRef = useRef(true)
  const languageRef = useRef(language)
  const requestInFlightRef = useRef(false)
  const { state: audioState, loadChunks, toggle, seek, setPlaybackRate } = useAudioPlayer()

  const generateAudio = useCallback(
    async (sourceText: string, shouldAutoPlay = true) => {
      if (requestInFlightRef.current || (showPaywall && !subscriptionActive)) return
      if (!sourceText.trim()) {
        setError('Adaugă un text sau o imagine pentru a începe lectura.')
        return
      }
      if (sourceText.length > MAX_CHARACTERS) {
        setError(`Textul depășește limita de ${MAX_CHARACTERS} de caractere.`)
        return
      }

      requestInFlightRef.current = true
      setError(null)
      setTtsError(null)
      setShowPaywall(false)
      setIsSubmitting(true)
      try {
        const response = await requestSpeech(
          sourceText,
          languageRef.current === 'auto' ? '' : languageRef.current,
        )
        await loadChunks(response.chunks, response.audioContentType, shouldAutoPlay)
      } catch (requestError) {
        if (
          requestError instanceof TtsRequestError &&
          (requestError.code === 'SUBSCRIPTION_REQUIRED' || requestError.code === 'PAYWALL')
        ) {
          setShowPaywall(true)
          return
        }
        if (
          requestError instanceof TtsRequestError &&
          requestError.code === 'AUTHENTICATION_REQUIRED'
        ) {
          setTtsError('Sesiunea a expirat. Cere un link de conectare nou și autentifică-te din nou.')
          return
        }
        setTtsError(requestError instanceof Error ? requestError.message : 'Generarea audio a eșuat.')
      } finally {
        requestInFlightRef.current = false
        setIsSubmitting(false)
      }
    },
    [loadChunks, showPaywall, subscriptionActive],
  )

  const handleTextExtracted = useCallback((extractedText: string) => {
    const existingText = currentTextRef.current.trim()
    const nextText = existingText ? `${existingText}\n\n${extractedText}` : extractedText
    currentTextRef.current = nextText
    setText(nextText)
    setError(null)
    setTtsError(null)
    if (autoPlayRef.current) void generateAudio(nextText, true)
  }, [generateAudio])
  const {
    previewUrl,
    status: ocrStatus,
    errorMessage: ocrErrorMessage,
    uploadProgress,
    selectFile,
    removeImage,
    startOcr,
  } = useImageOcr({ onTextExtracted: handleTextExtracted })
  const characterCount = text.length
  const isOverLimit = characterCount > MAX_CHARACTERS

  useEffect(() => {
    onPaywallChange?.(showPaywall)
  }, [onPaywallChange, showPaywall])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void generateAudio(currentTextRef.current, true)
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:gap-6 sm:p-7"
    >
      <h2 id="reader-heading" className="font-display text-xl text-ink">
        Ce text vrei sa citim?
      </h2>
      <FreeTrialNotice />
      {showPaywall && !subscriptionActive ? <PaywallNotice /> : null}
      <div className="flex flex-col gap-2">
        <label htmlFor={textareaId} className="text-base font-semibold text-ink">
          Lipește sau scrie textul
        </label>
        <textarea
          id={textareaId}
          name="text"
          rows={6}
          value={text}
          onChange={(event) => {
            currentTextRef.current = event.target.value
            setText(event.target.value)
            if (error) setError(null)
            setTtsError(null)
          }}
          placeholder="Scrie sau lipește aici textul pe care vrei să îl asculți…"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-h-36 w-full resize-y rounded-xl border border-border bg-paper px-4 py-3 text-base leading-relaxed text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        />
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>
            {text.length === 0 ? 'Niciun text adăugat încă.' : `${characterCount} caractere`}
          </span>
          <span className={isOverLimit ? 'font-medium text-danger' : undefined}>
            {characterCount} / {MAX_CHARACTERS}
          </span>
        </div>
        {error ? (
          <p id={errorId} role="alert" className="text-sm font-medium text-danger">
            {error}
          </p>
        ) : null}
        {text.trim() ? (
          <details className="rounded-lg bg-paper/70 px-3 py-2">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-teal">
              Previzualizează textul pregătit
            </summary>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words pb-2 text-sm leading-relaxed text-ink">
              {text}
            </pre>
          </details>
        ) : null}
      </div>
      <ImageUploadControl
        previewUrl={previewUrl}
        status={ocrStatus}
        errorMessage={ocrErrorMessage}
        uploadProgress={uploadProgress}
        onFileSelected={selectFile}
        onRemove={removeImage}
        onStartOcr={startOcr}
      />
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-ink">
          Redare după extragere text
        </legend>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={autoPlayId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2 text-sm font-medium text-ink"
          >
            <input
              id={autoPlayId}
              type="radio"
              name="ocr-playback-mode"
              value="autoplay"
              checked={autoPlayEnabled}
              onChange={() => {
                autoPlayRef.current = true
                setAutoPlayEnabled(true)
              }}
              className="h-4 w-4 accent-teal"
            />
            Autoplay
          </label>
          <label
            htmlFor={manualPlayId}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-paper px-3 py-2 text-sm font-medium text-ink"
          >
            <input
              id={manualPlayId}
              type="radio"
              name="ocr-playback-mode"
              value="manual"
              checked={!autoPlayEnabled}
              onChange={() => {
                autoPlayRef.current = false
                setAutoPlayEnabled(false)
              }}
              className="h-4 w-4 accent-teal"
            />
            Redare manuală
          </label>
        </div>
        <p className="text-xs text-ink-muted">
          {autoPlayEnabled
            ? 'După extragere, textul este transformat și redat automat.'
            : 'După extragere, verifică textul și pornește lectura manual.'}
        </p>
      </fieldset>
      <LanguageSelector
        value={language}
        onChange={(nextLanguage) => {
          languageRef.current = nextLanguage
          setLanguage(nextLanguage)
        }}
      />
      <div className="flex flex-col gap-2">
        <Button
          type="submit"
          variant="primary"
          disabled={
            isSubmitting ||
            audioState.status === 'loading' ||
            isOverLimit ||
            !text.trim() ||
            (showPaywall && !subscriptionActive)
          }
          aria-busy={isSubmitting || audioState.status === 'loading'}
          className="min-h-14 w-full text-lg sm:w-auto"
        >
          <span aria-hidden="true">🔊</span>
          {isSubmitting || audioState.status === 'loading'
            ? 'Generez audio…'
            : showPaywall && !subscriptionActive
              ? 'Abonament necesar pentru a continua'
              : 'Citește cu voce tare'}
        </Button>
        {ttsError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {ttsError}
          </p>
        ) : null}
        <p className="text-xs text-ink-muted">
          Prima lectură reușită este gratuită. După aceea, este necesar un abonament.
        </p>
      </div>
      {audioState.status !== 'idle' ? (
        <section aria-labelledby="audio-heading" className="rounded-2xl bg-teal-soft/60 p-4 sm:p-5">
          <h2 id="audio-heading" className="mb-3 font-display text-xl text-ink">
            Redarea audio
          </h2>
          <AudioPlayer
            state={audioState}
            onToggle={() => void toggle()}
            onSeek={seek}
            onSpeedChange={setPlaybackRate}
          />
        </section>
      ) : null}
    </form>
  )
}
