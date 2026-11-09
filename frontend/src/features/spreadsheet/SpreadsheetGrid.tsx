import { DataEditor } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { gridColumns, GRID_ROWS } from './grid-config'
import { useSpreadsheetGrid } from './use-spreadsheet-grid'
import { FormulaBar } from './FormulaBar'
import { FormattingToolbar } from './FormattingToolbar'
import { FormulaCellEditorContext } from './formula-cell-editor-context'
import { InlineFormulaEditor } from './InlineFormulaEditor'

export function SpreadsheetGrid() {
  const {
    gridRef, getCellContent, onCellsEdited, drawCell, selection,
    onGridSelectionChange, selected, formulaDraft, beginFormulaEdit,
    changeFormulaDraft, updateFormulaSelection, commitFormula, cancelFormula, applyFormat,
    provideEditor, isOutsideClick, finishCellEdit, formulaCellEditorCallbacks,
    onGridKeyDown, inlineFormulaBounds, formulaCursor,
  } = useSpreadsheetGrid()

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Spreadsheet editor">
      <FormattingToolbar format={selected.format} onChange={applyFormat} />
      <FormulaBar
        address={selected.address}
        draft={formulaDraft}
        onBeginEdit={beginFormulaEdit}
        onChange={changeFormulaDraft}
        onSelectionChange={updateFormulaSelection}
        onCommit={commitFormula}
        onCancel={cancelFormula}
      />
      <div className="min-h-0 flex-1">
      <FormulaCellEditorContext.Provider value={formulaCellEditorCallbacks}>
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
      <p className="border-t border-slate-200 bg-slate-50 px-4 py-1 text-xs text-slate-500">Temporary sheet · Refresh clears cells and formatting · Formulas, references, and ranges are supported</p>
    </section>
  )
}
