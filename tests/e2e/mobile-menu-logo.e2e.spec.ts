import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('mobile links stay still while their text fill animates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()

  const links = page.locator('.mobile-menu-links')

  await expect(links).not.toHaveAttribute('inert')

  const about = links.getByRole('link', { name: 'About.', exact: true })

  await about.hover()
  await expect(about).toHaveAttribute('data-highlighted')

  const moving = await about.evaluate(async (link) => {
    for (let frame = 0; frame < 24; frame++) {
      await new Promise(requestAnimationFrame)

      for (const label of link.querySelectorAll('.mobile-menu-label, .mobile-menu-label-fill')) {
        const style = getComputedStyle(label)

        if (style.transform !== 'none' || style.opacity !== '1') return true
      }
    }

    return false
  })

  expect(moving).toBe(false)
  await expect(about.locator('.mobile-menu-label-fill')).toHaveCSS('--letter-fill', '100%')
})

for (const width of [320, 390]) {
  test(`mobile menu centers labels and keeps numbers at the left at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(baseURL)
    await expect(page.locator('.portfolio-loader')).toHaveCount(0)
    await page.getByRole('button', { name: 'Open menu', exact: true }).click()

    const links = page.locator('.mobile-menu-links')

    await expect(links).not.toHaveAttribute('inert')
    await expect(links.locator('.dot-icon, .mobile-menu-current')).toHaveCount(0)

    const positions = await links.locator('a').evaluateAll((rows) =>
      rows.map((row) => {
        const bounds = row.getBoundingClientRect()
        const label = row.querySelector('.mobile-menu-label')!.getBoundingClientRect()
        const number = row.querySelector('.mobile-menu-number')!.getBoundingClientRect()

        return {
          center: label.left + label.width / 2,
          numberLeft: number.left,
          rowLeft: bounds.left,
          rowCenter: bounds.left + bounds.width / 2,
        }
      }),
    )

    for (const position of positions) {
      expect(position.center).toBeCloseTo(position.rowCenter, 0)
      expect(position.numberLeft).toBeCloseTo(position.rowLeft, 0)
    }
  })
}

for (const theme of ['light', 'dark'] as const) {
  for (const reduced of [false, true]) {
    test(`mobile menu keeps its logo visible in ${theme} mode with reduced motion ${reduced}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: reduced ? 320 : 390, height: 844 })
      await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' })
      await page.addInitScript((theme) => localStorage.setItem('portfolio-theme', theme), theme)
      await page.goto(baseURL)
      await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })

      const dialog = page.locator('.mobile-menu-dialog')
      const logo = dialog.getByRole('link', { name: 'Jacob Moya home' })
      const symbol = logo.locator('.wordmark-symbol')

      // Check the actual menu logo, rather than the separate animated header copy.
      for (let opening = 0; opening < 2; opening++) {
        await page.getByRole('button', { name: 'Open menu', exact: true }).click()
        await expect(dialog).toBeVisible()
        await expect(dialog).not.toHaveAttribute('data-transitioning')
        await expect(logo).toBeVisible()
        await expect(logo).toHaveCSS('opacity', '1')
        await expect(logo).toHaveCSS('transform', 'none')
        await expect(symbol).toHaveCSS('width', '36px')
        await expect(symbol).toHaveCSS('height', '36px')
        await expect(symbol).toHaveCSS('mask-image', /jm-symbol\.svg/)
        await expect(logo).toBeInViewport()
        await logo.click({ trial: true })
        await page.getByRole('button', { name: 'Close menu', exact: true }).click()
        await expect(dialog).toBeHidden()
      }
    })
  }
}
