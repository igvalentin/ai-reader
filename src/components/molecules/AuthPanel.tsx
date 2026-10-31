import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { sendMagicLink } from '../../lib/auth/authClient'
import { Button } from '../atoms/Button'

export function AuthPanel() {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const submit = async () => {
    if (!email.trim()) { setMessage('Introdu adresa de email.'); return }
    setLoading(true); setMessage(null)
    try { await sendMagicLink(email.trim()); setMessage('Verifică emailul pentru a confirma autentificarea.') }
    catch { setMessage('Emailul de autentificare nu a putut fi trimis. Încearcă din nou.') }
    finally { setLoading(false) }
  }

  if (userEmail) return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm"><span>Conectat ca <strong>{userEmail}</strong></span><Button type="button" variant="ghost" onClick={() => void supabase.auth.signOut()}>Deconectare</Button></div>
  return <div className="rounded-lg border border-border bg-surface p-4"><p className="mb-3 text-sm text-ink-muted">Autentificarea este necesară doar pentru abonament și pentru a-l putea administra de pe orice dispozitiv.</p><div className="flex flex-col gap-2 sm:flex-row"><label htmlFor="auth-email" className="sr-only">Adresa de email</label><input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplu.ro" className="min-w-0 flex-1 rounded-lg border border-border bg-paper px-3 py-2.5 text-ink" /><Button type="button" variant="secondary" onClick={() => void submit()} disabled={loading}>{loading ? 'Trimit…' : 'Primește link de conectare'}</Button></div>{message ? <p role="status" className="mt-2 text-sm text-ink-muted">{message}</p> : null}</div>
}
