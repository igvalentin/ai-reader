import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AuthConfigurationError,
  UnauthorizedError,
  verifySupabaseUser,
} from '../../src/server/auth/verifySupabaseUser.js'
import { EntitlementError } from '../../src/server/entitlement/entitlement.js'
import { getAdminUsers, type AdminCategory } from '../../src/server/admin/adminUsers.js'
import { isAdminUserId } from '../../src/server/admin/adminAccess.js'

const CATEGORIES = new Set<AdminCategory>(['all', 'anonymous', 'registered-unpaid', 'subscribers'])

function queryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ code: 'METHOD_NOT_ALLOWED', error: 'Metodă nepermisă.' })
  }

  try {
    const userId = await verifySupabaseUser(req.headers.authorization)
    if (!isAdminUserId(userId)) {
      return res.status(403).json({
        code: 'ADMIN_REQUIRED',
        error: 'Nu ai permisiunea de a accesa zona de administrare.',
      })
    }
    if (queryValue(req.query.check) === '1') {
      return res.status(200).json({ authorized: true })
    }

    const categoryValue = queryValue(req.query.category) || 'all'
    if (!CATEGORIES.has(categoryValue as AdminCategory)) {
      return res
        .status(400)
        .json({ code: 'INVALID_FILTER', error: 'Filtrul de utilizatori nu este valid.' })
    }
    const pageValue = Number.parseInt(queryValue(req.query.page) || '1', 10)
    const pageSizeValue = Number.parseInt(queryValue(req.query.pageSize) || '50', 10)
    if (
      !Number.isInteger(pageValue) ||
      pageValue < 1 ||
      !Number.isInteger(pageSizeValue) ||
      pageSizeValue < 1
    ) {
      return res
        .status(400)
        .json({ code: 'INVALID_PAGINATION', error: 'Pagina solicitată nu este validă.' })
    }
    const result = await getAdminUsers(
      queryValue(req.query.search).slice(0, 100),
      categoryValue as AdminCategory,
      pageValue,
      Math.min(pageSizeValue, 100),
    )
    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res
        .status(401)
        .json({ code: 'AUTHENTICATION_REQUIRED', error: 'Autentifică-te pentru a continua.' })
    }
    if (error instanceof AuthConfigurationError) {
      return res.status(500).json({
        code: 'AUTH_CONFIGURATION_ERROR',
        error: 'Autentificarea server-side nu este configurată.',
      })
    }
    if (error instanceof EntitlementError) {
      return res.status(500).json({ code: 'ADMIN_DATA_UNAVAILABLE', error: error.message })
    }
    console.error(JSON.stringify({ event: 'admin_users_unexpected_failure' }))
    return res
      .status(500)
      .json({ code: 'INTERNAL_ERROR', error: 'Datele de administrare nu au putut fi încărcate.' })
  }
}
