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

})

describe('multiple-argument functions', () => {
  it.each([
    ['=MOD(10, 3)', 1],
    ['=MOD(-3, 2)', 1],
    ['=MOD(3, -2)', -1],
    ['=ROUND(12.345, 2)', 12.35],
    ['=ROUND(125, -1)', 130],
    ['=SUM(1, 2, 3, 4)', 10],
    ['=AVG(2, 4, 6)', 4],
    ['=AVERAGE(2, 4, 6)', 4],
    ['=MIN(8, 3, 5)', 3],
    ['=MAX(8, 3, 5)', 8],
    ['=COUNT(8, 3, 5)', 3],
    ['=SUM(ABS(-2), SQRT(9), ROUND(1.6))', 7],
  ])('evaluates %s as %s', (formula, expected) => {
    expect(evaluateFormula(formula)).toBe(expected)
  })

  it('evaluates arguments from left to right and propagates the first error', () => {
    const result = evaluateFormula('=SUM(1/0, SQRT(-1))')
    expect(isSpreadsheetError(result) && result.error).toBe('#DIV/0!')
  })

  it.each([
    ['=MOD(1, 0)', '#DIV/0!'],
    ['=ROUND(1, 1.5)', '#VALUE!'],
    ['=ABS()', '#PARSE!'],
    ['=ABS(1, 2)', '#PARSE!'],
    ['=MOD(1)', '#PARSE!'],
    ['=ROUND(1, 2, 3)', '#PARSE!'],
    ['=SUM()', '#PARSE!'],
  ] as const)('returns %s for %s', (formula, expectedError) => {
    const result = evaluateFormula(formula)
    expect(isSpreadsheetError(result) && result.error).toBe(expectedError)
  })
})

describe('additional numeric and text functions', () => {
  it.each([
    ['=MEDIAN(7, 1, 4)', 4],
    ['=MEDIAN(7, 1, 4, 10)', 5.5],
    ['=POWER(2, 8)', 256],
    ['=LOG(100)', 2],
    ['=LOG(8, 2)', 3],
    ['=LN(1)', 0],
    ['=LEN("hello")', 5],
    ['=LEN("say ""hi""")', 8],
    ['=UPPER("Hello 42")', 'HELLO 42'],
    ['=LOWER("Hello 42")', 'hello 42'],
    ['=CONCAT("Hello", " ", "world", 42)', 'Hello world42'],
  ])('evaluates %s as %s', (formula, expected) => {
    expect(evaluateFormula(formula)).toBe(expected)
  })

  it.each([
    ['=LOG(0)', '#NUM!'],
    ['=LOG(10, 1)', '#NUM!'],
    ['=LN(-1)', '#NUM!'],
    ['=POWER(-1, .5)', '#NUM!'],
    ['=LEN("a", "b")', '#PARSE!'],
    ['=CONCAT()', '#PARSE!'],
  ] as const)('returns %s for %s', (formula, expectedError) => {
    const result = evaluateFormula(formula)
    expect(isSpreadsheetError(result) && result.error).toBe(expectedError)
  })
})

describe('booleans and comparisons', () => {
  it.each([
    ['=TRUE', true],
    ['=false', false],
    ['=1+2=3', true],
    ['=2*3>5', true],
    ['=5<>5', false],
    ['=5<=5', true],
    ['=6>=7', false],
    ['=TRUE>FALSE', true],
    ['=TRUE+2', 3],
    ['=FALSE*10', 0],
  ])('evaluates %s as %s', (formula, expected) => {
    expect(evaluateFormula(formula)).toBe(expected)
  })
})

describe('logical and conditional functions', () => {
  it.each([
    ['=AND(TRUE, 5>3, 1)', true],
    ['=AND(TRUE, 0, 1)', false],
    ['=OR(FALSE, 0, 2>1)', true],
    ['=OR(FALSE, 0)', false],
    ['=NOT(TRUE)', false],
    ['=NOT(FALSE)', true],
    ['=IF(5>3, 100, 0)', 100],
    ['=IF(FALSE, 100, 0)', 0],
    ['=IF(2, 10, 20)', 10],
    ['=IF(FALSE, 10)', false],
    ['=IFERROR(1/0, 99)', 99],
    ['=IFERROR(5, 99)', 5],
  ])('evaluates %s as %s', (formula, expected) => {
    expect(evaluateFormula(formula)).toBe(expected)
  })

  it('does not evaluate the unselected IF branch', () => {
    expect(evaluateFormula('=IF(TRUE, 10, 1/0)')).toBe(10)
    expect(evaluateFormula('=IF(FALSE, SQRT(-1), 20)')).toBe(20)
  })

  it('does not evaluate the IFERROR fallback when the first value succeeds', () => {
    expect(evaluateFormula('=IFERROR(5, SQRT(-1))')).toBe(5)
  })

  it('propagates eager logical argument errors from left to right', () => {
    const result = evaluateFormula('=AND(1/0, SQRT(-1))')
    expect(isSpreadsheetError(result) && result.error).toBe('#DIV/0!')
  })

  it.each([
    ['=AND()', '#PARSE!'],
    ['=OR()', '#PARSE!'],
    ['=NOT(TRUE, FALSE)', '#PARSE!'],
    ['=IF(TRUE)', '#PARSE!'],
    ['=IF(TRUE, 1, 2, 3)', '#PARSE!'],
    ['=IFERROR(1)', '#PARSE!'],
  ] as const)('returns %s for %s', (formula, expectedError) => {
    const result = evaluateFormula(formula)
    expect(isSpreadsheetError(result) && result.error).toBe(expectedError)
  })
})
