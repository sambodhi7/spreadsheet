import {
  GridCellKind,
  type DataEditorProps,
  type DataEditorRef,
  type GridCell,
  type Item,
} from '@glideapps/glide-data-grid'
import { useCallback, useRef, useState } from 'react'
import { createRawCellStore } from './raw-cell-store'

export function useSpreadsheetGrid() {
  const [store] = useState(createRawCellStore)
  const gridRef = useRef<DataEditorRef>(null)

  const getCellContent = useCallback((position: Item): GridCell => {
    const raw = store.get(position)
    return {
      kind: GridCellKind.Text,
      data: raw,
      displayData: raw,
      allowOverlay: true,
    }
  }, [store])

  const onCellsEdited = useCallback<NonNullable<DataEditorProps['onCellsEdited']>>(
    (edits) => {
      const changed: { cell: Item }[] = []
      for (const { location, value } of edits) {
        if (value.kind === GridCellKind.Text && store.set(location, value.data)) {
          changed.push({ cell: location })
        }
      }

      // Commit synchronously before Glide rereads data. Repaint only changed cells;
      // typing, deletion and paste share this path without rerendering the React tree.
      if (changed.length > 0) gridRef.current?.updateCells(changed)
      return true
    },
    [store],
  )

  return { gridRef, getCellContent, onCellsEdited }
}
