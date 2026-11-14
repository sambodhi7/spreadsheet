import { toBoolean, toNumber } from '../coercion.js'
import {
  isRangeValue,
  isSpreadsheetError,
  type CellValue,
  type FunctionValue,
  type ScalarValue,
  type SpreadsheetError,
} from '../values.js'

interface BaseFunctionDefinition {
  readonly minArgs: number
  readonly maxArgs: number
}

export interface EagerFunctionDefinition extends BaseFunctionDefinition {
  readonly mode: 'eager'
  readonly evaluate: (arguments_: readonly FunctionValue[]) => CellValue
}

export interface LazyFunctionDefinition extends BaseFunctionDefinition {
  readonly mode: 'lazy'
}

export type FunctionDefinition = EagerFunctionDefinition | LazyFunctionDefinition

function error(errorCode: SpreadsheetError['error'], message: string): SpreadsheetError {
  return { error: errorCode, message }
}

function scalarNumericArguments(arguments_: readonly FunctionValue[]): readonly number[] | SpreadsheetError {
  const numbers: number[] = []
  for (const argument of arguments_) {
    if (isRangeValue(argument)) return error('#VALUE!', 'This function requires scalar arguments')
    const number = toNumber(argument)
    if (isSpreadsheetError(number)) return number
    numbers.push(number)
  }
  return numbers
}

function aggregateNumericArguments(arguments_: readonly FunctionValue[]): readonly number[] | SpreadsheetError {
  const numbers: number[] = []
  for (const argument of arguments_) {
    if (!isRangeValue(argument)) {
      const number = toNumber(argument)
      if (isSpreadsheetError(number)) return number
      numbers.push(number)
      continue
    }

    for (const value of argument.values) {
      if (isSpreadsheetError(value)) return value
      if (typeof value === 'number') numbers.push(value)
    }
  }
  return numbers
}

function scalarNumericFunction(evaluate: (values: readonly number[]) => CellValue): EagerFunctionDefinition['evaluate'] {
  return (arguments_) => {
    const numbers = scalarNumericArguments(arguments_)
    return isSpreadsheetError(numbers) ? numbers : evaluate(numbers)
  }
}

function aggregateNumericFunction(evaluate: (values: readonly number[]) => CellValue): EagerFunctionDefinition['evaluate'] {
  return (arguments_) => {
    const numbers = aggregateNumericArguments(arguments_)
    return isSpreadsheetError(numbers) ? numbers : evaluate(numbers)
  }
}

function scalarText(value: FunctionValue, functionName: string): string | SpreadsheetError {
  if (isRangeValue(value)) return error('#VALUE!', `${functionName} requires a scalar argument`)
  if (value === null) return ''
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return String(value)
}

function logarithm(number: number, base: number): CellValue {
  if (number <= 0) return error('#NUM!', 'LOG requires a positive number')
  if (base <= 0 || base === 1) return error('#NUM!', 'LOG requires a positive base other than 1')
  const result = Math.log(number) / Math.log(base)
  return Number.isFinite(result) ? result : error('#NUM!', 'LOG produced a non-finite number')
}

function naturalLogarithm(number: number): CellValue {
  return number <= 0
    ? error('#NUM!', 'LN requires a positive number')
    : Math.log(number)
}

function median(values: readonly number[]): CellValue {
  if (values.length === 0) return error('#NUM!', 'MEDIAN has no numeric values')
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}

function concatenate(arguments_: readonly FunctionValue[]): CellValue {
  let result = ''
  for (const argument of arguments_) {
    const values: readonly CellValue[] = isRangeValue(argument) ? argument.values : [argument]
    for (const value of values) {
      if (isSpreadsheetError(value)) return value
      const text = scalarText(value, 'CONCAT')
      if (isSpreadsheetError(text)) return text
      result += text
    }
  }
  return result
}

function roundHalfAwayFromZero(value: number, digits = 0): CellValue {
  if (!Number.isInteger(digits)) return error('#VALUE!', 'ROUND digits must be an integer')
  if (Math.abs(digits) > 308) return error('#NUM!', 'ROUND digits are outside the supported range')

  const magnitude = 10 ** Math.abs(digits)
  if (!Number.isFinite(magnitude)) return error('#NUM!', 'ROUND produced a non-finite scale')

  const absolute = Math.abs(value)
  const roundedAbsolute = digits >= 0
    ? Math.round((absolute + Number.EPSILON) * magnitude) / magnitude
    : Math.round(absolute / magnitude) * magnitude
  const result = Math.sign(value) * roundedAbsolute

  if (!Number.isFinite(result)) return error('#NUM!', 'ROUND produced a non-finite number')
  return Object.is(result, -0) ? 0 : result
}

function modulo(number: number, divisor: number): CellValue {
  if (divisor === 0) return error('#DIV/0!', 'MOD divisor cannot be zero')
  const result = number - divisor * Math.floor(number / divisor)
  return Number.isFinite(result) ? result : error('#NUM!', 'MOD produced a non-finite number')
}

function squareRoot(value: number): CellValue {
  return value < 0
    ? error('#NUM!', 'SQRT requires a non-negative number')
    : Math.sqrt(value)
}

function logicalEvery(arguments_: readonly FunctionValue[]): CellValue {
  let result = true
  for (const argument of arguments_) {
    const values: readonly CellValue[] = isRangeValue(argument) ? argument.values : [argument]
    for (const value of values) {
      if (isSpreadsheetError(value)) return value
      if (isRangeValue(argument) && (typeof value === 'string' || value === null)) continue
      const logical = toBoolean(value as ScalarValue)
      if (isSpreadsheetError(logical)) return logical
      if (!logical) result = false
    }
  }
  return result
}

function logicalSome(arguments_: readonly FunctionValue[]): CellValue {
  let result = false
  for (const argument of arguments_) {
    const values: readonly CellValue[] = isRangeValue(argument) ? argument.values : [argument]
    for (const value of values) {
      if (isSpreadsheetError(value)) return value
      if (isRangeValue(argument) && (typeof value === 'string' || value === null)) continue
      const logical = toBoolean(value as ScalarValue)
      if (isSpreadsheetError(logical)) return logical
      if (logical) result = true
    }
  }
  return result
}

function countNumericValues(arguments_: readonly FunctionValue[]): CellValue {
  let count = 0
  for (const argument of arguments_) {
    if (!isRangeValue(argument)) {
      if (typeof argument === 'number') count += 1
      continue
    }
    for (const value of argument.values) {
      if (isSpreadsheetError(value)) return value
      if (typeof value === 'number') count += 1
    }
  }
  return count
}

const definitions: ReadonlyMap<string, FunctionDefinition> = new Map<string, FunctionDefinition>([
  ['ABS', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: scalarNumericFunction(([value = 0]) => Math.abs(value)) }],
  ['ROUND', { mode: 'eager', minArgs: 1, maxArgs: 2, evaluate: scalarNumericFunction(([value = 0, digits = 0]) => roundHalfAwayFromZero(value, digits)) }],
  ['NOT', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: ([value = 0]) => {
    if (isRangeValue(value)) return error('#VALUE!', 'NOT requires a scalar argument')
    const logical = toBoolean(value)
    return isSpreadsheetError(logical) ? logical : !logical
  } }],
  ['AND', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: logicalEvery }],
  ['OR', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: logicalSome }],
  ['SQRT', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: scalarNumericFunction(([value = 0]) => squareRoot(value)) }],
  ['MOD', { mode: 'eager', minArgs: 2, maxArgs: 2, evaluate: scalarNumericFunction(([number = 0, divisor = 0]) => modulo(number, divisor)) }],
  ['SUM', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: aggregateNumericFunction((values) => values.reduce((sum, value) => sum + value, 0)) }],
  ['AVG', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: aggregateNumericFunction((values) => values.length === 0 ? error('#DIV/0!', 'AVG has no numeric values') : values.reduce((sum, value) => sum + value, 0) / values.length) }],
  ['AVERAGE', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: aggregateNumericFunction((values) => values.length === 0 ? error('#DIV/0!', 'AVERAGE has no numeric values') : values.reduce((sum, value) => sum + value, 0) / values.length) }],
  ['MIN', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: aggregateNumericFunction((values) => values.length === 0 ? 0 : Math.min(...values)) }],
  ['MAX', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: aggregateNumericFunction((values) => values.length === 0 ? 0 : Math.max(...values)) }],
  ['COUNT', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: countNumericValues }],
  ['MEDIAN', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: aggregateNumericFunction(median) }],
  ['POWER', { mode: 'eager', minArgs: 2, maxArgs: 2, evaluate: scalarNumericFunction(([number = 0, exponent = 0]) => number ** exponent) }],
  ['LOG', { mode: 'eager', minArgs: 1, maxArgs: 2, evaluate: scalarNumericFunction(([number = 0, base = 10]) => logarithm(number, base)) }],
  ['LN', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: scalarNumericFunction(([number = 0]) => naturalLogarithm(number)) }],
  ['LEN', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: ([value = null]) => {
    const text = scalarText(value, 'LEN')
    return isSpreadsheetError(text) ? text : text.length
  } }],
  ['UPPER', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: ([value = null]) => {
    const text = scalarText(value, 'UPPER')
    return isSpreadsheetError(text) ? text : text.toUpperCase()
  } }],
  ['LOWER', { mode: 'eager', minArgs: 1, maxArgs: 1, evaluate: ([value = null]) => {
    const text = scalarText(value, 'LOWER')
    return isSpreadsheetError(text) ? text : text.toLowerCase()
  } }],
  ['CONCAT', { mode: 'eager', minArgs: 1, maxArgs: Number.POSITIVE_INFINITY, evaluate: concatenate }],
  ['IF', { mode: 'lazy', minArgs: 2, maxArgs: 3 }],
  ['IFERROR', { mode: 'lazy', minArgs: 2, maxArgs: 2 }],
])

export function resolveFunction(name: string): FunctionDefinition | undefined {
  return definitions.get(name.toUpperCase())
}

export function validateFunctionArity(
  name: string,
  definition: FunctionDefinition,
  argumentCount: number,
): SpreadsheetError | null {
  if (argumentCount >= definition.minArgs && argumentCount <= definition.maxArgs) return null
  return error('#PARSE!', `${name.toUpperCase()} received ${argumentCount} arguments`)
}

export function evaluateEagerFunction(
  name: string,
  definition: EagerFunctionDefinition,
  arguments_: readonly FunctionValue[],
): CellValue {
  const result = definition.evaluate(arguments_)
  if (typeof result === 'number' && !Number.isFinite(result)) {
    return error('#NUM!', `${name.toUpperCase()} produced a non-finite number`)
  }
  return result
}
