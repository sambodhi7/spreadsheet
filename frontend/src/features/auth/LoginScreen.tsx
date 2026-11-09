import { useAuth } from './auth-context'
import { GoogleSignInButton } from './GoogleSignInButton'

export function LoginScreen() {
  const { googleSignIn } = useAuth()
  return (
    <main className="flex h-full items-center justify-center bg-slate-100 px-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-200/60">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">S</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Spreadsheet</h1>
        <p className="mb-8 mt-2 text-sm leading-6 text-slate-500">Sign in to create, save, and continue working on your spreadsheets.</p>
        <GoogleSignInButton onCredential={googleSignIn} />
      </section>
    </main>
  )
}
