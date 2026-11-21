import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.describe('content without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  for (const width of [1440, 390]) {
    test(`shows the page and supports section links at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(baseURL)

      await expect(page.locator('html')).not.toHaveAttribute('data-js')
      await expect(page.locator('.portfolio-loader')).toBeHidden()
      await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')

      // Verify computed styles: an element can occupy space while remaining transparent.
      for (const selector of [
        '.site-header',
        '.wordmark',
        '.hero-greeting',
        '.hero-description',
        '.hero-letter',
        '.hero-period',
      ]) {
        const elements = page.locator(selector)

        for (const element of await elements.all()) {
          await expect(element).toHaveCSS('opacity', '1')
          await expect(element).toHaveCSS('transform', 'none')
        }
      }

      await page.locator('.hero-period').click()
      await expect(page).toHaveURL(/#skills$/)
      await expect(page.locator('#skills')).toBeInViewport()
      await expect(page.locator('#about')).toBeVisible()
      await expect(page.locator('#contact')).toBeVisible()
    })
  }
})
