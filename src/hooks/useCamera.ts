import { useState, useRef, useCallback, useEffect } from 'react'

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  isReady: boolean
  error: string | null
  stopCamera: () => void
  captureFrame: () => Blob | null
  /** Starts camera if no stream, or reattaches existing stream. Call when entering live view. */
  ensureCameraRunning: () => Promise<void>
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsReady(true)
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Camera not available'
      setError(message)
      setIsReady(false)
    }
  }, [])

  const reattachStream = useCallback(() => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    if (video.srcObject === stream && video.readyState >= 2) return
    video.srcObject = stream
    void video.play().then(() => setIsReady(true))
  }, [])

  const ensureInProgressRef = useRef(false)
  const ensureCameraRunning = useCallback(async () => {
    if (ensureInProgressRef.current) return
    ensureInProgressRef.current = true
    try {
      if (streamRef.current) {
        reattachStream()
      } else {
        await startCamera()
      }
    } finally {
      ensureInProgressRef.current = false
    }
  }, [reattachStream, startCamera])

  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current
    if (!video || !isReady) return null

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0)

    let blob: Blob | null = null
    canvas.toBlob(
      (b) => {
        blob = b
      },
      'image/jpeg',
      0.92,
    )
    if (!blob) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const base64 = dataUrl.split(',')[1]
      if (!base64) return null
      const raw = atob(base64)
      const arr = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) {
        arr[i] = raw.charCodeAt(i)
      }
      blob = new Blob([arr], { type: 'image/jpeg' })
    }

    return blob
  }, [isReady])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  return { videoRef, isReady, error, stopCamera, captureFrame, ensureCameraRunning }
}
