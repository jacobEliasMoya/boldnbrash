import { expect, test, type Page } from '@playwright/test'
import {
  experienceDisclosureTiming,
  experiencePillTravel,
  experienceRoleTravel,
} from '../../src/components/organisms/experienceTimeline'
import {
  experienceStart,
  projectStops,
  sceneDuration,
  skillStart,
  skillSegments,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function swipe(page: Page, selector: string, fromY: number, toY: number) {
  return page.evaluate(
    async ({ selector, fromY, toY }) => {
      const target = document.querySelector(selector)!
      const send = (type: string, y: number, count = 1) => {
        const points = Array.from({ length: count }, (_, index) => ({
          identifier: index,
          clientX: 180 + index * 40,
          clientY: y,
          target,
        }))
        const event = new Event(type, { bubbles: true, cancelable: true })

        Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : points })
        target.dispatchEvent(event)

        return event.defaultPrevented
      }

      send('touchstart', fromY)

      const consumed: boolean[] = []

      for (let i = 1; i <= 10; i++) {
        consumed.push(send('touchmove', fromY + ((toY - fromY) * i) / 10))
        await new Promise(requestAnimationFrame)
      }

      send('touchend', toY)

      return consumed
    },
    { selector, fromY, toY },
  )
}

test.beforeEach(async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 12000 })
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
})

test('the mobile liquid matches the pill corner radius throughout its entrance', async ({
  page,
}) => {
  await page.goto(`${baseURL}/#about-profile`)
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')

  const track = page.locator('.scene-track')
  const pill = page.locator('[data-role="biziq-developer-ii"]')
  const start = experienceStart + 2 * experienceRoleTravel

  async function seek(progress: number) {
    await track.evaluate(
      (element, { progress, duration }) => {
        const start = scrollY + element.getBoundingClientRect().top
        const travel = element.clientHeight - element.firstElementChild!.clientHeight

        window.scrollTo({ top: start + (travel * progress) / duration, behavior: 'instant' })
      },
      { progress, duration: sceneDuration },
    )
    await expect
      .poll(() => track.getAttribute('data-playback-progress').then(Number))
      .toBeCloseTo(progress, 2)
  }

  for (const phase of [0.43, 0.61, 0.43]) {
    await seek(start + phase * experiencePillTravel)
    await expect(pill).toHaveAttribute('data-docked', '')

    const widths = await pill.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius)
      const swell = document.querySelector<SVGPathElement>('.liquid-experience-shoulders')!
      const inverse = swell.getScreenCTM()!.inverse()

      // Measure outward from the actual CSS edge along the top and both rounded corners.
      return [-1, 1].flatMap((side) =>
        [0, Math.PI / 6, Math.PI / 4, Math.PI / 2.4].map((angle) => {
          const centerX = side < 0 ? bounds.left + radius : bounds.right - radius
          const centerY = bounds.top + radius
          let inside = radius
          let outside = radius + 24

          for (let step = 0; step < 8; step++) {
            const distance = (inside + outside) / 2
            const x = centerX + side * Math.sin(angle) * distance
            const y = centerY - Math.cos(angle) * distance

            if (swell.isPointInFill(new DOMPoint(x, y).matrixTransform(inverse))) inside = distance
            else outside = distance
          }

          return inside - radius
        }),
      )
    })

    expect(Math.min(...widths)).toBeGreaterThan(4)
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1)
  }

  const read = (experienceDisclosureTiming.openEnd + experienceDisclosureTiming.closeStart) / 2
  await seek(start + read)
  await expect(pill.getByRole('button')).toHaveCount(0)
  await expect(pill.getByRole('img', { name: 'REST APIs' })).toBeVisible()

  // Tapping the flat header leaves the open reading state intact.
  await pill.getByRole('heading', { name: 'Web Developer II' }).tap()
  await expect(pill.getByRole('img', { name: 'REST APIs' })).toBeVisible()
  await seek(start + 0.43 * experiencePillTravel)
  await expect(pill).toHaveAttribute('data-docked', '')
  await expect(pill.locator('.experience-disclosure')).toHaveCSS('height', '0px')
})

test('Experience follows a held swipe through release, resize, and reversal', async ({ page }) => {
  await page.goto(`${baseURL}/#about-profile`)
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')

  const track = page.locator('.scene-track')
  const progress = () => track.getAttribute('data-playback-progress').then(Number)
  const start = experienceStart + 2 * experienceRoleTravel + 0.43 * experiencePillTravel

  await track.evaluate(
    (element, { start, duration }) => {
      const trackTop = scrollY + element.getBoundingClientRect().top
      const travel = element.clientHeight - element.firstElementChild!.clientHeight

      window.scrollTo({ top: trackTop + (travel * start) / duration, behavior: 'instant' })
    },
    { start, duration: sceneDuration },
  )
  await expect.poll(progress).toBeCloseTo(start, 2)
  await expect(page.locator('[data-role="biziq-developer-ii"]')).toHaveAttribute('data-docked', '')

  const { forward, reverse, consumed, released } = await track.evaluate(async (element) => {
    const target = document.querySelector('#about-profile')!
    const frame = () => new Promise(requestAnimationFrame)
    const read = () => Number(element.dataset.playbackProgress)
    const send = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })

      Object.defineProperty(event, 'touches', {
        value: type === 'touchend' ? [] : [{ identifier: 1, clientX: 180, clientY: y, target }],
      })
      target.dispatchEvent(event)

      return event.defaultPrevented
    }

    let y = 650
    const forward = [read()]
    const consumed = []

    send('touchstart', y)
    for (let step = 0; step < 12; step++) {
      y -= 20
      consumed.push(send('touchmove', y))

      // Simulate the resize notification Safari chrome can send during a swipe.
      if (step % 2 === 1) window.dispatchEvent(new Event('resize'))

      await frame()
      forward.push(read())
    }

    const reverse = [read()]

    for (let step = 0; step < 8; step++) {
      y += 20
      consumed.push(send('touchmove', y))
      await frame()
      reverse.push(read())
    }

    send('touchend', y)
    for (let step = 0; step < 6; step++) await frame()

    return { forward, reverse, consumed, released: read() }
  })

  expect(consumed.every(Boolean)).toBe(true)
  for (let step = 1; step < forward.length; step++) {
    expect(forward[step] - forward[step - 1]).toBeGreaterThan(0.01)
  }
  for (let step = 1; step < reverse.length; step++) {
    expect(reverse[step - 1] - reverse[step]).toBeGreaterThan(0.01)
  }
  expect(released).toBeCloseTo(reverse.at(-1)!, 3)
})

test('mobile Work showcase keeps the stage pinned until playback pauses', async ({ page }) => {
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await expect(page.locator('.portfolio[data-work-projects]')).toBeVisible()

  const track = page.locator('.scene-track')
  const progress = () => track.getAttribute('data-playback-progress').then(Number)
  const initialY = await page.evaluate(() => scrollY)

  await page.getByRole('button', { name: 'Play showcase' }).click()
  await expect.poll(progress).toBeGreaterThan(skillStart + projectStops[1].position - 0.2)
  expect(await page.evaluate(() => scrollY)).toBe(initialY)
  await expect(page.locator('#top')).toHaveCSS('display', 'none')
  await expect(page.locator(`#${projectStops[1].id}`)).not.toHaveAttribute('inert')

  await page.getByRole('button', { name: 'Pause showcase' }).click()
  const paused = await progress()
  const native = await track.evaluate((element, duration) => {
    const travel = element.clientHeight - element.firstElementChild!.clientHeight

    return (-element.getBoundingClientRect().top * duration) / travel
  }, sceneDuration)

  expect(native).toBeCloseTo(paused, 2)
})

test('mobile Experience showcase pauses at the visible pill without scrolling each frame', async ({
  page,
}) => {
  await page.goto(`${baseURL}/#about-profile`)
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')

  const track = page.locator('.scene-track')
  const progress = () => track.getAttribute('data-playback-progress').then(Number)
  const initialY = await page.evaluate(() => scrollY)

  await page.getByRole('button', { name: 'Play showcase' }).click()
  await expect.poll(progress).toBeGreaterThan(experienceStart + 0.4)
  expect(await page.evaluate(() => scrollY)).toBe(initialY)
  await expect(page.locator('#top')).toHaveCSS('display', 'none')
  await expect(page.locator('#skills')).toHaveCSS('display', 'none')

  await page.getByRole('button', { name: 'Pause showcase' }).click()
  const paused = await progress()
  const native = await track.evaluate((element, duration) => {
    const travel = element.clientHeight - element.firstElementChild!.clientHeight

    return (-element.getBoundingClientRect().top * duration) / travel
  }, sceneDuration)

  expect(native).toBeCloseTo(paused, 2)

  await swipe(page, '#about-profile', 580, 510)
  await expect.poll(progress).toBeGreaterThan(paused + 0.04)

  await page.evaluate(() => {
    location.hash = '#skills'
  })
  await expect(page.locator('#skills')).toBeVisible()
})

test('vertical touch input advances and reverses the scene clock', async ({ page }) => {
  await page.locator('.scene-top').evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })

  const consumed = await swipe(page, '.hero-copy', 620, 220)

  expect(consumed.every(Boolean)).toBe(true)

  const slider = page.getByRole('slider', { name: 'Home scroll position' })

  await expect(slider).toBeAttached()

  const { top, bottomInset } = await slider.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    const height = window.visualViewport?.height ?? innerHeight

    return { top: bounds.top, bottomInset: (height - bounds.bottom) / height }
  })
  const menuBounds = (await page.getByRole('button', { name: 'Open menu' }).boundingBox())!

  expect(top - (menuBounds.y + menuBounds.height)).toBeGreaterThanOrEqual(16)
  expect(bottomInset).toBeCloseTo(0.07, 3)
  await expect
    .poll(async () =>
      Number(await page.locator('.scene-track').getAttribute('data-playback-progress')),
    )
    .toBeGreaterThan(0.25)

  const before = Number(await page.locator('.scene-track').getAttribute('data-playback-progress'))

  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await page.locator('.scene-top').evaluate((element) => {
    element.scrollTop = 0
  })
  await swipe(page, '.hero-copy', 220, 620)
  await expect
    .poll(async () =>
      Number(await page.locator('.scene-track').getAttribute('data-playback-progress')),
    )
    .toBeLessThan(before)

  if (await page.evaluate(() => CSS.supports('overscroll-behavior-y', 'none'))) {
    await expect(page.locator('html')).toHaveCSS('overscroll-behavior-y', 'none')
  }
})

test('walking follows short swipes at different speeds without a playback queue', async ({
  page,
}) => {
  test.setTimeout(60000)

  for (const { steps, interval } of [
    { steps: 8, interval: 16 },
    { steps: 2, interval: 64 },
    { steps: 20, interval: 25 },
  ]) {
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 0 })),
    )

    const result = await page.evaluate(
      async ({ steps, interval }) => {
        const target = document.querySelector('.hero-copy')!
        const track = document.querySelector<HTMLElement>('.scene-track')!
        const send = (type: string, y: number) => {
          const event = new Event(type, { bubbles: true, cancelable: true })

          Object.defineProperty(event, 'touches', {
            value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }],
          })
          target.dispatchEvent(event)
        }
        const read = () => {
          const rect = track.getBoundingClientRect()

          return {
            visible: Number(track.dataset.playbackProgress),
            target:
              (-rect.top / (track.offsetHeight - track.firstElementChild!.clientHeight)) *
              Number(track.dataset.duration),
          }
        }

        send('touchstart', 650)

        for (let index = 1; index <= steps; index++) {
          send('touchmove', 650 - (400 * index) / steps)
          await new Promise((resolve) => setTimeout(resolve, interval))
        }

        send('touchend', 250)
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )

        const released = read()

        await new Promise((resolve) => setTimeout(resolve, 600))

        return { released, settled: read() }
      },
      { steps, interval },
    )

    // The same thumb travel must not be dropped when events arrive in larger chunks.
    expect(result.released.target).toBeGreaterThan(0.39)
    expect(result.released.target).toBeLessThan(0.43)
    expect(result.released.visible).toBeGreaterThan(steps === 2 ? 0.08 : 0.12)
    expect(Math.abs(result.settled.visible - result.settled.target)).toBeLessThan(0.005)
  }
})

test('a held drag reverses the walk promptly and settles after release', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const target = document.querySelector('.hero-copy')!
    const track = document.querySelector<HTMLElement>('.scene-track')!
    const send = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })

      Object.defineProperty(event, 'touches', {
        value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }],
      })
      target.dispatchEvent(event)
    }
    const progress = () => Number(track.dataset.playbackProgress)

    send('touchstart', 650)

    for (let i = 1; i <= 12; i++) {
      send('touchmove', 650 - i * 12)
      await new Promise((resolve) => setTimeout(resolve, 25))
    }

    const forward = progress()

    for (let i = 1; i <= 6; i++) {
      send('touchmove', 506 + i * 12)
      await new Promise((resolve) => setTimeout(resolve, 25))
    }

    const reversed = progress()

    send('touchend', 578)
    await new Promise((resolve) => setTimeout(resolve, 600))

    const rect = track.getBoundingClientRect()
    const destination =
      (-rect.top / (track.offsetHeight - track.firstElementChild!.clientHeight)) *
      Number(track.dataset.duration)

    return { forward, reversed, settled: progress(), destination }
  })

  expect(result.forward).toBeGreaterThan(0.05)
  expect(result.reversed).toBeLessThan(result.forward - 0.015)
  expect(Math.abs(result.settled - result.destination)).toBeLessThan(0.005)
})

test('skills introduction fill responds to mobile wheel input and vertical swipes', async ({
  page,
}) => {
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })),
  )

  const work = page.locator('#skills')
  const first = work.locator('.skills-title-fill').first()
  const second = work.locator('.skills-title-fill').nth(1)

  await expect(work).toHaveAttribute('data-intro-drop-complete', '')
  await expect(first).toHaveCSS('--title-fill', '0%')
  await expect(work.locator('.skills-heading p')).toHaveCount(0)
  await first.dispatchEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
  await expect
    .poll(async () =>
      parseFloat(
        await first.evaluate((line) => getComputedStyle(line).getPropertyValue('--title-fill')),
      ),
    )
    .toBeGreaterThan(8)

  const consumed = await swipe(page, '.skills-title-fill', 620, 320)

  expect(consumed.every(Boolean)).toBe(true)
  await expect(first).toHaveCSS('--title-fill', '100%')

  await swipe(page, '.skills-title-fill', 620, 160)
  await expect(page.locator('.skills-reveal')).toHaveAttribute('data-revealed', '')
  await swipe(page, '.skills-title-fill', 160, 720)
  // Returning from the project reveal finishes at the full title before the
  // next gesture scrubs its fill backward.
  await expect(page.locator('.skills-reveal')).toHaveAttribute('aria-hidden', 'true')
  await swipe(page, '.skills-title-fill', 320, 620)

  await expect
    .poll(async () =>
      parseFloat(
        await second.evaluate((line) => getComputedStyle(line).getPropertyValue('--title-fill')),
      ),
    )
    .toBeLessThan(100)
})

test('long and short swipes advance one project and reverse across category gaps', async ({
  page,
}) => {
  test.setTimeout(60000)

  const boundary =
    projectStops.findIndex(
      (stop, index) => index > 0 && stop.skillIndex !== projectStops[index - 1].skillIndex,
    ) - 1

  for (const index of [0, boundary]) {
    const stop = projectStops[index]

    await page.evaluate(
      ({ index, offset }) =>
        window.dispatchEvent(
          new CustomEvent('portfolio:select-skill', {
            detail: { index, offset },
            cancelable: true,
          }),
        ),
      { index: stop.skillIndex, offset: stop.position - skillSegments[stop.skillIndex].start },
    )

    const progress = () =>
      page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
    const initial = skillStart + stop.position

    await expect.poll(async () => Math.abs((await progress()) - initial)).toBeLessThan(0.01)
    const projectSlot = page.locator('.skills-projects')
    const initialSlot = await projectSlot.boundingBox()
    await swipe(page, '.skills-browser', 600, index === 0 ? 170 : 480)
    await expect
      .poll(
        async () => Math.abs((await progress()) - (skillStart + projectStops[index + 1].position)),
        { timeout: 5000 },
      )
      .toBeLessThan(0.01)
    expect(await projectSlot.boundingBox()).toEqual(initialSlot)

    if (projectStops[index + 1].skillIndex === 1) {
      const cms = page
        .locator('.skills-category-pill[data-active]')
        .filter({ hasText: 'Headless CMS' })

      for (const name of ['Strapi', 'GraphQL']) {
        await expect(cms.getByRole('img', { name }).locator('svg')).toBeVisible()
      }
    }

    await swipe(page, '.skills-browser', 480, 600)
    await expect
      .poll(async () => Math.abs((await progress()) - initial), { timeout: 5000 })
      .toBeLessThan(0.01)
    await swipe(page, '.skills-browser', 600, 570)
    await expect
      .poll(async () => Math.abs((await progress()) - initial), { timeout: 5000 })
      .toBeLessThan(0.01)
  }
})

test('a forward drag leaves the final Skills project without snapping back', async ({ page }) => {
  const last = projectStops[projectStops.length - 1]
  const end = skillStart + last.position

  await page.goto(`${baseURL}/#${last.id}`)
  const progress = () =>
    page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)

  await expect.poll(async () => Math.abs((await progress()) - end)).toBeLessThan(0.01)
  await swipe(page, '.skills-browser', 700, 140)
  // Wait through the idle snap window to catch a return to the last card.
  await expect.poll(progress).toBeGreaterThan(end + 0.02)
  await page.waitForTimeout(900)
  expect(await progress()).toBeGreaterThan(end + 0.02)
})

test('landscape Work aligns the intro with the focused pill below the navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 750, height: 342 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)

  const intro = page.locator('ul.skills-browser > li[data-wheel-static]:first-child')
  const pill = page.locator('.skills-category-pill[data-active]')

  await expect(intro).toHaveCSS('opacity', '1')
  await expect(pill).toBeVisible()
  await expect(pill).not.toHaveAttribute('data-work-entering')

  const headerBounds = (await page.locator('.site-header').boundingBox())!
  const introBounds = (await intro.boundingBox())!
  const projectBounds = (await page.locator('.skills-projects').boundingBox())!
  const pillBounds = (await pill.boundingBox())!

  expect(introBounds.y - (headerBounds.y + headerBounds.height)).toBeGreaterThanOrEqual(24)
  expect(projectBounds.y - (introBounds.y + introBounds.height)).toBeGreaterThanOrEqual(12)
  expect(pillBounds.y).toBeGreaterThan(introBounds.y + introBounds.height)
  expect(pillBounds.x - (projectBounds.x + projectBounds.width)).toBeGreaterThanOrEqual(12)
  expect(introBounds.x).toBeCloseTo(pillBounds.x, 1)
  expect(pillBounds.y + pillBounds.height).toBeLessThan(330)

  await page.screenshot({ path: test.info().outputPath('work-landscape.png'), scale: 'css' })
  await page.locator(`#${projectStops[0].id}`).getByRole('button').tap()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('an oversized touch sample stays bounded and cancellation does not snap a project', async ({
  page,
}) => {
  const consumed = await swipe(page, '.hero-copy', 600, -100000)
  expect(consumed.every(Boolean)).toBe(true)
  const progress = () =>
    page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
  expect(await progress()).toBeLessThan(skillStart)

  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await expect(page.locator('.portfolio[data-work-projects]')).toBeVisible()
  await page.locator('.skills-browser').evaluate(async (target) => {
    const send = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', {
        value: type === 'touchcancel' ? [] : [{ identifier: 9, clientX: 180, clientY: y }],
      })
      target.dispatchEvent(event)
    }
    send('touchstart', 600)
    for (let i = 1; i <= 4; i++) {
      send('touchmove', 600 - i * 10)
      await new Promise(requestAnimationFrame)
    }
    send('touchcancel', 560)
  })
  // Wait past the release-snap delay to catch a canceled gesture starting a snap.
  await page.waitForTimeout(900)
  const stopped = await progress()
  expect(stopped).toBeGreaterThan(skillStart + projectStops[0].position + 0.1)
  expect(stopped).toBeLessThan(skillStart + projectStops[1].position - 0.1)
})

test('pulling past the beginning is consumed instead of escaping the app', async ({ page }) => {
  const consumed = await swipe(page, '.hero-copy', 300, 650)

  expect(consumed.every(Boolean)).toBe(true)
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 })
})

test('nested scroll content keeps its gesture until it reaches its edge', async ({ page }) => {
  await page.locator('.hero-copy').evaluate((element) => {
    const scroller = document.createElement('div')

    scroller.id = 'touch-scroll-test'
    scroller.style.cssText = 'height:100px;overflow-y:auto'
    scroller.innerHTML = '<div style="height:400px">Scrollable content</div>'
    element.append(scroller)
  })
  expect((await swipe(page, '#touch-scroll-test > div', 600, 350)).some(Boolean)).toBe(false)
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await page.locator('#touch-scroll-test').evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await page.locator('.scene-top').evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  expect((await swipe(page, '#touch-scroll-test > div', 600, 350)).every(Boolean)).toBe(true)
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
})

test('pinch gestures and modal content do not drive the scene clock', async ({ page }) => {
  const consumed = await page.locator('.hero-copy').evaluate((target) => {
    const event = new Event('touchmove', { bubbles: true, cancelable: true })

    Object.defineProperty(event, 'touches', {
      value: [
        { clientX: 140, clientY: 500 },
        { clientX: 240, clientY: 500 },
      ],
    })
    target.dispatchEvent(event)

    return event.defaultPrevented
  })

  expect(consumed).toBe(false)
  await page.evaluate(() => {
    const dialog = document.createElement('dialog')

    dialog.id = 'touch-dialog-test'
    dialog.innerHTML = '<p>Modal content</p>'
    document.body.append(dialog)
    dialog.showModal()
  })
  expect((await swipe(page, '#touch-dialog-test p', 600, 350)).some(Boolean)).toBe(false)
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('the mobile hero fits short portrait and landscape viewports', async ({ page }) => {
  for (const [width, height] of [
    [390, 844],
    [375, 667],
    [320, 568],
    [667, 375],
    [568, 320],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(() =>
        page
          .locator('.scene-top')
          .evaluate((element) => element.scrollHeight - element.clientHeight),
      )
      .toBeLessThanOrEqual(1)

    const bounds = await page.locator('.hero-copy').boundingBox()
    const visibleHeight = await page.evaluate(() => window.visualViewport?.height ?? innerHeight)

    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(visibleHeight - 12)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  }
})
