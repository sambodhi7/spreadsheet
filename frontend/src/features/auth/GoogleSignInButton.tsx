import { useEffect, useRef, useState } from 'react'

let scriptPromise: Promise<void> | null = null

function loadGoogleIdentity(): Promise<void> {
  if (window.google !== undefined) return Promise.resolve()
  if (scriptPromise !== null) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]')
    if (existing !== null) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google sign-in failed to load')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google sign-in failed to load'))
    document.head.append(script)
  })
  return scriptPromise
}

export function GoogleSignInButton({ onCredential }: { onCredential(credential: string): Promise<void> }) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const configurationError = typeof clientId !== 'string' || clientId.length === 0
    ? 'Google client ID is not configured.'
    : null

  useEffect(() => {
    let active = true
    if (configurationError !== null) return
    void loadGoogleIdentity().then(() => {
      if (!active || buttonRef.current === null || window.google === undefined) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          void onCredential(credential).catch(() => {
            if (active) setError('Google sign-in could not be completed.')
          })
        },
      })
      buttonRef.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with',
        shape: 'rectangular', width: 320,
      })
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Google sign-in failed to load')
    })
    return () => { active = false }
  }, [clientId, configurationError, onCredential])

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={buttonRef} className="min-h-11" />
      {(error ?? configurationError) !== null && <p className="text-sm text-red-600" role="alert">{error ?? configurationError}</p>}
    </div>
  )
}
