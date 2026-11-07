import {
  DataEditor,
  GridCellKind,
  type GridCell,
  type GridColumn,
  type Item,
} from '@glideapps/glide-data-grid'
import { useCallback } from 'react'

const COLUMN_COUNT = 26
const ROW_COUNT = 1_000

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
  const getCellContent = useCallback((_cell: Item): GridCell => {
    return {
      kind: GridCellKind.Text,
      data: '',
      displayData: '',
      allowOverlay: true,
    }
  }, [])

  return (
    <main className="h-full w-full">
      <DataEditor
        columns={columns}
        rows={ROW_COUNT}
        getCellContent={getCellContent}
        rowMarkers="number"
        smoothScrollX
        smoothScrollY
      />
    </main>
  )
}

export default App
