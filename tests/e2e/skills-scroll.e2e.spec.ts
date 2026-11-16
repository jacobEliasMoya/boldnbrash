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

test('only nearby resting points settle and further input interrupts settling', async ({
  page,
}) => {
  const stop = skillStart + projectStops[2].position
  await moveTo(page, stop - 0.12)
  await expect.poll(() => progress(page)).toBeCloseTo(stop, 2)
  await moveTo(page, stop - 0.4)
  await page.waitForTimeout(550)
  expect(await progress(page)).toBeCloseTo(stop - 0.4, 2)
  await moveTo(page, stop - 0.15)
  await expect(page.locator('.scene-track')).toHaveAttribute('data-snapping', 'true')
  await page.mouse.wheel(0, -180)
  await expect(page.locator('.scene-track')).not.toHaveAttribute('data-snapping')
  await expect.poll(() => progress(page)).toBeLessThan(stop - 0.18)
})

test('project cards enter from depth and reverse with scroll', async ({ page }) => {
  const midpoint = skillStart + (projectStops[0].position + projectStops[1].position) / 2
  await moveTo(page, midpoint)
  const cards = page.locator('.skills-project-deck').first().locator('.skill-project-card')
  const geometry = await cards.evaluateAll((nodes) =>
    nodes.map((el) => {
      const style = getComputedStyle(el)
      const matrix = new DOMMatrixReadOnly(style.transform)
      return {
        z: matrix.m43,
        x: matrix.m41,
        y: matrix.m42,
        rotation: matrix.m12,
        opacity: Number(style.opacity),
        visible: style.visibility,
      }
    }),
  )
  expect(
    geometry.every(
      (card) =>
        card.x === 0 &&
        card.y === 0 &&
        card.rotation === 0 &&
        card.opacity > 0 &&
        card.visible === 'visible',
    ),
  ).toBe(true)
  expect(geometry[0].z).toBeLessThan(-100)
  expect(geometry[1].z).toBeGreaterThan(100)
  expect(geometry[1].opacity).toBeGreaterThan(geometry[0].opacity)
  await page.screenshot({ path: 'test-results/project-depth-midpoint.png' })
  await moveTo(page, skillStart + projectStops[0].position)
  await expect
    .poll(() =>
      cards
        .first()
        .evaluate((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m43)),
    )
    .toBeLessThan(1)
  await expect
    .poll(() => cards.first().evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.99)
})
