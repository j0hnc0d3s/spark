import { createContext, useContext, useEffect, useState } from 'react'
import { api, token, storedUser } from '../api/client'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Best-effort JWT payload decode (no verification — that's the server's job)
function decodeJwtPayload(t) {
  try {
    const [, payload] = t.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Hydrate from localStorage on mount
  useEffect(() => {
    const t = token.get()
    if (t) {
      const claims = decodeJwtPayload(t) || {}
      const cached = storedUser.get() || {}
      // Token expiry check
      if (claims.exp && Date.now() / 1000 > claims.exp) {
        token.clear()
      } else {
        setUser({
          user_id: cached.user_id || claims.sub || claims.user_id,
          role:    cached.role    || claims.role
        })
      }
    }
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    const data = await api.login(credentials)
    setUser({ user_id: data.user_id, role: data.role })
    return data
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  const value = { user, login, logout, loading }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
