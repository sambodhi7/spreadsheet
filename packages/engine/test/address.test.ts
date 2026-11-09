import { describe, expect, it } from 'vitest'
import { addressFromCoordinates, parseCellAddress } from '../src/index.js'

describe('cell addresses', () => {
  it.each([
    ['A1', 'A1', 0, 0],
    ['a1', 'A1', 0, 0],
    ['$A$1', 'A1', 0, 0],
    ['A$10', 'A10', 0, 9],
    ['$Z1000', 'Z1000', 25, 999],
  ] as const)('normalizes %s', (input, address, column, row) => {
    const result = parseCellAddress(input)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toMatchObject({ address, column, row })
  })

  it.each(['A0', 'A1001', 'AA1', '1A', '', 'A-1'])('rejects %s', (input) => {
    expect(parseCellAddress(input).ok).toBe(false)
  })

  it('converts zero-based coordinates to A1 addresses', () => {
    expect(addressFromCoordinates(0, 0)).toBe('A1')
    expect(addressFromCoordinates(25, 999)).toBe('Z1000')
    expect(addressFromCoordinates(26, 0)).toBeNull()
  })
})
