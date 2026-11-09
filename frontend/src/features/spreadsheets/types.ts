export interface SheetSummary {
  id: string
  name: string
  position: number
  rowCount: number
  columnCount: number
  revision: number
  createdAt: string
  updatedAt: string
}

export interface Workbook {
  id: string
  title: string
  revision: number
  access: 'owner' | 'editor' | 'viewer'
  sheets: SheetSummary[]
  createdAt: string
  updatedAt: string
}

export interface PersistedCellFormat {
  textColor: string
  backgroundColor: string
  markdown: boolean
}

export interface PersistedCell {
  row: number
  column: number
  raw: string
  format: PersistedCellFormat
}

export interface SheetSnapshot {
  sheet: SheetSummary
  cells: PersistedCell[]
}

export interface CellChange extends PersistedCell {}
