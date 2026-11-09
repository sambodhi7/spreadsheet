export class DependencyGraph {
  private readonly precedents = new Map<string, Set<string>>()
  private readonly dependents = new Map<string, Set<string>>()

  updatePrecedents(address: string, nextPrecedents: ReadonlySet<string>): void {
    const previousPrecedents = this.precedents.get(address) ?? new Set<string>()

    for (const precedent of previousPrecedents) {
      if (nextPrecedents.has(precedent)) continue
      const reverseEdges = this.dependents.get(precedent)
      reverseEdges?.delete(address)
      if (reverseEdges?.size === 0) this.dependents.delete(precedent)
    }

    for (const precedent of nextPrecedents) {
      if (previousPrecedents.has(precedent)) continue
      const reverseEdges = this.dependents.get(precedent) ?? new Set<string>()
      reverseEdges.add(address)
      this.dependents.set(precedent, reverseEdges)
    }

    if (nextPrecedents.size === 0) this.precedents.delete(address)
    else this.precedents.set(address, new Set(nextPrecedents))
  }

  getPrecedents(address: string): ReadonlySet<string> {
    return new Set(this.precedents.get(address))
  }

  getDependents(address: string): ReadonlySet<string> {
    return new Set(this.dependents.get(address))
  }

  collectAffected(address: string): ReadonlySet<string> {
    const affected = new Set([address])
    const queue = [address]

    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index]!
      for (const dependent of this.dependents.get(current) ?? []) {
        if (affected.has(dependent)) continue
        affected.add(dependent)
        queue.push(dependent)
      }
    }

    return affected
  }

  clear(): void {
    this.precedents.clear()
    this.dependents.clear()
  }
}
