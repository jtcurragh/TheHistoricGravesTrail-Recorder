/** @type {import('@playwright/test').PlaywrightTestConfig} */
export default {
  testDir: '.',
  testMatch: 'scripts/screenshot-docs.test.js',
  timeout: 60000,
  use: {
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    baseURL: 'https://the-historic-graves-trail-recorder.vercel.app',
  },
}
