import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAudioPlayer } from './useAudioPlayer'

const audioInstances: FakeAudio[] = []

class FakeAudio extends EventTarget {
  currentTime = 0
  duration = 12
  paused = true
  playbackRate = 1
  src = ''
  failNextPlay = false
  onloadedmetadata: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor() {
    super()
    audioInstances.push(this)
  }

  load() {
    queueMicrotask(() => this.onloadedmetadata?.())
  }

  async play() {
    if (this.failNextPlay) {
      this.failNextPlay = false
      throw new Error('Playback was blocked.')
    }
    this.paused = false
    this.dispatchEvent(new Event('play'))
  }

  pause() {
    this.paused = true
    this.dispatchEvent(new Event('pause'))
  }
}

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

afterEach(() => {
  audioInstances.length = 0
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: originalCreateObjectURL,
    })
  } else {
    Reflect.deleteProperty(URL, 'createObjectURL')
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: originalRevokeObjectURL,
    })
  } else {
    Reflect.deleteProperty(URL, 'revokeObjectURL')
  }
})

function prepareAudio() {
  vi.stubGlobal('Audio', FakeAudio)
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:reader-audio'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
}

describe('useAudioPlayer', () => {
  it('loads generated audio, plays it, pauses it, and revokes its object URL on unmount', async () => {
    prepareAudio()
    const { result, unmount } = renderHook(() => useAudioPlayer())

    await act(async () => result.current.loadChunks(['QQ==']))

    expect(result.current.state).toMatchObject({ status: 'ready', playing: true, duration: 12 })
    expect(audioInstances[0].src).toBe('blob:reader-audio')

    await act(async () => result.current.toggle())
    expect(audioInstances[0].paused).toBe(true)

    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:reader-audio')
  })

  it('surfaces playback errors rather than leaving an unhandled rejected play promise', async () => {
    prepareAudio()
    const { result } = renderHook(() => useAudioPlayer())
    await act(async () => result.current.loadChunks(['QQ==']))
    await act(async () => result.current.toggle())
    audioInstances[0].failNextPlay = true

    await act(async () => result.current.toggle())

    expect(result.current.state).toMatchObject({
      status: 'error',
      playing: false,
      error: 'Playback was blocked.',
    })
  })
})
