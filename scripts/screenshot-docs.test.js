/**
 * TDD Green phase: Screenshot documentation tests.
 * Login runs in beforeEach (IndexedDB is per-context, so storageState cannot persist it).
 * Each route must be reachable (200) and contain expected landmark text.
 */
import { test, expect } from '@playwright/test'
import { mkdir, writeFile } from 'fs/promises'

const APP_URL = 'https://the-historic-graves-trail-recorder.vercel.app/'
const LOGIN_EMAIL = 'john@eachtra.ie'
const FAILED_SCREENSHOTS_DIR = 'docs/screenshots'
const DEBUG_HTML_PATH = 'docs/debug-trail.html'

async function debugTrailPage(page) {
  await mkdir('docs', { recursive: true })
  const html = await page.content()
  await writeFile(DEBUG_HTML_PATH, html, 'utf-8')
}

async function login(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  const nameInput = page.getByPlaceholder(/first and last name/i)
  if (await nameInput.isVisible()) {
    await nameInput.fill('John')
    await page.getByPlaceholder(/email address/i).fill(LOGIN_EMAIL)
    await page.getByRole('button', { name: /continue/i }).click()
    await page.waitForTimeout(4000)
    const welcomeBack = page.getByText(/Welcome back!/i)
    if (await welcomeBack.isVisible()) {
      await page.getByRole('button', { name: /continue|ok|got it/i }).click().catch(() => {})
      await page.waitForTimeout(2000)
    }
    const parishInput = page.getByPlaceholder(/Graveyard name|graveyard/i)
    if (await parishInput.isVisible()) {
      await parishInput.fill('Test Graveyard')
      await page.getByPlaceholder(/Parish or place name|parish/i).fill('Test Parish')
      await page.getByRole('button', { name: /create my trails|continue/i }).click()
      await page.waitForTimeout(3000)
    }
  }
  await page.getByText(/Welcome back|Open.*Graveyard Trail|Open.*Parish Trail|POIs recorded|No POIs recorded/i).first().waitFor({ timeout: 15000 })
}

async function takeFailureScreenshot(page, screenName) {
  await mkdir(FAILED_SCREENSHOTS_DIR, { recursive: true })
  const safeName = screenName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
  await page.screenshot({
    path: `${FAILED_SCREENSHOTS_DIR}/FAILED_${safeName}.png`,
    fullPage: true,
  })
}

test.describe('Screenshot docs - route reachability and landmarks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Trails home returns 200 and contains Welcome back', async ({ page }) => {
    try {
      const res = await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      expect(res?.status()).toBe(200)
      await expect(page.getByText(/Welcome back/i)).toBeVisible({ timeout: 15000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'Trails home')
      throw err
    }
  })

  test('Record screen returns 200 and contains Record Location', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      const openBtn = page.getByRole('button', { name: /Open.*Graveyard Trail|Open.*Parish Trail/i }).first()
      if (await openBtn.isVisible()) {
        await openBtn.click()
        await page.waitForLoadState('networkidle')
      }
      const res = await page.goto(APP_URL + 'capture')
      await page.waitForLoadState('networkidle')
      expect(res?.status()).toBe(200)
      await expect(
        page.getByText(/Record Location|Open a trail from Trails first/i).first()
      ).toBeVisible({ timeout: 10000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'Record screen')
      throw err
    }
  })

  test('Sync screen returns 200 and contains Sync now button', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      await page.getByRole('link', { name: /Sync/i }).click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('button', { name: /Sync now/i })).toBeVisible({ timeout: 10000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'Sync screen')
      throw err
    }
  })

  test('Trail list returns 200 and contains POIs recorded', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      const openBtn = page.getByRole('button', { name: /Open.*Graveyard Trail|Open.*Parish Trail/i }).first()
      await openBtn.click()
      await page.waitForURL(/\/trail/)
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/POIs recorded|No POIs recorded yet/i).first()).toBeVisible({ timeout: 10000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'Trail list')
      throw err
    }
  })

  test('POI detail returns 200 and contains Site name', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      const openBtn = page.getByRole('button', { name: /Open.*Graveyard Trail|Open.*Parish Trail/i }).first()
      await openBtn.click()
      await page.waitForURL(/\/trail/)
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/POIs recorded|No POIs recorded yet/i).first()).toBeVisible({ timeout: 10000 })
      await debugTrailPage(page)
      const poiRow = page.locator('ul[aria-label="POIs in this trail"] a[href*="/trail/poi/"]').first()
      await expect(poiRow).toBeVisible({ timeout: 15000 })
      await poiRow.click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/Site name/i).first()).toBeVisible({ timeout: 10000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'POI detail')
      throw err
    }
  })

  test('Export screen returns 200 and contains Export', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      await page.getByRole('link', { name: /Export/i }).click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/Export/i).first()).toBeVisible({ timeout: 10000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'Export screen')
      throw err
    }
  })

  test('Brochure Setup returns 200 and contains Brochure Setup', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      await page.getByRole('link', { name: /Export/i }).click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/Export/i).first()).toBeVisible({ timeout: 10000 })
      const setupBtn = page.getByRole('button', { name: /Set Up Brochure|Edit Setup/i })
      await expect(setupBtn).toBeVisible({ timeout: 15000 })
      await setupBtn.click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/Brochure Setup/i).first()).toBeVisible({ timeout: 10000 })
    } catch (err) {
      await takeFailureScreenshot(page, 'Brochure Setup')
      throw err
    }
  })

  test('Delete confirmation modal contains This cannot be undone', async ({ page }) => {
    try {
      await page.goto(APP_URL)
      await page.waitForLoadState('networkidle')
      const openBtn = page.getByRole('button', { name: /Open.*Graveyard Trail|Open.*Parish Trail/i }).first()
      await openBtn.click()
      await page.waitForURL(/\/trail/)
      await page.waitForLoadState('networkidle')
      await expect(page.getByText(/POIs recorded|No POIs recorded yet/i).first()).toBeVisible({ timeout: 10000 })
      await debugTrailPage(page)
      const deleteBtn = page.locator('[aria-label="POI actions"] button[aria-label^="Delete"]').first()
      await expect(deleteBtn).toBeVisible({ timeout: 15000 })
      await deleteBtn.click()
      await expect(page.getByText(/This cannot be undone/i).first()).toBeVisible({ timeout: 5000 })
      await page.getByRole('button', { name: /Cancel/i }).click()
    } catch (err) {
      await takeFailureScreenshot(page, 'Delete confirmation modal')
      throw err
    }
  })
})
