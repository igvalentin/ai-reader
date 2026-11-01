import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mocks = vi.hoisted(() => ({ getAccessToken: vi.fn() }))

vi.mock('../lib/auth/authClient', () => ({ getAccessToken: mocks.getAccessToken }))
vi.mock('../components/templates/MainScreenLayout', () => ({
  MainScreenLayout: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}))

import AdminUsersPage from './AdminUsersPage'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AdminUsersPage', () => {
  it('shows summary data and opens a user detail view from the protected admin response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        rows: [
          {
            id: 'user-123',
            userId: 'user-123',
            category: 'subscribers',
            email: 'paid@example.com',
            anonymousId: null,
            firstSeen: '2026-10-01T10:00:00.000Z',
            lastActivity: '2026-10-31T10:00:00.000Z',
            ocrAttempts: 3,
            audioAttempts: 4,
            successfulAudioGenerations: 3,
            freeReadingConsumed: true,
            planId: '30-days',
            subscriptionStatus: 'active',
            subscriptionStart: '2026-10-31T10:00:00.000Z',
            subscriptionExpiry: '2026-11-30T10:00:00.000Z',
            providerCustomerId: 'cus_admin_only',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
        summary: { anonymousVisitors: 8, registeredUnpaid: 5, subscribers: 1 },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    mocks.getAccessToken.mockReset().mockResolvedValue('admin-token')
    const user = userEvent.setup()
    render(<AdminUsersPage />)

    expect(await screen.findByText('paid@example.com')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Deschide' }))
    expect(screen.getByText('cus_admin_only')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users?'),
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
    )
  })
})
