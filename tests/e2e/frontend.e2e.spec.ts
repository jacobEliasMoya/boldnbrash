import { expect, test } from '@playwright/test'

test('can go on homepage', async ({ page }) => {
  await page.goto('http://localhost:3000')

  await expect(page).toHaveTitle(/Jacob Moya/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('Jacob Moya')
  await page.getByRole('link', { name: 'Selected work' }).click()
  await expect(page).toHaveURL(/#work$/)
})

test('night mode is on by default and the light preference survives reload', async ({ page }) => {
  await page.goto('http://localhost:3000')

  const toggle = page.getByRole('button', { name: 'Night mode' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('body')).toHaveCSS('background-image', /fractalNoise/)

  await toggle.focus()
  await toggle.press('Space')
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('body')).toHaveCSS('background-image', 'none')

  await page.reload()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  await toggle.click()
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
})

test('featured projects open by keyboard and the footer is reachable', async ({ page }) => {
  await page.goto('http://localhost:3000')

  const platform = page.locator('#work details').filter({ hasText: 'Platform Modernization' })
  const designSystem = page.locator('#work details').filter({ hasText: 'Design System' })
  const summary = platform.locator('summary')

  await expect(platform).not.toHaveAttribute('open', '')
  await summary.focus()
  await summary.press('Enter')
  await expect(platform).toHaveAttribute('open', '')
  await expect(platform.getByText(/more than 50 state sites/)).toBeVisible()

  await summary.press('Space')
  await expect(platform).not.toHaveAttribute('open', '')
  await designSystem.locator('summary').click()
  await expect(designSystem.getByText(/extended a shared section overlay/)).toBeVisible()

  await page.getByRole('link', { name: 'Contact', exact: true }).click()
  await expect(page).toHaveURL(/#contact$/)
  await expect(page.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute('href', /^mailto:/)
})
