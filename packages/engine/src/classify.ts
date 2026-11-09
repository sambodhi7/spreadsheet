import type { ScalarValue } from './values.js'

const numericPattern = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/

export type ClassifiedInput =
  | { readonly kind: 'empty' }
  | { readonly kind: 'formula'; readonly source: string }
  | { readonly kind: 'literal'; readonly value: ScalarValue }

export function classifyInput(raw: string): ClassifiedInput {
  if (raw.trim() === '') return { kind: 'empty' }
  if (raw.startsWith('=')) return { kind: 'formula', source: raw }
  if (raw.startsWith("'")) return { kind: 'literal', value: raw.slice(1) }

  const trimmed = raw.trim()
  if (numericPattern.test(trimmed)) return { kind: 'literal', value: Number(trimmed) }
  if (trimmed.toUpperCase() === 'TRUE') return { kind: 'literal', value: true }
  if (trimmed.toUpperCase() === 'FALSE') return { kind: 'literal', value: false }
  return { kind: 'literal', value: raw }
}
