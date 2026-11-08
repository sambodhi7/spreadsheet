import { evaluateFormula, isSpreadsheetError } from '@spreadsheet/engine'
import { defaultCellFormat, type CellFormat } from './cell-format.ts'

export type CellPosition = readonly [column: number, row: number]

/** Temporary raw inputs only. Formula interpretation belongs to the future engine. */
export function createRawCellStore() {
  const cells = new Map<string, string>()
  const formats = new Map<string, Readonly<CellFormat>>()
  const keyOf = ([column, row]: CellPosition) => `${column}:${row}`

  return {
    getFormat(position: CellPosition): Readonly<CellFormat> {
      return formats.get(keyOf(position)) ?? defaultCellFormat
    },
    setFormat(position: CellPosition, format: Readonly<CellFormat>): void {
      const key = keyOf(position)
      if (format.textColor === defaultCellFormat.textColor &&
          format.backgroundColor === defaultCellFormat.backgroundColor && !format.markdown) {
        formats.delete(key)
      } else {
        formats.set(key, { ...format })
      }
    },
    get(position: CellPosition): string {
      return cells.get(keyOf(position)) ?? ''
    },
    getDisplay(position: CellPosition): { text: string; isError: boolean } {
      const raw = cells.get(keyOf(position)) ?? ''
      if (!raw.startsWith('=')) return { text: raw, isError: false }

      const value = evaluateFormula(raw)
      if (isSpreadsheetError(value)) return { text: value.error, isError: true }
      if (typeof value === 'boolean') return { text: value ? 'TRUE' : 'FALSE', isError: false }
      return { text: String(value), isError: false }
    },
    set(position: CellPosition, raw: string): boolean {
      const key = keyOf(position)
      if ((cells.get(key) ?? '') === raw) return false

      if (raw === '') cells.delete(key)
      else cells.set(key, raw)

      return true
    },
  }
}
