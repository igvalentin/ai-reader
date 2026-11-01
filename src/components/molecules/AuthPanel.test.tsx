import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({
  sendMagicLink: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
    },
  },
}))

vi.mock('../../lib/auth/authClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/auth/authClient')>()
  return { ...actual, sendMagicLink: mocks.sendMagicLink }
})

import { AuthPanel } from './AuthPanel'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  mocks.sendMagicLink.mockReset().mockResolvedValue(undefined)
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: null } })
  mocks.onAuthStateChange
    .mockReset()
    .mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } })
  mocks.signOut.mockReset().mockResolvedValue({ error: null })
})

describe('AuthPanel magic-link flow', () => {
  it('sends at most one OTP for repeated form submissions and starts a resend cooldown', async () => {
    let resolveRequest: (() => void) | undefined
    mocks.sendMagicLink.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve
        }),
    )
    render(<AuthPanel />)
    const email = screen.getByLabelText('Adresa de email')
    await userEvent.setup().type(email, 'reader@example.com')
    const form = screen.getByRole('button', { name: 'Primește link de conectare' }).closest('form')

    expect(form).not.toBeNull()
    fireEvent.submit(form!)
    fireEvent.submit(form!)

    expect(mocks.sendMagicLink).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button')).toBeDisabled()
    resolveRequest?.()

    expect(await screen.findByRole('status')).toHaveTextContent('verifică dosarul spam')
    expect(email).toHaveValue('reader@example.com')
    expect(screen.getByRole('button')).toHaveAccessibleName(/Retrimite în/)
  })

  it('shows a specific rate-limit message, retains the email, and does not retry automatically', async () => {
    const rateLimitError = Object.assign(new Error('Email rate limit exceeded'), {
      code: 'over_email_send_rate_limit',
      status: 429,
    })
    mocks.sendMagicLink.mockRejectedValueOnce(rateLimitError)
    const user = userEvent.setup()
    render(<AuthPanel />)
    const email = screen.getByLabelText('Adresa de email')

    await user.type(email, 'reader@example.com')
    await user.click(screen.getByRole('button', { name: 'Primește link de conectare' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Supabase limitează temporar trimiterea',
    )
    expect(screen.getByRole('button')).toBeDisabled()
    expect(email).toHaveValue('reader@example.com')
    expect(mocks.sendMagicLink).toHaveBeenCalledTimes(1)
  })
})
