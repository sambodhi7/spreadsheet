import {
  CompactSelection, GridCellKind,
  type DataEditorProps, type DataEditorRef, type GridCell, type GridSelection, type Item,
} from '@glideapps/glide-data-grid'
import { useCallback, useRef, useState } from 'react'
import { createRawCellStore } from './raw-cell-store'
import type { CellFormat } from './cell-format'
import { drawMarkdown } from './draw-markdown'

const initialSelection: GridSelection = {
  columns: CompactSelection.empty(), rows: CompactSelection.empty(),
  current: { cell: [0, 0], range: { x: 0, y: 0, width: 1, height: 1 }, rangeStack: [] },
}

export function useSpreadsheetGrid() {
  const [store] = useState(createRawCellStore)
  const gridRef = useRef<DataEditorRef>(null)
  const activeCell = useRef<Item>([0, 0])
  const [selection, setSelection] = useState(initialSelection)
  const [selected, setSelected] = useState(() => ({
    address: 'A1', raw: '', format: store.getFormat([0, 0]),
  }))

  const refreshSelected = useCallback(() => {
    const position = activeCell.current
    setSelected({
      address: `${String.fromCharCode(65 + position[0])}${position[1] + 1}`,
      raw: store.get(position), format: store.getFormat(position),
    })
  }, [store])

  const onGridSelectionChange = useCallback((next: GridSelection) => {
    // Formatting controls target the active cell, including during range selection.
    activeCell.current = next.current?.cell ?? activeCell.current
    setSelection(next)
    refreshSelected()
  }, [refreshSelected])

  const getCellContent = useCallback((position: Item): GridCell => {
    const raw = store.get(position)
    const display = store.getDisplay(position)
    const format = store.getFormat(position)
    return {
      kind: GridCellKind.Text, data: raw, displayData: display.text, allowOverlay: true,
      themeOverride: { textDark: display.isError ? '#dc2626' : format.textColor, bgCell: format.backgroundColor },
    }
  }, [store])

  const drawCell = useCallback<NonNullable<DataEditorProps['drawCell']>>((args, drawContent) => {
    if (store.getFormat([args.col, args.row]).markdown) {
      drawMarkdown(args, store.get([args.col, args.row]))
    } else drawContent()
  }, [store])

  const onCellsEdited = useCallback<NonNullable<DataEditorProps['onCellsEdited']>>((edits) => {
    const changed: { cell: Item }[] = []
    let activeChanged = false
    for (const { location, value } of edits) {
      if (value.kind === GridCellKind.Text && store.set(location, value.data)) {
        changed.push({ cell: location })
        activeChanged ||= location[0] === activeCell.current[0] && location[1] === activeCell.current[1]
      }
    }
    if (changed.length) gridRef.current?.updateCells(changed)
    if (activeChanged) refreshSelected()
    return true
  }, [store, refreshSelected])

  const commitRaw = useCallback((raw: string) => {
    const position = activeCell.current
    if (store.set(position, raw)) gridRef.current?.updateCells([{ cell: position }])
    refreshSelected()
    gridRef.current?.focus()
  }, [store, refreshSelected])

  const applyFormat = useCallback((format: Readonly<CellFormat>) => {
    store.setFormat(activeCell.current, format)
    gridRef.current?.updateCells([{ cell: activeCell.current }])
    refreshSelected()
  }, [store, refreshSelected])

  return {
    gridRef, getCellContent, onCellsEdited, drawCell, selection,
    onGridSelectionChange, selected, commitRaw, applyFormat,
  }
}
