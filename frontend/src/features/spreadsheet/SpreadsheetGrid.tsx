import { DataEditor } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { gridColumns, GRID_ROWS } from './grid-config'
import { useSpreadsheetGrid } from './use-spreadsheet-grid'

export function SpreadsheetGrid() {
  const { gridRef, getCellContent, onCellsEdited } = useSpreadsheetGrid()

  return (
    <DataEditor
      ref={gridRef}
      width="100%"
      height="100%"
      columns={gridColumns}
      rows={GRID_ROWS}
      getCellContent={getCellContent}
      onCellsEdited={onCellsEdited}
      onPaste
      rowMarkers="number"
      smoothScrollX
      smoothScrollY
    />
  )
}
