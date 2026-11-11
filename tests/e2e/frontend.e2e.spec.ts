import { expect, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.use({ viewport: { width: 1440, height: 900 } })

test('navigation includes Home and moves one shared highlight between links', async ({ page }) => {
  await page.goto(baseURL)
  const home = page.getByRole('navigation', { name: 'Portfolio' }).getByRole('link', {
    name: 'Home',
  })
  await expect(home.locator('.nav-home-icon')).toBeVisible()
  await expect(home.locator('.nav-highlight')).toHaveCount(1)
  const work = page.getByRole('link', { name: 'Work', exact: true })
  await work.hover()
  await expect(work.locator('.nav-highlight')).toHaveCount(1)
  await expect(page.locator('.site-header .nav-highlight')).toHaveCount(1)
})

test('scenes open with scroll and close again in reverse', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page).toHaveTitle(/Jacob Moya/)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build.Break.Repeat')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.2))
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#top')).toHaveJSProperty('inert', true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#skills')).toHaveJSProperty('inert', true)
})

test('section reveals remain partial until further scrolling and reverse with scroll', async ({
  page,
}) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  const scrollToProgress = async (progress: number) => {
    await page.evaluate((value) => {
      const track = document.querySelector<HTMLElement>('.scene-track')!
      const stage = track.firstElementChild as HTMLElement
      const start = scrollY + track.getBoundingClientRect().top
      window.scrollTo(0, start + ((track.offsetHeight - stage.clientHeight) * value) / 6)
    }, progress)
  }
  await scrollToProgress(1)
  const panel = page.locator('#skills')
  await expect(panel).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '100%')
  await expect(page.locator('.hero-letter').nth(5)).toHaveCSS('--letter-fill', '100%')
  await scrollToProgress(1.1)
  await expect(panel).toHaveCSS('visibility', 'visible')
  await page.waitForTimeout(1000)
  const radius = () => panel.evaluate((el) => parseFloat(getComputedStyle(el).clipPath.slice(7)))
  const partial = await radius()
  expect(partial).toBeGreaterThan(0)
  await expect(panel).not.toHaveCSS('clip-path', 'none')
  await scrollToProgress(1.32)
  await expect.poll(radius).toBeGreaterThan(partial * 1.5)
  await scrollToProgress(1.04)
  await expect.poll(radius).toBeLessThan(partial)
  await scrollToProgress(1.4)
  await expect(panel).toHaveCSS('clip-path', 'none')
  await scrollToProgress(0)
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '0%')
  await expect(page.locator('#skills')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
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

test('mobile retains reveals and scrollable content; reduced motion retains document flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.locator('#skills')).toHaveJSProperty('inert', true)
  await page.getByRole('link', { name: 'Explore my skills' }).click()
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await page.getByRole('button', { name: 'Next skill', exact: true }).click()
  await expect(page.locator('.wheel-selection strong').last()).toHaveText('Next.js')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.getByRole('heading', { name: 'Selected work.' })).toBeInViewport()
  const work = page.locator('#work')
  expect(await work.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  await work.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(work.locator('.scene-project').last()).toBeInViewport()
  await page.getByRole('link', { name: 'Jacob Moya home' }).click()
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
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
