import { describe, expect, it } from 'vitest'
import { isSpreadsheetError, SpreadsheetEngine } from '../src/index.js'

function expectError(engine: SpreadsheetEngine, address: string, errorCode: string) {
  const value = engine.getValue(address)
  expect(isSpreadsheetError(value) && value.error).toBe(errorCode)
}

describe('SpreadsheetEngine references', () => {
  it('stores typed literals separately from raw input', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '10')
    engine.setCell('A2', 'TRUE')
    engine.setCell('A3', "'10")

    expect(engine.getRaw('A1')).toBe('10')
    expect(engine.getValue('A1')).toBe(10)
    expect(engine.getValue('A2')).toBe(true)
    expect(engine.getValue('A3')).toBe('10')
  })

  it('evaluates direct, absolute, and transitive references', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '10')
    engine.setCell('B1', '=A1*2')
    engine.setCell('C1', '=$B$1+5')

    expect(engine.getValue('B1')).toBe(20)
    expect(engine.getValue('C1')).toBe(25)
  })

  it('treats an empty referenced cell as zero in arithmetic', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('B1', '=A1+2')
    expect(engine.getValue('B1')).toBe(2)
  })

  it('recalculates formulas after a referenced cell changes', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '10')
    engine.setCell('B1', '=A1*2')

    const result = engine.setCell('A1', '15')
    expect(result.changed).toEqual(expect.arrayContaining(['A1', 'B1']))
    expect(engine.getValue('B1')).toBe(30)
  })

  it('supports references inside comparisons and lazy functions', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '5')
    engine.setCell('B1', '=IF(A1>3, A1*10, 1/0)')
    expect(engine.getValue('B1')).toBe(50)
  })

  it.each([
    ['=A0+1', '#REF!'],
    ['=AA1+1', '#REF!'],
  ] as const)('returns an error for an invalid reference in %s', (formula, errorCode) => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', formula)
    expectError(engine, 'A1', errorCode)
  })
})

describe('SpreadsheetEngine cycles', () => {
  it('detects a self-reference', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '=A1+1')
    expectError(engine, 'A1', '#CYCLE!')
  })

  it('detects multi-cell cycles and propagates the cycle error downstream', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '=B1')
    engine.setCell('B1', '=A1')
    engine.setCell('C1', '=A1+1')

    expectError(engine, 'A1', '#CYCLE!')
    expectError(engine, 'B1', '#CYCLE!')
    expectError(engine, 'C1', '#CYCLE!')
  })

  it('recovers after a cycle is broken', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '=B1')
    engine.setCell('B1', '=A1')
    expectError(engine, 'A1', '#CYCLE!')

    engine.setCell('B1', '7')
    expect(engine.getValue('A1')).toBe(7)
    expect(engine.getValue('B1')).toBe(7)
  })
})
