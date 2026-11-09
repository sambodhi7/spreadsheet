import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'
import { SpreadsheetGrid } from '../spreadsheet/SpreadsheetGrid'
import {
  createSheet,
  getSheetSnapshot,
  getWorkbook,
  renameSheet,
  renameWorkbook,
} from './spreadsheet-api'
import { openLibrary, workbookUrl } from './routes'
import type { SheetSnapshot, Workbook } from './types'

export function WorkbookEditor({ workbookId, sheetId }: { workbookId: string; sheetId: string }) {
  const { user, logout } = useAuth()
  const [workbook, setWorkbook] = useState<Workbook | null>(null)
  const [snapshot, setSnapshot] = useState<SheetSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [renamingWorkbook, setRenamingWorkbook] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([getWorkbook(workbookId), getSheetSnapshot(sheetId)]).then(([nextWorkbook, nextSnapshot]) => {
      if (!active) return
      if (nextSnapshot.sheet.id !== sheetId || !nextWorkbook.sheets.some((sheet) => sheet.id === sheetId)) {
        setError('This sheet does not belong to the requested workbook.')
        return
      }
      setWorkbook(nextWorkbook)
      setSnapshot(nextSnapshot)
    }).catch(() => {
      if (active) setError('This workbook could not be loaded.')
    })
    return () => { active = false }
  }, [sheetId, workbookId])

  const handleWorkbookRename = useCallback(async (title: string) => {
    const updated = await renameWorkbook(workbookId, title)
    setWorkbook(updated)
  }, [workbookId])

  const handleSheetRename = useCallback(async (targetSheetId: string, name: string) => {
    const updated = await renameSheet(targetSheetId, name)
    setWorkbook((current) => current === null ? null : {
      ...current,
      sheets: current.sheets.map((sheet) => sheet.id === targetSheetId ? updated : sheet),
    })
    setSnapshot((current) => current?.sheet.id === targetSheetId
      ? { ...current, sheet: updated }
      : current)
  }, [])

  const handleCreateSheet = useCallback(async () => {
    if (workbook === null) return
    try {
      const sheet = await createSheet(workbook.id)
      window.location.assign(workbookUrl(workbook.id, sheet.id))
    } catch {
      setError('A new sheet could not be created.')
    }
  }, [workbook])

  if (error !== null) {
    return (
      <main className="flex h-full items-center justify-center bg-slate-50 p-6">
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
          <button className="mt-5 rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={openLibrary}>Back to workbooks</button>
        </section>
      </main>
    )
  }
  if (workbook === null || snapshot === null) {
    return <main className="flex h-full items-center justify-center bg-slate-50 text-sm text-slate-500">Loading workbook…</main>
  }

  const canEdit = workbook.access !== 'viewer'
  return (
    <main className="flex h-full min-h-0 flex-col bg-white" aria-label="Spreadsheet application">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3">
        <button className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Back to workbooks" onClick={openLibrary}>←</button>
        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 font-semibold text-white">S</div>
        {renamingWorkbook ? (
          <RenameForm
            initialValue={workbook.title}
            maxLength={255}
            onCancel={() => setRenamingWorkbook(false)}
            onSave={async (title) => { await handleWorkbookRename(title); setRenamingWorkbook(false) }}
          />
        ) : (
          <button className="max-w-80 truncate rounded-md px-2 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-100" disabled={!canEdit} onClick={() => setRenamingWorkbook(true)} title={canEdit ? 'Rename workbook' : workbook.title}>{workbook.title}</button>
        )}
        <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium capitalize text-slate-500">{workbook.access}</span>
        <div className="ml-auto text-xs text-slate-500">{user?.email}</div>
        <button className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100" onClick={() => void logout()}>Sign out</button>
      </header>

      <nav className="flex h-10 shrink-0 items-end gap-1 border-b border-slate-200 bg-slate-50 px-2" aria-label="Sheets">
        {workbook.sheets.map((sheet) => (
          <SheetTab
            key={sheet.id}
            workbookId={workbook.id}
            sheetId={sheet.id}
            name={sheet.name}
            active={sheet.id === sheetId}
            editable={canEdit}
            onRename={handleSheetRename}
          />
        ))}
        {canEdit && <button className="mb-1 px-2 text-lg leading-6 text-slate-500 hover:text-slate-900" aria-label="Add sheet" onClick={() => void handleCreateSheet()}>+</button>}
      </nav>

      <div className="min-h-0 flex-1">
        <SpreadsheetGrid key={snapshot.sheet.id} snapshot={snapshot} readOnly={!canEdit} />
      </div>
    </main>
  )
}

function SheetTab({ workbookId, sheetId, name, active, editable, onRename }: {
  workbookId: string
  sheetId: string
  name: string
  active: boolean
  editable: boolean
  onRename(sheetId: string, name: string): Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <div className="mb-0.5 rounded-t-md border border-slate-200 bg-white px-2 py-1">
        <RenameForm initialValue={name} maxLength={100} compact onCancel={() => setEditing(false)} onSave={async (nextName) => { await onRename(sheetId, nextName); setEditing(false) }} />
      </div>
    )
  }
  return (
    <div className={`group flex h-9 items-center rounded-t-md px-1 ${active ? 'border border-b-white border-slate-200 bg-white text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>
      <a className="px-3 text-xs font-medium" href={workbookUrl(workbookId, sheetId)}>{name}</a>
      {editable && <button className="mr-1 hidden text-[10px] text-slate-400 hover:text-slate-800 group-hover:block" aria-label={`Rename ${name}`} onClick={() => setEditing(true)}>✎</button>}
    </div>
  )
}

function RenameForm({ initialValue, maxLength, compact = false, onSave, onCancel }: {
  initialValue: string
  maxLength: number
  compact?: boolean
  onSave(value: string): Promise<void>
  onCancel(): void
}) {
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length === 0) return
    setSaving(true)
    setFailed(false)
    try {
      await onSave(trimmed)
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <form className="flex items-center gap-1.5" onSubmit={(event) => void submit(event)}>
      <input autoFocus className={`${compact ? 'w-28 py-0.5 text-xs' : 'w-72 py-1 text-sm'} rounded border border-blue-400 px-2 outline-none ring-2 ring-blue-100`} value={value} maxLength={maxLength} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') onCancel() }} />
      <button disabled={saving || value.trim().length === 0} className="text-xs font-medium text-blue-700 disabled:opacity-40">{saving ? '…' : 'Save'}</button>
      <button type="button" className="text-xs text-slate-500" onClick={onCancel}>Cancel</button>
      {failed && <span className="text-xs text-red-600">Failed</span>}
    </form>
  )
}
