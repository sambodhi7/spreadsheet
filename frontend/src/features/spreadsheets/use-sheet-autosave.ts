import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../lib/api'
import { saveCells } from './spreadsheet-api'
import type { CellChange } from './types'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error' | 'conflict'

const AUTOSAVE_DELAY_MS = 750
const MAX_BATCH_SIZE = 500

export function useSheetAutosave(sheetId: string, initialRevision: number) {
  const revisionRef = useRef(initialRevision)
  const pendingRef = useRef(new Map<string, CellChange>())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const mountedRef = useRef(true)
  const flushRef = useRef<() => Promise<void>>(async () => {})
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const flush = useCallback(async () => {
    if (savingRef.current || pendingRef.current.size === 0) return
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const batch = [...pendingRef.current.entries()].slice(0, MAX_BATCH_SIZE)
    for (const [key] of batch) pendingRef.current.delete(key)
    savingRef.current = true
    let failed = false
    let failureStatus: SaveStatus = 'error'
    const changes = batch.map(([, change]) => change)
    if (mountedRef.current) setStatus('saving')
    if (mountedRef.current) setErrorMessage(null)
    try {
      let result
      try {
        result = await saveCells(sheetId, revisionRef.current, changes)
      } catch (error) {
        const currentRevision = error instanceof ApiError
          ? error.payload.currentRevision
          : undefined
        if (error instanceof ApiError && error.status === 409 && typeof currentRevision === 'number') {
          revisionRef.current = currentRevision
          result = await saveCells(sheetId, currentRevision, changes)
        } else {
          throw error
        }
      }
      revisionRef.current = result.revision
      if (mountedRef.current) setStatus(pendingRef.current.size === 0 ? 'saved' : 'pending')
    } catch (error) {
      failed = true
      failureStatus = error instanceof ApiError && error.status === 409 ? 'conflict' : 'error'
      // Preserve newer edits already queued for the same coordinate.
      for (const [key, change] of batch) {
        if (!pendingRef.current.has(key)) pendingRef.current.set(key, change)
      }
      if (mountedRef.current) {
        setStatus(failureStatus)
        setErrorMessage(error instanceof ApiError
          ? `Save failed (HTTP ${error.status}): ${error.message}`
          : error instanceof Error ? `Save failed: ${error.message}` : 'Save failed: unknown error')
      }
    } finally {
      savingRef.current = false
      if (pendingRef.current.size > 0 && !failed) {
        if (mountedRef.current) {
          timerRef.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_DELAY_MS)
        } else {
          void flushRef.current()
        }
      }
    }
  }, [sheetId])
  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  const queueChange = useCallback((change: CellChange) => {
    pendingRef.current.set(`${change.column}:${change.row}`, change)
    if (status !== 'conflict') setStatus('pending')
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => { void flushRef.current() }, AUTOSAVE_DELAY_MS)
  }, [status])

  const retry = useCallback(() => {
    setStatus('pending')
    void flushRef.current()
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const pending = pendingRef
    const saving = savingRef
    const timer = timerRef
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current.size === 0 && !saving.current) return
      event.preventDefault()
    }
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') void flushRef.current()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    document.addEventListener('visibilitychange', flushWhenHidden)
    return () => {
      if (timer.current !== null) clearTimeout(timer.current)
      if (!saving.current && pending.current.size > 0) void flushRef.current()
      mountedRef.current = false
      window.removeEventListener('beforeunload', warnBeforeUnload)
      document.removeEventListener('visibilitychange', flushWhenHidden)
    }
  }, [])

  return { queueChange, retry, status, errorMessage }
}
