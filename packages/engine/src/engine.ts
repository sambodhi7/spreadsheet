import { parseCellAddress, type GridLimits, DEFAULT_GRID_LIMITS } from './address.js'
import type { AstNode } from './ast.js'
import { classifyInput } from './classify.js'
import { findCyclicCells } from './cycles.js'
import { extractReferences } from './dependencies.js'
import { evaluateAst } from './evaluator.js'
import { DependencyGraph } from './graph.js'
import { parseFormula } from './parser.js'
import { isSpreadsheetError, type CellValue, type SpreadsheetError } from './values.js'

export interface SetCellResult {
  readonly changed: readonly string[]
  readonly recalculated: readonly string[]
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
  private readonly formulaAsts = new Map<string, AstNode>()
  private readonly formulaErrors = new Map<string, SpreadsheetError>()
  private readonly graph = new DependencyGraph()

  constructor(limits: GridLimits = DEFAULT_GRID_LIMITS) {
    this.limits = { ...limits }
  }

  setCell(addressInput: string, raw: string): SetCellResult {
    const parsedAddress = parseCellAddress(addressInput, this.limits)
    if (!parsedAddress.ok) return { changed: [], recalculated: [], error: referenceError(parsedAddress.message) }

    const address = parsedAddress.value.address
    const previousRaw = this.rawCells.get(address) ?? ''
    if (previousRaw === raw) return { changed: [], recalculated: [] }

    const classified = classifyInput(raw)
    if (classified.kind === 'empty') this.rawCells.delete(address)
    else this.rawCells.set(address, raw)

    this.updateFormulaState(address, classified)

    const affected = this.graph.collectAffected(address)
    const previousValues = new Map<string, CellValue>()
    for (const affectedAddress of affected) {
      previousValues.set(affectedAddress, this.values.get(affectedAddress) ?? null)
      this.values.delete(affectedAddress)
    }

    for (const cyclicAddress of findCyclicCells(this.graph, affected)) {
      this.values.set(cyclicAddress, cycleError(cyclicAddress))
    }
    for (const affectedAddress of affected) this.evaluateCell(affectedAddress, new Set())

    const changed = [...affected].filter((affectedAddress) => {
      const previous = previousValues.get(affectedAddress) ?? null
      const current = this.values.get(affectedAddress) ?? null
      return affectedAddress === address || !valuesEqual(previous, current)
    })
    return { changed, recalculated: [...affected] }
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

  getPrecedents(addressInput: string): ReadonlySet<string> {
    const parsedAddress = parseCellAddress(addressInput, this.limits)
    return parsedAddress.ok ? this.graph.getPrecedents(parsedAddress.value.address) : new Set()
  }

  getDependents(addressInput: string): ReadonlySet<string> {
    const parsedAddress = parseCellAddress(addressInput, this.limits)
    return parsedAddress.ok ? this.graph.getDependents(parsedAddress.value.address) : new Set()
  }

  clear(): readonly string[] {
    const changed = [...this.rawCells.keys()]
    this.rawCells.clear()
    this.values.clear()
    this.formulaAsts.clear()
    this.formulaErrors.clear()
    this.graph.clear()
    return changed
  }

  private updateFormulaState(address: string, classified: ReturnType<typeof classifyInput>): void {
    this.formulaAsts.delete(address)
    this.formulaErrors.delete(address)

    if (classified.kind !== 'formula') {
      this.graph.updatePrecedents(address, new Set())
      return
    }

    const parsed = parseFormula(classified.source)
    if (!parsed.ok) {
      this.formulaErrors.set(address, {
        error: '#PARSE!',
        message: parsed.diagnostic.message,
        position: parsed.diagnostic.position,
      })
      this.graph.updatePrecedents(address, new Set())
      return
    }

    this.formulaAsts.set(address, parsed.ast)
    this.graph.updatePrecedents(address, extractReferences(parsed.ast, this.limits))
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
      const formulaError = this.formulaErrors.get(address)
      const ast = this.formulaAsts.get(address)
      if (formulaError !== undefined) value = formulaError
      else if (ast === undefined) value = { error: '#PARSE!', message: 'Formula AST is unavailable' }
      else value = evaluateAst(ast, {
        limits: this.limits,
        resolveCell: (referencedAddress) => this.evaluateCell(referencedAddress, visiting),
      })
    }

    visiting.delete(address)
    this.values.set(address, value)
    return value
  }
}
