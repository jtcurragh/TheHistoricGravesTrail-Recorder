import { useEffect, useState } from 'react'
import { useTrail } from '../hooks/useTrail'
import { getTrailById } from '../db/trails'
import type { Trail } from '../types'

export function TrailScreen() {
  const { activeTrailId } = useTrail()
  const [trail, setTrail] = useState<Trail | null>(null)

  useEffect(() => {
    if (!activeTrailId) return
    getTrailById(activeTrailId).then((t) => setTrail(t ?? null))
  }, [activeTrailId])

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">
          No trail selected. Go to Trails to open a trail.
        </p>
      </main>
    )
  }

  if (!trail) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <h1 className="text-2xl font-bold text-govuk-text mb-4">
        {trail.displayName}
      </h1>
      <p className="text-lg text-govuk-text">
        No POIs recorded yet — go to Capture to start
      </p>
    </main>
  )
}
