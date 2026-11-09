import { DataEditor } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { gridColumns } from './grid-config'
import { useSpreadsheetGrid } from './use-spreadsheet-grid'
import { FormulaBar } from './FormulaBar'
import { FormattingToolbar } from './FormattingToolbar'
import { FormulaCellEditorContext } from './formula-cell-editor-context'
import { InlineFormulaEditor } from './InlineFormulaEditor'
import type { SheetSnapshot } from '../spreadsheets/types'
import { useSheetAutosave } from '../spreadsheets/use-sheet-autosave'

export function SpreadsheetGrid({ snapshot, readOnly = false }: { snapshot: SheetSnapshot; readOnly?: boolean }) {
  const { queueChange, retry, status, errorMessage } = useSheetAutosave(snapshot.sheet.id, snapshot.sheet.revision)
  const {
    gridRef, getCellContent, onCellsEdited, drawCell, selection,
    onGridSelectionChange, selected, formulaDraft, beginFormulaEdit,
    changeFormulaDraft, updateFormulaSelection, commitFormula, cancelFormula, applyFormat,
    provideEditor, isOutsideClick, finishCellEdit, formulaCellEditorCallbacks,
    onGridKeyDown, inlineFormulaBounds, formulaCursor,
  } = useSpreadsheetGrid({ initialCells: snapshot.cells, readOnly, onCellChange: queueChange })

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Spreadsheet editor">
      <FormattingToolbar format={selected.format} onChange={applyFormat} disabled={readOnly} />
      <FormulaBar
        address={selected.address}
        draft={formulaDraft}
        onBeginEdit={beginFormulaEdit}
        onChange={changeFormulaDraft}
        onSelectionChange={updateFormulaSelection}
        onCommit={commitFormula}
        onCancel={cancelFormula}
        readOnly={readOnly}
      />
      <div className="min-h-0 flex-1">
      <FormulaCellEditorContext.Provider value={formulaCellEditorCallbacks}>
      <DataEditor
      ref={gridRef}
      width="100%"
      height="100%"
      columns={gridColumns}
      rows={snapshot.sheet.rowCount}
      getCellContent={getCellContent}
      onCellsEdited={onCellsEdited}
      drawCell={drawCell}
      gridSelection={selection}
      onGridSelectionChange={onGridSelectionChange}
      onKeyDown={onGridKeyDown}
      provideEditor={provideEditor}
      isOutsideClick={isOutsideClick}
      onFinishedEditing={finishCellEdit}
      onPaste
      rowMarkers="number"
      smoothScrollX
      smoothScrollY
    />
      </FormulaCellEditorContext.Provider>
      {inlineFormulaBounds !== null && (
        <InlineFormulaEditor
          bounds={inlineFormulaBounds}
          draft={formulaDraft}
          cursor={formulaCursor}
          onChange={changeFormulaDraft}
          onSelectionChange={updateFormulaSelection}
          onCommit={commitFormula}
          onCancel={cancelFormula}
        />
      )}
      </div>
      <div className="flex border-t border-slate-200 bg-slate-50 px-4 py-1 text-xs text-slate-500">
        <span>{snapshot.sheet.name} · Formulas, references, and ranges are supported</span>
        <span className={`ml-auto ${status === 'error' || status === 'conflict' ? 'text-red-600' : ''}`}>
          {readOnly ? 'View only' : status === 'saved' ? 'Saved' : status === 'pending' ? 'Unsaved changes' : status === 'saving' ? 'Saving…' : status === 'conflict' ? 'Save conflict' : 'Save failed'}
          {!readOnly && (status === 'error' || status === 'conflict') && <button className="ml-2 underline" onClick={retry}>Retry</button>}
        </span>
      </div>
      {errorMessage !== null && <p className="border-t border-red-100 bg-red-50 px-4 py-1 text-xs text-red-700" role="alert">{errorMessage} · Your edits are still on this page. Retry before leaving.</p>}
    </section>
  )
}
