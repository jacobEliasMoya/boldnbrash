import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const width of [1440, 390]) {
  test(`the loader drops Jake before the introduction, catches it, and releases the page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(baseURL)
    const loader = page.locator('.portfolio-loader')
    await expect(loader).toBeVisible()
    await expect(loader).toHaveAttribute('data-play-once', 'false')
    await expect(loader, 'the loader should be plain black without an inset frame').toHaveCSS(
      'background-color',
      'rgb(8, 8, 9)',
    )
    expect(
      await loader.evaluate((element) => getComputedStyle(element, '::after').content),
    ).toBe('none')
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', true)
    const copyLines = page.locator('.portfolio-loader-copy-line')
    await expect(copyLines).toHaveText(['hey', 'I am', 'Jacob'])
    await expect(copyLines.last()).toHaveCSS('opacity', '0')
    await expect(loader).toHaveAttribute('data-phase', 'copy', { timeout: 7000 })
    await expect(copyLines.last()).toHaveCSS('opacity', '1')
    await expect(loader).toHaveAttribute('data-phase', 'catch')
    await expect(loader).toHaveAttribute('data-assets-ready', 'true')
    await expect(loader).toHaveAttribute('data-load-progress', '100')
    await expect(loader).toHaveCount(0)
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
    await expect(page.locator('html')).not.toHaveAttribute('data-intro-loading')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const requests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('mini-jacob-loader')) requests.push(request.url())
    })
    await page.reload()
    await expect(loader).toBeVisible()
    await expect.poll(() => requests.length).toBeGreaterThan(0)
    await page.getByRole('button', { name: 'Skip intro' }).click()
    await expect(loader).toHaveCount(0)
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
