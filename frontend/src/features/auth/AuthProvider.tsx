import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, refreshCsrfToken } from '../../lib/api'
import { getCurrentUser, signInWithGoogle, signOut } from './auth-api'
import { AuthContext, type AuthContextValue, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        await refreshCsrfToken()
        const user = await getCurrentUser()
        if (active) setState({ status: 'authenticated', user })
      } catch (error) {
        if (active && error instanceof ApiError && [401, 403].includes(error.status)) {
          setState({ status: 'anonymous', user: null })
        } else if (active) {
          setState({ status: 'anonymous', user: null })
        }
      }
    })()
    return () => { active = false }
  }, [])

  const googleSignIn = useCallback(async (credential: string) => {
    const user = await signInWithGoogle(credential)
    setState({ status: 'authenticated', user })
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setState({ status: 'anonymous', user: null })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    ...state, googleSignIn, logout,
  }), [googleSignIn, logout, state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
