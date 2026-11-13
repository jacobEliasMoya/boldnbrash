import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const width of [1440, 390]) {
  test(`light loader opens from its black period at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.addInitScript(() => localStorage.setItem('portfolio-theme', 'light'))
    await page.goto(baseURL)
    const loader = page.locator('.portfolio-loader')
    const period = page.locator('.portfolio-loader-period')
    await expect(period).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(loader).toHaveAttribute('data-phase', 'opening', { timeout: 10000 })
    const origin = await loader.evaluate((element) => {
      const [x, y] = element.getAttribute('data-opener-origin')!.split(',').map(Number)
      const dot = document.querySelector('.portfolio-loader-period')!.getBoundingClientRect()
      return { x, y, expectedX: dot.left + dot.width / 2, expectedY: dot.top + dot.height / 2 }
    })
    expect(origin.x).toBeCloseTo(origin.expectedX, 0)
    expect(origin.y).toBeCloseTo(origin.expectedY, 0)
    await expect(loader).toHaveAttribute('data-aperture', 'open')
    expect(
      await page
        .locator('.portfolio-loader-opener')
        .evaluate((element) => getComputedStyle(element).clipPath),
    ).toMatch(/^circle\(/)
    expect(await loader.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
      /^path\(evenodd/,
    )
    // The hero begins while the loader still exists and is visible through its hole.
    await expect(page.locator('.hero-letter').first()).toHaveCSS('opacity', '1')
    await expect(loader).toHaveCount(0, { timeout: 10000 })
    await expect(page.locator('html')).toHaveAttribute('data-intro-complete', 'true')
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
    await expect(page.locator('.scene-top')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

test('night mode keeps its themed loader and hero', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('portfolio-theme', 'dark'))
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader-period')).toBeHidden()
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })
  await expect(page.locator('.scene-top')).toHaveCSS('background-color', 'rgb(16, 16, 20)')
  await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
})

test('reduced motion releases the page without the expanding opener', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0)
  await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
})
