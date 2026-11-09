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

  it('detects references in lazy branches as graph cycles', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '=IF(TRUE, 1, A1)')
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

describe('SpreadsheetEngine incremental recalculation', () => {
  it('recalculates only the edited cell and its transitive dependents', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('B1', '=A1+1')
    engine.setCell('C1', '=B1+1')
    engine.setCell('D1', '10')
    engine.setCell('E1', '=D1+1')

    const result = engine.setCell('A1', '2')
    expect(new Set(result.recalculated)).toEqual(new Set(['A1', 'B1', 'C1']))
    expect(result.recalculated).not.toContain('D1')
    expect(result.recalculated).not.toContain('E1')
    expect(engine.getValue('C1')).toBe(4)
    expect(engine.getValue('E1')).toBe(11)
  })

  it('tracks empty precedents so filling them recalculates dependents', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('B1', '=A1+1')

    const result = engine.setCell('A1', '5')
    expect(result.recalculated).toEqual(expect.arrayContaining(['A1', 'B1']))
    expect(engine.getValue('B1')).toBe(6)
  })

  it('removes obsolete dependency edges when a formula changes', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('B1', '2')
    engine.setCell('C1', '=A1')
    engine.setCell('C1', '=B1')

    expect(engine.getPrecedents('C1')).toEqual(new Set(['B1']))
    expect(engine.getDependents('A1')).toEqual(new Set())
    expect(engine.getDependents('B1')).toEqual(new Set(['C1']))

    const unrelatedEdit = engine.setCell('A1', '10')
    expect(unrelatedEdit.recalculated).toEqual(['A1'])
    expect(engine.getValue('C1')).toBe(2)

    const relatedEdit = engine.setCell('B1', '3')
    expect(relatedEdit.recalculated).toEqual(expect.arrayContaining(['B1', 'C1']))
    expect(engine.getValue('C1')).toBe(3)
  })

  it('recalculates a dependency diamond in the correct order', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '2')
    engine.setCell('B1', '=A1*2')
    engine.setCell('C1', '=A1*3')
    engine.setCell('D1', '=B1+C1')

    const result = engine.setCell('A1', '4')
    expect(new Set(result.recalculated)).toEqual(new Set(['A1', 'B1', 'C1', 'D1']))
    expect(engine.getValue('D1')).toBe(20)
  })
})

describe('SpreadsheetEngine ranges', () => {
  it('aggregates cell ranges and mixed scalar arguments', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('A2', '2')
    engine.setCell('A3', '3')
    engine.setCell('B1', '=SUM(A1:A3, 4)')
    engine.setCell('B2', '=AVG(A1:A3)')
    engine.setCell('B3', '=MIN(A1:A3)')
    engine.setCell('B4', '=MAX(A1:A3)')
    engine.setCell('B5', '=COUNT(A1:A3)')

    expect(engine.getValue('B1')).toBe(10)
    expect(engine.getValue('B2')).toBe(2)
    expect(engine.getValue('B3')).toBe(1)
    expect(engine.getValue('B4')).toBe(3)
    expect(engine.getValue('B5')).toBe(3)
  })

  it('supports rectangular and reversed ranges', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('B1', '2')
    engine.setCell('A2', '3')
    engine.setCell('B2', '4')
    engine.setCell('C1', '=SUM(B2:A1)')
    expect(engine.getValue('C1')).toBe(10)
  })

  it('supports whole-column ranges', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('A1000', '9')
    engine.setCell('B1', '=SUM(A:A)')

    expect(engine.getValue('B1')).toBe(10)
    expect(engine.getPrecedents('B1').size).toBe(1_000)
  })

  it('recalculates a range formula when any member changes', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('A2', '2')
    engine.setCell('B1', '=SUM(A1:A2)')

    const result = engine.setCell('A2', '5')
    expect(result.recalculated).toEqual(expect.arrayContaining(['A2', 'B1']))
    expect(engine.getValue('B1')).toBe(6)
  })

  it('ignores text, booleans, and empty cells in numeric range aggregation', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '2')
    engine.setCell('A2', 'text')
    engine.setCell('A3', 'TRUE')
    engine.setCell('B1', '=SUM(A1:A4)')
    engine.setCell('B2', '=COUNT(A1:A4)')

    expect(engine.getValue('B1')).toBe(2)
    expect(engine.getValue('B2')).toBe(1)
  })

  it('handles ranges containing no numeric values', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', 'text')
    engine.setCell('A2', 'TRUE')
    engine.setCell('B1', '=AVG(A1:A2)')
    engine.setCell('B2', '=MIN(A1:A2)')
    engine.setCell('B3', '=MAX(A1:A2)')

    expectError(engine, 'B1', '#DIV/0!')
    expect(engine.getValue('B2')).toBe(0)
    expect(engine.getValue('B3')).toBe(0)
  })

  it('passes ranges to logical aggregations', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', 'TRUE')
    engine.setCell('A2', '1')
    engine.setCell('A3', 'text')
    engine.setCell('B1', '=AND(A1:A3)')
    engine.setCell('B2', '=OR(A1:A3)')

    expect(engine.getValue('B1')).toBe(true)
    expect(engine.getValue('B2')).toBe(true)
  })

  it('propagates errors contained in a range', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('A2', '=1/0')
    engine.setCell('B1', '=SUM(A1:A2)')
    expectError(engine, 'B1', '#DIV/0!')
  })

  it('returns #VALUE! when a range is used as a scalar', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '1')
    engine.setCell('A2', '2')
    engine.setCell('B1', '=A1:A2+1')
    expectError(engine, 'B1', '#VALUE!')
  })

  it('returns #REF! for an invalid range', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '=SUM(AA1:AA2)')
    expectError(engine, 'A1', '#REF!')
  })

  it('detects cycles introduced through ranges', () => {
    const engine = new SpreadsheetEngine()
    engine.setCell('A1', '=SUM(A1:A2)')
    expectError(engine, 'A1', '#CYCLE!')
  })
})
