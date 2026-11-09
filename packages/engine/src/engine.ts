import { parseCellAddress, type GridLimits, DEFAULT_GRID_LIMITS } from './address.js'
import { classifyInput } from './classify.js'
import { evaluateFormula } from './evaluator.js'
import { isSpreadsheetError, type CellValue, type SpreadsheetError } from './values.js'

export interface SetCellResult {
  readonly changed: readonly string[]
  readonly error?: SpreadsheetError
}

function referenceError(message: string): SpreadsheetError {
  return { error: '#REF!', message }
}

function cycleError(address: string): SpreadsheetError {
  return { error: '#CYCLE!', message: `Circular reference involving ${address}` }
}

function valuesEqual(left: CellValue, right: CellValue): boolean {
  if (isSpreadsheetError(left) && isSpreadsheetError(right)) {
    return left.error === right.error && left.message === right.message
  }
  return Object.is(left, right)
}

export class SpreadsheetEngine {
  readonly limits: Readonly<GridLimits>
  private readonly rawCells = new Map<string, string>()
  private readonly values = new Map<string, CellValue>()

  constructor(limits: GridLimits = DEFAULT_GRID_LIMITS) {
    this.limits = { ...limits }
  }

  setCell(addressInput: string, raw: string): SetCellResult {
    const parsedAddress = parseCellAddress(addressInput, this.limits)
    if (!parsedAddress.ok) return { changed: [], error: referenceError(parsedAddress.message) }

    const address = parsedAddress.value.address
    const previousRaw = this.rawCells.get(address) ?? ''
    if (previousRaw === raw) return { changed: [] }

    if (classifyInput(raw).kind === 'empty') this.rawCells.delete(address)
    else this.rawCells.set(address, raw)

    return { changed: this.recalculate(address) }
  }

  getRaw(addressInput: string): string {
    const parsedAddress = parseCellAddress(addressInput, this.limits)
    return parsedAddress.ok ? this.rawCells.get(parsedAddress.value.address) ?? '' : ''
  }

  getValue(addressInput: string): CellValue {
    const parsedAddress = parseCellAddress(addressInput, this.limits)
    if (!parsedAddress.ok) return referenceError(parsedAddress.message)
    return this.values.get(parsedAddress.value.address) ?? null
  }

  getAllRaw(): ReadonlyMap<string, string> {
    return new Map(this.rawCells)
  }

  clear(): readonly string[] {
    const changed = [...this.rawCells.keys()]
    this.rawCells.clear()
    this.values.clear()
    return changed
  }

  private recalculate(editedAddress: string): readonly string[] {
    const previousValues = new Map(this.values)
    this.values.clear()

    for (const address of this.rawCells.keys()) this.evaluateCell(address, new Set())

    const candidates = new Set([...previousValues.keys(), ...this.values.keys(), editedAddress])
    return [...candidates].filter((address) => {
      const previous = previousValues.get(address) ?? null
      const current = this.values.get(address) ?? null
      return address === editedAddress || !valuesEqual(previous, current)
    })
  }

  private evaluateCell(address: string, visiting: Set<string>): CellValue {
    if (this.values.has(address)) return this.values.get(address)!
    if (visiting.has(address)) return cycleError(address)

    const raw = this.rawCells.get(address)
    if (raw === undefined) return null

    visiting.add(address)
    let value: CellValue
    const classified = classifyInput(raw)

    if (classified.kind === 'empty') value = null
    else if (classified.kind === 'literal') value = classified.value
    else {
      value = evaluateFormula(classified.source, {
        resolveCell: (referencedAddress) => this.evaluateCell(referencedAddress, visiting),
      })
    }

    visiting.delete(address)
    this.values.set(address, value)
    return value
  }
}
