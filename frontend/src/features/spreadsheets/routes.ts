export interface EditorRoute {
  page: 'editor'
  workbookId: string
  sheetId: string
}

export type AppRoute = { page: 'library' } | EditorRoute | { page: 'not-found' }

const editorPattern = /^\/workbooks\/([^/]+)\/sheets\/([^/]+)\/?$/

export function currentRoute(pathname = window.location.pathname): AppRoute {
  if (pathname === '/' || pathname === '/workbooks' || pathname === '/workbooks/') {
    return { page: 'library' }
  }
  const match = editorPattern.exec(pathname)
  if (match === null) return { page: 'not-found' }
  const workbookId = match[1]
  const sheetId = match[2]
  if (workbookId === undefined || sheetId === undefined) return { page: 'not-found' }
  return { page: 'editor', workbookId, sheetId }
}

export function workbookUrl(workbookId: string, sheetId: string): string {
  return `/workbooks/${encodeURIComponent(workbookId)}/sheets/${encodeURIComponent(sheetId)}`
}

export function openWorkbook(workbookId: string, sheetId: string): void {
  window.location.assign(workbookUrl(workbookId, sheetId))
}

export function openLibrary(): void {
  window.location.assign('/workbooks')
}
