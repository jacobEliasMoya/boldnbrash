import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('mobile entrance runs nav, JM particles, then hero copy', async ({ page }) => {
  test.setTimeout(30000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  const timing = await page.evaluate(async () => {
    const timing: Record<string, number> = {}
    const start = performance.now()
    while (performance.now() - start < 15000) {
      await new Promise(requestAnimationFrame)
      const now = performance.now() - start
      const root = document.documentElement
      const formation = Number(document.querySelector<HTMLElement>('.particle-logo canvas')?.dataset.formation ?? 0)
      const copy = document.querySelector('.hero-letter')
      const description = document.querySelector('.hero-description')
      if (!document.querySelector('.portfolio-loader')) timing.loader ??= now
      if (root.dataset.mobileNavReady === 'true') timing.nav ??= now
      if (formation > 0.01) timing.particles ??= now
      if (formation >= 0.999) timing.formed ??= now
      if (copy && Number(getComputedStyle(copy).opacity) > 0.01) timing.copy ??= now
      if (description && Number(getComputedStyle(description).opacity) >= 0.99) break
    }
    return timing
  })
  expect(Object.keys(timing)).toEqual(expect.arrayContaining(['loader', 'nav', 'particles', 'formed', 'copy']))
  expect(timing.nav).toBeGreaterThanOrEqual(timing.loader)
  expect(timing.particles).toBeGreaterThanOrEqual(timing.nav)
  expect(timing.copy).toBeGreaterThan(timing.formed)
})

for (const width of [1440, 390]) {
  test(`the loader drops Jake before the introduction, catches it, and releases the page at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(baseURL)
    const loader = page.locator('.portfolio-loader')
    await expect(loader).toBeVisible()
    const copyLines = page.locator('.portfolio-loader-copy-line')
    await expect(copyLines.last()).toHaveCSS('opacity', '0')
    await expect.poll(() => loader.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--title-fill')))).toBe(0)
    await expect(page.locator('.site-header')).toHaveCSS('opacity', '0')
    await expect(page.locator('.site-header .wordmark')).toHaveCSS('opacity', '0')
    if (width === 390)
      await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCSS('opacity', '0')
    await expect(page.locator('.hero-letter').first()).toHaveCSS('opacity', '0')
    await expect(loader).toHaveAttribute('data-play-once', 'false')
    await expect(loader, 'the light-mode loader should be white without an inset frame').toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    )
    expect(await loader.evaluate((element) => getComputedStyle(element, '::after').content)).toBe(
      'none',
    )
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', true)
    await expect(copyLines).toHaveText(['Im Jake'])
    await expect(loader).toHaveAttribute('data-phase', 'copy', { timeout: 7000 })
    await expect(copyLines.last()).toHaveCSS('opacity', '1')
    await expect(loader).toHaveAttribute('data-phase', 'catch')
    await expect.poll(() => loader.evaluate((el) => parseFloat(getComputedStyle(el).getPropertyValue('--title-fill')))).toBe(100)
    await expect(loader).toHaveAttribute('data-assets-ready', 'true')
    await expect(loader).toHaveAttribute('data-load-progress', '100')
    await expect(
      page.getByRole('progressbar', { name: 'Loading portfolio assets' }),
    ).toHaveAttribute('aria-valuenow', '100')
    await expect(loader).toHaveCount(0)
    await expect(page.locator('.site-header')).toHaveCSS('opacity', '1')
    await expect(page.locator('.site-header .wordmark')).toHaveCSS('opacity', '1')
    if (width === 390)
      await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCSS('opacity', '1')
    await expect(page.locator('.hero-letter').first()).toHaveCSS('opacity', '1')
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
    await expect(loader).toHaveCount(0)
  })
}

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
