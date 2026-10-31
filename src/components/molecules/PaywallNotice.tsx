import { useState } from 'react'
import { getAccessToken } from '../../lib/auth/authClient'
import { Button } from '../atoms/Button'

async function openBillingEndpoint(endpoint: '/api/checkout' | '/api/portal') {
  const token = await getAccessToken()
  if (!token) throw new Error('Conectează-te cu emailul de mai sus pentru a continua.')
  const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
  const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null
  if (!response.ok || !payload?.url) throw new Error(payload?.error ?? 'Acțiunea de facturare nu a putut fi inițiată.')
  window.location.assign(payload.url)
}

export function PaywallNotice() {
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (action: 'checkout' | 'portal') => { setLoading(action); setError(null); try { await openBillingEndpoint(action === 'checkout' ? '/api/checkout' : '/api/portal') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Acțiunea nu a putut fi finalizată.') } finally { setLoading(null) } }
  return <section aria-labelledby="paywall-title" className="rounded-xl border border-accent/60 bg-accent/10 p-4"><h2 id="paywall-title" className="font-display text-xl">Lectura gratuită a fost folosită</h2><p className="mt-2 text-sm text-ink-muted">Abonamentul îți oferă lecturi audio nelimitate, în română și engleză, cu procesare securizată pe server. Prețul și intervalul de facturare sunt afișate de Stripe la checkout.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="button" variant="primary" onClick={() => void run('checkout')} disabled={Boolean(loading)}>{loading === 'checkout' ? 'Deschid checkout-ul…' : 'Alege abonamentul'}</Button><Button type="button" variant="secondary" onClick={() => void run('portal')} disabled={Boolean(loading)}>{loading === 'portal' ? 'Deschid portalul…' : 'Administrează abonamentul'}</Button></div>{error ? <p role="alert" className="mt-3 text-sm font-medium text-danger">{error}</p> : null}</section>
}
