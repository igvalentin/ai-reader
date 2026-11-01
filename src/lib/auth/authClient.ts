import { supabase } from '../supabaseClient'

interface SupabaseAuthFailure {
  readonly code?: unknown
  readonly status?: unknown
  readonly message?: unknown
}

export function isMagicLinkRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const failure = error as SupabaseAuthFailure
  return (
    failure.code === 'over_email_send_rate_limit' ||
    failure.status === 429 ||
    (typeof failure.message === 'string' &&
      /over_email_send_rate_limit|email.*rate.?limit|too many requests/i.test(failure.message))
  )
}

export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
