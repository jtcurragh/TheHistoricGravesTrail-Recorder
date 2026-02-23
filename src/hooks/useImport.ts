import { useState } from 'react'
import { parseZipFile, resolveConflictAndImport, type ImportResult } from '../services/importService'

export function useImport() {
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [conflictPending, setConflictPending] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const triggerImport = async (file: File): Promise<void> => {
    setIsImporting(true)
    setImportResult(null)
    setConflictPending(false)
    setPendingFile(file)

    try {
      const result = await parseZipFile(file)
      setImportResult(result)

      if (result.status === 'conflict') {
        setConflictPending(true)
      }
    } catch (error) {
      setImportResult({
        status: 'error',
        trailId: '',
        trailName: '',
        poisImported: 0,
        poisSkipped: 0,
        imagesFailed: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsImporting(false)
    }
  }

  const resolveConflict = async (strategy: 'overwrite' | 'keep'): Promise<void> => {
    if (!pendingFile) {
      console.error('No pending file to resolve')
      return
    }

    setIsImporting(true)
    setConflictPending(false)

    try {
      const result = await resolveConflictAndImport(pendingFile, strategy)
      setImportResult(result)
    } catch (error) {
      setImportResult({
        status: 'error',
        trailId: '',
        trailName: '',
        poisImported: 0,
        poisSkipped: 0,
        imagesFailed: 0,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      })
    } finally {
      setIsImporting(false)
      setPendingFile(null)
    }
  }

  const resetImport = (): void => {
    setImportResult(null)
    setConflictPending(false)
    setPendingFile(null)
    setIsImporting(false)
  }

  return {
    isImporting,
    importResult,
    conflictPending,
    triggerImport,
    resolveConflict,
    resetImport,
  }
}
