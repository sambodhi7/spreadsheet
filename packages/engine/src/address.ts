export interface GridLimits {
  readonly columns: number
  readonly rows: number
}

export const DEFAULT_GRID_LIMITS: Readonly<GridLimits> = { columns: 26, rows: 1_000 }

export interface ParsedCellAddress {
  readonly address: string
  readonly column: number
  readonly row: number
  readonly absoluteColumn: boolean
  readonly absoluteRow: boolean
}

export type AddressParseResult =
  | { readonly ok: true; readonly value: ParsedCellAddress }
  | { readonly ok: false; readonly message: string }

function columnLabelToIndex(label: string): number {
  let value = 0
  for (const character of label) value = value * 26 + character.charCodeAt(0) - 64
  return value - 1
}

function columnIndexToLabel(column: number): string {
  let value = column + 1
  let label = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    value = Math.floor((value - 1) / 26)
  }
  return label
}

export function parseCellAddress(
  input: string,
  limits: GridLimits = DEFAULT_GRID_LIMITS,
): AddressParseResult {
  const match = /^\s*(\$?)([A-Za-z]+)(\$?)([1-9]\d*)\s*$/.exec(input)
  if (match === null) return { ok: false, message: `Invalid cell address: ${input}` }

  const [, columnMarker = '', columnText = '', rowMarker = '', rowText = ''] = match
  const column = columnLabelToIndex(columnText.toUpperCase())
  const rowNumber = Number(rowText)
  const row = rowNumber - 1

  if (!Number.isSafeInteger(rowNumber) || column < 0 || column >= limits.columns || row < 0 || row >= limits.rows) {
    return { ok: false, message: `Cell address is outside the grid: ${input}` }
  }

  return {
    ok: true,
    value: {
      address: `${columnIndexToLabel(column)}${rowNumber}`,
      column,
      row,
      absoluteColumn: columnMarker === '$',
      absoluteRow: rowMarker === '$',
    },
  }
}

export function addressFromCoordinates(
  column: number,
  row: number,
  limits: GridLimits = DEFAULT_GRID_LIMITS,
): string | null {
  if (!Number.isInteger(column) || !Number.isInteger(row)
    || column < 0 || column >= limits.columns || row < 0 || row >= limits.rows) return null
  return `${columnIndexToLabel(column)}${row + 1}`
}
