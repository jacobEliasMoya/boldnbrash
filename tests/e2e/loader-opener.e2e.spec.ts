import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const theme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    test(`${theme} loader expands from its period without fading at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript((theme) => localStorage.setItem('portfolio-theme', theme), theme)
      await page.goto(baseURL)

      const loader = page.locator('.portfolio-loader')
      const period = page.locator('.portfolio-loader-period')

      await expect(period).toBeVisible()

      if (theme === 'light') await expect(period).toHaveCSS('background-color', 'rgb(0, 0, 0)')

      await expect(loader).toHaveAttribute('data-phase', 'opening', { timeout: 10000 })

      const origin = await loader.evaluate((element) => {
        const [x, y] = element.getAttribute('data-opener-origin')!.split(',').map(Number)
        const dot = document.querySelector('.portfolio-loader-period')!.getBoundingClientRect()

        return { x, y, expectedX: dot.left + dot.width / 2, expectedY: dot.top + dot.height / 2 }
      })

      expect(origin.x).toBeCloseTo(origin.expectedX, 0)
      expect(origin.y).toBeCloseTo(origin.expectedY, 0)
      await expect(loader).toHaveAttribute('data-aperture', 'open')

      const samples = await loader.evaluate(async (element) => {
        const samples: { opacity: number; clip: string }[] = []

        for (let frame = 0; frame < 8 && element.isConnected; frame++) {
          await new Promise(requestAnimationFrame)
          const style = getComputedStyle(element)

          samples.push({ opacity: Number(style.opacity), clip: style.clipPath })
        }

        return samples
      })

      expect(samples.every(({ opacity }) => opacity === 1)).toBe(true)
      expect(new Set(samples.map(({ clip }) => clip)).size).toBeGreaterThan(1)
      expect(
        await page
          .locator('.portfolio-loader-opener')
          .evaluate((element) => getComputedStyle(element).clipPath),
      ).toMatch(/^circle\(/)
      expect(await loader.evaluate((element) => getComputedStyle(element).clipPath)).toMatch(
        /^path\(evenodd/,
      )
      // Keep the hero entrance and interaction handoff intact after the circular reveal.
      await expect(page.locator('.hero-letter').first()).toHaveCSS('opacity', '1')
      await expect(loader).toHaveCount(0, { timeout: 10000 })
      await expect(page.locator('html')).toHaveAttribute('data-intro-complete', 'true')
      await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
      await expect(page.locator('.scene-top')).toHaveCSS(
        'background-color',
        theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(16, 16, 20)',
      )
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    })
  }
}

test('reduced motion releases the page without the expanding opener', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0)
  await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
})
