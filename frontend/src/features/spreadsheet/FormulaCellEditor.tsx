import {
  GridCellKind,
  type GridCell,
  type ProvideEditorComponent,
  type TextCell,
} from '@glideapps/glide-data-grid'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  FormulaCellEditorContext, type FormulaCellEditorController,
} from './formula-cell-editor-context'

export const FormulaCellEditor: ProvideEditorComponent<GridCell> = ({ value, onChange, isHighlighted }) => {
    const callbacks = useContext(FormulaCellEditorContext)
    if (callbacks === null) throw new Error('FormulaCellEditor must be used inside FormulaCellEditorContext')
    const { onFormulaChange, onControllerChange } = callbacks
    const textValue = value as TextCell
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const valueRef = useRef(textValue)
    const onChangeRef = useRef(onChange)
    const [initialLength] = useState(textValue.data.length)
    const selectionRef = useRef({ start: initialLength, end: initialLength })
    const referenceSpan = useRef<{ start: number; end: number } | null>(null)
    const preserveReferenceSpan = useRef(false)
    useEffect(() => {
      valueRef.current = textValue
      onChangeRef.current = onChange
    }, [onChange, textValue])

    const publishSelection = useCallback(() => {
      const input = inputRef.current
      if (input === null) return
      const start = input.selectionStart
      const end = input.selectionEnd
      selectionRef.current = { start, end }
      onFormulaChange(valueRef.current.data, start, end)
    }, [onFormulaChange])

    useEffect(() => {
      const input = inputRef.current
      if (input !== null) {
        const cursor = isHighlighted ? 0 : initialLength
        input.focus()
        input.setSelectionRange(cursor, isHighlighted ? initialLength : cursor)
        selectionRef.current = {
          start: cursor,
          end: isHighlighted ? initialLength : cursor,
        }
      }
    }, [initialLength, isHighlighted])

    useEffect(() => {
      const controller: FormulaCellEditorController = {
        insertReference(reference) {
          const current = valueRef.current
          const span = referenceSpan.current ?? selectionRef.current
          const start = Math.min(span.start, span.end)
          const end = Math.max(span.start, span.end)
          const nextDraft = `${current.data.slice(0, start)}${reference}${current.data.slice(end)}`
          const cursor = start + reference.length
          referenceSpan.current = { start, end: cursor }
          preserveReferenceSpan.current = true
          selectionRef.current = { start: cursor, end: cursor }
          const nextValue: TextCell = {
            ...current,
            kind: GridCellKind.Text,
            data: nextDraft,
            displayData: nextDraft,
          }
          valueRef.current = nextValue
          onChangeRef.current(nextValue)
          onFormulaChange(nextDraft, cursor, cursor)
          queueMicrotask(() => {
            inputRef.current?.focus()
            inputRef.current?.setSelectionRange(cursor, cursor)
            setTimeout(() => { preserveReferenceSpan.current = false }, 0)
          })
        },
      }
      onControllerChange(controller)
      const initialDraft = valueRef.current.data
      if (initialDraft.startsWith('=')) {
        onFormulaChange(initialDraft, selectionRef.current.start, selectionRef.current.end)
      }
      return () => onControllerChange(null)
    }, [onControllerChange, onFormulaChange])

    return (
      <textarea
        ref={inputRef}
        className="gdg-input"
        value={textValue.data}
        aria-label="Edit cell formula"
        onChange={(event) => {
          const draft = event.target.value
          const nextValue: TextCell = { ...textValue, data: draft, displayData: draft }
          valueRef.current = nextValue
          referenceSpan.current = null
          onChange(nextValue)
          if (draft.startsWith('=')) {
            const start = event.target.selectionStart
            const end = event.target.selectionEnd
            selectionRef.current = { start, end }
            onFormulaChange(draft, start, end)
          }
        }}
        onSelect={() => {
          if (preserveReferenceSpan.current) return
          referenceSpan.current = null
          if (valueRef.current.data.startsWith('=')) publishSelection()
        }}
        style={{
          boxSizing: 'border-box',
          display: 'block',
          font: 'inherit',
          height: '100%',
          minHeight: 28,
          minWidth: 160,
          padding: '5px 8px',
          resize: 'none',
          width: '100%',
        }}
      />
    )
}
