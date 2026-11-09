import { useAuth } from './features/auth/auth-context'
import { LoginScreen } from './features/auth/LoginScreen'
import { currentRoute } from './features/spreadsheets/routes'
import { WorkbookEditor } from './features/spreadsheets/WorkbookEditor'
import { WorkbookLibrary } from './features/spreadsheets/WorkbookLibrary'

export default function App() {
  const auth = useAuth()
  if (auth.status === 'loading') {
    return <main className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">Loading…</main>
  }
  if (auth.status === 'anonymous') return <LoginScreen />
  const route = currentRoute()
  if (route.page === 'library') return <WorkbookLibrary />
  if (route.page === 'editor') {
    return <WorkbookEditor workbookId={route.workbookId} sheetId={route.sheetId} />
  }
  return (
    <main className="flex h-full items-center justify-center bg-slate-50">
      <section className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <a className="mt-4 inline-block text-sm font-medium text-blue-700" href="/workbooks">Go to your workbooks</a>
      </section>
    </main>
  )
}
