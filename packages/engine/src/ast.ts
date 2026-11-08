export interface SourceSpan {
  readonly start: number
  readonly end: number
}

export interface NumberNode extends SourceSpan {
  readonly kind: 'number'
  readonly value: number
}

export interface UnaryNode extends SourceSpan {
  readonly kind: 'unary'
  readonly operator: '+' | '-'
  readonly operand: AstNode
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '^'

export interface BinaryNode extends SourceSpan {
  readonly kind: 'binary'
  readonly operator: BinaryOperator
  readonly left: AstNode
  readonly right: AstNode
}

export interface CallNode extends SourceSpan {
  readonly kind: 'call'
  readonly name: string
  readonly argument: AstNode
}

export type AstNode = NumberNode | UnaryNode | BinaryNode | CallNode
