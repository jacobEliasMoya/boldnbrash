import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.use({ viewport: { width: 1440, height: 900 } })

test('scenes open with scroll and close again in reverse', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page).toHaveTitle(/Jacob Moya/)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build.Break.Repeat.')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.35))
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#top')).toHaveJSProperty('inert', true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#skills')).toHaveJSProperty('inert', true)
})

test('direct navigation, history, and project dialogs work by keyboard', async ({ page }) => {
  await page.goto(baseURL)
  await page.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page).toHaveURL(/#work$/)
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  const button = page.getByRole('button', { name: /View project.*Platform modernization/ })
  await button.focus()
  await button.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Platform modernization' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/more than 50 state sites/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(button).toBeFocused()
  await page.getByRole('link', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', /^mailto:/)
  await page.goBack()
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  await page.goto(`${baseURL}/#skills`)
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
})

test('small screens and reduced motion retain readable document flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')
  await expect(page.locator('#skills')).not.toHaveJSProperty('inert', true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Selected work.' })).toBeInViewport()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')
  await expect(page.locator('#contact')).not.toHaveJSProperty('inert', true)
})


test('skills rotate through every option before opening projects', async ({ page }) => {
  await page.goto(baseURL + '/#skills')
  const selection = page.locator('.wheel-selection strong').last()
  await expect(selection).toHaveText('React')
  for (const name of ['Next.js', 'TypeScript', 'Strapi', 'Go']) {
    await page.getByRole('button', { name: 'Next skill', exact: true }).click()
    await expect(selection).toHaveText(name)
    await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
    await expect(page.locator('#work')).toHaveJSProperty('inert', true)
  }
  await expect(page.getByRole('button', { name: 'Next skill', exact: true })).toBeDisabled()
  await page.mouse.wheel(0, 1600)
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  await page.getByRole('link', { name: 'Skills', exact: true }).click()
  await expect(selection).toHaveText('React')
})
