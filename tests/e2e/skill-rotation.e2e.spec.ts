import { expect, test } from '@playwright/test'
import {
  projectStops,
  sceneDuration,
  skillStart,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

for (const width of [390, 1440]) {
  test(`category wheel reverses without pose jumps at ${width}px`, async ({ page }, testInfo) => {
    test.skip(
      width > 900 && Boolean(testInfo.project.use.isMobile),
      'Use the iPhone profile at phone widths; desktop geometry is checked in Chromium.',
    )
    test.setTimeout(180000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto(`${baseURL}/#${projectStops[0].id}`)
    await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 20000 })
    await expect(page.locator('.portfolio[data-work-projects]')).toBeVisible()
    await page.locator('.skills-performance').evaluate((element) => {
      const event = new Event('touchstart', { bubbles: true })
      Object.defineProperty(event, 'touches', { value: [{ clientX: 180, clientY: 450 }] })
      element.dispatchEvent(event)
    })
    for (let category = 1; category < projectStops.length; category++) {
      const from = projectStops[category - 1].position
      const gap = projectStops[category].position - from
      const screenshots = new Set<number>()
      for (const phase of [0.1, 0.35, 0.48, 0.54, 0.6, 0.85, 1, 0.6, 0.54, 0.48, 0.35, 0.1]) {
        const position = skillStart + from + gap * phase
        const missingFrames = await page.evaluate(
          async ({ position, duration, phase, category, from, gap, skillStart }) => {
            const track = document.querySelector<HTMLElement>('.scene-track')!
            const start = scrollY + track.getBoundingClientRect().top
            const travel = track.offsetHeight - track.firstElementChild!.clientHeight
            window.scrollTo({ top: start + (travel * position) / duration, behavior: 'instant' })
            let missing = 0
            if (phase === 0.6) {
              // Inspect the handoff frames themselves, not only the settled screenshot.
              const incoming =
                document.querySelectorAll<HTMLElement>('.skills-category-pill')[category]
              for (let frame = 0; frame < 18; frame++) {
                await new Promise(requestAnimationFrame)
                const visible = Number(track.dataset.playbackProgress)
                const reveal = (visible - skillStart - from) / gap
                if (reveal > 0.55 && getComputedStyle(incoming).visibility === 'hidden') missing++
              }
            }
            return missing
          },
          { position, duration: sceneDuration, phase, category, from, gap, skillStart },
        )
        expect(missingFrames).toBe(0)
        await expect
          .poll(() =>
            page.locator('.scene-track').getAttribute('data-playback-progress').then(Number),
          )
          .toBeCloseTo(position, 2)
        if (
          [1, 4, 7].includes(category) &&
          [0.35, 0.48, 0.6].includes(phase) &&
          !screenshots.has(phase)
        ) {
          screenshots.add(phase)
          await page.screenshot({
            path: test.info().outputPath(`category-${category}-phase-${phase}.png`),
          })
        }
        const incoming = page.locator('.skills-category-pill').nth(category)
        if (phase === 0.48) {
          // The visible wheel has turned to the incoming category before the old project finishes its wipe.
          await expect(incoming.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
          await expect(
            page
              .locator('.skills-category-pill')
              .nth(category - 1)
              .getByRole('button'),
          ).toHaveAttribute('aria-pressed', 'false')
        }

        if (phase >= 0.6) {
          await expect(incoming).toHaveCSS('visibility', 'visible')
          const centered = await incoming.evaluate((element) => {
            const list = element.parentElement!
            const rowCenter = list.getBoundingClientRect().top + (element as HTMLElement).offsetTop
            const bounds = element.getBoundingClientRect()

            return Math.abs(bounds.top + bounds.height / 2 - rowCenter)
          })
          expect(centered).toBeLessThan(2)
        }
      }
    }
  })
}
