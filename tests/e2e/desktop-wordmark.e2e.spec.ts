import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('desktop links drop in left to right after the first two hero letters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL)

  const { starts, secondLetterLanded } = await page.evaluate(async () => {
    const selectors = [
      '.liquid-blended-logo .wordmark',
      '.liquid-blended-nav a[href="#top"]',
      '.liquid-blended-nav a[href="#skills"]',
      '.liquid-blended-nav a[href="#about"]',
      '.liquid-blended-nav a[href="#contact"]',
      '.liquid-blended-control .showcase-toggle',
      '.liquid-blended-control .theme-toggle',
    ]
    const starts: number[] = []
    let secondLetterLanded: number | undefined
    const deadline = performance.now() + 15000

    while (performance.now() < deadline) {
      await new Promise(requestAnimationFrame)

      if (document.documentElement.dataset.introComplete !== 'true') continue

      const letter = document.querySelectorAll('.hero-line .hero-letter')[1]

      if (letter) {
        const style = getComputedStyle(letter)
        const y = new DOMMatrixReadOnly(style.transform).m42

        if (Number(style.opacity) > 0.99 && Math.abs(y) < 0.1)
          secondLetterLanded ??= performance.now()
      }

      selectors.forEach((selector, index) => {
        const element = document.querySelector(selector)

        if (!element) return

        const style = getComputedStyle(element)
        const y = new DOMMatrixReadOnly(style.transform).m42
        const started = index === 0 ? y > -99.9 : Number(style.opacity) > 0.01

        if (started) starts[index] ??= performance.now()
      })

      if (starts.filter(Number.isFinite).length === selectors.length) break
    }

    return { starts, secondLetterLanded }
  })

  expect(starts).toHaveLength(7)

  expect(secondLetterLanded).toBeDefined()
  expect(starts[1]).toBeGreaterThanOrEqual(secondLetterLanded!)

  for (let index = 1; index < starts.length; index++) {
    expect(starts[index]).toBeGreaterThan(starts[index - 1])
  }

  const averageLinkGap = (starts[4] - starts[1]) / 3

  expect(averageLinkGap).toBeGreaterThan(45)
  expect(averageLinkGap).toBeLessThan(100)

  await expect(page.locator('.liquid-blended-control .theme-toggle')).toHaveCSS('transform', 'none')
})

for (const theme of ['light', 'dark'] as const) {
  test(`desktop wordmark and liquid share one uninterrupted entrance in ${theme} mode`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.addInitScript((theme) => localStorage.setItem('portfolio-theme', theme), theme)
    await page.goto(baseURL)

    const samples = await page.evaluate(async () => {
      const samples: { difference: number; liquid: boolean }[] = []
      const deadline = performance.now() + 15000
      let started = 0

      while (performance.now() < deadline) {
        await new Promise(requestAnimationFrame)

        if (document.documentElement.dataset.introComplete !== 'true') continue

        started ||= performance.now()

        const layout = document.querySelector('.site-header .wordmark')
        const floating = document.querySelector('.liquid-blended-logo .wordmark')
        const liquid = document.querySelector('.liquid-wordmark-parked')

        if (!layout || !floating || !liquid) continue

        samples.push({
          difference: Math.abs(
            layout.getBoundingClientRect().top - floating.getBoundingClientRect().top,
          ),
          liquid: !!liquid.getAttribute('d'),
        })

        if (performance.now() - started > 1100) break
      }

      return samples
    })

    expect(samples.length).toBeGreaterThan(15)
    expect(Math.max(...samples.map(({ difference }) => difference))).toBeLessThan(8)

    const firstLiquid = samples.findIndex(({ liquid }) => liquid)

    expect(firstLiquid).toBeGreaterThanOrEqual(0)
    expect(samples.slice(firstLiquid).every(({ liquid }) => liquid)).toBe(true)
    await expect(page.locator('.liquid-blended-logo .wordmark')).toBeInViewport()
  })
}
