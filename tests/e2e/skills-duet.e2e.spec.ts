import { expect, test, type Page } from '@playwright/test'
import { skillStart, skills } from '../../src/components/organisms/skillsTimeline'

async function scrollToPhase(page: Page, position: number) {
  await page.evaluate((value) => {
    window.dispatchEvent(new Event('pointerdown'))
    const track = document.querySelector<HTMLElement>('.scene-track')!
    const stage = track.firstElementChild as HTMLElement
    window.scrollTo(
      0,
      scrollY +
        track.getBoundingClientRect().top +
        ((track.offsetHeight - stage.clientHeight) * value) / Number(track.dataset.duration),
    )
  }, position)
  await expect
    .poll(
      async () =>
        Math.abs(
          Number(await page.locator('.scene-track').getAttribute('data-playback-progress')) -
            position,
        ),
      { timeout: 20000 },
    )
    .toBeLessThan(0.01)
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`paired scroll ${viewport.width}`, () => {
    test.use({ viewport })
    test('intro recedes into separate, synchronized skill and project wheels', async ({ page }) => {
      test.setTimeout(60000)
      await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
      await page.goto('http://localhost:3000/#skills')
      await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
      const intro = page.locator('.skills-heading')
      await expect(intro).toHaveCSS('opacity', '1')
      const bounds = (await intro.boundingBox())!
      expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(3)
      await expect(page.locator('.skills-performance')).toHaveAttribute('inert', '')
      await page.screenshot({ path: `test-results/duet-intro-${viewport.width}.png` })
      await expect(page.locator('.skills-scroll-cue')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'What I use. What I build.' })).toBeVisible()
      await scrollToPhase(page, 1.4 + (skillStart - 1.4) * 0.46)
      await expect(intro).toHaveCSS('opacity', '1')
      for (const letter of await page.locator('.skills-title-letter').all()) {
        await expect(letter).toHaveCSS('--letter-fill', '100%')
      }
      await page.screenshot({ path: 'test-results/intro-filled-' + viewport.width + '.png' })
      await scrollToPhase(page, 1.4 + (skillStart - 1.4) * 0.8)
      await page.screenshot({ path: 'test-results/intro-falling-' + viewport.width + '.png' })
      const drop = await page
        .locator('.skills-title-letter')
        .first()
        .evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)
      expect(drop).toBeGreaterThan(20)
      const faded = Number(await intro.evaluate((el) => getComputedStyle(el).opacity))
      expect(faded).toBeGreaterThan(0)
      expect(faded).toBeLessThan(0.65)
      await expect(page.locator('.skills-project-deck').first()).toHaveAttribute(
        'aria-hidden',
        'false',
      )
      await expect(page.locator('.skills-performance')).not.toHaveCSS('opacity', '0')
      await scrollToPhase(page, skillStart + 1.1)
      await expect(intro).toHaveCSS('opacity', '0')
      const currentSkill = page.locator('.skills-category-pill[data-active]')
      await expect(currentSkill).toContainText('Frontend Development')
      await expect(page.locator('.skills-category-pill .skill-project-card')).toHaveCount(0)
      const firstProject = page.getByRole('article', {
        name: 'Multi-state Astro platform',
        exact: true,
      })
      await expect(firstProject).toBeVisible()
      const left = (await currentSkill.boundingBox())!
      const right = (await firstProject.boundingBox())!
      if (viewport.width > 900) expect(right.x).toBeGreaterThan(left.x + left.width)
      else expect(right.y).toBeGreaterThan(left.y + left.height)
      await page.screenshot({ path: `test-results/duet-project-${viewport.width}.png` })
      await scrollToPhase(page, skillStart + 2.1)
      await expect(currentSkill).toContainText('Frontend Development')
      const second = page.getByRole('article', { name: 'This portfolio', exact: true })
      await expect(second).toBeVisible()
      await second.getByRole('button', { name: /Read project/ }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('button', { name: /Close/ }).click()
      await scrollToPhase(page, skillStart + 1.1)
      await expect(firstProject).toBeVisible()
      // Every category uses the same navigation path as its optional direct-select control.
      for (const index of skills.keys()) {
        await page.evaluate(
          (index) =>
            window.dispatchEvent(
              new CustomEvent('portfolio:select-skill', {
                detail: { index, offset: 1.1 },
                cancelable: true,
              }),
            ),
          index,
        )
        await expect(currentSkill).toContainText(skills[index].name)
        await expect(
          page.getByRole('article', { name: skills[index].projects[0].title, exact: true }),
        ).toBeVisible()
      }
      await expect(page.locator('.skills-category-pill').last()).toHaveCSS('opacity', '1')
      await expect(page.locator('.skills-browser')).toHaveCSS('touch-action', 'pan-y pinch-zoom')
    })
  })
}

test('reduced motion presents each skill beside its projects without hiding content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('http://localhost:3000/#skills')
  await expect(page.locator('.skills-performance')).toHaveCount(0)
  await expect(page.locator('.skills-pair')).toHaveCount(skills.length)
  await expect(page.locator('.skills-fallback article[aria-hidden="true"]')).toHaveCount(0)
})
