import type { ScalarValue, SpreadsheetError } from './values.js'

const numericTextPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

function valueError(message: string): SpreadsheetError {
  return { error: '#VALUE!', message }
}

export function toNumber(value: ScalarValue): number | SpreadsheetError {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  if (value === null) return 0

  const trimmed = value.trim()
  return numericTextPattern.test(trimmed)
    ? Number(trimmed)
    : valueError(`Cannot convert ${JSON.stringify(value)} to a number`)
}

export function toBoolean(value: ScalarValue): boolean | SpreadsheetError {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (value === null) return false
  return valueError('Text cannot be used as a logical value')
}
