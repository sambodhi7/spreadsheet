import { expandRange, parseCellAddress, type GridLimits } from './address.js'
import type { AstNode } from './ast.js'

export function extractReferences(node: AstNode, limits: GridLimits): ReadonlySet<string> {
  const references = new Set<string>()

  function visit(current: AstNode): void {
    switch (current.kind) {
      case 'cellReference': {
        const parsed = parseCellAddress(current.reference, limits)
        if (parsed.ok) references.add(parsed.value.address)
        return
      }
      case 'range': {
        const expanded = expandRange(
          current.rangeKind,
          current.startReference,
          current.endReference,
          limits,
        )
        if (expanded.ok) {
          for (const address of expanded.value.addresses) references.add(address)
        }
        return
      }
      case 'unary':
        visit(current.operand)
        return
      case 'binary':
        visit(current.left)
        visit(current.right)
        return
      case 'call':
        for (const argument of current.arguments) visit(argument)
        return
      case 'number':
      case 'boolean':
        return
    }
  }

  visit(node)
  return references
}
