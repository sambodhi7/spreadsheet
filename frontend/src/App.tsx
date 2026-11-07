import {
  DataEditor,
  GridCellKind,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type Item,
} from '@glideapps/glide-data-grid'
import { useCallback, useRef } from 'react'

const COLUMN_COUNT = 26
const ROW_COUNT = 1_000

function cellKey([column, row]: Item): string {
  return `${column}:${row}`
}

const columns: GridColumn[] = Array.from(
  { length: COLUMN_COUNT },
  (_, index) => {
    const label = String.fromCharCode(65 + index)

    return {
      id: label,
      title: label,
      width: 110,
    }
  },
)

function App() {
  const cells = useRef(new Map<string, string>())

  const getCellContent = useCallback((cell: Item): GridCell => {
    const value = cells.current.get(cellKey(cell)) ?? ''

    return {
      kind: GridCellKind.Text,
      data: value,
      displayData: value,
      allowOverlay: true,
    }
  }, [])

  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell): void => {
      if (newValue.kind !== GridCellKind.Text) {
        return
      }

      const key = cellKey(cell)

      if (newValue.data === '') {
        cells.current.delete(key)
      } else {
        cells.current.set(key, newValue.data)
      }
    },
    [],
  )

  return (
    <main className="h-full w-full">
      <DataEditor
        columns={columns}
        rows={ROW_COUNT}
        getCellContent={getCellContent}
        onCellEdited={onCellEdited}
        onPaste
        rowMarkers="number"
        smoothScrollX
        smoothScrollY
      />
    </main>
  )
}

export default App
