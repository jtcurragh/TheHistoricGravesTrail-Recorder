#!/usr/bin/env node
/**
 * Screenshot documentation script for Trail Recorder app.
 * Logs in via email, navigates each screen, captures full-page PNGs,
 * and compiles them into an annotated PDF.
 */
import { chromium } from 'playwright'
import { mkdir } from 'fs/promises'
import { join } from 'path'
import { createWriteStream, existsSync } from 'fs'
import PDFDocument from 'pdfkit'

const APP_URL = 'https://the-historic-graves-trail-recorder.vercel.app/'
const LOGIN_EMAIL = 'john@eachtra.ie'
const LOGIN_NAME = 'John'
const SCREENSHOTS_DIR = './docs/screenshots'
const PDF_PATH = './docs/trail-recorder-screens.pdf'

const SCREENS = [
  { name: '01 Trails home', path: '/', landmark: /Welcome back/i },
  { name: '02 Record screen', path: '/capture', landmark: /Record Location|Open a trail from Trails first/i },
  { name: '03 Sync screen', path: '/sync', landmark: /Sync/i },
  { name: '04 Trail list', path: '/trail', landmark: /POIs recorded|No POIs recorded/i },
  { name: '05 POI detail', path: null, landmark: /Site name/i },
  { name: '06 Export screen', path: '/export', landmark: /Export/i },
  { name: '07 Brochure Setup', path: '/brochure-setup-via-export', landmark: /Brochure Setup/i },
  { name: '08 Delete confirmation modal', path: null, landmark: /This cannot be undone/i },
]

async function login(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  const nameInput = page.getByPlaceholder(/first and last name/i)
  if (await nameInput.isVisible()) {
    await nameInput.fill(LOGIN_NAME)
    await page.getByPlaceholder(/email address/i).fill(LOGIN_EMAIL)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(3000)
    const welcomeBack = page.getByText(/Welcome back!/i)
    if (await welcomeBack.isVisible()) {
      await page.getByRole('button', { name: /continue/i }).click()
      await page.waitForTimeout(2000)
    }
    const parishInput = page.getByPlaceholder(/Graveyard name/i)
    if (await parishInput.isVisible()) {
      await parishInput.fill('Test Graveyard')
      await page.getByPlaceholder(/Parish or place name/i).fill('Test Parish')
      await page.getByRole('button', { name: /create my trails/i }).click()
      await page.waitForTimeout(3000)
    }
  }
}

async function ensureTrailOpen(page) {
  const openBtn = page.getByRole('button', { name: /Open.*Graveyard Trail|Open.*Parish Trail/i }).first()
  if (await openBtn.isVisible()) {
    await openBtn.click()
    await page.waitForURL(/\/trail/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')
  }
}

async function main() {
  await mkdir(SCREENSHOTS_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  try {
    await login(page)

    const screenshots = []

    for (const screen of SCREENS) {
      if (screen.path === '/trail' || (screen.path === null && screen.name.includes('POI detail'))) {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })
        await ensureTrailOpen(page)
        if (screen.path === '/trail') {
          await page.getByText(/POIs recorded|No POIs recorded/).first().waitFor({ timeout: 10000 })
        } else {
          const poiRow = page.locator('ul[aria-label="POIs in this trail"] a[href*="/trail/poi/"]').first()
          try {
            await poiRow.waitFor({ state: 'visible', timeout: 15000 })
            await poiRow.click()
            await page.getByText(/Site name/i).first().waitFor({ timeout: 10000 })
          } catch {
            console.warn('No POIs to open, skipping POI detail')
            continue
          }
        }
      } else if (screen.path === null && screen.name.includes('Delete')) {
        await page.goto(APP_URL, { waitUntil: 'networkidle' })
        await ensureTrailOpen(page)
        const deleteBtn = page.locator('[aria-label="POI actions"] button[aria-label^="Delete"]').first()
        try {
          await deleteBtn.waitFor({ state: 'visible', timeout: 15000 })
          await deleteBtn.click()
          await page.getByText(/This cannot be undone/i).first().waitFor({ timeout: 5000 })
        } catch {
          console.warn('No delete button (empty trail), skipping delete modal')
          continue
        }
      } else {
        if (screen.path === '/capture') {
          await page.goto(APP_URL, { waitUntil: 'networkidle' })
          await ensureTrailOpen(page)
          await page.goto(APP_URL + 'capture', { waitUntil: 'networkidle' })
        } else if (screen.path === '/brochure-setup-via-export') {
          await page.goto(APP_URL + 'export', { waitUntil: 'networkidle' })
          await page.getByText(/Export/i).first().waitFor({ timeout: 10000 })
          const setupBtn = page.getByRole('button', { name: /Set Up Brochure|Edit Setup/i })
          if (await setupBtn.isVisible()) {
            await setupBtn.click()
            await page.waitForTimeout(2000)
          } else {
            await page.goto(APP_URL + 'brochure-setup', { waitUntil: 'networkidle' })
          }
        } else {
          await page.goto(APP_URL + screen.path.replace(/^\//, ''), { waitUntil: 'networkidle' })
        }
        await page.getByText(screen.landmark).first().waitFor({ timeout: 10000 })
      }

      const filename = `${screen.name.replace(/\s+/g, '-').toLowerCase()}.png`
      const filepath = join(SCREENSHOTS_DIR, filename)
      await page.screenshot({ path: filepath, fullPage: true })
      screenshots.push({ name: screen.name, path: filepath })
      console.log(`Captured: ${screen.name}`)

      if (screen.name.includes('Delete')) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    }

    await browser.close()

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const writeStream = createWriteStream(PDF_PATH)
    doc.pipe(writeStream)

    for (const { name, path } of screenshots) {
      if (!existsSync(path)) continue
      doc.addPage()
      doc.fontSize(16).font('Helvetica-Bold').text(name, 50, 50)
      doc.moveDown(0.5)
      const img = doc.openImage(path)
      const maxWidth = 500
      const maxHeight = 650
      let w = img.width
      let h = img.height
      if (w > maxWidth) {
        h = (h * maxWidth) / w
        w = maxWidth
      }
      if (h > maxHeight) {
        w = (w * maxHeight) / h
        h = maxHeight
      }
      doc.image(path, 50, 100, { width: w, height: h })
      doc.moveDown()
    }

    doc.end()
    await new Promise((resolve) => writeStream.on('finish', resolve))
    console.log(`PDF saved to ${PDF_PATH}`)
  } catch (err) {
    console.error(err)
    await browser.close()
    process.exit(1)
  }
}

main()
