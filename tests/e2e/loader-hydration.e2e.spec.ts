import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('hosting head whitespace does not interrupt the loader or hydration', async ({
  page,
  context,
  browserName,
}) => {
  const errors: string[] = []

  page.on('pageerror', (error) => errors.push(error.message))

  // Chrome requires permission for localhost assets after intercepting a document response.
  if (browserName === 'chromium' && new URL(baseURL).hostname === 'localhost') {
    await context.grantPermissions(['local-network-access'])
  }

  // Reproduce the HTML modification observed on the deployed Netlify page.
  await page.route(baseURL, async (route) => {
    const response = await route.fetch()
    const html = await response.text()

    await route.fulfill({
      response,
      body: html.replace('<head>', '<head>\n<!-- Hosting information -->'),
    })
  })

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })

  const loader = page.locator('.portfolio-loader')

  await expect(loader).toHaveAttribute('data-active', '')
  await expect(loader).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-js', '')

  // A lost bootstrap marker must not hide an already active client loader.
  await page.locator('html').evaluate((element) => element.removeAttribute('data-js'))
  await expect(loader).toBeVisible()
  await expect(loader).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('html')).toHaveAttribute('data-intro-complete', 'true')
  expect(errors).toEqual([])
})

test.describe('reduced motion hydration', () => {
  test.use({ reducedMotion: 'reduce' })

  test('keeps server and client markup consistent and releases the page', async ({ page }) => {
    const errors: string[] = []

    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(baseURL)

    await expect(page.locator('html')).toHaveAttribute('data-intro-complete', 'true', {
      timeout: 15000,
    })
    await expect(page.locator('.portfolio-loader')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-js', '')
    expect(errors).toEqual([])
  })
})
