export interface SourceSpan {
  readonly start: number
  readonly end: number
}

export interface NumberNode extends SourceSpan {
  readonly kind: 'number'
  readonly value: number
}

export interface BooleanNode extends SourceSpan {
  readonly kind: 'boolean'
  readonly value: boolean
}

export interface CellReferenceNode extends SourceSpan {
  readonly kind: 'cellReference'
  readonly reference: string
}

export interface RangeNode extends SourceSpan {
  readonly kind: 'range'
  readonly rangeKind: 'cells' | 'columns'
  readonly startReference: string
  readonly endReference: string
}

export interface UnaryNode extends SourceSpan {
  readonly kind: 'unary'
  readonly operator: '+' | '-'
  readonly operand: AstNode
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '^' | '=' | '<>' | '<' | '<=' | '>' | '>='

export interface BinaryNode extends SourceSpan {
  readonly kind: 'binary'
  readonly operator: BinaryOperator
  readonly left: AstNode
  readonly right: AstNode
}

export interface CallNode extends SourceSpan {
  readonly kind: 'call'
  readonly name: string
  readonly arguments: readonly AstNode[]
}

export type AstNode = NumberNode | BooleanNode | CellReferenceNode | RangeNode | UnaryNode | BinaryNode | CallNode
