import { useEffect, useState } from 'react'
import { getAccessToken } from '../../lib/auth/authClient'

export function AdminNavLink() {
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    let active = true
    void getAccessToken()
      .then(async (token) => {
        if (!token) return false
        const response = await fetch('/api/admin/users?check=1', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        return response.ok
      })
      .then((isAuthorized) => {
        if (active) setAuthorized(isAuthorized)
      })
      .catch(() => {
        if (active) setAuthorized(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (!authorized) return null
  return (
    <a
      href="/admin"
      className="rounded px-2 py-1 text-sm font-medium text-teal underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
    >
      Administrare
    </a>
  )
}
