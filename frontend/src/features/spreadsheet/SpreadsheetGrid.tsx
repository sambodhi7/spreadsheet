import { DataEditor } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { gridColumns, GRID_ROWS } from './grid-config'
import { useSpreadsheetGrid } from './use-spreadsheet-grid'
import { FormulaBar } from './FormulaBar'
import { FormattingToolbar } from './FormattingToolbar'

export function SpreadsheetGrid() {
  const {
    gridRef, getCellContent, onCellsEdited, drawCell, selection,
    onGridSelectionChange, selected, commitRaw, applyFormat,
  } = useSpreadsheetGrid()

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Spreadsheet editor">
      <FormattingToolbar format={selected.format} onChange={applyFormat} />
      <FormulaBar key={`${selected.address}:${selected.raw}`} address={selected.address} raw={selected.raw} onCommit={commitRaw} />
      <div className="min-h-0 flex-1">
      <DataEditor
      ref={gridRef}
      width="100%"
      height="100%"
      columns={gridColumns}
      rows={GRID_ROWS}
      getCellContent={getCellContent}
      onCellsEdited={onCellsEdited}
      drawCell={drawCell}
      gridSelection={selection}
      onGridSelectionChange={onGridSelectionChange}
      onPaste
      rowMarkers="number"
      smoothScrollX
      smoothScrollY
    />
      </div>
      <p className="border-t border-slate-200 bg-slate-50 px-4 py-1 text-xs text-slate-500">Temporary sheet · Refresh clears cells and formatting · Basic arithmetic formulas are supported</p>
    </section>
  )
}
