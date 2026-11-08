import type { AstNode, BinaryOperator } from './ast.js'
import { evaluateUnaryFunction } from './functions/registry.js'
import { isSpreadsheetError, type CellValue, type SpreadsheetError } from './values.js'
import { parseFormula } from './parser.js'

function spreadsheetError(error: SpreadsheetError['error'], message?: string, position?: number): SpreadsheetError {
  return { error, ...(message === undefined ? {} : { message }), ...(position === undefined ? {} : { position }) }
}

function calculate(operator: BinaryOperator, left: number, right: number): CellValue {
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

export function evaluateAst(node: AstNode): CellValue {
  if (node.kind === 'number') return node.value

  if (node.kind === 'call') {
    const argument = evaluateAst(node.argument)
    if (isSpreadsheetError(argument)) return argument
    if (typeof argument !== 'number') return spreadsheetError('#VALUE!')
    return evaluateUnaryFunction(node.name, argument) ?? spreadsheetError('#NAME?', `Unknown function: ${node.name}`)
  }

  if (node.kind === 'unary') {
    const operand = evaluateAst(node.operand)
    if (isSpreadsheetError(operand)) return operand
    if (typeof operand !== 'number') return spreadsheetError('#VALUE!')
    return node.operator === '-' ? -operand : operand
  }

  const left = evaluateAst(node.left)
  if (isSpreadsheetError(left)) return left
  const right = evaluateAst(node.right)
  if (isSpreadsheetError(right)) return right
  if (typeof left !== 'number' || typeof right !== 'number') return spreadsheetError('#VALUE!')
  return calculate(node.operator, left, right)
}

export function evaluateFormula(source: string): CellValue {
  const parsed = parseFormula(source)
  if (!parsed.ok) {
    return spreadsheetError('#PARSE!', parsed.diagnostic.message, parsed.diagnostic.position)
  }
  return evaluateAst(parsed.ast)
}
