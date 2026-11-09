import {
  CompactSelection, GridCellKind,
  type DataEditorProps, type DataEditorRef, type GridCell, type GridSelection, type Item, type Rectangle,
} from '@glideapps/glide-data-grid'
import { addressFromCoordinates } from '@spreadsheet/engine'
import { useCallback, useMemo, useRef, useState } from 'react'
import { createRawCellStore } from './raw-cell-store'
import type { CellFormat } from './cell-format'
import { drawMarkdown } from './draw-markdown'
import { FormulaCellEditor } from './FormulaCellEditor'
import type { CellChange, PersistedCell } from '../spreadsheets/types'
import {
  type FormulaCellEditorCallbacks, type FormulaCellEditorController,
} from './formula-cell-editor-context'

const initialSelection: GridSelection = {
  columns: CompactSelection.empty(), rows: CompactSelection.empty(),
  current: { cell: [0, 0], range: { x: 0, y: 0, width: 1, height: 1 }, rangeStack: [] },
}

function selectionAt(cell: Item): GridSelection {
  return {
    columns: CompactSelection.empty(), rows: CompactSelection.empty(),
    current: { cell, range: { x: cell[0], y: cell[1], width: 1, height: 1 }, rangeStack: [] },
  }
}

function referenceForSelection(selection: GridSelection): string | null {
  const range = selection.current?.range
  if (range === undefined) return null

  const start = addressFromCoordinates(range.x, range.y)
  const end = addressFromCoordinates(range.x + range.width - 1, range.y + range.height - 1)
  if (start === null || end === null) return null
  return start === end ? start : `${start}:${end}`
}

interface SpreadsheetGridOptions {
  initialCells: PersistedCell[]
  readOnly: boolean
  onCellChange(change: CellChange): void
}

export function useSpreadsheetGrid({ initialCells, readOnly, onCellChange }: SpreadsheetGridOptions) {
  const [store] = useState(() => createRawCellStore(initialCells))
  const gridRef = useRef<DataEditorRef>(null)
  const activeCell = useRef<Item>([0, 0])
  const formulaTarget = useRef<Item>([0, 0])
  const formulaEditing = useRef(false)
  const formulaDraftRef = useRef('')
  const formulaSelection = useRef({ start: 0, end: 0 })
  const referenceSpan = useRef<{ start: number; end: number } | null>(null)
  const cellEditorController = useRef<FormulaCellEditorController | null>(null)
  const [selection, setSelection] = useState(initialSelection)
  const [formulaDraft, setFormulaDraft] = useState('')
  const [formulaCursor, setFormulaCursor] = useState(0)
  const [inlineFormulaBounds, setInlineFormulaBounds] = useState<Rectangle | null>(null)
  const [selected, setSelected] = useState(() => ({
    address: 'A1', raw: '', format: store.getFormat([0, 0]),
  }))

  const updateFormulaDraft = useCallback((draft: string) => {
    formulaDraftRef.current = draft
    setFormulaDraft(draft)
  }, [])

  const refreshSelected = useCallback(() => {
    const position = activeCell.current
    setSelected({
      address: `${String.fromCharCode(65 + position[0])}${position[1] + 1}`,
      raw: store.get(position), format: store.getFormat(position),
    })
    if (!formulaEditing.current) updateFormulaDraft(store.get(position))
  }, [store, updateFormulaDraft])

  const onGridSelectionChange = useCallback((next: GridSelection) => {
    if (formulaEditing.current && formulaDraftRef.current.startsWith('=')) {
      const reference = referenceForSelection(next)
      if (reference !== null) {
        if (cellEditorController.current !== null) {
          cellEditorController.current.insertReference(reference)
          setSelection(next)
          return
        }
        const draft = formulaDraftRef.current
        const span = referenceSpan.current ?? formulaSelection.current
        const start = Math.min(span.start, span.end)
        const end = Math.max(span.start, span.end)
        const nextDraft = `${draft.slice(0, start)}${reference}${draft.slice(end)}`
        referenceSpan.current = { start, end: start + reference.length }
        formulaSelection.current = { start: start + reference.length, end: start + reference.length }
        setFormulaCursor(start + reference.length)
        updateFormulaDraft(nextDraft)
        setSelection(next)
        return
      }
    }

    formulaEditing.current = false
    referenceSpan.current = null
    // Formatting controls target the active cell, including during range selection.
    activeCell.current = next.current?.cell ?? activeCell.current
    setSelection(next)
    refreshSelected()
  }, [refreshSelected, updateFormulaDraft])

  const onGridKeyDown = useCallback<NonNullable<DataEditorProps['onKeyDown']>>((event) => {
    if (readOnly) return
    if (event.key !== '=' || event.altKey || event.ctrlKey || event.metaKey || event.bounds === undefined) return
    event.cancel()
    event.preventDefault()
    event.stopPropagation()
    formulaEditing.current = true
    formulaTarget.current = activeCell.current
    formulaSelection.current = { start: 1, end: 1 }
    setFormulaCursor(1)
    referenceSpan.current = null
    updateFormulaDraft('=')
    setInlineFormulaBounds(event.bounds)
  }, [readOnly, updateFormulaDraft])

  const onCellFormulaChange = useCallback((draft: string, selectionStart: number, selectionEnd: number) => {
    if (!formulaEditing.current) {
      formulaEditing.current = true
      formulaTarget.current = activeCell.current
    }
    referenceSpan.current = null
    formulaSelection.current = { start: selectionStart, end: selectionEnd }
    setFormulaCursor(selectionEnd)
    updateFormulaDraft(draft)
  }, [updateFormulaDraft])

  const onCellEditorControllerChange = useCallback((controller: FormulaCellEditorController | null) => {
    cellEditorController.current = controller
  }, [])

  const formulaCellEditorCallbacks = useMemo<FormulaCellEditorCallbacks>(() => ({
    onFormulaChange: onCellFormulaChange,
    onControllerChange: onCellEditorControllerChange,
  }), [onCellFormulaChange, onCellEditorControllerChange])

  const provideEditor = useCallback<NonNullable<DataEditorProps['provideEditor']>>((cell) => {
    if (cell.kind !== GridCellKind.Text) return undefined
    return { editor: FormulaCellEditor, disablePadding: true }
  }, [])

  const isOutsideClick = useCallback<NonNullable<DataEditorProps['isOutsideClick']>>(() => {
    // Glide's editor lives in a portal, and its outside-click listener runs in the
    // capture phase before the grid can turn a click into a cell/range selection.
    // Keep the original editor alive for the whole formula-picking session.
    if (formulaEditing.current && cellEditorController.current !== null) return false
    return true
  }, [])

  const getCellContent = useCallback((position: Item): GridCell => {
    const raw = store.get(position)
    const display = store.getDisplay(position)
    const format = store.getFormat(position)
    return {
      kind: GridCellKind.Text, data: raw, displayData: display.text, allowOverlay: true,
      readonly: readOnly,
      themeOverride: { textDark: display.isError ? '#dc2626' : format.textColor, bgCell: format.backgroundColor },
    }
  }, [store, readOnly])

  const drawCell = useCallback<NonNullable<DataEditorProps['drawCell']>>((args, drawContent) => {
    if (store.getFormat([args.col, args.row]).markdown) {
      drawMarkdown(args, store.get([args.col, args.row]))
    } else drawContent()
  }, [store])

  const onCellsEdited = useCallback<NonNullable<DataEditorProps['onCellsEdited']>>((edits) => {
    if (readOnly) return true
    const changed = new Map<string, { cell: Item }>()
    let activeChanged = false
    for (const { location, value } of edits) {
      if (value.kind === GridCellKind.Text) {
        const changedPositions = store.set(location, value.data)
        onCellChange(store.getChange(location))
        for (const position of changedPositions) changed.set(`${position[0]}:${position[1]}`, { cell: position })
        activeChanged ||= changedPositions.length > 0
          && location[0] === activeCell.current[0] && location[1] === activeCell.current[1]
      }
    }
    if (changed.size) gridRef.current?.updateCells([...changed.values()])
    if (activeChanged) refreshSelected()
    return true
  }, [store, refreshSelected, readOnly, onCellChange])

  const beginFormulaEdit = useCallback(() => {
    if (readOnly) return
    if (formulaEditing.current) return
    formulaEditing.current = true
    formulaTarget.current = activeCell.current
    referenceSpan.current = null
  }, [readOnly])

  const changeFormulaDraft = useCallback((draft: string, selectionStart: number, selectionEnd: number) => {
    if (readOnly) return
    beginFormulaEdit()
    referenceSpan.current = null
    formulaSelection.current = { start: selectionStart, end: selectionEnd }
    setFormulaCursor(selectionEnd)
    updateFormulaDraft(draft)
  }, [beginFormulaEdit, updateFormulaDraft, readOnly])

  const updateFormulaSelection = useCallback((selectionStart: number, selectionEnd: number) => {
    formulaSelection.current = { start: selectionStart, end: selectionEnd }
    setFormulaCursor(selectionEnd)
  }, [])

  const commitFormula = useCallback(() => {
    if (readOnly) return
    const position = formulaEditing.current ? formulaTarget.current : activeCell.current
    const changed = store.set(position, formulaDraftRef.current)
    onCellChange(store.getChange(position))
    if (changed.length) gridRef.current?.updateCells(changed.map((cell) => ({ cell })))
    formulaEditing.current = false
    setInlineFormulaBounds(null)
    referenceSpan.current = null
    activeCell.current = position
    setSelection(selectionAt(position))
    refreshSelected()
    gridRef.current?.focus()
  }, [store, refreshSelected, readOnly, onCellChange])

  const cancelFormula = useCallback(() => {
    const position = formulaEditing.current ? formulaTarget.current : activeCell.current
    formulaEditing.current = false
    setInlineFormulaBounds(null)
    referenceSpan.current = null
    activeCell.current = position
    setSelection(selectionAt(position))
    refreshSelected()
    gridRef.current?.focus()
  }, [refreshSelected])

  const finishCellEdit = useCallback<NonNullable<DataEditorProps['onFinishedEditing']>>(() => {
    const wasFormula = formulaEditing.current
    cellEditorController.current = null
    if (!wasFormula) return
    const position = formulaTarget.current
    formulaEditing.current = false
    setInlineFormulaBounds(null)
    referenceSpan.current = null
    activeCell.current = position
    setSelection(selectionAt(position))
    refreshSelected()
  }, [refreshSelected])

  const applyFormat = useCallback((format: Readonly<CellFormat>) => {
    if (readOnly) return
    store.setFormat(activeCell.current, format)
    onCellChange(store.getChange(activeCell.current))
    gridRef.current?.updateCells([{ cell: activeCell.current }])
    refreshSelected()
  }, [store, refreshSelected, readOnly, onCellChange])

  return {
    gridRef, getCellContent, onCellsEdited, drawCell, selection,
    onGridSelectionChange, selected, formulaDraft, beginFormulaEdit,
    changeFormulaDraft, updateFormulaSelection, commitFormula, cancelFormula, applyFormat,
    provideEditor, isOutsideClick, finishCellEdit, formulaCellEditorCallbacks,
    onGridKeyDown, inlineFormulaBounds, formulaCursor,
  }
}
