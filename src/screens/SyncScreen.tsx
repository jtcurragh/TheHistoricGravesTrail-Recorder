import { useSync } from '../hooks/useSync'
import { formatSyncDate } from '../utils/formatSyncDate'
import { features } from '../config/features'
import { supabase } from '../lib/supabase'

function formatPendingMessage(stats: {
  poiCount: number
  trailCount: number
  brochureSetupCount: number
}): string {
  const parts: string[] = []
  if (stats.poiCount > 0)
    parts.push(
      `${stats.poiCount} POI${stats.poiCount !== 1 ? 's' : ''}`
    )
  if (stats.trailCount > 0)
    parts.push(
      `${stats.trailCount} trail${stats.trailCount !== 1 ? 's' : ''}`
    )
  if (stats.brochureSetupCount > 0)
    parts.push(
      `${stats.brochureSetupCount} brochure setup${stats.brochureSetupCount !== 1 ? 's' : ''}`
    )
  if (parts.length === 0) return '0 items'
  return parts.join(', ')
}

export function SyncScreen() {
  const {
    isSyncing,
    lastSyncedAt,
    pendingCount,
    pendingEntityStats,
    syncError,
    syncedStats,
    triggerManualSync,
  } = useSync()

  if (!features.SUPABASE_SYNC_ENABLED || !supabase) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24">
        <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-4">Sync</h1>
        <p className="text-lg text-[#595959]">
          Cloud sync is not configured. Your work is saved on this device.
        </p>
      </main>
    )
  }

  const isGreen = !syncError && pendingCount === 0 && lastSyncedAt
  const isAmber = !syncError && pendingCount > 0
  const isRed = !!syncError

  return (
    <main className="min-h-screen bg-[#f5f5f0] p-6 pb-24 max-w-[680px] mx-auto">
      <h1 className="text-2xl font-semibold text-[#1a2a2a] mb-8">Sync</h1>

      {isSyncing && (
        <div className="mb-6 flex items-center gap-3 text-[#595959]" role="status">
          <span
            className="inline-block w-5 h-5 border-2 border-tmt-teal border-t-transparent rounded-full animate-spin"
            aria-hidden
          />
          <span>Saving your work…</span>
        </div>
      )}

      {isGreen && (
        <div className="space-y-6">
          <div
            className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-govuk-green"
            role="status"
          >
            <span
              className="text-3xl font-bold text-govuk-green"
              aria-hidden
            >
              ✓
            </span>
            <div>
              <p className="text-xl font-bold text-govuk-green">
                Your work is safe
              </p>
              <p className="text-lg text-[#0b0c0c] mt-2">
                Last saved: {formatSyncDate(lastSyncedAt!)}
              </p>
              <p className="text-[#595959] mt-1">
                Items saved: {syncedStats.poiCount} POI
                {syncedStats.poiCount !== 1 ? 's' : ''} across{' '}
                {syncedStats.trailCount} trail
                {syncedStats.trailCount !== 1 ? 's' : ''}
              </p>
              <p className="text-[#595959]">Waiting: 0 items</p>
            </div>
          </div>
        </div>
      )}

      {isAmber && (
        <div className="space-y-6">
          <div
            className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-amber-500"
            role="status"
          >
            <span
              className="text-2xl font-bold text-amber-700"
              aria-hidden
            >
              ●
            </span>
            <div>
              <p className="text-xl font-bold text-amber-800">
                Saving when you have a connection
              </p>
              <p className="text-lg text-[#0b0c0c] mt-2">
                {formatPendingMessage(pendingEntityStats)} waiting to save
              </p>
              <p className="text-[#595959] text-sm mt-4">
                Your work is saved on this device. It will save automatically
                when you have a connection.
              </p>
            </div>
          </div>
        </div>
      )}

      {isRed && (
        <div className="space-y-6">
          <div
            className="flex items-start gap-4 p-5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-govuk-red"
            role="alert"
          >
            <span
              className="text-2xl font-bold text-govuk-red"
              aria-hidden
            >
              ●
            </span>
            <div>
              <p className="text-xl font-bold text-govuk-red">
                Sync problem
              </p>
              {syncError && (
                <p className="text-[#0b0c0c] mt-2 font-mono text-sm break-words">
                  {syncError}
                </p>
              )}
              {lastSyncedAt && (
                <p className="text-lg text-[#0b0c0c] mt-2">
                  Last successful save: {formatSyncDate(lastSyncedAt)}
                </p>
              )}
              <p className="text-[#0b0c0c] mt-1">
                {formatPendingMessage(pendingEntityStats)} waiting
              </p>
              <p className="text-[#595959] text-sm mt-4">
                Don&apos;t worry — your work is safe on this device. Try again
                when you have a good connection, or contact your area editor.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isGreen && !isAmber && !isRed && (
        <div className="p-5 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-[#3a9b8e]">
          <p className="text-lg text-[#0b0c0c]">
            Your work will save automatically when you have a connection.
          </p>
          <p className="text-[#595959] text-sm mt-2">
            Nothing to save yet. Start recording to see your progress here.
          </p>
        </div>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={() => void triggerManualSync()}
          disabled={isSyncing}
          className="min-h-[56px] w-full px-6 bg-[#2d7a6e] text-white font-bold text-lg rounded-[12px] disabled:opacity-50"
        >
          {isSyncing ? 'Saving…' : 'Sync now'}
        </button>
      </div>
    </main>
  )
}
