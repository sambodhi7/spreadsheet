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

export interface ParsedColumnReference {
  readonly column: number
  readonly label: string
  readonly absolute: boolean
}

export type AddressParseResult =
  | { readonly ok: true; readonly value: ParsedCellAddress }
  | { readonly ok: false; readonly message: string }

export type ColumnParseResult =
  | { readonly ok: true; readonly value: ParsedColumnReference }
  | { readonly ok: false; readonly message: string }

export interface ExpandedRange {
  readonly addresses: readonly string[]
  readonly width: number
  readonly height: number
}

export type RangeExpansionResult =
  | { readonly ok: true; readonly value: ExpandedRange }
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

export function parseColumnReference(
  input: string,
  limits: GridLimits = DEFAULT_GRID_LIMITS,
): ColumnParseResult {
  const match = /^\s*(\$?)([A-Za-z]+)\s*$/.exec(input)
  if (match === null) return { ok: false, message: `Invalid column reference: ${input}` }

  const [, marker = '', columnText = ''] = match
  const label = columnText.toUpperCase()
  const column = columnLabelToIndex(label)
  if (column < 0 || column >= limits.columns) {
    return { ok: false, message: `Column reference is outside the grid: ${input}` }
  }
  return { ok: true, value: { column, label, absolute: marker === '$' } }
}

export function expandRange(
  rangeKind: 'cells' | 'columns',
  startReference: string,
  endReference: string,
  limits: GridLimits = DEFAULT_GRID_LIMITS,
): RangeExpansionResult {
  let startColumn: number
  let endColumn: number
  let startRow: number
  let endRow: number

  if (rangeKind === 'cells') {
    const start = parseCellAddress(startReference, limits)
    if (!start.ok) return start
    const end = parseCellAddress(endReference, limits)
    if (!end.ok) return end
    startColumn = Math.min(start.value.column, end.value.column)
    endColumn = Math.max(start.value.column, end.value.column)
    startRow = Math.min(start.value.row, end.value.row)
    endRow = Math.max(start.value.row, end.value.row)
  } else {
    const start = parseColumnReference(startReference, limits)
    if (!start.ok) return start
    const end = parseColumnReference(endReference, limits)
    if (!end.ok) return end
    startColumn = Math.min(start.value.column, end.value.column)
    endColumn = Math.max(start.value.column, end.value.column)
    startRow = 0
    endRow = limits.rows - 1
  }

  const addresses: string[] = []
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const address = addressFromCoordinates(column, row, limits)
      if (address !== null) addresses.push(address)
    }
  }
  return {
    ok: true,
    value: {
      addresses,
      width: endColumn - startColumn + 1,
      height: endRow - startRow + 1,
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
