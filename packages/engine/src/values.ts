export type ErrorCode = '#PARSE!' | '#DIV/0!' | '#REF!' | '#NAME?' | '#VALUE!' | '#CYCLE!' | '#NUM!'

export interface SpreadsheetError {
  readonly error: ErrorCode
  readonly message?: string
  readonly position?: number
}

export type CellValue = number | string | boolean | null | SpreadsheetError
export type ScalarValue = number | string | boolean | null

export function isSpreadsheetError(value: unknown): value is SpreadsheetError {
  return typeof value === 'object' && value !== null && 'error' in value
}
