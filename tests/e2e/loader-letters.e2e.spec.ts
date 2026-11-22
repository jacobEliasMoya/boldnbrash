import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const width of [390, 1440]) {
  test(`loader letters fall sequentially and settle before the reveal at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(baseURL)

    const starts = await page.evaluate(async () => {
      const letters = [
        ...document.querySelectorAll('.portfolio-loader-letter, .portfolio-loader-period'),
      ]
      const starts: number[] = []
      const deadline = performance.now() + 10000

      while (performance.now() < deadline) {
        await new Promise(requestAnimationFrame)

        letters.forEach((letter, index) => {
          if (Number(getComputedStyle(letter).opacity) === 1) starts[index] ??= performance.now()
        })

        if (starts.filter(Number.isFinite).length === letters.length) break
      }

      return starts
    })

    expect(starts).toHaveLength(8)

    for (let index = 1; index < starts.length; index++) {
      expect(starts[index]).toBeGreaterThan(starts[index - 1])
    }

    // Measure the full cascade so an individual dropped frame does not skew the result.
    const averageGap = (starts[starts.length - 1] - starts[0]) / (starts.length - 1)
    expect(averageGap).toBeGreaterThan(65)
    expect(averageGap).toBeLessThan(115)

    await expect
      .poll(() =>
        page.locator('.portfolio-loader-letter').evaluateAll((letters) => {
          const fills = letters.map((letter) =>
            parseFloat(getComputedStyle(letter).getPropertyValue('--title-fill')),
          )

          return {
            hasFill: fills.some((fill) => fill > 0),
            hasRest: fills.some((fill) => fill === 0),
            ordered: fills.every((fill, index) => index === 0 || fills[index - 1] >= fill),
          }
        }),
      )
      .toEqual({ hasFill: true, hasRest: true, ordered: true })

    await expect(page.locator('.portfolio-loader')).toHaveAttribute('data-phase', 'opening')

    const positions = await page
      .locator('.portfolio-loader-letter, .portfolio-loader-period')
      .evaluateAll((letters) =>
        letters.map((letter) => new DOMMatrixReadOnly(getComputedStyle(letter).transform).m42),
      )

    for (const position of positions) expect(Math.abs(position)).toBeLessThan(0.1)
  })
}
