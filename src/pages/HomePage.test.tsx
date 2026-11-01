import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: () => new Promise(() => undefined),
      getSession: () => new Promise(() => undefined),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn(),
    },
  },
}))

import HomePage from './HomePage'

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  it('afișează titlul principal și mesajul despre lectura gratuită', () => {
    renderHomePage()

    expect(
      screen.getByRole('heading', { level: 1, name: /ascultă orice text/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/lectură gratuit/i)).toBeInTheDocument()
  })

  it('dezactivează butonul de citire cu voce tare', () => {
    renderHomePage()

    expect(screen.getByRole('button', { name: /citește cu voce tare/i })).toBeDisabled()
  })

  it('actualizează numărul de caractere la introducerea textului', async () => {
    renderHomePage()
    const user = userEvent.setup()
    const textarea = screen.getByLabelText(/textul tău/i)

    await user.type(textarea, 'Salut!')
    await user.clear(textarea)
    await user.click(textarea)
    await user.paste('Text lipit')

    expect(screen.getByText('10 caractere')).toBeInTheDocument()
  })
})
