import type { FormEvent, SyntheticEvent } from 'react'

interface FormulaBarProps {
  address: string
  draft: string
  onBeginEdit: () => void
  onChange: (draft: string, selectionStart: number, selectionEnd: number) => void
  onSelectionChange: (selectionStart: number, selectionEnd: number) => void
  onCommit: () => void
  onCancel: () => void
}

export function FormulaBar({
  address, draft, onBeginEdit, onChange, onSelectionChange, onCommit, onCancel,
}: FormulaBarProps) {
  function commit(event: FormEvent) {
    event.preventDefault()
    onCommit()
  }

  function reportSelection(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget
    onSelectionChange(input.selectionStart ?? draft.length, input.selectionEnd ?? draft.length)
  }

  return (
    <form onSubmit={commit} className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
      <output className="w-14 shrink-0 font-mono text-sm font-semibold">{address}</output>
      <span className="text-slate-400" aria-hidden="true">fx</span>
      <input
        aria-label={`Raw input for ${address}`}
        className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-1.5 font-mono text-sm focus:outline-2 focus:outline-blue-500"
        value={draft}
        onFocus={(event) => {
          onBeginEdit()
          reportSelection(event)
        }}
        onSelect={reportSelection}
        onChange={(event) => {
          const input = event.currentTarget
          onChange(input.value, input.selectionStart ?? input.value.length, input.selectionEnd ?? input.value.length)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
            event.currentTarget.blur()
          }
        }}
        placeholder="Enter a value or formula, e.g. =SUM(A1:A10)"
      />
      <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">Apply</button>
    </form>
  )
}
