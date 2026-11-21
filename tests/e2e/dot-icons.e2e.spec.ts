import { expect, test, type Locator } from '@playwright/test'

async function expectClickRebound(button: Locator, icon: Locator) {
  const samplesReady = await icon.evaluateHandle((element) => ({
    result: new Promise<number[]>((resolve) => {
      element.closest('button')!.addEventListener('click', () => {
        const samples: number[] = []
        const start = performance.now()
        function sample() {
          const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform)
          samples.push(matrix.a)
          if (performance.now() - start < 750) requestAnimationFrame(sample)
          else resolve(samples)
        }
        requestAnimationFrame(sample)
      }, { capture: true, once: true })
    }),
  }))
  let scales: number[]
  try {
    await button.click()
    scales = await samplesReady.evaluate(({ result }) => result)
  } finally {
    await samplesReady.dispose()
  }
  const compressed = scales.findIndex((scale) => scale < 0.92)
  expect(compressed).toBeGreaterThanOrEqual(0)
  expect(scales.slice(compressed + 1).some((scale) => scale > 1.02)).toBe(true)
}

test('mobile menu and project controls visibly gather and rebound before opening or closing', async ({ page }) => {
  test.setTimeout(45000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3000')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('html')).toHaveAttribute('data-mobile-nav-ready', 'true')
  const open = page.getByRole('button', { name: 'Open menu', exact: true })
  await expectClickRebound(open, open.locator('.mobile-menu-dots'))
  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })
  await expect(menu).toBeVisible()
  await expect(menu).not.toHaveAttribute('data-transitioning')
  const close = menu.getByRole('button', { name: 'Close menu' })
  await expectClickRebound(close, close.locator('.mobile-menu-close-dots'))
  await expect(menu).not.toBeVisible()

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-skill', {
    detail: { index: 2, offset: 0.95 }, cancelable: true,
  })))
  const card = page.getByRole('button', { name: /^Read project - GitGo\b/ })
  await expectClickRebound(card, card.locator('.dot-icon'))
  const modal = page.getByRole('dialog', { name: 'GitGo', exact: true })
  await expect(modal).toBeVisible()
  await expect(modal).toHaveCSS('clip-path', 'none')
  const dismiss = modal.getByRole('button', { name: 'Close project' })
  await expectClickRebound(dismiss, dismiss.locator('.dot-icon'))
  await expect(modal).not.toBeVisible()
  await expect(card).toBeFocused()
})
