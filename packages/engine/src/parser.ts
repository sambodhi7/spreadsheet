import { grammar, type ActionDict, type Node } from 'ohm-js'
import type { AstNode, BinaryOperator } from './ast.js'
import { spreadsheetGrammar } from './grammar/generated-spreadsheet-grammar.js'

const MAX_FORMULA_LENGTH = 1_000
const calculatorGrammar = grammar(spreadsheetGrammar)

function astOf(node: Node): AstNode {
  return node.ast() as AstNode
}

function foldBinary(first: Node, operators: Node, operands: Node): AstNode {
  let left = astOf(first)

  for (let index = 0; index < operators.numChildren; index += 1) {
    const operatorNode = operators.child(index)
    const operandNode = operands.child(index)
    const operator = operatorNode.sourceString as BinaryOperator
    const right = astOf(operandNode)
    left = {
      kind: 'binary',
      operator,
      left,
      right,
      start: left.start,
      end: right.end,
    }
  }

  return left
}

function callArguments(optionalArguments: Node): readonly AstNode[] {
  if (optionalArguments.numChildren === 0) return []

  const argumentList = optionalArguments.child(0)
  const first = astOf(argumentList.child(0))
  const remainingExpressions = argumentList.child(2).children.map(astOf)
  return [first, ...remainingExpressions]
}

const actions: ActionDict<AstNode> = {
  Formula(_equals, expression, _end) {
    return astOf(expression)
  },
  Comparison(first, operators, operands) {
    return foldBinary(first, operators, operands)
  },
  Additive(first, operators, operands) {
    return foldBinary(first, operators, operands)
  },
  Multiplicative(first, operators, operands) {
    return foldBinary(first, operators, operands)
  },
  Power(first, operators, operands) {
    return foldBinary(first, operators, operands)
  },
  Unary_op(operator, operand) {
    return {
      kind: 'unary',
      operator: operator.sourceString as '+' | '-',
      operand: astOf(operand),
      start: this.source.startIdx,
      end: this.source.endIdx,
    }
  },
  Primary_number(value) {
    return {
      kind: 'number',
      value: Number(value.sourceString),
      start: this.source.startIdx,
      end: this.source.endIdx,
    }
  },
  Primary_boolean(value) {
    return {
      kind: 'boolean',
      value: value.sourceString.toUpperCase() === 'TRUE',
      start: this.source.startIdx,
      end: this.source.endIdx,
    }
  },
  Primary_cellReference(value) {
    return {
      kind: 'cellReference',
      reference: value.sourceString,
      start: this.source.startIdx,
      end: this.source.endIdx,
    }
  },
  Primary_paren(_open, expression, _close) {
    return astOf(expression)
  },
  Primary_call(call) {
    return astOf(call)
  },
  Call(name, _open, optionalArguments, _close) {
    return {
      kind: 'call',
      name: name.sourceString,
      arguments: callArguments(optionalArguments),
      start: this.source.startIdx,
      end: this.source.endIdx,
    }
  },
}

const calculatorSemantics = calculatorGrammar.createSemantics().addOperation<AstNode>('ast', actions)

export interface ParseDiagnostic {
  readonly position: number
  readonly message: string
}

export type ParseResult =
  | { readonly ok: true; readonly ast: AstNode }
  | { readonly ok: false; readonly diagnostic: ParseDiagnostic }

export function parseFormula(source: string): ParseResult {
  if (source.length > MAX_FORMULA_LENGTH) {
    return {
      ok: false,
      diagnostic: {
        position: MAX_FORMULA_LENGTH,
        message: `Formula exceeds the ${MAX_FORMULA_LENGTH}-character limit`,
      },
    }
  }

  const match = calculatorGrammar.match(source, 'Formula')
  if (match.failed()) {
    return {
      ok: false,
      diagnostic: {
        position: match.getRightmostFailurePosition(),
        message: match.shortMessage,
      },
    }
  }

  return { ok: true, ast: calculatorSemantics(match).ast() as AstNode }
}
