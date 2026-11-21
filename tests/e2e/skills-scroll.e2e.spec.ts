import { expect, test, type Page } from '@playwright/test'
import {
  projectStops,
  skillStart,
  skillSegments,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function moveTo(page: Page, position: number) {
  await page.evaluate(
    ({ position, segments, start }) => {
      const relative = position - start
      const index = segments.reduce(
        (chosen, segment, i) => (segment.start <= relative ? i : chosen),
        0,
      )

      window.dispatchEvent(
        new CustomEvent('portfolio:select-skill', {
          detail: { index, offset: relative - segments[index].start },
          cancelable: true,
        }),
      )
    },
    { position, segments: skillSegments, start: skillStart },
  )
  await page.waitForTimeout(60)
}

const progress = (page: Page) =>
  page
    .locator('.scene-track')
    .evaluate((el) => Number((el as HTMLElement).dataset.playbackProgress))

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
  await page.goto(`${baseURL}/#skills`)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
})

test('native wheel input glides and small movements remain responsive', async ({ page }) => {
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
  await expect
    .poll(() =>
      page.locator('.scene-track').evaluate((el) => {
        const track = el as HTMLElement
        const native =
          (-track.getBoundingClientRect().top /
            (track.offsetHeight - track.firstElementChild!.clientHeight)) *
          Number(track.dataset.duration)

        return Math.abs(native - Number(track.dataset.playbackProgress))
      }),
    )
    .toBeLessThan(0.01)
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

test('project cards stay fixed during a circular reveal and settle completely', async ({
  page,
}) => {
  const stop = skillStart + projectStops[1].position

  await moveTo(page, stop - 0.4)

  const incoming = page.locator('.skill-project-card[aria-label="This Portfolio"]')

  await expect(incoming).toHaveCSS('transform', 'none')
  await expect(incoming).toHaveCSS('opacity', '1')
  await expect.poll(() => progress(page)).toBeCloseTo(stop, 2)

  const radius = await incoming.evaluate((el) => parseFloat(getComputedStyle(el).clipPath.slice(7)))

  expect(radius).toBeGreaterThan(149)
  await moveTo(page, skillStart + projectStops[0].position + 0.3)
  await expect.poll(() => progress(page)).toBeCloseTo(skillStart + projectStops[0].position, 2)
  await expect(page.getByRole('article', { name: 'Astro Platform', exact: true })).toBeVisible()
})

test('continuous scrolling stays native and only settles after input stops', async ({ page }) => {
  await moveTo(page, skillStart + projectStops[1].position)
  await page.mouse.move(300, 380)

  for (let i = 0; i < 4; i++) {
    const before = await page.evaluate(() => scrollY)

    await page.mouse.wheel(0, 60)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before)

    const travel = await page.evaluate((start) => scrollY - start, before)

    expect(travel).toBeLessThanOrEqual(75)
    await expect(page.locator('.scene-track')).not.toHaveAttribute('data-snapping')
  }

  const position = await page.locator('.scene-track').evaluate((el) => {
    const track = el as HTMLElement

    return (
      (-track.getBoundingClientRect().top /
        (track.offsetHeight - track.firstElementChild!.clientHeight)) *
      Number(track.dataset.duration)
    )
  })
  const nearest = projectStops.reduce((best, stop) =>
    Math.abs(skillStart + stop.position - position) <
    Math.abs(skillStart + best.position - position)
      ? stop
      : best,
  )

  await expect.poll(() => progress(page)).toBeCloseTo(skillStart + nearest.position, 2)
})

test('scrolling up after the final project stays within the stop list', async ({ page }) => {
  const errors: string[] = []

  page.on('pageerror', (error) => errors.push(error.message))

  const last = projectStops[projectStops.length - 1]

  await moveTo(page, skillStart + last.position + 0.3)

  const before = await progress(page)

  await page.mouse.move(300, 380)
  await page.mouse.wheel(0, -100)
  await expect.poll(() => progress(page)).toBeLessThan(before - 0.1)
  expect(errors).toEqual([])
  await expect.poll(() => progress(page)).toBeCloseTo(skillStart + last.position, 2)
})
