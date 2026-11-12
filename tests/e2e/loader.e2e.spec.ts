import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const width of [1440, 390]) {
  test(`the loader drops Jake before the name, catches it, and releases the page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(baseURL)
    const loader = page.locator('.portfolio-loader')
    await expect(loader).toBeVisible()
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', true)
    await expect(page.locator('.portfolio-loader-name')).toHaveCSS('opacity', '0')
    await expect(loader).toHaveAttribute('data-phase', 'name', { timeout: 7000 })
    await expect(loader).toHaveAttribute('data-phase', 'catch')
    await expect(loader).toHaveCount(0)
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
    await expect(page.locator('html')).not.toHaveAttribute('data-intro-loading')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('mini-jacob-loader')) requests.push(request.url())
    })
    await page.reload()
    await expect(loader).toHaveCount(0)
    expect(requests).toHaveLength(0)
  })
}

test('the intro can be skipped without leaving the page locked', async ({ page }) => {
  await page.goto(baseURL)
  await page.getByRole('button', { name: 'Skip intro' }).click()
  await expect(page.locator('.portfolio-loader')).toHaveCount(0)
  await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
  await expect(page.locator('html')).not.toHaveAttribute('data-intro-loading')
})

test('reduced motion skips the drop sequence and does not load its frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('mini-jacob-loader')) requests.push(request.url())
  })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0)
  expect(requests).toHaveLength(0)
  await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
})

test('a failed loader frame releases the portfolio', async ({ page }) => {
  await page.route('**/mini-jacob-loader/**', (route) => route.abort())
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0)
  await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
})
