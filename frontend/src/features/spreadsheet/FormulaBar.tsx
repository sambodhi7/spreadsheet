import { useState, type FormEvent } from 'react'

interface FormulaBarProps {
  address: string
  raw: string
  onCommit: (raw: string) => void
}

export function FormulaBar({ address, raw, onCommit }: FormulaBarProps) {
  const [draft, setDraft] = useState(raw)

  function commit(event: FormEvent) {
    event.preventDefault()
    onCommit(draft)
  }

  return (
    <form onSubmit={commit} className="flex items-center gap-3 border-b border-slate-200 px-4 py-2">
      <output className="w-14 shrink-0 font-mono text-sm font-semibold">{address}</output>
      <span className="text-slate-400" aria-hidden="true">fx</span>
      <input
        aria-label={`Raw input for ${address}`}
        className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-1.5 font-mono text-sm focus:outline-2 focus:outline-blue-500"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setDraft(raw)
            event.currentTarget.blur()
          }
        }}
        placeholder="Enter text or a formula (calculation engine coming later)"
      />
      <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">Apply</button>
    </form>
  )
}
