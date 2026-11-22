import { expect, test, type Page } from '@playwright/test'
import {
  heroWalkOutEnd,
  skillParagraphEnd,
  sceneDuration,
  sceneStops,
  skillStart,
  skillSegments,
  aboutIntroEnd,
  aboutProfileStart,
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

test('Work opens the About intro and the paper profile leads to Contact', async ({ page }) => {
  const index = skillSegments.length - 1

  await page.evaluate(
    (detail) => window.dispatchEvent(new CustomEvent('portfolio:select-skill', { detail })),
    { index, offset: skillSegments[index].duration - 0.01 },
  )
  await expect(page.locator('.skills-about-portal')).toBeAttached()
  await moveToBoundary(page, sceneStops[2] - 1 + 0.02)
  await page.mouse.move(10, 400)
  await page.mouse.wheel(0, 120)

  const about = page.locator('#about')

  await expect(about).toHaveCSS('clip-path', 'none')
  await expect(page.getByRole('slider', { name: 'About scroll position' })).toBeVisible()
  await expect(about.locator('.about-introduction')).toBeVisible()
  const profile = about.locator('.about-reveal')
  await expect(profile).toHaveCSS('clip-path', /^circle\(0px(?: at .*?)?\)$/)
  await expect(about).toHaveAttribute('data-intro-drop-complete', '')

  await moveToBoundary(page, aboutIntroEnd + (aboutProfileStart - aboutIntroEnd) * 0.35)
  await expect(about).toHaveAttribute('data-about-stage', 'opening')
  await expect(about.locator('.about-introduction')).toHaveCSS('visibility', 'visible')
  const canvas = await page
    .locator('#skills .skills-reveal')
    .evaluate((layer) => getComputedStyle(layer).backgroundColor)
  await expect(profile).toHaveCSS('background-color', canvas)

  const profileCoversPeriod = await profile.evaluate((element) => {
    const profile = element as HTMLElement
    const period = profile.parentElement!.querySelector('.about-next .skills-title-period')!
    const { x, y, width, height } = period.getBoundingClientRect()
    const inert = profile.inert

    // Hit-test the visual stacking without enabling the profile during the animation.
    profile.inert = false
    const top = document.elementFromPoint(x + width / 2, y + height / 2)
    profile.inert = inert

    return profile.contains(top)
  })

  expect(profileCoversPeriod).toBe(true)
  await page.mouse.wheel(0, 120)
  await expect(page.getByRole('slider', { name: 'About profile scroll position' })).toBeVisible()
  await expect(about.getByRole('heading', { name: 'How I work.' })).toBeVisible()
  await expect(about.locator('.about-details')).toHaveJSProperty('open', true)
  await about.getByRole('link', { name: 'Get in touch' }).click()
  await expect(page.locator('#contact')).toHaveAttribute('aria-hidden', 'false')
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
    document.querySelector<HTMLAnchorElement>('#about a[href="#about-profile"]')?.click(),
  )
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')

  const progress = () =>
    page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)

  await page.mouse.move(10, 400)
  await moveToBoundary(page, sceneStops[3] - 1 - 0.01)
  await page.mouse.wheel(0, 60)
  await expect.poll(progress).toBeCloseTo(sceneStops[3], 2)

  await page.evaluate(() =>
    document.querySelector<HTMLAnchorElement>('#about a[href="#about-profile"]')?.click(),
  )
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')
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
