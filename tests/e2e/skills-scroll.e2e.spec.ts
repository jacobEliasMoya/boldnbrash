import { expect, test, type Page } from '@playwright/test'
import { projectStops, skillStart } from '../../src/components/organisms/skillsTimeline'

async function moveTo(page: Page, position: number) {
  await page.evaluate((position) => {
    window.dispatchEvent(new Event('pointerdown'))
    const track = document.querySelector<HTMLElement>('.scene-track')!
    const stage = track.firstElementChild as HTMLElement
    window.scrollTo(
      0,
      scrollY +
        track.getBoundingClientRect().top +
        ((track.offsetHeight - stage.clientHeight) * position) / Number(track.dataset.duration),
    )
  }, position)
  await page.waitForTimeout(60)
}
const progress = (page: Page) =>
  page
    .locator('.scene-track')
    .evaluate((el) => Number((el as HTMLElement).dataset.playbackProgress))

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
  await page.goto('http://localhost:3000/#skills')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
})

test('native wheel input stays in sync and small movements rotate immediately', async ({
  page,
}) => {
  const middle = skillStart + (projectStops[1].position + projectStops[2].position) / 2
  await moveTo(page, middle)
  const pill = page.locator('.skills-category-pill').nth(1)
  const before = await pill.evaluate((el) => getComputedStyle(el).transform)
  const start = await progress(page)
  await page.mouse.move(300, 380)
  await page.mouse.wheel(0, 24)
  await expect.poll(() => progress(page)).toBeGreaterThan(start + 0.01)
  await expect(pill).not.toHaveCSS('transform', before)
  const forward = await progress(page)
  await page.mouse.wheel(0, -24)
  await expect.poll(() => progress(page)).toBeLessThan(forward - 0.01)
  const syncError = await page.locator('.scene-track').evaluate((el) => {
    const track = el as HTMLElement
    const native =
      (-track.getBoundingClientRect().top /
        (track.offsetHeight - track.firstElementChild!.clientHeight)) *
      Number(track.dataset.duration)
    return Math.abs(native - Number(track.dataset.playbackProgress))
  })
  expect(syncError).toBeLessThan(0.01)
})

test('every resting position snaps to an item and further input interrupts settling', async ({
  page,
}) => {
  const stop = skillStart + projectStops[2].position
  await moveTo(page, stop - 0.12)
  await expect.poll(() => progress(page)).toBeCloseTo(stop, 2)
  await moveTo(page, stop - 0.4)
  await expect.poll(() => progress(page)).toBeCloseTo(stop, 2)
  await moveTo(page, stop - 0.15)
  await expect(page.locator('.scene-track')).toHaveAttribute('data-snapping', 'true')
  await page.mouse.wheel(0, -180)
  await expect(page.locator('.scene-track')).not.toHaveAttribute('data-snapping')
  await expect.poll(() => progress(page)).toBeLessThan(stop - 0.18)
})

test('project cards stay fixed during a circular reveal and settle completely', async ({ page }) => {
  const stop = skillStart + projectStops[1].position
  await moveTo(page, stop - 0.4)
  const incoming = page.locator('.skill-project-card[aria-label="This portfolio"]')
  await expect(incoming).toHaveCSS('transform', 'none')
  await expect(incoming).toHaveCSS('opacity', '1')
  await expect.poll(() => progress(page)).toBeCloseTo(stop, 2)
  const radius = await incoming.evaluate((el) => parseFloat(getComputedStyle(el).clipPath.slice(7)))
  expect(radius).toBeGreaterThan(149)
  await moveTo(page, skillStart + projectStops[0].position + 0.3)
  await expect.poll(() => progress(page)).toBeCloseTo(skillStart + projectStops[0].position, 2)
  await expect(page.getByRole('article', { name: 'Multi-state Astro platform', exact: true })).toBeVisible()
})


test('one deliberate wheel notch advances a project and crosses skill boundaries', async ({ page }) => {
  for (const index of [0, 1]) {
    await moveTo(page, skillStart + projectStops[index].position)
    await page.mouse.move(300, 380)
    await page.mouse.wheel(0, 100)
    await expect.poll(() => progress(page)).toBeCloseTo(skillStart + projectStops[index + 1].position, 2)
    await page.mouse.wheel(0, -100)
    await expect.poll(() => progress(page)).toBeCloseTo(skillStart + projectStops[index].position, 2)
  }
})
