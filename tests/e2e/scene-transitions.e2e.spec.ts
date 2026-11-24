import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import {
  experienceEntryTravel,
  experiencePillTravel,
} from '../../src/components/organisms/experienceTimeline'
import {
  heroWalkOutEnd,
  skillParagraphEnd,
  sceneDuration,
  sceneStops,
  skillStart,
  projectStops,
  experienceStart,
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

test('Work categories dock with the liquid and return to their project slot', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await expect(page.locator('.portfolio[data-work-projects]')).toBeVisible()

  // Keep the project snap from moving a paused inspection point.
  await page.locator('.skills-performance').evaluate((target) => {
    const event = new Event('touchstart', { bubbles: true })

    Object.defineProperty(event, 'touches', { value: [{ clientX: 900, clientY: 480 }] })
    target.dispatchEvent(event)
  })

  const nextProject = projectStops.findIndex((stop) => stop.skillIndex === 1)
  const from = projectStops[nextProject - 1].position
  const to = projectStops[nextProject].position
  const midEntry = skillStart + from + (to - from) * 0.43
  const second = page.locator('.skills-category-pill').nth(1)
  const first = page.locator('.skills-category-pill').first()

  // Measure scale independently of the wheel's tilt and perspective.
  const readScale = () =>
    second.evaluate((pill) => {
      const pose = new DOMMatrixReadOnly(getComputedStyle(pill).transform)

      return { x: pose.m11, y: Math.hypot(pose.m22, pose.m23) }
    })

  await moveToBoundary(page, skillStart - 0.1)
  await expect(first).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.skills-reveal')).toHaveAttribute('inert', '')

  await moveToBoundary(page, skillStart + projectStops[0].position * 0.43)
  await expect(first).toHaveAttribute('data-work-docked', '')
  await expect(first).toHaveCSS('visibility', 'visible')

  await moveToBoundary(page, midEntry)
  await expect(second).toHaveAttribute('data-work-docked', '')
  const outgoingTilt = () =>
    first.evaluate((pill) => new DOMMatrixReadOnly(getComputedStyle(pill).transform).m23)

  await expect.poll(outgoingTilt).toBeCloseTo(0, 3)
  const attached = (await second.boundingBox())!
  const attachedScale = await readScale()
  expect(attached.y + attached.height).toBeGreaterThan(900)

  const edge = await sharp(await page.screenshot({ scale: 'css' }))
    .extract({ left: Math.floor(attached.x + attached.width / 2), top: 899, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer()

  expect(Array.from(edge)).toEqual([8, 8, 9])

  await moveToBoundary(page, skillStart + to + 0.035)
  await expect(second).toHaveAttribute('data-active', '')
  await expect(second).not.toHaveAttribute('data-work-entering')
  await expect.poll(outgoingTilt).toBeGreaterThan(0.3)
  const settledScale = await readScale()
  expect(settledScale.x).toBeCloseTo(attachedScale.x, 3)
  expect(settledScale.y).toBeCloseTo(attachedScale.y, 3)
  await expect(page.locator(`#${projectStops[nextProject].id}`)).not.toHaveAttribute('inert')

  await moveToBoundary(page, midEntry)
  await expect(second).toHaveAttribute('data-work-docked', '')

  await moveToBoundary(page, skillStart - 0.1)
  await expect(first).toHaveCSS('visibility', 'hidden')
})

test('Experience docks the entering role to the viewport and reverses cleanly', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL + '/#about-profile')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')
  await expect(page.getByRole('heading', { name: 'Experience.' })).toBeVisible()

  const about = page.locator('#about')
  const canvas = about.locator('.about-reveal')
  const nightMode = page.getByRole('button', { name: 'Night mode' })
  const second = about.locator('[data-role="biziq-developer-i"]')
  const third = about.locator('[data-role="biziq-developer-ii"]')
  const thirdStart = experienceStart + experienceEntryTravel * 2
  const midEntry = thirdStart + experiencePillTravel * 0.43

  await moveToBoundary(page, midEntry)
  await expect(third).toHaveAttribute('data-docked', '')
  await expect(third.locator('.experience-detail')).toHaveCSS('opacity', '0')
  await expect(second).toHaveAttribute('aria-current', 'true')
  await expect(second).toHaveCSS('transform', 'none')
  await expect(third).toHaveCSS('transform', 'none')
  const docked = (await third.boundingBox())!
  const focused = (await second.boundingBox())!
  await expect(about.locator('.experience-role h3')).toHaveText([
    'Junior Web Developer',
    'Web Developer I',
    'Web Developer II',
    'Software Engineer',
  ])

  async function expectDockPixels(surface: number[]) {
    const { data, info } = await sharp(await page.screenshot({ scale: 'css' }))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const pixel = (x: number, y = info.height - 1) => {
      const offset = (y * info.width + x) * info.channels

      return Array.from(data.subarray(offset, offset + 3))
    }

    // Sample the last row of pixels to catch seams and check the pill's fixed width.
    for (const x of [info.width * 0.5, info.width * 0.6, info.width * 0.7])
      expect(pixel(Math.round(x))).toEqual(surface)

    const entering = (await third.boundingBox())!

    // The shared surface must paint through the masked join without a halo in either theme.
    const edgeY = Math.floor(entering.y)

    for (const y of [edgeY - 1, edgeY, edgeY + 1])
      expect(pixel(Math.round(info.width / 2), y)).toEqual(surface)

    // The rising frame wraps over the pill as well as around its sides.
    expect(pixel(Math.round(info.width / 2), Math.floor(entering.y - 8))).toEqual(surface)

    // Both shoulders rise above the flat frame outside the pill's outline.
    expect(pixel(Math.floor(entering.x - 12), info.height - 18)).toEqual(surface)
    expect(pixel(Math.ceil(entering.x + entering.width + 12), info.height - 18)).toEqual(surface)

    for (const x of [4, Math.floor(entering.x - 4), Math.ceil(entering.x + entering.width + 4)]) {
      const outside = pixel(x)

      for (const [index, channel] of surface.entries())
        expect(Math.abs(outside[index] - channel)).toBeLessThanOrEqual(2)
    }
  }

  await expect(canvas).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(canvas).toHaveCSS('color', 'rgb(8, 8, 9)')
  await expectDockPixels([8, 8, 9])

  await nightMode.click()
  await expect(canvas).toHaveCSS('background-color', 'rgb(16, 16, 20)')
  await expect(canvas).toHaveCSS('color', 'rgb(239, 235, 225)')
  await expectDockPixels([255, 255, 255])

  await moveToBoundary(page, thirdStart + experiencePillTravel * 0.68)
  const swell = page.locator('.liquid-experience-shoulders')
  const raised = (await swell.boundingBox())!
  const fullyDocked = (await third.boundingBox())!
  const crestClearance = fullyDocked.y - raised.y
  expect(crestClearance).toBeGreaterThan(16)
  expect(crestClearance).toBeLessThan(27)

  await moveToBoundary(page, thirdStart + experiencePillTravel * 0.71)
  const lifting = (await third.boundingBox())!
  expect(lifting.y + lifting.height).toBeLessThan(900)
  expect(lifting.y + lifting.height).toBeGreaterThan(888)
  await expect(third).toHaveAttribute('data-docked', '')
  const liftOffTilt = await second.evaluate(
    (role) => new DOMMatrixReadOnly(getComputedStyle(role).transform).m23,
  )
  expect(liftOffTilt).toBeGreaterThan(0)
  expect(liftOffTilt).toBeLessThan(0.08)
  await expect(swell).toHaveAttribute('d', / Q/)

  await moveToBoundary(page, thirdStart + experiencePillTravel * 0.76)
  const cleared = (await third.boundingBox())!
  const recoil = page.locator('.liquid-experience-recoil')
  expect(cleared.y + cleared.height).toBeLessThan(888)
  await expect(third).not.toHaveAttribute('data-docked')
  await expect(swell).toHaveAttribute('d', / Q/)
  await expect(second).toHaveCSS('transform', /^matrix3d\(/)
  await expect(third).toHaveCSS('transform', 'none')

  // The spring can still overlap the pill after it clears the flat frame.
  const pillPixel = await sharp(await page.screenshot({ scale: 'css' }))
    .extract({ left: 720, top: Math.floor(cleared.y + cleared.height - 8), width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer()
  expect(Array.from(pillPixel)).toEqual([255, 255, 255])

  const inwardDip = thirdStart + experiencePillTravel * 0.86
  // Leave a strong pointer pull on the floor while the pill's liquid recoils.
  await page.mouse.move(860, 891)
  const pointerLiquid = page.locator('.liquid-boundary')
  await expect(pointerLiquid).toHaveAttribute('data-edge', 'bottom')
  await expect
    .poll(() => pointerLiquid.getAttribute('data-pull-depth').then(Number))
    .toBeGreaterThan(24)
  await moveToBoundary(page, inwardDip)
  await expect(recoil).toHaveAttribute('d', / Q/)
  await expect(swell).toHaveAttribute('d', '')

  // The dip cuts into the painted frame while the viewport floor stays white.
  const { data, info } = await sharp(await page.screenshot({ scale: 'css' }))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const framePixel = (y: number, x = Math.floor(info.width / 2)) => {
    const offset = (y * info.width + x) * info.channels

    return Array.from(data.subarray(offset, offset + 3))
  }
  // The old edge must leave no antialiased line above the dip.
  const canvasPixel = framePixel(info.height - 14)
  expect(framePixel(info.height - 13)).toEqual(canvasPixel)
  expect(framePixel(info.height - 12)).toEqual(canvasPixel)
  expect(framePixel(info.height - 1)).toEqual([255, 255, 255])
  // Both the canvas and the JM watermark are dark across the former floating bump.
  for (let y = info.height - 60; y < info.height - 13; y++)
    expect(framePixel(y, 860)[0]).toBeLessThan(50)
  await page.mouse.move(10, 400)

  await moveToBoundary(page, thirdStart + experiencePillTravel * 1.045)
  await expect(recoil).toHaveAttribute('d', '')
  await expect(swell).toHaveAttribute('d', / Q/)

  await moveToBoundary(page, thirdStart + experienceEntryTravel * 0.99)
  await expect(third).not.toHaveAttribute('data-docked')
  await expect(recoil).toHaveAttribute('d', '')
  await expect(swell).toHaveAttribute('d', '')
  await expect(third).toHaveCSS('scale', 'none')
  const settled = (await third.boundingBox())!
  expect(settled.width).toBeCloseTo(docked.width, 1)
  expect(settled.height).toBeCloseTo(docked.height, 1)
  expect(settled.y + settled.height).toBeLessThan(900)
  expect(settled.y + settled.height / 2).toBeCloseTo(focused.y + focused.height / 2, 0)
  await expect(third).toHaveAttribute('aria-current', 'true')
  await expect
    .poll(() =>
      third
        .locator('.experience-detail')
        .evaluate((detail) => Number(getComputedStyle(detail).opacity)),
    )
    .toBeGreaterThan(0.95)
  const outgoingOpacity = await second.evaluate((role) => Number(getComputedStyle(role).opacity))
  expect(outgoingOpacity).toBeCloseTo(0.35, 2)

  const outgoing = await second.evaluate((element) => {
    const pose = new DOMMatrixReadOnly(getComputedStyle(element).transform)

    return { tilt: pose.m23, depth: pose.m43 }
  })

  // The departing pill rolls in Work's direction while moving back into depth.
  expect(outgoing.tilt).toBeGreaterThan(0)
  expect(outgoing.depth).toBeLessThan(0)

  await moveToBoundary(page, inwardDip)
  await expect(recoil).toHaveAttribute('d', / Q/)

  await moveToBoundary(page, midEntry)
  await expect(third).toHaveAttribute('data-docked', '')
  await expect(second).toHaveAttribute('aria-current', 'true')
  await expect(second).toHaveCSS('transform', 'none')

  await moveToBoundary(page, sceneStops[3] - 1 - 0.01)
  const currentRole = about.locator('[data-role="inenvi-engineer"]')
  await expect(currentRole).toHaveAttribute('aria-current', 'true')
  await expect(currentRole).toHaveAttribute('data-portal', 'contact')

  await page.mouse.move(10, 400)
  await page.mouse.wheel(0, 120)
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
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 2 })),
  )
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false')

  const progress = () =>
    page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)

  await page.mouse.move(10, 400)
  await moveToBoundary(page, sceneStops[3] - 1 - 0.01)
  await page.mouse.wheel(0, 60)
  await expect.poll(progress).toBeCloseTo(sceneStops[3], 2)

  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 2 })),
  )
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false')
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
