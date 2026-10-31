import { useCallback, useEffect, useRef, useState } from 'react'

export interface AudioPlayerState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  currentTime: number
  duration: number
  playing: boolean
}

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [state, setState] = useState<AudioPlayerState>({
    status: 'idle',
    error: null,
    currentTime: 0,
    duration: 0,
    playing: false,
  })

  useEffect(
    () => () => {
      audioRef.current?.pause()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    [],
  )

  const loadChunks = useCallback(
    async (chunks: string[], contentType: 'audio/mpeg' = 'audio/mpeg') => {
      setState((current) => ({
        ...current,
        status: 'loading',
        error: null,
        playing: false,
        currentTime: 0,
        duration: 0,
      }))
      try {
        const decodedChunks = chunks.map((chunk) =>
          Uint8Array.from(atob(chunk), (character) => character.charCodeAt(0)),
        )
        const totalLength = decodedChunks.reduce((total, chunk) => total + chunk.length, 0)
        const bytes = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of decodedChunks) {
          bytes.set(chunk, offset)
          offset += chunk.length
        }
        const url = URL.createObjectURL(new Blob([bytes], { type: contentType }))
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = url
        const audio = audioRef.current ?? new Audio()
        audioRef.current = audio
        audio.src = url
        audio.load()
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve()
          audio.onerror = () => reject(new Error('Fișierul audio nu a putut fi încărcat.'))
        })
        setState((current) => ({
          ...current,
          status: 'ready',
          duration: Number.isFinite(audio.duration) ? audio.duration : 0,
        }))
        await audio.play()
        setState((current) => ({ ...current, playing: true }))
      } catch (error) {
        setState((current) => ({
          ...current,
          status: 'error',
          error: error instanceof Error ? error.message : 'Redarea audio a eșuat.',
        }))
      }
    },
    [],
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const update = () =>
      setState((current) => ({
        ...current,
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : current.duration,
        playing: !audio.paused,
      }))
    const ended = () =>
      setState((current) => ({ ...current, playing: false, currentTime: audio.duration }))
    audio.addEventListener('timeupdate', update)
    audio.addEventListener('play', update)
    audio.addEventListener('pause', update)
    audio.addEventListener('ended', ended)
    return () => {
      audio.removeEventListener('timeupdate', update)
      audio.removeEventListener('play', update)
      audio.removeEventListener('pause', update)
      audio.removeEventListener('ended', ended)
    }
  }, [state.status])

  const toggle = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      if (audio.paused) await audio.play()
      else audio.pause()
    } catch (error) {
      setState((current) => ({
        ...current,
        status: 'error',
        playing: false,
        error: error instanceof Error ? error.message : 'Redarea audio a eșuat.',
      }))
    }
  }, [])
  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time
  }, [])
  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [])
  return { state, loadChunks, toggle, seek, setPlaybackRate }
}
