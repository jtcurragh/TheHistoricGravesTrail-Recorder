import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrail } from '../hooks/useTrail'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import type { Trail } from '../types'
import type { POIRecord } from '../types'

const MAX_POIS = 12

function ThumbnailImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])
  if (!src) return <div className="w-full h-full bg-govuk-background animate-pulse" />
  return <img src={src} alt={alt} className="w-full h-full object-cover" />
}

export function TrailScreen() {
  const navigate = useNavigate()
  const { activeTrailId } = useTrail()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [pois, setPois] = useState<POIRecord[]>([])

  useEffect(() => {
    if (!activeTrailId) return
    Promise.all([
      getTrailById(activeTrailId),
      getPOIsByTrailId(activeTrailId, { includeBlobs: true }),
    ]).then(([t, p]) => {
      setTrail(t ?? null)
      setPois(p ?? [])
    })
  }, [activeTrailId])

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <p className="text-lg text-govuk-text">
          No trail selected. Go to Parish to open a trail.
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

  const poiCount = pois.length
  const completedCount = pois.filter((p) => p.completed).length
  const progressPercent = Math.min(100, (poiCount / MAX_POIS) * 100)

  if (poiCount === 0) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">
          {trail.displayName}
        </h1>
        <p className="text-lg text-govuk-text mb-6">
          No POIs recorded yet — go to Capture to start
        </p>
        <button
          type="button"
          onClick={() => navigate('/capture')}
          className="min-h-[56px] px-6 bg-tmt-teal text-white font-bold text-lg"
        >
          Go to Capture
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white p-6 pb-24">
      <h1 className="text-2xl font-bold text-govuk-text mb-2">
        {trail.displayName}
      </h1>
      <p className="text-lg text-govuk-text mb-3">
        {poiCount} of {MAX_POIS} POIs recorded — {completedCount} completed
      </p>
      <div
        className="h-2 bg-govuk-background mb-6"
        role="progressbar"
        aria-valuenow={poiCount}
        aria-valuemin={0}
        aria-valuemax={MAX_POIS}
        aria-label={`${poiCount} of ${MAX_POIS} POIs recorded`}
      >
        <div
          className="h-full bg-tmt-teal transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {pois
          .sort((a, b) => a.sequence - b.sequence)
          .map((poi) => (
            <div
              key={poi.id}
              className="aspect-square bg-govuk-background rounded overflow-hidden border border-govuk-border"
            >
              <ThumbnailImage
                blob={poi.thumbnailBlob}
                alt={poi.siteName || poi.filename}
              />
            </div>
          ))}
      </div>
    </main>
  )
}
