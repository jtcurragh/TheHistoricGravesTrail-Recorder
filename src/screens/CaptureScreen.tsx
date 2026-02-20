import { useEffect, useRef, useState, useCallback } from 'react'
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

type CaptureState = 'idle' | 'live' | 'preview'

export function CaptureScreen() {
  const { activeTrailId } = useTrail()
  const {
    videoRef,
    isReady,
    error: cameraError,
    stopCamera,
    captureFrame,
    ensureCameraRunning,
  } = useCamera()
  const { latitude, longitude, accuracy, status: gpsStatus, recordLocation } = useGPS()

  const [trail, setTrail] = useState<Trail | null>(null)
  const [poiCount, setPoiCount] = useState(0)
  const [captureState, setCaptureState] = useState<CaptureState>('idle')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  const loadTrailState = useCallback(async () => {
    if (!activeTrailId) return
    const t = await getTrailById(activeTrailId)
    setTrail(t ?? null)
    const pois = await getPOIsByTrailId(activeTrailId, { includeBlobs: false })
    setPoiCount(pois.length)
  }, [activeTrailId])

  useEffect(() => {
    loadTrailState()
    return () => stopCamera()
  }, [stopCamera, loadTrailState])

  useEffect(() => {
    if (captureState === 'live') {
      void ensureCameraRunning()
    }
  }, [captureState, ensureCameraRunning])

  function handleStartCamera() {
    setCaptureState('live')
  }

  function handleCapture() {
    const blob = captureFrame()
    if (!blob) return
    setCapturedBlob(blob)
    setPreviewUrl(URL.createObjectURL(blob))
    setCaptureState('preview')
  }

  function handleRetake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl('')
    setCaptureState('live')
  }

  async function handleConfirm() {
    if (!capturedBlob || !trail || !activeTrailId) return
    if (savingRef.current) return

    savingRef.current = true
    setSaving(true)
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
      setPoiCount((c) => c + 1)
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setCapturedBlob(null)
      setPreviewUrl('')
      stopCamera()
      setCaptureState('idle')

      setTimeout(() => setSuccessMessage(null), 1500)
      await loadTrailState()
    } catch (err) {
      console.error('Failed to save photo:', err)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

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

  return (
    <div className="flex flex-col min-h-dvh pb-24">
      <main className="flex-1 flex flex-col">
        {successMessage && (
          <div
            className="bg-tmt-teal text-white text-center text-lg font-bold py-3 px-4"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </div>
        )}

        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center">
          {captureState === 'idle' ? (
            <div className="text-white text-center p-6">
              <span className="text-6xl mb-4 block" aria-hidden>📷</span>
              <p className="text-xl font-bold mb-2">Tap 2. Take Photo below to start camera</p>
              <p className="text-base opacity-80">
                Frame the heritage site in the live view, then tap the shutter button to capture
              </p>
            </div>
          ) : captureState === 'live' ? (
            <>
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}
                playsInline
                muted
                autoPlay
                aria-label="Camera live view"
              />
              {isReady ? (
                <>
                  <div
                    className="absolute inset-8 border-2 border-dashed border-white/60 rounded pointer-events-none"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!isReady}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-white border-4 border-govuk-text flex items-center justify-center shadow-lg disabled:opacity-50"
                    aria-label="Capture photo"
                  >
                    <span className="w-16 h-16 rounded-full bg-tmt-teal" aria-hidden />
                  </button>
                </>
              ) : !cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <p className="text-white text-lg">Starting camera...</p>
                </div>
              ) : null}
              {cameraError && (
                <p className="text-white text-center text-lg p-4">
                  Camera unavailable: {cameraError}
                </p>
              )}
            </>
          ) : (
            <>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Captured heritage site preview"
                  className="w-full h-full object-cover"
                />
              )}
              <div
                className="absolute inset-8 border-2 border-dashed border-white/60 rounded pointer-events-none"
                aria-hidden
              />
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-white text-lg font-bold bg-black/50 rounded py-2 px-3 mb-3">
                  Is the site clearly visible in the photo?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="flex-1 min-h-[56px] bg-white text-govuk-red border-2 border-govuk-red text-lg font-bold rounded"
                    aria-label="Retake photo"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={saving}
                    className="flex-1 min-h-[56px] bg-tmt-teal text-white text-lg font-bold rounded disabled:opacity-50"
                    aria-label="Confirm photo looks good"
                  >
                    {saving ? 'Saving...' : 'Looks Good'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {(captureState === 'idle' || captureState === 'live') && (
          <div className="px-4 py-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xl font-bold text-govuk-text">NEXT {nextId}</p>
              <span className="bg-govuk-background text-govuk-text text-sm font-semibold px-3 py-1 rounded-full">
                {poiCount} of {MAX_POIS} recorded
              </span>
            </div>

            <div className="flex gap-3 mb-3">
              <button
                type="button"
                onClick={recordLocation}
                disabled={gpsStatus === 'loading'}
                className={`flex-1 min-h-[56px] border-2 text-lg font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50 ${
                  gpsStatus === 'success'
                    ? 'bg-govuk-green border-govuk-green text-white'
                    : 'bg-white border-govuk-border text-govuk-text'
                }`}
                aria-label="1. Record GPS location"
              >
                <span aria-hidden>📍</span>
                1. Record Location
              </button>
              <button
                type="button"
                onClick={captureState === 'idle' ? handleStartCamera : undefined}
                disabled={captureState === 'live'}
                className={`flex-1 min-h-[56px] border-2 text-lg font-bold rounded flex items-center justify-center gap-2 ${
                  captureState === 'live'
                    ? 'bg-govuk-green border-govuk-green text-white'
                    : 'bg-white border-govuk-border text-govuk-text'
                }`}
                aria-label={captureState === 'idle' ? '2. Take Photo – start camera' : '2. Take Photo – camera active'}
              >
                <span aria-hidden>📷</span>
                2. Take Photo
              </button>
            </div>

            <p className="text-base text-govuk-text text-center" aria-live="polite">
              {gpsStatus === 'idle' && 'No GPS — tap Record Location'}
              {gpsStatus === 'loading' && 'Getting location...'}
              {gpsStatus === 'success' &&
                `GPS recorded (±${accuracy ? Math.round(accuracy) : '?'}m)`}
              {gpsStatus === 'error' &&
                'Location unavailable — photos will be saved without GPS.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
