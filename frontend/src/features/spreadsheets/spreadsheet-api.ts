import { apiRequest } from '../../lib/api'
import type { CellChange, SheetSnapshot, SheetSummary, Workbook } from './types'

export async function listWorkbooks(): Promise<Workbook[]> {
  return await apiRequest<Workbook[]>('/workbooks/')
}

export async function getWorkbook(workbookId: string): Promise<Workbook> {
  return await apiRequest<Workbook>(`/workbooks/${workbookId}/`)
}

export async function createWorkbook(title: string): Promise<Workbook> {
  return await apiRequest<Workbook>('/workbooks/', {
    method: 'POST', body: JSON.stringify({ title }),
  })
}

export async function renameWorkbook(workbookId: string, title: string): Promise<Workbook> {
  return await apiRequest<Workbook>(`/workbooks/${workbookId}/`, {
    method: 'PATCH', body: JSON.stringify({ title }),
  })
}

export async function createSheet(workbookId: string, name?: string): Promise<SheetSummary> {
  return await apiRequest<SheetSummary>(`/workbooks/${workbookId}/sheets/`, {
    method: 'POST', body: JSON.stringify(name === undefined ? {} : { name }),
  })
}

export async function renameSheet(sheetId: string, name: string): Promise<SheetSummary> {
  return await apiRequest<SheetSummary>(`/sheets/${sheetId}/`, {
    method: 'PATCH', body: JSON.stringify({ name }),
  })
}

export async function getSheetSnapshot(sheetId: string): Promise<SheetSnapshot> {
  return await apiRequest<SheetSnapshot>(`/sheets/${sheetId}/snapshot/`)
}

export interface SaveCellsResult {
  revision: number
  workbookRevision: number
  changedCells: number
}

export async function saveCells(
  sheetId: string,
  baseRevision: number,
  changes: CellChange[],
): Promise<SaveCellsResult> {
  return await apiRequest<SaveCellsResult>(`/sheets/${sheetId}/cells/`, {
    method: 'PATCH',
    body: JSON.stringify({ baseRevision, changes }),
  })
}
