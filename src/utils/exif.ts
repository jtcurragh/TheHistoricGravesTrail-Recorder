import piexif from 'piexifjs'

// Extended type for EXIF data with orientation
type ExifDictWithOrientation = ReturnType<typeof piexif.load> & {
  '0th'?: {
    [key: number]: number | string | undefined
  }
}

/**
 * Fix image orientation based on EXIF data
 * Many phones store portrait photos as landscape with an orientation flag
 * This function rotates the image to display correctly
 */
export async function fixImageOrientation(blob: Blob): Promise<Blob> {
  try {
    // Only process JPEG images
    if (!blob.type.startsWith('image/jpeg') && !blob.type.startsWith('image/jpg')) {
      return blob
    }

    const arrayBuffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }

    if (!binary.startsWith('\xff\xd8')) {
      return blob
    }

    const exifObj = piexif.load(binary) as ExifDictWithOrientation
    // ImageIFD.Orientation = 274 (0x0112)
    const orientation = exifObj['0th']?.[274] as number | undefined

    console.log('[EXIF] Orientation detected:', orientation)

    // Orientation 1 = normal, undefined = no rotation needed
    if (typeof orientation !== 'number' || orientation === 1) {
      console.log('[EXIF] No rotation needed')
      return blob
    }

    console.log('[EXIF] Applying rotation for orientation:', orientation)

    // Create image and canvas to rotate
    const img = new Image()
    const url = URL.createObjectURL(blob)
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = url
    })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // Set canvas dimensions based on orientation
    if (orientation >= 5 && orientation <= 8) {
      // Orientations 5-8 swap width/height
      canvas.width = img.height
      canvas.height = img.width
    } else {
      canvas.width = img.width
      canvas.height = img.height
    }

    // Apply rotation/flip based on EXIF orientation
    switch (orientation) {
      case 2:
        ctx.transform(-1, 0, 0, 1, img.width, 0)
        break
      case 3:
        ctx.transform(-1, 0, 0, -1, img.width, img.height)
        break
      case 4:
        ctx.transform(1, 0, 0, -1, 0, img.height)
        break
      case 5:
        ctx.transform(0, 1, 1, 0, 0, 0)
        break
      case 6:
        ctx.transform(0, 1, -1, 0, img.height, 0)
        break
      case 7:
        ctx.transform(0, -1, -1, 0, img.height, img.width)
        break
      case 8:
        ctx.transform(0, -1, 1, 0, 0, img.width)
        break
    }

    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((rotatedBlob) => {
        resolve(rotatedBlob || blob)
      }, 'image/jpeg', 0.95)
    })
  } catch (error) {
    console.error('Failed to fix image orientation:', error)
    return blob
  }
}

/**
 * Convert decimal degrees to DMS rational format for EXIF GPS
 */
function degToDmsRational(degFloat: number): [[number, number], [number, number], [number, number]] {
  const abs = Math.abs(degFloat)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const secFloat = (minFloat - min) * 60
  const sec = Math.round(secFloat * 100)
  return [[deg, 1], [min, 1], [sec, 100]]
}

/**
 * Convert DMS rational format from EXIF to decimal degrees
 */
function dmsRationalToDecimal(dms: [[number, number], [number, number], [number, number]]): number {
  const deg = dms[0][0] / dms[0][1]
  const min = dms[1][0] / dms[1][1]
  const sec = dms[2][0] / dms[2][1]
  return deg + min / 60 + sec / 3600
}

/**
 * Extract GPS coordinates from a JPEG Blob's EXIF data.
 * Returns { latitude, longitude, accuracy } or null if no GPS data found.
 */
export async function extractGpsFromJpeg(
  jpegBlob: Blob
): Promise<{ latitude: number; longitude: number; accuracy: number | null } | null> {
  try {
    const arrayBuffer = await jpegBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }

    if (!binary.startsWith('\xff\xd8')) {
      return null
    }

    const exifObj = piexif.load(binary)
    if (!exifObj.GPS) {
      return null
    }

    const latRef = exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef]
    const latDms = exifObj.GPS[piexif.GPSIFD.GPSLatitude]
    const lonRef = exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef]
    const lonDms = exifObj.GPS[piexif.GPSIFD.GPSLongitude]

    if (!latDms || !lonDms || !latRef || !lonRef) {
      return null
    }

    let latitude = dmsRationalToDecimal(latDms as [[number, number], [number, number], [number, number]])
    let longitude = dmsRationalToDecimal(lonDms as [[number, number], [number, number], [number, number]])

    if (latRef === 'S') latitude = -latitude
    if (lonRef === 'W') longitude = -longitude

    return {
      latitude,
      longitude,
      accuracy: null, // EXIF doesn't typically include accuracy
    }
  } catch {
    return null
  }
}

/**
 * Embed GPS coordinates into a JPEG Blob. Returns new Blob with EXIF.
 * On failure, returns original blob unchanged (no GPS in EXIF).
 */
export async function embedGpsInJpeg(
  jpegBlob: Blob,
  latitude: number,
  longitude: number
): Promise<Blob> {
  try {
    const arrayBuffer = await jpegBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const chunkSize = 8192
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, chunk as unknown as number[])
    }

    if (!binary.startsWith('\xff\xd8')) {
      return jpegBlob
    }

    const exifObj = piexif.load(binary)
    if (!exifObj.GPS) {
      exifObj.GPS = {}
    }

    exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? 'N' : 'S'
    exifObj.GPS[piexif.GPSIFD.GPSLatitude] = degToDmsRational(latitude)
    exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? 'E' : 'W'
    exifObj.GPS[piexif.GPSIFD.GPSLongitude] = degToDmsRational(longitude)

    const exifBytes = piexif.dump(exifObj)
    const inserted = piexif.insert(exifBytes, binary)

    const resultBytes = new Uint8Array(inserted.length)
    for (let i = 0; i < inserted.length; i++) {
      resultBytes[i] = inserted.charCodeAt(i)
    }
    return new Blob([resultBytes], { type: 'image/jpeg' })
  } catch {
    return jpegBlob
  }
}
