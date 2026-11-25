import { expect, test, type Page } from '@playwright/test'
import {
  experienceStart,
  sceneDuration,
  skillStart,
  projectStops,
} from '../../src/components/organisms/skillsTimeline'
import { experiencePillTravel } from '../../src/components/organisms/experienceTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function seek(page: Page, position: number) {
  await page.evaluate(
    ({ position, duration }) => {
      const track = document.querySelector<HTMLElement>('.scene-track')!
      const start = scrollY + track.getBoundingClientRect().top
      const travel = track.offsetHeight - track.firstElementChild!.clientHeight
      window.scrollTo({ top: start + (travel * position) / duration, behavior: 'instant' })
    },
    { position, duration: sceneDuration },
  )
  await expect
    .poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(position, 2)
}

for (const width of [320, 390, 440, 1440]) {
  for (const theme of width === 320 || width === 440 ? ['light'] : ['light', 'dark']) {
    test(`liquid visual audit ${width} ${theme}`, async ({ page }) => {
      test.setTimeout(90000)
      await page.setViewportSize({ width, height: width > 900 ? 900 : 844 })
      await page.goto(baseURL)
      const shot = async (name: string) =>
        page.screenshot({ path: test.info().outputPath(`${name}.png`) })
      if (await page.locator('.portfolio-loader').count()) {
        await expect(page.locator('.loader-progress-pill')).toHaveCSS('visibility', 'visible')
        await shot('01-loader')
      }
      await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 20000 })
      if (theme === 'dark') {
        await page.getByRole('button', { name: 'Night mode', exact: true }).click()
        await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      }
      await expect(page.getByRole('button', { name: 'Night mode', exact: true })).toHaveCSS(
        'opacity',
        '1',
      )
      if (width > 900) await page.getByRole('link', { name: 'Work', exact: true }).hover()
      await shot('02-header-and-scroll-pill')

      await page.goto(`${baseURL}/#${projectStops[0].id}`)
      await expect(page.locator('.portfolio[data-work-projects]')).toBeVisible()
      await page.locator('.skills-performance').evaluate((element) => {
        const event = new Event('touchstart', { bubbles: true })
        Object.defineProperty(event, 'touches', { value: [{ clientX: 190, clientY: 480 }] })
        element.dispatchEvent(event)
      })
      await seek(page, skillStart + 0.95 * 0.43)
      await shot('03-category-attached')
      for (const [name, phase] of [
        ['attached', 0.43],
        ['release', 0.76],
        ['recoil', 0.86],
      ] as const) {
        await seek(page, skillStart + 0.95 + 0.8 * phase)
        await shot(`04-project-${name}`)
      }
      await seek(page, skillStart + projectStops[0].position + 0.04)
      const button = page.locator('.skill-project-card').first().getByRole('button')
      await button.focus()
      await expect(button.locator('.project-cta-liquid path')).toHaveAttribute('d', /C/)
      await shot('05-project-button')
      await button.blur()

      await page.goto(`${baseURL}/#about-profile`)
      for (const [name, phase] of [
        ['attached', 0.43],
        ['release', 0.76],
        ['recoil', 0.86],
      ] as const) {
        await seek(page, experienceStart + experiencePillTravel * phase)
        await shot(`06-experience-${name}`)
      }
      if (width <= 900) {
        await page.getByRole('button', { name: 'Open menu', exact: true }).click()
        const menu = page.getByRole('dialog', { name: 'Mobile navigation' })
        await expect(menu.locator('.mobile-menu-entry-ring circle')).toHaveCSS(
          'visibility',
          'hidden',
        )
        await expect(menu.locator('.mobile-menu-liquid path').first()).toHaveAttribute('d', /C/)
        await expect(menu.locator('.profile-links-menu')).not.toHaveAttribute('inert')
        await expect(menu.locator('.profile-links-menu')).toHaveCSS('transform', 'none')
        await shot('07-menu-selector-and-socials')
        await menu.locator('.mobile-menu-links').dispatchEvent('wheel', { deltaY: 70 })
        await expect(menu.locator('a[data-highlighted]')).toHaveAttribute('href', '#contact')
        await shot('08-menu-selector-moved')
      }
    })
  }
}
