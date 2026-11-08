import { describe, expect, it } from 'vitest'
import { evaluateFormula, isSpreadsheetError, parseFormula } from '../src/index.js'

describe('arithmetic formula parser', () => {
  it('requires a leading equals sign', () => {
    const result = parseFormula('1 + 2')
    expect(result.ok).toBe(false)
  })

  it('reports malformed formulas as parse failures', () => {
    const result = parseFormula('=1 +')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.diagnostic.position).toBeGreaterThan(0)
  })

  it('accepts decimals, exponents, parentheses, and whitespace', () => {
    expect(evaluateFormula('= (1.5 + .5) * 2e2 ')).toBe(400)
  })
})

describe('arithmetic formula evaluation', () => {
  it.each([
    ['=1+2', 3],
    ['=10-3-2', 5],
    ['=2*3+4', 10],
    ['=2+3*4', 14],
    ['=(2+3)*4', 20],
    ['=8/2/2', 2],
    ['=2^3^2', 64],
    ['=-2^2', 4],
    ['=--5', 5],
  ])('evaluates %s as %s', (formula, expected) => {
    expect(evaluateFormula(formula)).toBe(expected)
  })

  it.each([
    ['=1/0', '#DIV/0!'],
    ['=0^-1', '#NUM!'],
    ['=(-1)^.5', '#NUM!'],
    ['=1+', '#PARSE!'],
  ] as const)('returns %s for %s', (formula, expectedError) => {
    const result = evaluateFormula(formula)
    expect(isSpreadsheetError(result)).toBe(true)
    if (isSpreadsheetError(result)) expect(result.error).toBe(expectedError)
  })
})

describe('single-argument functions', () => {
  it.each([
    ['=ABS(-5)', 5],
    ['=abs(2-7)', 5],
    ['=ROUND(1.5)', 2],
    ['=ROUND(-1.5)', -2],
    ['=ROUND(1.49)', 1],
    ['=NOT(0)', true],
    ['=NOT(2)', false],
    ['=SQRT(9)', 3],
    ['=sqrt(2+7)', 3],
    ['=ABS(ROUND(-1.6))', 2],
  ])('evaluates %s as %s', (formula, expected) => {
    expect(evaluateFormula(formula)).toBe(expected)
  })

  it('returns #NAME? for an unknown function', () => {
    const result = evaluateFormula('=MISSING(1)')
    expect(isSpreadsheetError(result) && result.error).toBe('#NAME?')
  })

  it('returns #NUM! when SQRT receives a negative number', () => {
    const result = evaluateFormula('=SQRT(-1)')
    expect(isSpreadsheetError(result) && result.error).toBe('#NUM!')
  })

  it('does not accept comma-separated arguments yet', () => {
    const result = evaluateFormula('=ABS(1, 2)')
    expect(isSpreadsheetError(result) && result.error).toBe('#PARSE!')
  })
})
