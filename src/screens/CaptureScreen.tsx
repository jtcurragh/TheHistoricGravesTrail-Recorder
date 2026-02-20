import { useEffect, useState } from 'react'
import { useTrail } from '../hooks/useTrail'
import { useCamera } from '../hooks/useCamera'
import { useGPS } from '../hooks/useGPS'
import { getTrailById } from '../db/trails'
import { getPOIsByTrailId } from '../db/pois'
import { createPOI } from '../db/pois'
import { incrementTrailSequence } from '../db/trails'
import { generatePOIId, generateFilename } from '../utils/idGeneration'
import { generateThumbnail } from '../utils/thumbnail'
import { embedGpsInJpeg } from '../utils/exif'
import type { Trail } from '../types'

const MAX_POIS = 12

type CapturePhase = 'viewfinder' | 'preview' | 'success'

export function CaptureScreen() {
  const { activeTrailId } = useTrail()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [poiCount, setPoiCount] = useState(0)
  const [phase, setPhase] = useState<CapturePhase>('viewfinder')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { stream, error: cameraError, startCamera, stopCamera, captureFrame, videoRef } = useCamera()
  const { latitude, longitude, accuracy, status: gpsStatus, recordLocation } = useGPS()

  useEffect(() => {
    if (!activeTrailId) return
    getTrailById(activeTrailId).then((t) => setTrail(t ?? null))
    getPOIsByTrailId(activeTrailId, { includeBlobs: false }).then((pois) => setPoiCount(pois.length))
  }, [activeTrailId])

  const [cameraStarted, setCameraStarted] = useState(false)

  useEffect(() => {
    if (cameraStarted && activeTrailId && trail && phase === 'viewfinder' && poiCount < MAX_POIS) {
      startCamera()
    }
    return () => stopCamera()
  }, [cameraStarted, activeTrailId, trail, phase, poiCount, startCamera, stopCamera])

  if (!activeTrailId) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">Capture</h1>
        <p className="text-lg text-govuk-text">
          Open a trail from Trails first to start capturing POIs.
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

  const isFull = poiCount >= MAX_POIS
  const nextId = generatePOIId(trail.groupCode, trail.trailType, trail.nextSequence)

  const handleTakePhoto = async () => {
    const blob = await captureFrame()
    if (blob) {
      setCapturedBlob(blob)
      setPhase('preview')
    }
  }

  const handleRetake = () => {
    setCapturedBlob(null)
    setPhase('viewfinder')
  }

  const handleLooksGood = async () => {
    if (!capturedBlob || !trail) return
    setIsSaving(true)
    try {
      let photoBlob = capturedBlob
      if (latitude !== null && longitude !== null) {
        photoBlob = await embedGpsInJpeg(capturedBlob, latitude, longitude)
      }
      const thumbnailBlob = await generateThumbnail(photoBlob)
      const sequence = trail.nextSequence
      const poiId = generatePOIId(trail.groupCode, trail.trailType, sequence)
      const filename = generateFilename(poiId)

      await createPOI({
        trailId: trail.id,
        groupCode: trail.groupCode,
        trailType: trail.trailType,
        sequence,
        filename,
        photoBlob,
        thumbnailBlob,
        latitude,
        longitude,
        accuracy,
        capturedAt: new Date().toISOString(),
      })
      await incrementTrailSequence(trail.id)

      setSuccessMessage(`Saved — ${filename}`)
      setPhase('success')
      setPoiCount((c) => c + 1)
      setCapturedBlob(null)

      setTimeout(() => {
        setSuccessMessage(null)
        setPhase('viewfinder')
      }, 1500)
    } finally {
      setIsSaving(false)
    }
  }

  if (isFull) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">
          Capture — {trail.displayName}
        </h1>
        <p className="text-lg text-govuk-text">
          This trail is full. Open a POI to edit it, or export your trail.
        </p>
      </main>
    )
  }

  if (phase === 'preview' && capturedBlob) {
    return (
      <main className="min-h-screen bg-white p-6 pb-24">
        <h1 className="text-2xl font-bold text-govuk-text mb-4">
          Capture — {trail.displayName}
        </h1>
        <div className="relative w-full aspect-[4/3] bg-black mb-6 overflow-hidden">
          <img
            src={URL.createObjectURL(capturedBlob)}
            alt="Captured heritage site"
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-lg text-govuk-text mb-4">
          Is the site clearly visible in the photo?
        </p>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleRetake}
            disabled={isSaving}
            className="flex-1 min-h-[56px] border-2 border-govuk-red text-govuk-red font-bold"
          >
            Retake
          </button>
          <button
            type="button"
            onClick={handleLooksGood}
            disabled={isSaving}
            className="flex-1 min-h-[56px] bg-tmt-teal text-white font-bold"
          >
            Looks Good
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      <h1 className="text-xl font-bold text-govuk-text px-4 py-3">
        Capture — {trail.displayName}
      </h1>

      {successMessage && (
        <div
          className="bg-tmt-teal text-white px-4 py-3 text-center font-bold"
          role="status"
          aria-live="polite"
        >
          {successMessage}
        </div>
      )}

      <div className="relative w-full aspect-[4/3] bg-govuk-text overflow-hidden">
        {stream ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0 border-4 border-white/50 pointer-events-none"
              style={{ margin: '10%' }}
              aria-hidden
            />
          </>
        ) : !cameraStarted ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
            <span className="text-6xl mb-4" aria-hidden>
              📷
            </span>
            <p className="text-lg font-bold mb-2">Camera access needed</p>
            <p className="text-base mb-6">
              The Memory Trail uses your camera to photograph heritage sites. Tap the button below to allow camera access.
            </p>
            <button
              type="button"
              onClick={() => setCameraStarted(true)}
              className="min-h-[56px] px-8 bg-tmt-teal text-white font-bold"
            >
              Enable Camera
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-6xl mb-4" aria-hidden>
              📷
            </span>
            <p className="text-lg font-bold">Ready to capture</p>
            {cameraError && (
              <p className="text-sm mt-2 text-red-300">{cameraError}</p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-lg font-bold text-govuk-text">NEXT {nextId}</p>
          <span className="px-3 py-1 bg-govuk-background text-govuk-text text-sm">
            {poiCount} of {MAX_POIS} recorded
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={recordLocation}
            disabled={gpsStatus === 'loading'}
            className="min-h-[56px] border-2 border-govuk-border font-bold flex items-center justify-center gap-2"
          >
            <span aria-hidden>📍</span>
            Record Location
          </button>
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={!stream}
            className="min-h-[56px] bg-tmt-teal text-white font-bold flex items-center justify-center gap-2"
          >
            <span aria-hidden>📷</span>
            Take Photo
          </button>
        </div>

        <p className="text-base text-govuk-text" aria-live="polite">
          {gpsStatus === 'idle' && 'No GPS — tap Record Location'}
          {gpsStatus === 'loading' && 'Getting location...'}
          {gpsStatus === 'success' &&
            `GPS recorded (±${accuracy ? Math.round(accuracy) : '?'}m)`}
          {gpsStatus === 'error' &&
            'Location unavailable — photos will be saved without GPS.'}
        </p>
      </div>
    </main>
  )
}
