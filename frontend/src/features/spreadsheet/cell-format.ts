export interface CellFormat {
  textColor: string
  backgroundColor: string
  markdown: boolean
}

export const defaultCellFormat: Readonly<CellFormat> = {
  textColor: '#1e293b',
  backgroundColor: '#ffffff',
  markdown: false,
}
