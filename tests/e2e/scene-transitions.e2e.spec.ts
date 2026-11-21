import { expect, test, type Page } from '@playwright/test'
import {
  heroWalkOutEnd,
  skillParagraphEnd,
  sceneDuration,
  sceneStops,
  skillStart,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function moveToBoundary(page: Page, progress: number) {
  await page.evaluate(
    ({ progress, duration }) => {
      const track = document.querySelector<HTMLElement>('.scene-track')!
      const start = scrollY + track.getBoundingClientRect().top
      const distance = track.offsetHeight - track.firstElementChild!.clientHeight

      window.scrollTo({ top: start + (distance * progress) / duration, behavior: 'instant' })
    },
    { progress, duration: sceneDuration },
  )

  await expect
    .poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(progress, 2)
}

test.beforeEach(async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
})

for (const input of ['touch', 'wheel'] as const) {
  test(`${input} keeps moving into the hero after reversing the Work reveal`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })),
    )

    const progress = await page.locator('.scene-track').evaluate(async (track, input) => {
      const target = document.querySelector('.skills-scene')!
      let y = 400

      function send(type: string, delta = 0) {
        if (input === 'wheel') {
          target.dispatchEvent(
            new WheelEvent('wheel', { deltaY: delta, bubbles: true, cancelable: true }),
          )

          return
        }

        y -= delta

        const event = new Event(type, { bubbles: true, cancelable: true })

        Object.defineProperty(event, 'touches', {
          value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }],
        })
        target.dispatchEvent(event)
      }

      if (input === 'touch') send('touchstart')

      send('touchmove', -40)

      const deadline = performance.now() + 2000

      // Keep wheel momentum arriving until the reveal has finished.
      while (track.hasAttribute('data-transitioning') && performance.now() < deadline) {
        if (input === 'wheel') send('touchmove', -20)

        await new Promise(requestAnimationFrame)
      }

      const boundary = Number(track.getAttribute('data-playback-progress'))

      send('touchmove', -60)

      const settleUntil = performance.now() + 250

      while (performance.now() < settleUntil) await new Promise(requestAnimationFrame)

      const continued = Number(track.getAttribute('data-playback-progress'))

      if (input === 'touch') send('touchend')

      return { boundary, continued }
    }, input)

    expect(progress.boundary).toBeCloseTo(heroWalkOutEnd, 2)
    expect(progress.continued).toBeLessThan(progress.boundary - 0.01)
  })
}

test('one scroll completes a page reveal and backscroll reverses it', async ({ page }) => {
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 2 })),
  )

  const progress = () =>
    page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)

  await page.mouse.move(500, 400)
  await moveToBoundary(page, sceneStops[3] - 1 - 0.01)
  await page.mouse.wheel(0, 60)
  await expect.poll(progress).toBeCloseTo(sceneStops[3], 2)

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 2 })),
  )
  await moveToBoundary(page, sceneStops[3] - 1 - 0.01)
  await page.mouse.wheel(0, 60)
  await expect(page.locator('.scene-track')).toHaveAttribute('data-transitioning', 'forward')
  await page.mouse.wheel(0, -60)
  await expect.poll(progress).toBeCloseTo(sceneStops[3] - 1, 2)
})

test('continued momentum finishes one reveal without skipping the next page', async ({ page }) => {
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })),
  )
  await moveToBoundary(page, skillParagraphEnd - 0.01)
  await page.mouse.move(500, 400)

  for (let index = 0; index < 14; index++) {
    await page.mouse.wheel(0, 50)
    await page.waitForTimeout(80)
  }

  await expect
    .poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeGreaterThanOrEqual(skillStart - 0.01)
  expect(
    Number(await page.locator('.scene-track').getAttribute('data-playback-progress')),
  ).toBeLessThan(sceneStops[2] - 1)
})

test('a short mobile drag opens the skills circle and a reverse drag closes it', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })),
  )

  const drag = (direction: number) =>
    page.locator('.skills-scene').evaluate(async (element, direction) => {
      const send = (type: string, y: number) => {
        const event = new Event(type, { bubbles: true, cancelable: true })

        Object.defineProperty(event, 'touches', {
          value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }],
        })
        element.dispatchEvent(event)
      }

      send('touchstart', 450)

      for (let step = 1; step <= 3; step++) {
        send('touchmove', 450 - direction * step * 12)
        await new Promise(requestAnimationFrame)
      }

      send('touchend', 450 - direction * 36)
    }, direction)

  await moveToBoundary(page, skillParagraphEnd - 0.01)
  await drag(1)
  await expect
    .poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(skillStart, 2)
  await drag(-1)
  await expect
    .poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(skillParagraphEnd, 2)
})
