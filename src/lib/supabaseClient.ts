import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_EXTERNAL_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Configurare Supabase lipsă. Verifică variabilele VITE_EXTERNAL_SUPABASE_URL și ' +
      'VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY din fișierul .env.',
  )
}

/**
 * Client Supabase pentru browser, folosind exclusiv cheia publică (anon/publishable).
 * Nu adăuga niciodată aici cheia service-role — aceasta trebuie să rămână doar pe server.
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
