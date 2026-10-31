import { useId } from 'react'
import type { AudioPlayerState } from '../../lib/tts/useAudioPlayer'

interface AudioPlayerProps { state: AudioPlayerState; onToggle: () => void; onSeek: (time: number) => void; onSpeedChange: (rate: number) => void }
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`

export function AudioPlayer({ state, onToggle, onSeek, onSpeedChange }: AudioPlayerProps) {
  const progressId = useId()
  const disabled = state.status !== 'ready'
  return <div role="group" aria-label="Player audio" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
    <div className="flex items-center gap-3">
      <button type="button" onClick={onToggle} disabled={disabled} aria-label={state.playing ? 'Pune pe pauză' : 'Redă lectura'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal text-white disabled:cursor-not-allowed disabled:opacity-40">{state.playing ? '❚❚' : '▶'}</button>
      <label htmlFor={progressId} className="sr-only">Progres lectură</label>
      <input id={progressId} type="range" min="0" max={state.duration || 0} step="0.1" value={Math.min(state.currentTime, state.duration || 0)} disabled={disabled} onChange={(event) => onSeek(Number(event.target.value))} className="min-w-0 flex-1 accent-teal" />
      <span className="shrink-0 text-xs tabular-nums text-ink-muted">{formatTime(state.currentTime)} / {formatTime(state.duration)}</span>
    </div>
    <div className="flex items-center justify-between gap-3 text-sm text-ink-muted"><label htmlFor={`${progressId}-speed`}>Viteză</label><select id={`${progressId}-speed`} defaultValue="1" disabled={disabled} onChange={(event) => onSpeedChange(Number(event.target.value))} className="rounded border border-border bg-surface px-2 py-1 text-ink"><option value="0.75">0,75×</option><option value="1">1×</option><option value="1.25">1,25×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></div>
    {state.status === 'loading' ? <p role="status" className="text-sm text-ink-muted">Generez audio…</p> : null}
    {state.error ? <p role="alert" className="text-sm font-medium text-danger">{state.error}</p> : null}
  </div>
}
