import { expect, test, type Page } from '@playwright/test'
import { skillStart, skills, skillSegments } from '../../src/components/organisms/skillsTimeline'

async function scrollToPhase(page: Page, position: number) {
  await page.evaluate(({ value, segments, start }) => {
    if (value >= start) {
      const relative = value - start
      const index = segments.reduce((selected, segment, i) => segment.start <= relative ? i : selected, 0)
      window.dispatchEvent(new CustomEvent('portfolio:select-skill', { detail: { index, offset: relative - segments[index].start }, cancelable: true }))
      return
    }
    window.dispatchEvent(new Event('pointerdown'))
    const track = document.querySelector<HTMLElement>('.scene-track')!
    const stage = track.firstElementChild as HTMLElement
    window.scrollTo(
      0,
      scrollY +
        track.getBoundingClientRect().top +
        ((track.offsetHeight - stage.clientHeight) * value) / Number(track.dataset.duration),
    )
  }, { value: position, segments: skillSegments, start: skillStart })
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
    test('period expands into the canvas behind synchronized skill and project wheels', async ({ page }) => {
      test.setTimeout(60000)
      await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
      await page.goto('http://localhost:3000/#skills')
      await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
      const intro = page.locator('.skills-heading')
      await expect(intro).toHaveCSS('opacity', '1')
      const bounds = (await intro.boundingBox())!
      const sceneBounds = (await page.locator('#skills').boundingBox())!
      expect(Math.abs(bounds.x + bounds.width / 2 - (sceneBounds.x + sceneBounds.width / 2))).toBeLessThan(3)
      await expect(page.locator('.skills-reveal')).toHaveAttribute('inert', '')
      await page.screenshot({ path: `test-results/duet-intro-${viewport.width}.png` })
      await expect(page.locator('.skills-scroll-cue')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'My tech. And stuff.' })).toBeVisible()
      await scrollToPhase(page, 1.4 + (skillStart - 1.4) * 0.46)
      await expect(intro).toHaveCSS('opacity', '1')
      await expect(page.locator('.skills-title-letter')).toHaveCount(0)
      const initialRadius = Number(await page.locator('.skills-scene').evaluate(
        (el) => parseFloat(getComputedStyle(el).getPropertyValue('--skills-portal-radius')),
      ))
      await scrollToPhase(page, 1.4 + (skillStart - 1.4) * 0.8)
      await page.screenshot({ path: 'test-results/intro-expanding-' + viewport.width + '.png' })
      const expandedRadius = Number(await page.locator('.skills-scene').evaluate(
        (el) => parseFloat(getComputedStyle(el).getPropertyValue('--skills-portal-radius')),
      ))
      expect(expandedRadius).toBeGreaterThan(initialRadius)
      await expect(intro).toHaveCSS('opacity', '1')
      await expect(intro).toHaveCSS('transform', 'none')
      await expect(page.locator('.skills-reveal')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
      await expect(page.locator('.skills-project-deck').first()).toHaveAttribute(
        'aria-hidden',
        'false',
      )
      await expect(page.locator('.skills-performance')).not.toHaveCSS('opacity', '0')
      await scrollToPhase(page, skillStart + 1.1)
      await expect(intro).toHaveAttribute('aria-hidden', 'true')
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
      if (viewport.width > 900) expect(left.x).toBeGreaterThan(right.x + right.width)
      else expect(left.y).toBeGreaterThan(right.y + right.height)
      await page.screenshot({ path: `test-results/duet-project-${viewport.width}.png` })
      await scrollToPhase(page, skillStart + 1.45)
      const incomingCard = page.locator('.skill-project-card[aria-label="This portfolio"]')
      await expect(incomingCard).toHaveCSS('transform', 'none')
      await expect(incomingCard).toHaveCSS('opacity', '1')
      await expect(incomingCard).toHaveCSS('filter', 'none')
      const incomingBounds = (await incomingCard.boundingBox())!
      const outgoingBounds = (await page.locator('.skill-project-card[aria-label="Multi-state Astro platform"]').boundingBox())!
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(incomingBounds[key] - outgoingBounds[key])).toBeLessThan(1)
      }
      const clip = await incomingCard.evaluate((el) => getComputedStyle(el).clipPath)
      expect(clip).toMatch(/at 100% 0%/)
      expect(Math.abs(parseFloat(clip.slice(7)) - 75)).toBeLessThan(1)
      await page.screenshot({ path: `test-results/card-circle-${viewport.width}.png` })
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


test('period opening follows changes to the heading and supporting text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3000/#skills')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await page.locator('.skills-heading').evaluate((heading) => {
    heading.querySelectorAll('.skills-title-fill')[1].textContent = 'New stuff'
    heading.querySelector('.skills-intro')!.textContent = 'A longer supporting line. '.repeat(6)
  })
  await expect.poll(() => page.locator('.skills-scene').evaluate((scene) => {
    const bounds = scene.getBoundingClientRect()
    const dot = scene.querySelector('.skills-title-period')!.getBoundingClientRect()
    const style = getComputedStyle(scene)
    const x = parseFloat(style.getPropertyValue('--skills-portal-x'))
    const y = parseFloat(style.getPropertyValue('--skills-portal-y'))
    return Math.hypot(x - (dot.left + dot.width / 2 - bounds.left), y - (dot.top + dot.height / 2 - bounds.top))
  })).toBeLessThan(0.5)
})
