import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../auth/auth-context'
import { createWorkbook, listWorkbooks, renameWorkbook } from './spreadsheet-api'
import { openWorkbook } from './routes'
import type { Workbook } from './types'

export function WorkbookLibrary() {
  const { user, logout } = useAuth()
  const [workbooks, setWorkbooks] = useState<Workbook[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void listWorkbooks().then((items) => {
      if (active) setWorkbooks(items)
    }).catch(() => {
      if (active) setError('Your workbooks could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])

  const createNewWorkbook = useCallback(async () => {
    setCreating(true)
    setError(null)
    try {
      const workbook = await createWorkbook('Untitled workbook')
      const firstSheet = workbook.sheets[0]
      if (firstSheet === undefined) throw new Error('Workbook has no initial sheet')
      openWorkbook(workbook.id, firstSheet.id)
    } catch {
      setError('A new workbook could not be created.')
      setCreating(false)
    }
  }, [])

  const updateTitle = useCallback(async (workbookId: string, title: string) => {
    const updated = await renameWorkbook(workbookId, title)
    setWorkbooks((current) => current.map((workbook) => workbook.id === workbookId ? updated : workbook))
  }, [])

  return (
    <main className="min-h-full overflow-y-auto bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-6">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">S</div>
          <h1 className="text-lg font-semibold">Spreadsheet</h1>
          <div className="ml-auto text-sm text-slate-500">{user?.email}</div>
          <button className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100" onClick={() => void logout()}>Sign out</button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Your workbooks</h2>
            <p className="mt-2 text-sm text-slate-500">Open a workbook or rename it directly from this page.</p>
          </div>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            disabled={creating}
            onClick={() => void createNewWorkbook()}
          >{creating ? 'Creating…' : 'New workbook'}</button>
        </div>

        {error !== null && <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {loading ? <LibraryMessage>Loading workbooks…</LibraryMessage>
          : workbooks.length === 0 ? (
            <LibraryMessage>
              <span className="block text-base font-medium text-slate-700">No workbooks yet</span>
              <span className="mt-1 block">Create one to start working.</span>
            </LibraryMessage>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_130px_160px_100px] border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Name</span><span>Sheets</span><span>Last modified</span><span>Access</span>
              </div>
              {workbooks.map((workbook) => (
                <WorkbookRow key={workbook.id} workbook={workbook} onRename={updateTitle} />
              ))}
            </div>
          )}
      </section>
    </main>
  )
}

function WorkbookRow({ workbook, onRename }: { workbook: Workbook; onRename(id: string, title: string): Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(workbook.title)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstSheet = workbook.sheets[0]

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (trimmed.length === 0) return
    setSaving(true)
    setError(null)
    try {
      await onRename(workbook.id, trimmed)
      setEditing(false)
    } catch {
      setError('Rename failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_130px_160px_100px] items-center border-b border-slate-100 px-5 last:border-b-0 hover:bg-slate-50">
      <div className="min-w-0 pr-5">
        {editing ? (
          <form className="flex items-center gap-2" onSubmit={(event) => void submit(event)}>
            <input autoFocus className="min-w-0 flex-1 rounded-md border border-blue-400 px-2.5 py-1.5 text-sm outline-none ring-2 ring-blue-100" value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} />
            <button disabled={saving || title.trim().length === 0} className="text-xs font-medium text-blue-700 disabled:opacity-40">Save</button>
            <button type="button" className="text-xs text-slate-500" onClick={() => { setEditing(false); setTitle(workbook.title) }}>Cancel</button>
          </form>
        ) : (
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="min-w-0 truncate text-left text-sm font-medium text-slate-900 hover:text-blue-700 disabled:text-slate-400"
              disabled={firstSheet === undefined}
              onClick={() => { if (firstSheet !== undefined) openWorkbook(workbook.id, firstSheet.id) }}
            >{workbook.title}</button>
            {workbook.access !== 'viewer' && <button className="shrink-0 text-xs text-slate-400 hover:text-slate-700" onClick={() => setEditing(true)}>Rename</button>}
          </div>
        )}
        {error !== null && <span className="text-xs text-red-600">{error}</span>}
      </div>
      <span className="text-sm text-slate-500">{workbook.sheets.length}</span>
      <span className="text-sm text-slate-500">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(workbook.updatedAt))}</span>
      <span className="text-xs font-medium capitalize text-slate-500">{workbook.access}</span>
    </div>
  )
}

function LibraryMessage({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-500">{children}</div>
}
