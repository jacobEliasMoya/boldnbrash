import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('mobile header reveals logo, play, theme, then menu with overlapping entrances', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)

  const { starts, peaks } = await page.evaluate(async () => {
    const starts: Record<string, number> = {}
    const peaks: Record<string, number> = {}
    const deadline = performance.now() + 20000
    const controls = {
      logo: '.liquid-blended-logo .wordmark',
      play: '.liquid-blended-control .showcase-toggle',
      theme: '.liquid-blended-control .theme-toggle',
      menu: '.liquid-blended-control .mobile-menu-toggle',
    }

    while (performance.now() < deadline) {
      await new Promise(requestAnimationFrame)

      if (document.documentElement.dataset.introComplete !== 'true') continue

      for (const [name, selector] of Object.entries(controls)) {
        const element = document.querySelector(selector)

        if (!element) continue

        const style = getComputedStyle(element)
        const transform = new DOMMatrixReadOnly(style.transform)
        const opacity = Number(style.opacity)
        const progressing = opacity > 0.01

        if (opacity > 0 && opacity < 1) throw new Error(`${name} faded during its pop-in`)

        // The header grows in place instead of dropping from above the viewport.
        if (Math.abs(transform.m42) > 0.1) throw new Error(`${name} moved vertically`)

        if (progressing) {
          starts[name] ??= performance.now()
          peaks[name] = Math.max(peaks[name] ?? 0, transform.m11)
        }
      }

      if (Object.keys(starts).length === 4 && performance.now() - starts.menu > 500) break
    }

    return { starts, peaks }
  })

  expect(Object.keys(starts)).toEqual(['logo', 'play', 'theme', 'menu'])

  // Each 420 ms entrance leads the next by approximately one third of its duration.
  for (const [previous, next] of [
    ['logo', 'play'],
    ['play', 'theme'],
    ['theme', 'menu'],
  ]) {
    const gap = starts[next] - starts[previous]

    expect(gap).toBeGreaterThan(65)
    expect(gap).toBeLessThan(240)
  }

  // All four controls share the dot icon's overshoot and settle back to full size.
  for (const peak of Object.values(peaks)) {
    expect(peak).toBeGreaterThan(1.08)
    expect(peak).toBeLessThanOrEqual(1.17)
  }

  await expect(page.locator('html')).toHaveAttribute('data-mobile-nav-ready', 'true')
  await expect(page.locator('.hero-description')).toHaveCSS('opacity', '1')
})

test('play stays aligned after resizing during the desktop header entrance', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL)

  const play = page.locator('.liquid-blended-control .showcase-toggle')
  const theme = page.locator('.liquid-blended-control .theme-toggle')

  // Cross the breakpoint while Play still carries its desktop entrance offset.
  await expect(play).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -24)', { timeout: 20000 })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(play.locator('.showcase-rounded-icon')).toBeVisible()

  const firstVisible = await page.waitForFunction(() => {
    const button = document.querySelector('.liquid-blended-control .showcase-toggle')

    if (!button) return null

    const { opacity, transform } = getComputedStyle(button)

    return Number(opacity) > 0.01 ? { y: new DOMMatrixReadOnly(transform).m42 } : null
  })
  expect(await firstVisible.jsonValue()).toEqual({ y: 0 })

  await expect(play).toHaveCSS('transform', 'none')
  await expect(theme).toHaveCSS('transform', 'none')

  await expect
    .poll(async () => {
      const playBounds = (await play.boundingBox())!
      const themeBounds = (await theme.boundingBox())!
      const playCenter = playBounds.y + playBounds.height / 2
      const themeCenter = themeBounds.y + themeBounds.height / 2

      return Math.abs(playCenter - themeCenter)
    })
    .toBeLessThan(1)
})
