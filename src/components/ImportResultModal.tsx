import type { ImportResult } from '../services/importService'

interface ImportResultModalProps {
  result: ImportResult | null
  conflictPending: boolean
  onResolveConflict: (strategy: 'overwrite' | 'keep') => void
  onClose: () => void
}

export function ImportResultModal({
  result,
  conflictPending,
  onResolveConflict,
  onClose,
}: ImportResultModalProps) {
  if (!result) {
    return null
  }

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  if (conflictPending && result.conflictDetails) {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-conflict-title"
      >
        <div className="bg-white p-6 max-w-md rounded shadow-lg">
          <h2
            id="import-conflict-title"
            className="text-xl font-bold text-govuk-text mb-4"
          >
            Trail Already Exists
          </h2>
          <p className="text-govuk-text mb-4">
            A trail named <strong>{result.trailName}</strong> already exists in your app.
          </p>
          <div className="mb-4 bg-govuk-background p-4 rounded border border-govuk-border">
            <p className="text-govuk-text mb-2">
              <strong>Your local version:</strong>
              <br />
              Last modified: {formatDate(result.conflictDetails.existingLastModified)}
            </p>
            <p className="text-govuk-text">
              <strong>Imported version:</strong>
              <br />
              Last modified: {formatDate(result.conflictDetails.incomingLastModified)}
            </p>
          </div>
          <p className="text-govuk-text mb-6">
            Do you want to overwrite your local trail with the imported one, or keep your existing trail?
          </p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => onResolveConflict('keep')}
              className="flex-1 min-h-[56px] px-4 bg-tmt-teal text-white font-bold text-lg"
            >
              Keep Existing
            </button>
            <button
              type="button"
              onClick={() => onResolveConflict('overwrite')}
              className="flex-1 min-h-[56px] px-4 bg-tmt-teal text-white font-bold text-lg"
            >
              Overwrite
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (result.status === 'error') {
    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-error-title"
      >
        <div className="bg-white p-6 max-w-md rounded shadow-lg">
          <h2
            id="import-error-title"
            className="text-xl font-bold text-govuk-red mb-4"
          >
            Import Failed
          </h2>
          <p className="text-govuk-text mb-6">
            {result.errorMessage || 'An unknown error occurred during import.'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[56px] px-6 bg-tmt-teal text-white font-bold text-lg"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (result.status === 'success') {
    const hasWarnings = result.poisSkipped > 0 || result.imagesFailed > 0

    return (
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-success-title"
      >
        <div className="bg-white p-6 max-w-md rounded shadow-lg">
          <h2
            id="import-success-title"
            className="text-xl font-bold text-govuk-green mb-4"
          >
            Import Successful
          </h2>
          {result.trailName && (
            <p className="text-govuk-text mb-4">
              Trail <strong>{result.trailName}</strong> has been imported.
            </p>
          )}
          <div className="mb-4 bg-govuk-background p-4 rounded border border-govuk-border">
            <p className="text-govuk-text">
              <strong>POIs imported:</strong> {result.poisImported}
            </p>
            {result.poisSkipped > 0 && (
              <p className="text-[#b45309] font-bold mt-2">
                POIs skipped: {result.poisSkipped}
              </p>
            )}
            {result.imagesFailed > 0 && (
              <p className="text-[#b45309] font-bold mt-2">
                Images failed: {result.imagesFailed}
              </p>
            )}
          </div>
          {hasWarnings && (
            <p className="text-govuk-muted text-sm mb-4">
              Some POIs were skipped due to missing photos or invalid data. Check your trail to verify all POIs imported correctly.
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[56px] px-6 bg-tmt-teal text-white font-bold text-lg"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return null
}
