import type { GridColumn } from '@glideapps/glide-data-grid'

export const GRID_ROWS = 1_000
export const GRID_COLUMNS = 26

// Static props keep Glide's column layout stable across React renders.
export const gridColumns: GridColumn[] = Array.from(
  { length: GRID_COLUMNS },
  (_, column) => {
    const label = String.fromCharCode(65 + column)
    return { id: label, title: label, width: 110 }
  },
)
