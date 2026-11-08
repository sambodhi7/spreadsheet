import type { CellValue } from '../values.js'

type UnaryFunction = (argument: number) => CellValue

function roundHalfAwayFromZero(value: number): number {
  const rounded = Math.sign(value) * Math.round(Math.abs(value))
  return Object.is(rounded, -0) ? 0 : rounded
}

function squareRoot(value: number): CellValue {
  return value < 0
    ? { error: '#NUM!', message: 'SQRT requires a non-negative number' }
    : Math.sqrt(value)
}

const unaryFunctions: ReadonlyMap<string, UnaryFunction> = new Map<string, UnaryFunction>([
  ['ABS', Math.abs],
  ['ROUND', roundHalfAwayFromZero],
  ['NOT', (argument) => argument === 0],
  ['SQRT', squareRoot],
])

export function evaluateUnaryFunction(name: string, argument: number): CellValue | undefined {
  return unaryFunctions.get(name.toUpperCase())?.(argument)
}
