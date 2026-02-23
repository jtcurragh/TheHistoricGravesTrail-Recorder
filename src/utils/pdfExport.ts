import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
} from 'pdf-lib'
import type { Trail, POIRecord, BrochureSetup } from '../types'

const A6_WIDTH = 297.64
const A6_HEIGHT = 419.53
const TEAL = rgb(58 / 255, 155 / 255, 142 / 255)
const NEAR_BLACK = rgb(11 / 255, 12 / 255, 12 / 255)
const WHITE = rgb(1, 1, 1)
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

  const page1 = doc.addPage([A6_WIDTH, A6_HEIGHT])

  // If cover photo exists, use it; otherwise create text-only cover
  if (setup.coverPhotoBlob) {
    const coverImage = await embedImage(doc, setup.coverPhotoBlob)
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

    // Historic Graves Trail branding at top for photo covers (moved higher to avoid title clash)
    page1.drawText('Historic Graves Trail', {
      x: 20,
      y: A6_HEIGHT - 20,
      size: 9,
      font: helvetica,
      color: WHITE,
    })
  } else {
    // Text-only cover with solid teal background
    page1.drawRectangle({
      x: 0,
      y: 0,
      width: A6_WIDTH,
      height: A6_HEIGHT,
      color: TEAL,
    })

    // Historic Graves Trail branding at bottom for text-only covers (avoid title clash)
    const brandingText = 'Historic Graves Trail'
    const brandingWidth = helvetica.widthOfTextAtSize(brandingText, 9)
    page1.drawText(brandingText, {
      x: (A6_WIDTH - brandingWidth) / 2,
      y: 45,
      size: 9,
      font: helvetica,
      color: WHITE,
    })
  }

  // Title with wrapping if too long
  const titleSize = setup.coverPhotoBlob ? 20 : 24
  const titleText = setup.coverTitle.toUpperCase()
  const maxWidth = A6_WIDTH - 40 // 20px margin on each side
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, titleSize)
  
  let titleBottomY: number // Track where title ends for subtitle placement
  
  if (titleWidth <= maxWidth) {
    // Single line - fits nicely
    const titleY = setup.coverPhotoBlob ? A6_HEIGHT - (A6_HEIGHT / 3) / 2 - titleSize / 2 : A6_HEIGHT / 2
    page1.drawText(titleText, {
      x: (A6_WIDTH - titleWidth) / 2,
      y: titleY,
      size: titleSize,
      font: helveticaBold,
      color: WHITE,
    })
    titleBottomY = titleY
  } else {
    // Multi-line - wrap text
    const words = titleText.split(' ')
    const lines: string[] = []
    let currentLine = ''
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = helveticaBold.widthOfTextAtSize(testLine, titleSize)
      
      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) lines.push(currentLine)
        currentLine = word
      }
    }
    if (currentLine) lines.push(currentLine)
    
    const lineHeight = titleSize * 1.2
    const totalHeight = lines.length * lineHeight
    const startY = setup.coverPhotoBlob 
      ? A6_HEIGHT - (A6_HEIGHT / 3) / 2 + totalHeight / 2
      : A6_HEIGHT / 2 + totalHeight / 2
    
    lines.forEach((line, i) => {
      const lineWidth = helveticaBold.widthOfTextAtSize(line, titleSize)
      page1.drawText(line, {
        x: (A6_WIDTH - lineWidth) / 2,
        y: startY - (i * lineHeight),
        size: titleSize,
        font: helveticaBold,
        color: WHITE,
      })
    })
    titleBottomY = startY - ((lines.length - 1) * lineHeight)
  }

  // Subtitle below main title
  const subtitleText = 'National Historic Graveyard Trail 2026'
  const subtitleSize = 11
  const subtitleWidth = helvetica.widthOfTextAtSize(subtitleText, subtitleSize)
  page1.drawText(subtitleText, {
    x: (A6_WIDTH - subtitleWidth) / 2,
    y: titleBottomY - 20,
    size: subtitleSize,
    font: helvetica,
    color: WHITE,
  })

  const barHeight = 30
  page1.drawRectangle({
    x: 0,
    y: 0,
    width: A6_WIDTH,
    height: barHeight,
    color: setup.coverPhotoBlob ? TEAL : rgb(0.2, 0.6, 0.55),
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

  const introHeaderHeight = 30
  page2.drawRectangle({
    x: 0,
    y: A6_HEIGHT - introHeaderHeight,
    width: A6_WIDTH,
    height: introHeaderHeight,
    color: TEAL,
  })
  page2.drawText('INTRODUCTION', {
    x: 20,
    y: A6_HEIGHT - introHeaderHeight + 8,
    size: 12,
    font: helveticaBold,
    color: WHITE,
  })

  const introWords = setup.introText.trim().split(/\s+/).filter(Boolean).slice(0, 50)
  let introY = A6_HEIGHT - introHeaderHeight - 25
  let line = ''
  const textMaxWidth = A6_WIDTH - 40
  for (const word of introWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 10) > textMaxWidth) {
      if (line && introY > 200) {
        page2.drawText(line, { x: 20, y: introY, size: 10, font: helvetica, color: NEAR_BLACK })
        introY -= 12
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && introY > 200) {
    page2.drawText(line, { x: 20, y: introY, size: 10, font: helvetica, color: NEAR_BLACK })
    introY -= 12
  }

  const fundedHeaderY = introY - 25
  page2.drawText('FUNDED AND SUPPORTED BY', {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize('FUNDED AND SUPPORTED BY', 11) / 2,
    y: fundedHeaderY,
    size: 11,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  const logoCellSize = 55
  const logoPadding = 12
  const logosPerRow = 2
  const logoGridWidth = logosPerRow * (logoCellSize + logoPadding) - logoPadding
  const logoGridStartX = (A6_WIDTH - logoGridWidth) / 2

  let logoY = fundedHeaderY - 15
  for (let i = 0; i < setup.funderLogos.length; i++) {
    const col = i % logosPerRow
    const row = Math.floor(i / logosPerRow)
    const cellX = logoGridStartX + col * (logoCellSize + logoPadding)
    const cellY = logoY - row * (logoCellSize + logoPadding) - logoCellSize
    try {
      const logoBytes = await blobToUint8Array(setup.funderLogos[i])
      const logoImg = isPng(setup.funderLogos[i])
        ? await doc.embedPng(logoBytes)
        : await doc.embedJpg(logoBytes)
      const scale = Math.min(logoCellSize / logoImg.width, logoCellSize / logoImg.height)
      const imgW = logoImg.width * scale
      const imgH = logoImg.height * scale
      const centerX = cellX + (logoCellSize - imgW) / 2
      const centerY = cellY + (logoCellSize - imgH) / 2
      page2.drawImage(logoImg, {
        x: centerX,
        y: centerY,
        width: imgW,
        height: imgH,
      })
    } catch {
      /* Skip logo if embedding fails (e.g. invalid image) */
    }
  }
  logoY -= setup.funderLogos.length > 0 ? Math.ceil(setup.funderLogos.length / logosPerRow) * (logoCellSize + logoPadding) : 0

  const creditsWords = setup.creditsText.trim().split(/\s+/).filter(Boolean).slice(0, 40)
  let creditsY = logoY - 20
  line = ''
  for (const word of creditsWords) {
    const test = line ? `${line} ${word}` : word
    if (helvetica.widthOfTextAtSize(test, 9) > textMaxWidth) {
      if (line && creditsY > 70) {
        const lw = helvetica.widthOfTextAtSize(line, 9)
        page2.drawText(line, {
          x: (A6_WIDTH - lw) / 2,
          y: creditsY,
          size: 9,
          font: helvetica,
          color: NEAR_BLACK,
        })
        creditsY -= 11
      }
      line = word
    } else {
      line = test
    }
  }
  if (line && creditsY > 70) {
    const lw = helvetica.widthOfTextAtSize(line, 9)
    page2.drawText(line, {
      x: (A6_WIDTH - lw) / 2,
      y: creditsY,
      size: 9,
      font: helvetica,
      color: NEAR_BLACK,
    })
    creditsY -= 11
  }

  page2.drawText(setup.groupName, {
    x: A6_WIDTH / 2 - helveticaBold.widthOfTextAtSize(setup.groupName, 10) / 2,
    y: creditsY - 15,
    size: 10,
    font: helveticaBold,
    color: NEAR_BLACK,
  })

  page2.drawText('Content licensed under CC BY-NC-ND', {
    x: A6_WIDTH / 2 - helvetica.widthOfTextAtSize('Content licensed under CC BY-NC-ND', 8) / 2,
    y: 20,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  })

  for (let i = 0; i < validatedPois.length; i++) {
    const poi = validatedPois[i]
    const poiPage = doc.addPage([A6_WIDTH, A6_HEIGHT])
    
    // Hero photo at top (~40% of page height)
    const photoBlob = poi.thumbnailBlob
    const photoBytes = await blobToUint8Array(photoBlob)
    const photoImg = isPng(photoBlob)
      ? await doc.embedPng(photoBytes)
      : await doc.embedJpg(photoBytes)
    
    const photoHeight = A6_HEIGHT * 0.4
    const photoScale = Math.min(
      A6_WIDTH / photoImg.width,
      photoHeight / photoImg.height
    )
    const photoW = photoImg.width * photoScale
    const photoH = photoImg.height * photoScale
    const photoX = (A6_WIDTH - photoW) / 2
    const photoY = A6_HEIGHT - photoH
    
    poiPage.drawImage(photoImg, {
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
    })

    // Title section below photo
    const titleY = photoY - 25
    const headerText = `${poi.sequence}. ${(poi.siteName || poi.filename).toUpperCase()}`
    const titleSize = headerText.length > 40 ? 12 : 14
    poiPage.drawText(headerText.substring(0, 60), {
      x: 20,
      y: titleY,
      size: titleSize,
      font: helveticaBold,
      color: NEAR_BLACK,
    })

    // Thin divider line below title
    const dividerY = titleY - 10
    poiPage.drawRectangle({
      x: 20,
      y: dividerY,
      width: A6_WIDTH - 40,
      height: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })

    // Story text section (digital-only: maximum space for text)
    const storyStartY = dividerY - 20
    const storyEndY = 50 // Digital PDF: no QR code needed, leave minimal space for URL
    const bodyText = poi.story || ''
    const maxLen = 1200 // Digital format allows more text
    const bodyChunk = bodyText.length > maxLen
      ? bodyText.substring(0, maxLen) + '...'
      : bodyText
    const bodyWords = bodyChunk.split(/\s+/)
    let bodyLine = ''
    let by = storyStartY
    for (const word of bodyWords) {
      const test = bodyLine ? `${bodyLine} ${word}` : word
      if (helvetica.widthOfTextAtSize(test, 13) > A6_WIDTH - 40) {
        if (bodyLine && by > storyEndY) {
          poiPage.drawText(bodyLine, { x: 20, y: by, size: 13, font: helvetica, color: NEAR_BLACK })
          by -= 16
        }
        bodyLine = word
      } else {
        bodyLine = test
      }
    }
    if (bodyLine && by > storyEndY) {
      poiPage.drawText(bodyLine, { x: 20, y: by, size: 13, font: helvetica, color: NEAR_BLACK })
      by -= 16
    }

    // Thin divider line above URL section
    const divider2Y = 58
    poiPage.drawRectangle({
      x: 20,
      y: divider2Y,
      width: A6_WIDTH - 40,
      height: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    })

    // Simple URL display at bottom (digital PDF - no QR code needed)
    const urlDisplay = poi.url?.trim() || PLACEHOLDER_URL
    const urlText = urlDisplay.length > 35 ? urlDisplay.substring(0, 32) + '...' : urlDisplay
    const urlTextWidth = helvetica.widthOfTextAtSize(urlText, 9)
    
    poiPage.drawText(urlText, {
      x: (A6_WIDTH - urlTextWidth) / 2,
      y: 30,
      size: 9,
      font: helvetica,
      color: rgb(0.2, 0.4, 0.6), // Blue link color
    })
    
    // "Tap to visit" label above URL
    const tapLabel = 'Tap to visit:'
    const tapLabelWidth = helvetica.widthOfTextAtSize(tapLabel, 8)
    poiPage.drawText(tapLabel, {
      x: (A6_WIDTH - tapLabelWidth) / 2,
      y: 42,
      size: 8,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
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

  // If map blob exists, embed it; otherwise show coordinates list
  console.log('[PDF] Map blob in setup:', setup.mapBlob ? `${setup.mapBlob.size} bytes` : 'null')
  if (setup.mapBlob) {
    try {
      console.log('[PDF] Attempting to embed map image...')
      const mapImg = await embedImage(doc, setup.mapBlob)
      console.log('[PDF] Map image embedded:', mapImg.width, 'x', mapImg.height)
      const mapAreaHeight = A6_HEIGHT - mapHeaderH - 40
      const mapScale = Math.min(
        (A6_WIDTH - 40) / mapImg.width,
        mapAreaHeight / mapImg.height
      )
      const mapW = mapImg.width * mapScale
      const mapH = mapImg.height * mapScale
      const mapX = (A6_WIDTH - mapW) / 2
      const mapY = A6_HEIGHT - mapHeaderH - 20 - mapH

      mapPage.drawImage(mapImg, {
        x: mapX,
        y: mapY,
        width: mapW,
        height: mapH,
      })
      console.log('[PDF] Map image drawn successfully')
    } catch (err) {
      console.error('Failed to embed map image:', err)
      // Fall through to coordinates list
    }
  } else {
    console.log('[PDF] No map blob - skipping map embed')
    const fallbackMsg = 'Map requires POIs with GPS coordinates. Record location when capturing photos to generate a map.'
    const fallbackY = A6_HEIGHT - mapHeaderH - 80
    const words = fallbackMsg.split(/\s+/)
    let fallbackLine = ''
    let fy = fallbackY
    for (const word of words) {
      const test = fallbackLine ? `${fallbackLine} ${word}` : word
      if (helvetica.widthOfTextAtSize(test, 10) > A6_WIDTH - 40) {
        if (fallbackLine && fy > 80) {
          const lw = helvetica.widthOfTextAtSize(fallbackLine, 10)
          mapPage.drawText(fallbackLine, {
            x: (A6_WIDTH - lw) / 2,
            y: fy,
            size: 10,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5),
          })
          fy -= 14
        }
        fallbackLine = word
      } else {
        fallbackLine = test
      }
    }
    if (fallbackLine && fy > 80) {
      const lw = helvetica.widthOfTextAtSize(fallbackLine, 10)
      mapPage.drawText(fallbackLine, {
        x: (A6_WIDTH - lw) / 2,
        y: fy,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      })
    }
  }

  const pdfBytes = await doc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
