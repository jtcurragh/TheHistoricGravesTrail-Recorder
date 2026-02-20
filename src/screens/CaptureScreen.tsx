import { useTrail } from '../hooks/useTrail'

export function CaptureScreen() {
  const { activeTrailId } = useTrail()

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <h1 className="text-2xl font-bold text-govuk-text mb-4">
        Capture
      </h1>
      <p className="text-lg text-govuk-text">
        Camera and GPS recording — coming soon
      </p>
      {!activeTrailId && (
        <p className="text-govuk-muted mt-4">
          Open a trail from Trails first to start capturing POIs.
        </p>
      )}
    </main>
  )
}
