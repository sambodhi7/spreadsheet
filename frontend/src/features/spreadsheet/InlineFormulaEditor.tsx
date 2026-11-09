import type { Rectangle } from '@glideapps/glide-data-grid'
import { useEffect, useRef } from 'react'

interface InlineFormulaEditorProps {
  bounds: Rectangle
  draft: string
  cursor: number
  onChange(draft: string, selectionStart: number, selectionEnd: number): void
  onCommit(): void
  onCancel(): void
  onSelectionChange(selectionStart: number, selectionEnd: number): void
}

export function InlineFormulaEditor({
  bounds, draft, cursor, onChange, onCommit, onCancel, onSelectionChange,
}: InlineFormulaEditorProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const initialFocus = useRef(true)

  useEffect(() => {
    const delay = initialFocus.current ? 0 : 100
    initialFocus.current = false
    const timeout = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(cursor, cursor)
    }, delay)
    return () => window.clearTimeout(timeout)
  }, [cursor, draft])

  return (
    <textarea
      ref={inputRef}
      aria-label="Edit cell formula"
      value={draft}
      onChange={(event) => onChange(
        event.target.value,
        event.target.selectionStart,
        event.target.selectionEnd,
      )}
      onSelect={(event) => onSelectionChange(
        event.currentTarget.selectionStart,
        event.currentTarget.selectionEnd,
      )}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          onCommit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          onCancel()
        }
      }}
      style={{
        background: 'white',
        border: '2px solid #3b82f6',
        boxSizing: 'border-box',
        color: '#111827',
        font: '13px Arial, sans-serif',
        height: Math.max(bounds.height, 30),
        left: bounds.x,
        minWidth: 160,
        padding: '5px 7px',
        position: 'fixed',
        resize: 'none',
        top: bounds.y,
        width: Math.max(bounds.width, 160),
        zIndex: 1000,
      }}
    />
  )
}
