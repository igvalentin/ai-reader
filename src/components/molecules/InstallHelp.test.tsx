import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { InstallHelp } from './InstallHelp'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})

function setUserAgent(userAgent: string) {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

describe('InstallHelp', () => {
  it('shows Safari-specific home-screen instructions on iOS', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    render(<InstallHelp />)

    expect(screen.getByRole('heading', { name: 'Instalează AI Reader' })).toBeInTheDocument()
    expect(screen.getByText(/Deschide AI Reader în Safari/i)).toBeInTheDocument()
    expect(screen.getByText(/În Chrome pe iOS/i)).toBeInTheDocument()
  })

  it('shows Android installation instructions and can be dismissed', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0')
    render(<InstallHelp />)

    expect(screen.getByText(/Deschide meniul browserului/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /închide instrucțiunile/i }))

    expect(screen.queryByRole('heading', { name: 'Instalează AI Reader' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('ai-reader-install-help-dismissed')).toBe('true')
  })

  it('offers the browser install prompt when supported', async () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0')
    const prompt = vi.fn().mockResolvedValue(undefined)
    const installEvent = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: 'accepted'; platform: string }>
    }
    installEvent.prompt = prompt
    installEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })
    render(<InstallHelp />)
    fireEvent(window, installEvent)

    const installButton = await screen.findByRole('button', { name: 'Instalează aplicația' })
    const { act } = await import('@testing-library/react')
    await act(async () => {
      fireEvent.click(installButton)
      await installEvent.userChoice
    })

    expect(prompt).toHaveBeenCalledOnce()
  })
})
