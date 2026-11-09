import { parseCellAddress } from './address.js'
import type { AstNode, BinaryOperator, CallNode } from './ast.js'
import { toBoolean, toNumber } from './coercion.js'
import {
  evaluateEagerFunction,
  resolveFunction,
  validateFunctionArity,
} from './functions/registry.js'
import { isSpreadsheetError, type CellValue, type ScalarValue, type SpreadsheetError } from './values.js'
import { parseFormula } from './parser.js'

export interface EvaluationContext {
  readonly resolveCell: (address: string) => CellValue
}

function spreadsheetError(error: SpreadsheetError['error'], message?: string, position?: number): SpreadsheetError {
  return { error, ...(message === undefined ? {} : { message }), ...(position === undefined ? {} : { position }) }
}

type ComparisonOperator = Extract<BinaryOperator, '=' | '<>' | '<' | '<=' | '>' | '>='>

function isComparisonOperator(operator: BinaryOperator): operator is ComparisonOperator {
  return operator === '=' || operator === '<>' || operator === '<' || operator === '<='
    || operator === '>' || operator === '>='
}

function emptyLike(value: ScalarValue): ScalarValue {
  if (typeof value === 'string') return ''
  if (typeof value === 'boolean') return false
  return 0
}

function typeRank(value: Exclude<ScalarValue, null>): number {
  if (typeof value === 'number') return 0
  if (typeof value === 'string') return 1
  return 2
}

function compareScalars(leftValue: ScalarValue, rightValue: ScalarValue): number {
  const left = leftValue === null ? emptyLike(rightValue) : leftValue
  const right = rightValue === null ? emptyLike(leftValue) : rightValue

  if (typeof left === 'number' && typeof right === 'number') return Math.sign(left - right)
  if (typeof left === 'string' && typeof right === 'string') {
    const normalizedLeft = left.toLocaleLowerCase()
    const normalizedRight = right.toLocaleLowerCase()
    return normalizedLeft === normalizedRight ? 0 : normalizedLeft < normalizedRight ? -1 : 1
  }
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
  return typeRank(left as Exclude<ScalarValue, null>) - typeRank(right as Exclude<ScalarValue, null>)
}

function compare(operator: ComparisonOperator, left: ScalarValue, right: ScalarValue): boolean {
  const order = compareScalars(left, right)
  switch (operator) {
    case '=': return order === 0
    case '<>': return order !== 0
    case '<': return order < 0
    case '<=': return order <= 0
    case '>': return order > 0
    case '>=': return order >= 0
  }
}

function calculate(operator: BinaryOperator, leftValue: ScalarValue, rightValue: ScalarValue): CellValue {
  if (isComparisonOperator(operator)) return compare(operator, leftValue, rightValue)

  const left = toNumber(leftValue)
  if (isSpreadsheetError(left)) return left
  const right = toNumber(rightValue)
  if (isSpreadsheetError(right)) return right

  if (operator === '/' && right === 0) {
    return spreadsheetError('#DIV/0!', 'Division by zero')
  }

  let result: number
  switch (operator) {
    case '+': result = left + right; break
    case '-': result = left - right; break
    case '*': result = left * right; break
    case '/': result = left / right; break
    case '^': result = left ** right; break
  }

  return Number.isFinite(result) ? result : spreadsheetError('#NUM!', 'Calculation produced a non-finite number')
}

function evaluateLazyFunction(node: CallNode, context?: EvaluationContext): CellValue {
  const normalizedName = node.name.toUpperCase()

  if (normalizedName === 'IF') {
    const condition = evaluateAst(node.arguments[0]!, context)
    if (isSpreadsheetError(condition)) return condition
    const logicalCondition = toBoolean(condition)
    if (isSpreadsheetError(logicalCondition)) return logicalCondition

    if (logicalCondition) return evaluateAst(node.arguments[1]!, context)
    return node.arguments[2] === undefined ? false : evaluateAst(node.arguments[2], context)
  }

  const value = evaluateAst(node.arguments[0]!, context)
  return isSpreadsheetError(value) ? evaluateAst(node.arguments[1]!, context) : value
}

function evaluateCall(node: CallNode, context?: EvaluationContext): CellValue {
  const definition = resolveFunction(node.name)
  if (definition === undefined) return spreadsheetError('#NAME?', `Unknown function: ${node.name}`)

  const arityError = validateFunctionArity(node.name, definition, node.arguments.length)
  if (arityError !== null) return arityError
  if (definition.mode === 'lazy') return evaluateLazyFunction(node, context)

  const arguments_: ScalarValue[] = []
  for (const argumentNode of node.arguments) {
    const argument = evaluateAst(argumentNode, context)
    if (isSpreadsheetError(argument)) return argument
    arguments_.push(argument)
  }
  return evaluateEagerFunction(node.name, definition, arguments_)
}

export function evaluateAst(node: AstNode, context?: EvaluationContext): CellValue {
  if (node.kind === 'number') return node.value
  if (node.kind === 'boolean') return node.value

  if (node.kind === 'cellReference') {
    const parsedAddress = parseCellAddress(node.reference)
    if (!parsedAddress.ok) return spreadsheetError('#REF!', parsedAddress.message)
    if (context === undefined) return spreadsheetError('#REF!', 'Cell reference requires a spreadsheet context')
    return context.resolveCell(parsedAddress.value.address)
  }

  if (node.kind === 'call') return evaluateCall(node, context)

  if (node.kind === 'unary') {
    const operand = evaluateAst(node.operand, context)
    if (isSpreadsheetError(operand)) return operand
    const number = toNumber(operand)
    if (isSpreadsheetError(number)) return number
    return node.operator === '-' ? -number : number
  }

  const left = evaluateAst(node.left, context)
  if (isSpreadsheetError(left)) return left
  const right = evaluateAst(node.right, context)
  if (isSpreadsheetError(right)) return right
  return calculate(node.operator, left, right)
}

export function evaluateFormula(source: string, context?: EvaluationContext): CellValue {
  const parsed = parseFormula(source)
  if (!parsed.ok) {
    return spreadsheetError('#PARSE!', parsed.diagnostic.message, parsed.diagnostic.position)
  }
  return evaluateAst(parsed.ast, context)
}
