import { createContext, useContext } from 'react'
import type { AuthUser } from './auth-api'

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: AuthUser }

export type AuthContextValue = AuthState & {
  googleSignIn(credential: string): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
