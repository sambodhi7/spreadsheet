export type CellPosition = readonly [column: number, row: number]

/** Temporary raw inputs only. Formula interpretation belongs to the future engine. */
export function createRawCellStore() {
  const cells = new Map<string, string>()
  const keyOf = ([column, row]: CellPosition) => `${column}:${row}`

  return {
    get(position: CellPosition): string {
      return cells.get(keyOf(position)) ?? ''
    },
    set(position: CellPosition, raw: string): boolean {
      const key = keyOf(position)
      if ((cells.get(key) ?? '') === raw) return false

      if (raw === '') cells.delete(key)
      else cells.set(key, raw)

      return true
    },
  }
}
