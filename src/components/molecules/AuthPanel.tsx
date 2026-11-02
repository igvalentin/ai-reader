import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { isMagicLinkRateLimitError, sendMagicLink } from '../../lib/auth/authClient'
import { AdminNavLink } from './AdminNavLink'
import { Button } from '../atoms/Button'

const RESEND_COOLDOWN_SECONDS = 60

interface AuthPanelProps {
  onUserChange?: (email: string | null) => void
}

export function AuthPanel({ onUserChange }: AuthPanelProps = {}) {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const requestInFlight = useRef(false)
  const coolingDown = cooldownSeconds > 0

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const nextEmail = data.user?.email ?? null
      setUserEmail(nextEmail)
      onUserChange?.(nextEmail)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextEmail = session?.user?.email ?? null
      setUserEmail(nextEmail)
      onUserChange?.(nextEmail)
    })
    return () => data.subscription.unsubscribe()
  }, [onUserChange])

  useEffect(() => {
    if (!coolingDown) return
    const interval = window.setInterval(() => {
      setCooldownSeconds((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [coolingDown])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (requestInFlight.current || loading || coolingDown) return
    if (!email.trim()) {
      setMessage('Introdu adresa de email pentru a primi linkul de conectare.')
      return
    }

    requestInFlight.current = true
    setLoading(true)
    setMessage(null)
    try {
      await sendMagicLink(email.trim())
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
      setMessage(
        'Dacă emailul nu apare, verifică dosarul spam. Poți cere un link nou după expirarea cronometrului.',
      )
    } catch (error) {
      if (isMagicLinkRateLimitError(error)) {
        setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
        setMessage(
          'Supabase limitează temporar trimiterea. Așteaptă cronometrul înainte să retrimiți linkul; verifică și dosarul spam.',
        )
      } else {
        setMessage(
          'Linkul nu a putut fi trimis. Verifică adresa de email și încearcă din nou peste câteva momente.',
        )
      }
    } finally {
      requestInFlight.current = false
      setLoading(false)
    }
  }

  if (userEmail) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <span>
          Autentificat ca <strong>{userEmail}</strong>
        </span>
        <AdminNavLink />
        <Button type="button" variant="ghost" onClick={() => void supabase.auth.signOut()}>
          Deconectează-te
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-lg border border-border bg-surface p-4"
    >
      <p className="mb-3 text-sm text-ink-muted">
        Autentificarea este necesară pentru abonament și pentru a-l putea administra de pe orice
        dispozitiv.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="auth-email" className="sr-only">
          Adresa de email
        </label>
        <input
          id="auth-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@exemplu.ro"
          className="min-w-0 flex-1 rounded-lg border border-border bg-paper px-3 py-2.5 text-ink"
        />
        <Button type="submit" variant="secondary" disabled={loading || coolingDown}>
          {loading
            ? 'Trimit…'
            : coolingDown
              ? `Retrimite în ${cooldownSeconds} s`
              : 'Primește link de conectare'}
        </Button>
      </div>
      {message ? (
        <p role="status" aria-live="polite" className="mt-2 text-sm text-ink-muted">
          {message}
          {coolingDown ? ` Mai așteaptă ${cooldownSeconds} secunde.` : ''}
        </p>
      ) : null}
    </form>
  )
}
