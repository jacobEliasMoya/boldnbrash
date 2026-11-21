import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const width of [390, 1440]) {
  test(`the loader frame surrounds the viewport at ${width}px and after resizing`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })

    const frame = page.locator('.loader-progress-frame')
    const pill = page.locator('.loader-progress-pill')

    await expect(pill).toBeVisible()

    for (const viewport of [
      { width, height: 900 },
      { width: width - 40, height: 820 },
    ]) {
      await page.setViewportSize(viewport)

      // Check rendered coordinates, including Motion's SVG translation.
      await expect
        .poll(() =>
          frame.evaluate((element) => {
            const bounds = element.getBoundingClientRect()

            return [bounds.x, bounds.y, bounds.width, bounds.height].map(Math.round)
          }),
        )
        .toEqual([0, 0, viewport.width, viewport.height])
      await expect
        .poll(() =>
          pill.evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight + 0.1),
        )
        .toBe(true)
    }
  })
}

test('the loading pill grows with assets and stays in place when the period opens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  let finishAsset!: () => void
  const heldAsset = new Promise<void>((resolve) => {
    finishAsset = resolve
  })

  await page.route('**/mini-jacob/frame-015.webp*', async (route) => {
    await heldAsset
    await route.continue()
  })

  try {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' })

    const loader = page.locator('.portfolio-loader')
    const progress = page.getByRole('progressbar', { name: 'Loading portfolio assets' })
    const pill = page.locator('.loader-progress-pill')
    const pillWidth = () => pill.evaluate((element) => element.getBoundingClientRect().width)

    await expect(pill).toBeVisible()
    await expect.poll(pillWidth).toBeGreaterThan(34)
    await expect.poll(() => progress.getAttribute('aria-valuenow').then(Number)).toBeLessThan(100)

    // Let the first ResizeObserver measurement reach the SVG before comparing its anchor.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )

    const partialWidth = await pillWidth()
    const leftEdge = await pill.evaluate((element) => element.getBoundingClientRect().left)

    expect(leftEdge).toBeLessThan(1440 / 4)
    expect(await pill.evaluate((element) => element.getBoundingClientRect().bottom)).toBeCloseTo(
      900,
      1,
    )
    expect(await pill.evaluate((element) => element.getBoundingClientRect().height)).toBe(
      await page
        .locator('html')
        .evaluate((element) =>
          parseFloat(getComputedStyle(element).getPropertyValue('--scroll-pill-width')),
        ),
    )
    const partialFrame = await page.locator('.loader-progress-frame').getAttribute('d')

    finishAsset()

    await expect(progress).toHaveAttribute('aria-valuenow', '100')
    await expect.poll(pillWidth).toBeGreaterThan(partialWidth + 1)
    expect(await pill.evaluate((element) => element.getBoundingClientRect().left)).toBeCloseTo(
      leftEdge,
      1,
    )
    await expect(page.locator('.loader-progress-frame')).not.toHaveAttribute('d', partialFrame!)
    await expect(loader).toHaveAttribute('data-phase', 'opening')
    const completedWidth = await pillWidth()
    const completedTop = await pill.evaluate((element) => element.getBoundingClientRect().top)

    expect(completedTop).toBeLessThan(900)
    expect(completedTop).toBeGreaterThan(800)

    // The circle may clip the loader away, but the pill itself must not retract or shrink.
    const held = await pill.evaluate(async (element) => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      )

      const bounds = element.getBoundingClientRect()

      return { width: bounds.width, top: bounds.top }
    })

    expect(held.width).toBeCloseTo(completedWidth, 1)
    expect(held.top).toBeCloseTo(completedTop, 1)
    await expect(loader).toHaveCount(0)
    await expect(page.locator('.portfolio')).toHaveJSProperty('inert', false)
  } finally {
    finishAsset()
  }
})
