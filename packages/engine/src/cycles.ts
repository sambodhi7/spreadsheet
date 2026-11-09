import { DependencyGraph } from './graph.js'

export function findCyclicCells(
  graph: DependencyGraph,
  candidates: ReadonlySet<string>,
): ReadonlySet<string> {
  let nextIndex = 0
  const indices = new Map<string, number>()
  const lowLinks = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const cyclic = new Set<string>()

  function connect(address: string): void {
    const index = nextIndex
    nextIndex += 1
    indices.set(address, index)
    lowLinks.set(address, index)
    stack.push(address)
    onStack.add(address)

    for (const precedent of graph.getPrecedents(address)) {
      if (!candidates.has(precedent)) continue
      if (!indices.has(precedent)) {
        connect(precedent)
        lowLinks.set(address, Math.min(lowLinks.get(address)!, lowLinks.get(precedent)!))
      } else if (onStack.has(precedent)) {
        lowLinks.set(address, Math.min(lowLinks.get(address)!, indices.get(precedent)!))
      }
    }

    if (lowLinks.get(address) !== indices.get(address)) return

    const component: string[] = []
    let member: string
    do {
      member = stack.pop()!
      onStack.delete(member)
      component.push(member)
    } while (member !== address)

    if (component.length > 1) {
      for (const cell of component) cyclic.add(cell)
    } else if (graph.getPrecedents(address).has(address)) cyclic.add(address)
  }

  for (const address of candidates) {
    if (!indices.has(address)) connect(address)
  }
  return cyclic
}
