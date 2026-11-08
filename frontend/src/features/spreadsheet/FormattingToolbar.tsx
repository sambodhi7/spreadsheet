import { defaultCellFormat, type CellFormat } from './cell-format'

interface FormattingToolbarProps {
  format: Readonly<CellFormat>
  onChange: (format: Readonly<CellFormat>) => void
}

export function FormattingToolbar({ format, onChange }: FormattingToolbarProps) {
  return (
    <div role="group" aria-label="Selected cell formatting" className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm">
      <label className="flex items-center gap-2">Text
        <input type="color" aria-label="Text color" value={format.textColor} onChange={(event) => onChange({ ...format, textColor: event.target.value })} />
      </label>
      <label className="flex items-center gap-2">Fill
        <input type="color" aria-label="Cell background color" value={format.backgroundColor} onChange={(event) => onChange({ ...format, backgroundColor: event.target.value })} />
      </label>
      <button type="button" aria-pressed={format.markdown} onClick={() => onChange({ ...format, markdown: !format.markdown })} className={`rounded border px-3 py-1 ${format.markdown ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-300'}`}>
        Markdown
      </button>
      <button type="button" onClick={() => onChange(defaultCellFormat)} className="rounded border border-slate-300 px-3 py-1">Clear formatting</button>
      <span className="text-xs text-slate-500">Markdown: **bold**, *italic*, `code` · Selected cell only</span>
    </div>
  )
}
