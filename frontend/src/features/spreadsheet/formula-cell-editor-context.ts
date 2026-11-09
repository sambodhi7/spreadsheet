import { createContext } from 'react'

export interface FormulaCellEditorController {
  insertReference(reference: string): void
}

export interface FormulaCellEditorCallbacks {
  onFormulaChange(draft: string, selectionStart: number, selectionEnd: number): void
  onControllerChange(controller: FormulaCellEditorController | null): void
}

export const FormulaCellEditorContext = createContext<FormulaCellEditorCallbacks | null>(null)
