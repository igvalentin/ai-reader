import { useCallback, useId, useState, type FormEvent } from 'react'
import { requestSpeech } from '../../lib/tts/ttsClient'
import { useAudioPlayer } from '../../lib/tts/useAudioPlayer'
import { Button } from '../atoms/Button'
import { AudioPlayer } from '../molecules/AudioPlayer'
import { FreeTrialNotice } from '../molecules/FreeTrialNotice'
import { ImageUploadControl } from '../molecules/ImageUploadControl'
import { LanguageSelector } from '../molecules/LanguageSelector'
import { useImageOcr } from '../../lib/image/useImageOcr'

const MAX_CHARACTERS = 4000

export function ReaderCard() {
  const [text, setText] = useState('')
  const [language, setLanguage] = useState('auto')
  const [error, setError] = useState<string | null>(null)
  const textareaId = useId()
  const errorId = useId()
  const { state: audioState, loadChunks, toggle, seek, setPlaybackRate } = useAudioPlayer()

  const handleTextExtracted = useCallback((extractedText: string) => {
    setText((current) => current.trim() ? `${current.trim()}\n\n${extractedText}` : extractedText)
    setError(null)
  }, [])
  const { previewUrl, status: ocrStatus, errorMessage: ocrErrorMessage, uploadProgress, selectFile, removeImage, startOcr } = useImageOcr({ onTextExtracted: handleTextExtracted })
  const characterCount = text.length
  const isOverLimit = characterCount > MAX_CHARACTERS

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!text.trim()) { setError('Adaugă un text sau o imagine pentru a începe lectura.'); return }
    if (isOverLimit) { setError(`Textul depășește limita de ${MAX_CHARACTERS} de caractere.`); return }
    setError(null)
    try { const response = await requestSpeech(text, language === 'auto' ? '' : language); await loadChunks(response.chunks) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Generarea audio a eșuat.') }
  }

  return <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
    <FreeTrialNotice />
    <div className="flex flex-col gap-1.5">
      <label htmlFor={textareaId} className="text-sm font-medium text-ink">Textul tău</label>
      <textarea id={textareaId} name="text" rows={8} value={text} onChange={(event) => { setText(event.target.value); if (error) setError(null) }} placeholder="Scrie sau lipește aici textul pe care vrei să îl asculți…" aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="min-h-40 w-full resize-y rounded-lg border border-border bg-paper px-3 py-2.5 text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal" />
      <div className="flex items-center justify-between text-xs text-ink-muted"><span>{text.length === 0 ? 'Niciun text adăugat încă.' : `${characterCount} caractere`}</span><span className={isOverLimit ? 'font-medium text-danger' : undefined}>{characterCount} / {MAX_CHARACTERS}</span></div>
      {error ? <p id={errorId} role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
    <ImageUploadControl previewUrl={previewUrl} status={ocrStatus} errorMessage={ocrErrorMessage} uploadProgress={uploadProgress} onFileSelected={selectFile} onRemove={removeImage} onStartOcr={startOcr} />
    <LanguageSelector value={language} onChange={setLanguage} />
    <div className="flex flex-col gap-2"><Button type="submit" variant="primary" disabled={audioState.status === 'loading' || isOverLimit || !text.trim()} className="w-full sm:w-auto"><span aria-hidden="true">🔊</span>{audioState.status === 'loading' ? 'Generez audio…' : 'Citește cu voce tare'}</Button><p className="text-xs text-ink-muted">Textul este procesat securizat pe server; cheia furnizorului nu ajunge în browser.</p></div>
    <AudioPlayer state={audioState} onToggle={() => void toggle()} onSeek={seek} onSpeedChange={setPlaybackRate} />
  </form>
}
