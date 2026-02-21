import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
} from 'pdf-lib'
import type { Trail, POIRecord, BrochureSetup } from '../types'
import { generateQrDataUrl } from './qrCode'

const A6_WIDTH = 297.64
const A6_HEIGHT = 419.53
const TEAL = rgb(58 / 255, 155 / 255, 142 / 255)
const NEAR_BLACK = rgb(11 / 255, 12 / 255, 12 / 255)
const WHITE = rgb(1, 1, 1)
const RED_URL = rgb(192 / 255, 57 / 255, 43 / 255)
const PLACEHOLDER_URL = 'https://thememorytrail.ie'

async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buf = await blob.arrayBuffer()
  return new Uint8Array(buf)
}

function isPng(blob: Blob): boolean {
  return blob.type === 'image/png'
}

async function embedImage(
  doc: PDFDocument,
  blob: Blob
): Promise<PDFImage> {
  const bytes = await blobToUint8Array(blob)
  return isPng(blob) ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
}

export async function generateBrochurePdf(
  _trail: Trail,
  setup: BrochureSetup,
  pois: POIRecord[]
): Promise<Blob> {
  const doc = await PDFDocument.create()
  const helvetica = await doc.embedFont(StandardFonts.Helvetica)
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold)

  const validatedPois = pois
    .filter((p) => p.completed)
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, 8)

  if (!setup.coverPhotoBlob) {
    throw new Error('Cover photo is required')
  }

  const coverImage = await embedImage(doc, setup.coverPhotoBlob)
  const page1 = doc.addPage([A6_WIDTH, A6_HEIGHT])

  const imgScale = Math.max(
    A6_WIDTH / coverImage.width,
    A6_HEIGHT / coverImage.height
  )
  const imgW = coverImage.width * imgScale
  const imgH = coverImage.height * imgScale
  const imgX = (A6_WIDTH - imgW) / 2
  const imgY = A6_HEIGHT - imgH

  page1.drawImage(coverImage, {
    x: imgX,
    y: imgY,
    width: imgW,
    height: imgH,
  })

  const overlayHeight = A6_HEIGHT / 3
  page1.drawRectangle({
    x: 0,
    y: A6_HEIGHT - overlayHeight,
    width: A6_WIDTH,
    height: overlayHeight,
    color: TEAL,
    opacity: 0.7,
  })

  page1.drawText('The Memory Trail', {
    x: 20,
    y: A6_HEIGHT - 30,
    size: 10,
    font: helvetica,
    color: WHITE,
  })

  const titleSize = 22
  const titleWidth = helveticaBold.widthOfTextAtSize(
    setup.coverTitle.toUpperCase(),
    titleSize
  )
  page1.drawText(setup.coverTitle.toUpperCase(), {
    x: (A6_WIDTH - titleWidth) / 2,
    y: A6_HEIGHT - overlayHeight / 2 - titleSize / 2,
    size: titleSize,
    font: helveticaBold,
    color: WHITE,
  })

  const barHeight = 30
  page1.drawRectangle({
    x: 0,
    y: 0,
    width: A6_WIDTH,
    height: barHeight,
    color: TEAL,
  })
  const groupWidth = helveticaBold.widthOfTextAtSize(
    setup.groupName.toUpperCase(),
    12
  )
  page1.drawText(setup.groupName.toUpperCase(), {
    x: (A6_WIDTH - groupWidth) / 2,
    y: 8,
    size: 12,
    font: helveticaBold,
    color: WHITE,
  })

  const page2 = doc.addPage([A6_WIDTH, A6_HEIGHT])
  page2.drawText('FUNDED AND SUPPORTED BY', {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize('FUNDED AND SUPPORTED BY', 14) / 2,
    y: A6_HEIGHT - 40,
    size: 14,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  let logoY = A6_HEIGHT - 80
  const logoSize = 60
  const logosPerRow = 2
  for (let i = 0; i < setup.funderLogos.length; i++) {
    const col = i % logosPerRow
    const row = Math.floor(i / logosPerRow)
    const x = (A6_WIDTH - logosPerRow * (logoSize + 20)) / 2 + col * (logoSize + 20)
    const y = logoY - row * (logoSize + 20)
    try {
      const logoBytes = await blobToUint8Array(setup.funderLogos[i])
      const logoImg = isPng(setup.funderLogos[i])
        ? await doc.embedPng(logoBytes)
        : await doc.embedJpg(logoBytes)
      const scale = Math.min(logoSize / logoImg.width, logoSize / logoImg.height)
      page2.drawImage(logoImg, {
        x,
        y,
        width: logoImg.width * scale,
        height: logoImg.height * scale,
      })
    } catch {
      /* Skip logo if embedding fails (e.g. invalid image) */
    }
  }
  logoY -= setup.funderLogos.length > 0 ? Math.ceil(setup.funderLogos.length / logosPerRow) * (logoSize + 30) : 0

  page2.drawText(setup.groupName, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(setup.groupName, 12) / 2,
    y: logoY - 30,
    size: 12,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  const creditsLines = setup.creditsText.split('\n').filter(Boolean)
  let creditsY = logoY - 60
  for (const line of creditsLines) {
    if (creditsY < 80) break
    const maxWidth = A6_WIDTH - 40
    const words = line.split(/\s+/)
    let currentLine = ''
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word
      if (helvetica.widthOfTextAtSize(test, 10) > maxWidth) {
        if (currentLine) {
          const lw = helvetica.widthOfTextAtSize(currentLine, 10)
          page2.drawText(currentLine, {
            x: (A6_WIDTH - lw) / 2,
            y: creditsY,
            size: 10,
            font: helvetica,
            color: NEAR_BLACK,
          })
          creditsY -= 14
        }
        currentLine = word
      } else {
        currentLine = test
      }
    }
    if (currentLine && creditsY > 80) {
      const lw = helvetica.widthOfTextAtSize(currentLine, 10)
      page2.drawText(currentLine, {
        x: (A6_WIDTH - lw) / 2,
        y: creditsY,
        size: 10,
        font: helvetica,
        color: NEAR_BLACK,
      })
      creditsY -= 14
    }
  }

  page2.drawText('Content licensed under CC BY-NC-ND', {
    x: A6_WIDTH / 2 - helvetica.widthOfTextAtSize('Content licensed under CC BY-NC-ND', 8) / 2,
    y: 20,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  const page3 = doc.addPage([A6_WIDTH, A6_HEIGHT])
  const introHeaderHeight = 35
  page3.drawRectangle({
    x: 0,
    y: A6_HEIGHT - introHeaderHeight,
    width: A6_WIDTH,
    height: introHeaderHeight,
    color: TEAL,
  })
  page3.drawText('INTRODUCTION', {
    x: 20,
    y: A6_HEIGHT - introHeaderHeight + 10,
    size: 14,
    font: helveticaBold,
    color: WHITE,
  })

  const introY = A6_HEIGHT - introHeaderHeight - 30
  const introChunk = setup.introText.substring(0, 800)
  const introWords = introChunk.split(/\s+/)
  let line = ''
  let y = introY
  for (const word of introWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 11) > A6_WIDTH - 40) {
      if (line && y > 60) {
        page3.drawText(line, { x: 20, y, size: 11, font: helvetica, color: NEAR_BLACK })
        y -= 14
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && y > 60) {
    page3.drawText(line, { x: 20, y, size: 11, font: helvetica, color: NEAR_BLACK })
    y -= 14
  }
  page3.drawText(setup.groupName, {
    x: 20,
    y: 30,
    size: 9,
    font: helvetica,
    color: NEAR_BLACK,
  })

  for (let i = 0; i < validatedPois.length; i++) {
    const poi = validatedPois[i]
    const poiPage = doc.addPage([A6_WIDTH, A6_HEIGHT])
    const headerH = A6_HEIGHT * 0.25
    poiPage.drawRectangle({
      x: 0,
      y: A6_HEIGHT - headerH,
      width: A6_WIDTH,
      height: headerH,
      color: TEAL,
    })
    const headerText = `${poi.sequence}. ${(poi.siteName || poi.filename).toUpperCase()}`
    const headerSize = headerText.length > 40 ? 10 : 14
    poiPage.drawText(headerText.substring(0, 60), {
      x: 15,
      y: A6_HEIGHT - headerH + 15,
      size: headerSize,
      font: helveticaBold,
      color: WHITE,
    })

    const blockH = (A6_HEIGHT - headerH) * 0.45
    const blockY = A6_HEIGHT - headerH - blockH
    const halfW = (A6_WIDTH - 30) / 2
    const qrUrl = poi.url?.trim() || PLACEHOLDER_URL
    const qrDataUrl = await generateQrDataUrl(qrUrl)
    const qrImg = await doc.embedPng(qrDataUrl)
    const qrSize = Math.min(halfW - 10, blockH - 40, 80)
    poiPage.drawImage(qrImg, {
      x: 15,
      y: blockY + blockH - qrSize - 5,
      width: qrSize,
      height: qrSize,
    })
    poiPage.drawRectangle({
      x: 15,
      y: blockY + 5,
      width: qrSize,
      height: 18,
      color: NEAR_BLACK,
    })
    poiPage.drawText('Website', {
      x: 15 + (qrSize - helvetica.widthOfTextAtSize('Website', 9)) / 2,
      y: blockY + 8,
      size: 9,
      font: helvetica,
      color: WHITE,
    })

    const photoBlob = poi.thumbnailBlob
    const photoBytes = await blobToUint8Array(photoBlob)
    const photoImg = isPng(photoBlob)
      ? await doc.embedPng(photoBytes)
      : await doc.embedJpg(photoBytes)
    const photoScale = Math.min(
      (halfW - 10) / photoImg.width,
      (blockH - 10) / photoImg.height
    )
    poiPage.drawImage(photoImg, {
      x: 15 + halfW + 5,
      y: blockY + blockH - photoImg.height * photoScale - 5,
      width: photoImg.width * photoScale,
      height: photoImg.height * photoScale,
    })

    const bodyY = blockY - 10
    const bodyText = poi.story || ''
    const maxLen = 600
    const bodyChunk = bodyText.length > maxLen
      ? bodyText.substring(0, maxLen) + '...'
      : bodyText
    const bodyWords = bodyChunk.split(/\s+/)
    let bodyLine = ''
    let by = bodyY
    for (const word of bodyWords) {
      const test = bodyLine ? `${bodyLine} ${word}` : word
      if (helvetica.widthOfTextAtSize(test, 10) > A6_WIDTH - 40) {
        if (bodyLine && by > 50) {
          poiPage.drawText(bodyLine, { x: 15, y: by, size: 10, font: helvetica, color: NEAR_BLACK })
          by -= 12
        }
        bodyLine = word
      } else {
        bodyLine = test
      }
    }
    if (bodyLine && by > 50) {
      poiPage.drawText(bodyLine, { x: 15, y: by, size: 10, font: helvetica, color: NEAR_BLACK })
      by -= 12
    }

    const urlDisplay = poi.url && poi.url.length > 30 ? 'Visit website' : (poi.url || 'Visit website')
    poiPage.drawRectangle({
      x: A6_WIDTH - 95,
      y: 15,
      width: 80,
      height: 22,
      color: RED_URL,
    })
    poiPage.drawText(urlDisplay.substring(0, 12), {
      x: A6_WIDTH - 90,
      y: 20,
      size: 9,
      font: helvetica,
      color: WHITE,
    })
  }

  const mapPage = doc.addPage([A6_WIDTH, A6_HEIGHT])
  const mapHeaderH = 35
  mapPage.drawRectangle({
    x: 0,
    y: A6_HEIGHT - mapHeaderH,
    width: A6_WIDTH,
    height: mapHeaderH,
    color: TEAL,
  })
  mapPage.drawText('MAP', {
    x: 20,
    y: A6_HEIGHT - mapHeaderH + 10,
    size: 14,
    font: helveticaBold,
    color: WHITE,
  })
  mapPage.drawText('Map to be added here.', {
    x: A6_WIDTH / 2 - helvetica.widthOfTextAtSize('Map to be added here.', 12) / 2,
    y: A6_HEIGHT - mapHeaderH - 40,
    size: 12,
    font: helvetica,
    color: NEAR_BLACK,
  })
  mapPage.drawText(
    'GPS coordinates for all POIs are included in your exported ZIP file.',
    {
      x: 20,
      y: A6_HEIGHT - mapHeaderH - 60,
      size: 10,
      font: helvetica,
      color: NEAR_BLACK,
    }
  )
  let coordY = A6_HEIGHT - mapHeaderH - 100
  for (const poi of validatedPois) {
    if (poi.latitude != null && poi.longitude != null && coordY > 50) {
      const ns = poi.latitude >= 0 ? 'N' : 'S'
      const ew = poi.longitude >= 0 ? 'E' : 'W'
      const line = `${poi.sequence}. ${poi.siteName || poi.filename} — ${Math.abs(poi.latitude).toFixed(4)}° ${ns}, ${Math.abs(poi.longitude).toFixed(4)}° ${ew}`
      mapPage.drawText(line.substring(0, 70), {
        x: 20,
        y: coordY,
        size: 9,
        font: helvetica,
        color: NEAR_BLACK,
      })
      coordY -= 14
    }
  }
  mapPage.drawText(
    'Use the ZIP export to generate a map using Google Maps or QGIS',
    {
      x: 20,
      y: 30,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    }
  )

  const pdfBytes = await doc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
