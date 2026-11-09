import { apiRequest, refreshCsrfToken } from '../../lib/api'

export interface AuthUser {
  id: number
  email: string
  first_name: string
  last_name: string
}

export async function getCurrentUser(): Promise<AuthUser> {
  return await apiRequest<AuthUser>('/auth/me/')
}

export async function signInWithGoogle(credential: string): Promise<AuthUser> {
  await refreshCsrfToken()
  const user = await apiRequest<AuthUser>('/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })
  // Django rotates the CSRF token when the authenticated session is created.
  await refreshCsrfToken()
  return user
}

export async function signOut(): Promise<void> {
  await apiRequest('/auth/logout/', { method: 'POST' })
  await refreshCsrfToken()
}
