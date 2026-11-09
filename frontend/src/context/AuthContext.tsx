import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as auth from '../lib/auth'

export interface AuthState {
  /** true until the first session check completes */
  loading: boolean
  email: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    auth
      .getUserEmail()
      .then((e) => {
        if (active) setEmail(e)
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const signIn = useCallback(async (userEmail: string, password: string) => {
    await auth.signIn(userEmail, password)
    setEmail((await auth.getUserEmail()) ?? userEmail)
  }, [])

  const signOut = useCallback(() => {
    auth.signOut()
    setEmail(null)
  }, [])

  const value = useMemo(
    () => ({ loading, email, signIn, signOut }),
    [loading, email, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export { AuthContext }
