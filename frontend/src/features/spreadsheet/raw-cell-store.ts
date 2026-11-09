import {
  addressFromCoordinates,
  isSpreadsheetError,
  parseCellAddress,
  SpreadsheetEngine,
} from '@spreadsheet/engine'
import { defaultCellFormat, type CellFormat } from './cell-format.ts'
import type { CellChange, PersistedCell } from '../spreadsheets/types.ts'

export type CellPosition = readonly [column: number, row: number]

export function createRawCellStore(initialCells: PersistedCell[] = []) {
  const engine = new SpreadsheetEngine()
  const formats = new Map<string, Readonly<CellFormat>>()
  const keyOf = ([column, row]: CellPosition) => `${column}:${row}`
  const addressOf = ([column, row]: CellPosition) => {
    const address = addressFromCoordinates(column, row)
    if (address === null) throw new RangeError(`Invalid grid position: ${column},${row}`)
    return address
  }
  const positionOf = (address: string): CellPosition | null => {
    const parsed = parseCellAddress(address)
    return parsed.ok ? [parsed.value.column, parsed.value.row] : null
  }

  for (const cell of initialCells) {
    const position: CellPosition = [cell.column, cell.row]
    engine.setCell(addressOf(position), cell.raw)
    if (cell.format.textColor !== defaultCellFormat.textColor ||
        cell.format.backgroundColor !== defaultCellFormat.backgroundColor || cell.format.markdown) {
      formats.set(keyOf(position), { ...cell.format })
    }
  }

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
      return engine.getRaw(addressOf(position))
    },
    getDisplay(position: CellPosition): { text: string; isError: boolean } {
      const value = engine.getValue(addressOf(position))
      if (isSpreadsheetError(value)) return { text: value.error, isError: true }
      if (value === null) return { text: '', isError: false }
      if (typeof value === 'boolean') return { text: value ? 'TRUE' : 'FALSE', isError: false }
      return { text: String(value), isError: false }
    },
    set(position: CellPosition, raw: string): readonly CellPosition[] {
      const result = engine.setCell(addressOf(position), raw)
      return result.changed.flatMap((address) => {
        const changedPosition = positionOf(address)
        return changedPosition === null ? [] : [changedPosition]
      })
    },
    getChange(position: CellPosition): CellChange {
      return {
        column: position[0], row: position[1], raw: engine.getRaw(addressOf(position)),
        format: { ...this.getFormat(position) },
      }
    },
  }
}
