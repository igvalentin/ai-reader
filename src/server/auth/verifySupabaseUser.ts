import { createClient } from '@supabase/supabase-js'

export class UnauthorizedError extends Error {}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null
  const [scheme, token] = authorizationHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token.trim() || null
}

/**
 * Verifică server-side antetul `Authorization: Bearer <token>` al cererii față de Supabase Auth
 * și returnează identificatorul utilizatorului autentificat. Folosit de endpoint-urile server
 * (ex. `/api/ocr`) pentru a garanta că doar utilizatori autentificați pot iniția procesarea și că
 * rezultatul este livrat exclusiv solicitantului — nu există stocare sau acces partajat între
 * utilizatori.
 */
export async function verifySupabaseUser(authorizationHeader: string | undefined): Promise<string> {
  const token = extractBearerToken(authorizationHeader)
  if (!token) {
    throw new UnauthorizedError('Lipsă token de autentificare.')
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configurare Supabase server-side lipsă (SUPABASE_URL / SUPABASE_ANON_KEY).')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new UnauthorizedError('Sesiune invalidă sau expirată.')
  }

  return data.user.id
}
