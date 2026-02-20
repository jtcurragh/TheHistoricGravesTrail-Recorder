import piexif from 'piexifjs'

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
