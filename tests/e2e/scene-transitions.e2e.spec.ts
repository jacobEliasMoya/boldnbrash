import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import {
  experienceDisclosureTiming,
  experiencePillTravel,
  experienceRoleTravel,
} from '../../src/components/organisms/experienceTimeline'
import {
  getWorkOpeningTiming,
  heroWalkOutEnd,
  skillTitleEnd,
  sceneDuration,
  sceneStops,
  skillStart,
  skillSegments,
  projectStops,
  experienceStart,
  workIntroCopyTiming,
  workIntroPillStart,
  workIntroSettle,
  workProjectTravel,
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
  const midEntry = skillStart + from + (to - from) * (0.95 / 1.75) * 0.43
  const earlyTurn = skillStart + from + (to - from) * 0.35
  const lateTurn = skillStart + from + (to - from) * 0.46
  const second = page.locator('.skills-category-pill').nth(1)
  const first = page.locator('.skills-category-pill').first()
  const intro = page.locator('ul.skills-browser > li[data-wheel-static]:first-child')
  const outgoingCard = page.locator(`#${projectStops[0].id}`)
  const incomingCard = page.locator(`#${projectStops[nextProject].id}`)
  const readSlide = (card = outgoingCard) =>
    card.evaluate((element) => {
      const style = getComputedStyle(element)
      const pose = new DOMMatrixReadOnly(style.transform)

      return { x: pose.m41, z: pose.m43, opacity: Number(style.opacity) }
    })

  // Rotation about the X axis leaves the X scale readable throughout the turn.
  const readScale = (pill = second) =>
    pill.evaluate((element) => {
      const pose = new DOMMatrixReadOnly(getComputedStyle(element).transform)

      return { x: pose.m11, y: Math.hypot(pose.m22, pose.m23) }
    })
  const outgoingScale = () => readScale(first).then(({ x }) => x)

  await moveToBoundary(page, skillStart - 0.1)
  await expect(first).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.skills-reveal')).toHaveAttribute('inert', '')

  await moveToBoundary(
    page,
    skillStart + workIntroPillStart + (workIntroSettle - workIntroPillStart) * 0.43,
  )
  await expect(first).toHaveAttribute('data-work-docked', '')
  await expect(first).toHaveCSS('visibility', 'visible')
  await expect(intro).toHaveCSS('opacity', '1')
  const introBounds = await intro.boundingBox()

  await moveToBoundary(page, midEntry)
  await expect(second).toHaveAttribute('data-work-docked', '')
  const outgoingTilt = () =>
    first.evaluate((pill) => new DOMMatrixReadOnly(getComputedStyle(pill).transform).m23)

  await expect.poll(outgoingTilt).toBeCloseTo(0, 3)
  const attached = (await second.boundingBox())!
  const attachedScale = await readScale()
  await expect.poll(outgoingScale).toBeCloseTo(attachedScale.x, 3)
  expect(attached.y + attached.height).toBeGreaterThan(900)

  const edge = await sharp(await page.screenshot({ scale: 'css' }))
    .extract({ left: Math.floor(attached.x + attached.width / 2), top: 899, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer()

  expect(Array.from(edge)).toEqual([0, 0, 0])

  await moveToBoundary(page, earlyTurn)
  await expect.poll(outgoingTilt).toBeGreaterThan(0.01)
  await expect.poll(outgoingScale).toBeLessThan(attachedScale.x - 0.01)
  await expect(outgoingCard).toHaveAttribute('data-project-exiting', '')
  await expect.poll(async () => (await readSlide()).z).toBeLessThan(0)
  const earlyScale = await outgoingScale()
  const earlySlide = await readSlide()
  expect(earlySlide.x).toBeCloseTo(0)
  expect(earlySlide.opacity).toBeLessThan(1)

  await moveToBoundary(page, lateTurn)
  await expect(incomingCard).toHaveAttribute('data-project-entering', '')
  await expect.poll(async () => (await readSlide(incomingCard)).x).toBeLessThan(0)
  await expect.poll(async () => (await readSlide()).opacity).toBeLessThan(earlySlide.opacity)
  await expect(page.locator('.liquid-experience-shoulders')).toHaveAttribute(
    'transform',
    /^translate\([^)]*\)\s*$/,
  )
  await expect(page.locator('.liquid-work-project-shoulders')).toHaveAttribute(
    'transform',
    /matrix\(0 1 -1 0/,
  )
  await page.screenshot({ path: test.info().outputPath('work-project-and-pill-liquid.png') })

  // The wheel can settle while the card and liquid are still finishing their turn.
  await moveToBoundary(page, skillStart + skillSegments[1].start + 0.7)
  await expect(second).toHaveCSS('visibility', 'visible')
  await expect(second).not.toHaveAttribute('data-work-entering')
  await expect(incomingCard).toHaveAttribute('data-project-entering', '')
  await expect.poll(async () => (await readSlide(incomingCard)).x).toBeLessThan(0)

  await moveToBoundary(page, skillStart + to + 0.035)
  await expect(incomingCard).toHaveCSS('transform', 'none')
  await expect(second).toHaveAttribute('data-active', '')
  await expect(second).not.toHaveAttribute('data-work-entering')
  await expect.poll(outgoingTilt).toBeGreaterThan(0.3)
  await expect(intro).toHaveCSS('transform', 'none')
  await expect(intro).toHaveCSS('opacity', '1')
  expect(await intro.boundingBox()).toEqual(introBounds)
  expect((await second.boundingBox())!.x).toBeCloseTo(introBounds!.x, 1)
  const settledScale = await readScale()
  expect(settledScale.x).toBeCloseTo(attachedScale.x, 3)
  expect(settledScale.y).toBeCloseTo(attachedScale.y, 3)
  await expect(page.locator(`#${projectStops[nextProject].id}`)).not.toHaveAttribute('inert')

  await moveToBoundary(page, earlyTurn)
  await expect.poll(outgoingScale).toBeCloseTo(earlyScale, 2)
  await expect.poll(async () => Math.abs((await readSlide()).z - earlySlide.z)).toBeLessThan(1)

  await moveToBoundary(page, midEntry)
  await expect(second).toHaveAttribute('data-work-docked', '')
  await expect.poll(outgoingScale).toBeCloseTo(attachedScale.x, 3)

  await moveToBoundary(page, skillStart - 0.1)
  await expect(first).toHaveCSS('visibility', 'hidden')
})

test('a page-mode wheel burst cannot queue multiple Work categories', async ({ page }) => {
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await expect(page.locator('.portfolio[data-work-projects]')).toBeVisible()
  const initial = skillStart + projectStops[0].position
  await moveToBoundary(page, initial)
  await page.locator('.skills-performance').evaluate((element) => {
    for (let i = 0; i < 20; i++)
      element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 1000000,
          deltaMode: 2,
        }),
      )
  })
  // A release commits to one adjacent project even for an oversized wheel burst.
  const track = page.locator('.scene-track')
  await expect
    .poll(() => track.getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(skillStart + projectStops[1].position, 2)
  await expect(track).not.toHaveAttribute('data-snapping')
  await expect(page.locator(`#${projectStops[1].id}`)).not.toHaveAttribute('inert')
})

test('desktop Work project enters from the left and reverses', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  const card = page.locator('.skill-project-card').first()

  await page.locator('.skills-performance').evaluate((target) => {
    const event = new Event('touchstart', { bubbles: true })
    Object.defineProperty(event, 'touches', { value: [{ clientX: 900, clientY: 480 }] })
    target.dispatchEvent(event)
  })

  const entry = skillStart + workProjectTravel * 0.25
  await moveToBoundary(page, entry)
  await expect(card).toHaveAttribute('data-project-entering', '')
  await expect(page.locator('.skills-browser [data-wheel-static]')).toHaveCSS('opacity', '0')
  const measurements = await page.evaluate(async () => {
    const original = Element.prototype.getBoundingClientRect
    const cards = new Set<string>()
    let reads = 0
    Element.prototype.getBoundingClientRect = function () {
      if (this.matches('.skill-project-card')) {
        reads++
        cards.add(this.id)
      }
      return original.call(this)
    }
    try {
      for (let frame = 0; frame < 8; frame++) await new Promise(requestAnimationFrame)
      return { reads, cards: cards.size }
    } finally {
      Element.prototype.getBoundingClientRect = original
    }
  })
  expect(measurements.cards).toBeLessThanOrEqual(1)
  expect(measurements.reads).toBeLessThanOrEqual(24)
  const attached = (await card.boundingBox())!
  expect(attached.x).toBeLessThan(0)
  await expect(page.locator('.liquid-experience-shoulders')).toHaveAttribute(
    'transform',
    /matrix\(0 1 -1 0/,
  )
  await page.screenshot({ path: test.info().outputPath('project-liquid-desktop.png') })

  await moveToBoundary(page, skillStart + projectStops[0].position + 0.04)
  await expect(card).not.toHaveAttribute('data-project-entering')
  const settled = (await card.boundingBox())!
  expect(settled.x).toBeGreaterThan(0)
  expect(settled.y).toBeCloseTo(attached.y, 0)

  await moveToBoundary(page, entry)
  await expect(card).toHaveAttribute('data-project-entering', '')
  await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(attached.x, 0)
  await expect(page.locator('.skill-project-card')).toHaveCount(projectStops.length)
})

test('mobile Work project enters from the left and reverses', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  const card = page.locator('.skill-project-card').first()

  await page.locator('.skills-performance').evaluate((target) => {
    const event = new Event('touchstart', { bubbles: true })
    Object.defineProperty(event, 'touches', { value: [{ clientX: 190, clientY: 480 }] })
    target.dispatchEvent(event)
  })

  const { copyStart, projectStart } = getWorkOpeningTiming(true)
  const copyPosition = skillStart + copyStart
  const intro = page.locator('.skills-browser [data-wheel-static]')
  const heading = intro.locator('h3')
  const paragraph = intro.locator('p')
  const { headingEnd, paragraphStart, end } = workIntroCopyTiming
  const headingMid = copyPosition + headingEnd / 2

  const alpha = (element: typeof heading) =>
    element.evaluate((el) => Number(getComputedStyle(el).opacity))

  await moveToBoundary(page, headingMid)
  await expect.poll(() => alpha(heading)).toBeCloseTo(0.5, 1)
  await expect(paragraph).toHaveCSS('opacity', '0')
  await expect(card).toBeHidden()

  await moveToBoundary(page, copyPosition + (headingEnd + paragraphStart) / 2)
  await expect(heading).toHaveCSS('opacity', '1')
  await expect(paragraph).toHaveCSS('opacity', '0')

  await moveToBoundary(page, copyPosition + (paragraphStart + end) / 2)
  await expect(heading).toHaveCSS('transform', 'none')
  await expect.poll(() => alpha(paragraph)).toBeCloseTo(0.5, 1)
  await expect(card).toBeHidden()

  const entry = skillStart + projectStart + workProjectTravel * 0.25
  await moveToBoundary(page, entry)
  await expect(intro).toHaveCSS('opacity', '1')
  await expect(paragraph).toHaveCSS('opacity', '1')
  await expect(page.locator('.skills-browser .skills-category-pill').first()).toBeHidden()

  // Sample the card after the spring reaches the browser's rounded scroll position.
  await expect
    .poll(() =>
      page.locator('.scene-track').evaluate((track, duration) => {
        const travel = track.clientHeight - track.firstElementChild!.clientHeight
        const target = (-track.getBoundingClientRect().top / travel) * duration

        return Math.abs(Number(track.getAttribute('data-playback-progress')) - target)
      }, sceneDuration),
    )
    .toBeLessThan(0.0001)

  const entering = (await card.boundingBox())!
  expect(entering.x).toBeLessThan(0)
  const liquid = page.locator('.liquid-experience-shoulders')
  await expect(liquid).toHaveAttribute('transform', /matrix\(0 1 -1 0/)
  await expect(liquid).toHaveAttribute('d', /M/)
  await expect(liquid).toHaveAttribute('d', /C/)
  await page.screenshot({ path: test.info().outputPath('project-liquid-mobile.png') })
  const colors = await liquid.evaluate((element) => ({
    liquid: getComputedStyle(element).fill,
    border: getComputedStyle(document.querySelector('.frame-surround') ?? element)
      .getPropertyValue('--frame-color')
      .trim(),
  }))
  expect(colors.liquid).toBe('rgb(0, 0, 0)')
  expect(colors.border).toMatch(/^#(?:000|000000)$/)

  await moveToBoundary(page, skillStart + projectStops[0].position + 0.04)
  const settled = (await card.boundingBox())!
  expect(settled.x).toBeGreaterThan(0)
  expect(settled.y).toBeCloseTo(entering.y, 0)

  await moveToBoundary(page, entry)
  await expect.poll(async () => (await card.boundingBox())!.x).toBeCloseTo(entering.x, 0)

  await moveToBoundary(page, headingMid)
  await expect.poll(() => alpha(heading)).toBeCloseTo(0.5, 1)
  await expect(paragraph).toHaveCSS('opacity', '0')
  await expect(card).toBeHidden()
})

test('project details reuse the scroll pill with their own measured range', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await page.locator('.skill-project-card').first().getByRole('button').click()
  const dialog = page.getByRole('dialog')
  const slider = dialog.getByRole('slider', { name: 'Astro Platform scroll position' })
  await expect(slider).toBeVisible()
  const backgroundScroll = await page.evaluate(() => scrollY)
  await slider.focus()
  await slider.press('End')
  await expect
    .poll(() =>
      dialog.locator('.project-detail-window').evaluate((element) => {
        return element.scrollTop / (element.scrollHeight - element.clientHeight)
      }),
    )
    .toBeCloseTo(1, 2)
  expect(await page.evaluate(() => scrollY)).toBe(backgroundScroll)
  await slider.press('Home')
  await expect
    .poll(() => dialog.locator('.project-detail-window').evaluate((element) => element.scrollTop))
    .toBe(0)
})

test('small wheel ticks advance Experience without amplifying a smooth wheel burst', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/#about-profile`)
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')

  const start = experienceStart + experienceRoleTravel + 0.3
  const track = page.locator('.scene-track')
  const progress = () => track.getAttribute('data-playback-progress').then(Number)
  const profile = page.locator('#about-profile')

  await moveToBoundary(page, start)
  await profile.evaluate((target) => {
    // A small start followed by rapid packets represents a continuous wheel gesture.
    for (const deltaY of [4, 20, 20, 20, 20, 20, 20]) {
      target.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }))
    }
  })
  const afterBurst = start + 0.09

  await expect.poll(progress).toBeCloseTo(afterBurst, 2)

  const wheelLine = (deltaY: number) =>
    profile.dispatchEvent('wheel', { deltaY, deltaMode: 1, bubbles: true, cancelable: true })

  await wheelLine(1)
  await expect.poll(progress).toBeCloseTo(afterBurst + 0.145, 2)
  await wheelLine(-1)
  await expect.poll(progress).toBeCloseTo(afterBurst, 2)
})

test('Experience keeps its pill spacing when the entrance reverses on a small screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto(`${baseURL}/#about-profile`)
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')
  await page.evaluate(() => document.fonts.ready)

  const incoming = page.locator('[data-role="biziq-developer-ii"]')
  const start = experienceStart + 2 * experienceRoleTravel
  const clearance = await incoming.evaluate((pill) =>
    parseFloat(getComputedStyle(pill.parentElement!).rowGap),
  )

  for (const phase of [0.68, 0.86, 1, 1.12, 0.86, 0.68]) {
    await moveToBoundary(page, start + phase * experiencePillTravel)

    const gap = await incoming.evaluate(
      (pill) =>
        pill.getBoundingClientRect().top -
        pill.previousElementSibling!.getBoundingClientRect().bottom,
    )

    expect(gap).toBeGreaterThanOrEqual(clearance - 0.5)
  }

  const read = (experienceDisclosureTiming.openEnd + experienceDisclosureTiming.closeStart) / 2
  await moveToBoundary(page, start + read)
  await expect(incoming.getByRole('img', { name: 'REST APIs' })).toBeVisible()
  await expect(incoming.getByRole('button')).toHaveCount(0)

  // The last metric is reachable by native scrolling while the role stays at its reading stop.
  const body = incoming.locator('.experience-body')
  const maxScroll = await body.evaluate((el) => el.scrollHeight - el.clientHeight)
  expect(maxScroll).toBeGreaterThan(0)
  await body.hover()
  await page.mouse.wheel(0, maxScroll + 50)
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(maxScroll - 2)

  const metric = incoming.getByText('Custom Features', { exact: true })
  await expect(metric).toBeInViewport()
  await expect(incoming.getByRole('heading', { name: 'Web Developer II' })).toBeInViewport()
  const clock = Number(await page.locator('.scene-track').getAttribute('data-playback-progress'))
  expect(clock).toBeCloseTo(start + read, 2)

  await moveToBoundary(page, start + experienceRoleTravel + read)
  const last = page.locator('[data-role="inenvi-engineer"]')
  await expect(last.getByRole('heading', { name: 'Software Engineer' })).toBeInViewport()
  await expect(last.getByRole('img', { name: 'Next.js' })).toBeVisible()
  const lastBounds = (await last.boundingBox())!
  expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(568)
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
  const thirdStart = experienceStart + experienceRoleTravel * 2
  const midEntry = thirdStart + experiencePillTravel * 0.43

  await moveToBoundary(page, thirdStart - 0.02)
  const previousRest = (await second.boundingBox())!

  await moveToBoundary(page, midEntry)
  await expect(third).toHaveAttribute('data-docked', '')
  await expect(third.locator('.experience-disclosure')).toHaveCSS('height', '0px')
  await expect(second).toHaveAttribute('aria-current', 'true')
  await expect(second).toHaveCSS('transform', 'none')
  await expect(third).toHaveCSS('transform', 'none')
  const docked = (await third.boundingBox())!
  await expect(about.locator('.experience-role button')).toHaveCount(0)

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

    // The liquid matches the outer border while the pill keeps its own surface.
    const frame = await page
      .locator('.liquid-experience-shoulders')
      .evaluate((element) => getComputedStyle(element).fill.match(/\d+/g)!.map(Number))

    // The rising frame wraps over the pill as well as around its sides.
    expect(pixel(Math.round(info.width / 2), Math.floor(entering.y - 8))).toEqual(frame)

    // Both shoulders rise above the flat frame outside the pill's outline.
    expect(pixel(Math.floor(entering.x - 12), info.height - 18)).toEqual(frame)
    expect(pixel(Math.ceil(entering.x + entering.width + 12), info.height - 18)).toEqual(frame)

    for (const x of [4, Math.floor(entering.x - 4), Math.ceil(entering.x + entering.width + 4)]) {
      const outside = pixel(x)

      for (const [index, channel] of frame.entries())
        expect(Math.abs(outside[index] - channel)).toBeLessThanOrEqual(2)
    }
  }

  await expect(canvas).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(canvas).toHaveCSS('color', 'rgb(8, 8, 9)')
  await expectDockPixels([0, 0, 0])

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
  await expect(second).toHaveJSProperty('inert', true)
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

  const reading = (experienceDisclosureTiming.openEnd + experienceDisclosureTiming.closeStart) / 2
  await moveToBoundary(page, thirdStart + reading)
  await expect(third).not.toHaveAttribute('data-docked')
  await expect(recoil).toHaveAttribute('d', '')
  await expect(swell).toHaveAttribute('d', '')
  await expect(third).toHaveCSS('scale', 'none')
  const settled = (await third.boundingBox())!
  expect(settled.width).toBeCloseTo(docked.width, 1)
  expect(settled.height).toBeGreaterThan(docked.height)
  expect(settled.y + settled.height).toBeLessThan(900)
  expect(settled.y).toBeGreaterThan((await about.locator('.experience-heading').boundingBox())!.y)
  await expect(third).toHaveAttribute('aria-current', 'true')
  await expect(second).toHaveJSProperty('inert', true)
  await expect(third.getByRole('img', { name: 'REST APIs' })).toBeVisible()

  const outgoingOpacity = await second.evaluate((role) => Number(getComputedStyle(role).opacity))
  expect(outgoingOpacity).toBe(1)

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
  expect((await second.boundingBox())!.y).toBeCloseTo(previousRest.y, 0)

  await moveToBoundary(page, sceneStops[3] - 1 - 0.01)
  const currentRole = about.locator('[data-role="inenvi-engineer"]')
  await expect(currentRole).toHaveAttribute('aria-current', 'true')
  await expect(currentRole).toHaveAttribute('data-portal', 'contact')
  await expect(currentRole.locator('.experience-disclosure')).toHaveCSS('height', '0px')

  await page.mouse.move(10, 400)
  await page.mouse.wheel(0, 120)
  await expect(page.locator('#contact')).toHaveAttribute('aria-hidden', 'false')
})

test('Experience keeps the reading card clear at tablet and laptop sizes', async ({ page }) => {
  const start = experienceStart + 2 * experienceRoleTravel
  const { openStart, openEnd, closeStart } = experienceDisclosureTiming
  const current = page.locator('[data-role="biziq-developer-ii"]')
  const previous = page.locator('[data-role="biziq-developer-i"]')
  const stage = page.locator('.experience-stage')

  for (const viewport of [
    { width: 820, height: 1000 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(`${baseURL}/#about-profile`)
    await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
    await page.evaluate(() => document.fonts.ready)

    await moveToBoundary(page, start + openStart + 0.06)
    const headerY = (await current.locator('.experience-header').boundingBox())!.y
    await moveToBoundary(page, start + (openEnd + closeStart) / 2)
    await expect(current).toHaveAttribute('aria-current', 'true')
    expect((await current.locator('.experience-header').boundingBox())!.y).toBeCloseTo(headerY, 0)

    const stageTop = await stage.evaluate((el) => {
      const inset = getComputedStyle(el).getPropertyValue('--experience-list-top')

      return el.getBoundingClientRect().top + parseFloat(inset)
    })
    const outgoingBottom = await previous.evaluate((el) => el.getBoundingClientRect().bottom)
    expect(outgoingBottom).toBeLessThanOrEqual(stageTop)

    const badgeRows = await current
      .locator('.experience-technologies [role="img"]')
      .evaluateAll((marks) => marks.map((mark) => mark.getBoundingClientRect().top))
    expect(badgeRows).toHaveLength(6)
    expect(new Set(badgeRows).size).toBe(1)
    await expect(current.getByText('Custom Features')).toBeInViewport()
    expect((await current.boundingBox())!.height + headerY).toBeLessThan(viewport.height)
  }
})

test('the focused Experience pill opens, holds for reading and closes before rotating', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/#about-profile`)
  await expect(page.locator('#about')).toHaveAttribute('data-about-stage', 'profile')
  await page.evaluate(() => document.fonts.ready)

  const role = page.locator('[data-role="biziq-developer-i"]')
  const start = experienceStart + experienceRoleTravel
  const { openStart, openEnd, closeStart, closeEnd } = experienceDisclosureTiming
  const opening = (openStart + openEnd) / 2
  const closing = (closeStart + closeEnd) / 2
  const title = role.getByRole('heading', { name: 'Web Developer I' })
  const panel = role.locator('.experience-disclosure')
  const height = () => panel.evaluate((el) => el.getBoundingClientRect().height)
  const seek = (travel: number) => moveToBoundary(page, start + travel)

  await seek(openStart - 0.01)
  await expect(panel).toHaveCSS('height', '0px')
  await seek(opening)
  const openingHeight = await height()
  const headingY = (await title.boundingBox())!.y
  expect(openingHeight).toBeGreaterThan(1)

  await seek(openEnd + 0.02)
  const fullHeight = await height()
  expect(fullHeight).toBeGreaterThan(openingHeight + 1)
  await expect(role.getByRole('img', { name: 'WordPress' })).toBeVisible()
  expect((await title.boundingBox())!.y).toBeCloseTo(headingY, 0)

  await seek(closeStart - 0.02)
  expect(await height()).toBeCloseTo(fullHeight, 0)
  await seek(closing)
  const closingHeight = await height()
  expect(closingHeight).toBeGreaterThan(1)
  expect(closingHeight).toBeLessThan(fullHeight - 1)
  await expect(role).toHaveCSS('transform', 'none')
  expect((await title.boundingBox())!.y).toBeCloseTo(headingY, 0)

  // The next entrance begins with this header still flat and fully closed.
  await seek(closeEnd + 0.04)
  await expect(panel).toHaveCSS('height', '0px')
  await expect(role).toHaveCSS('transform', 'none')
  await seek(experienceRoleTravel + experiencePillTravel * 0.86)
  await expect(role).toHaveCSS('transform', /^matrix3d\(/)
  await expect(panel).toHaveCSS('height', '0px')

  // Reverse the same scroll path and compare its partial and settled poses.
  await seek(closing)
  await expect.poll(height).toBeCloseTo(closingHeight, -1)
  await seek(closeStart - 0.02)
  expect(await height()).toBeCloseTo(fullHeight, 0)
  await expect(role.getByRole('img', { name: 'WordPress' })).toBeVisible()
  await seek(opening)
  await expect.poll(height).toBeCloseTo(openingHeight, -1)
  await seek(openStart - 0.01)
  await expect(panel).toHaveCSS('height', '0px')
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
  await moveToBoundary(page, skillTitleEnd - 0.01)
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

test('a short mobile drag reveals the intro, project, and pill in order and reverses', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })),
  )

  await expect(page.locator('.scene-skills')).toHaveAttribute('data-intro-drop-complete', '')

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

  await moveToBoundary(page, skillTitleEnd - 0.01)
  const progress = () =>
    page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
  const [entrance] = await Promise.all([
    page.evaluate(async (firstProject) => {
      const order: string[] = []
      const times: Record<string, number> = {}
      const record = (name: string) => {
        if (name in times) return

        times[name] = performance.now()
        order.push(name)
      }

      const intro = document.querySelector('.skills-browser .skills-wheel-intro')!
      const heading = intro.querySelector('h3')!
      const paragraph = intro.querySelector('p')!
      const expires = performance.now() + 6500

      while (!('category' in times) && performance.now() < expires) {
        await new Promise(requestAnimationFrame)
        const titleAlpha = Number(getComputedStyle(heading).opacity)
        const paragraphAlpha = Number(getComputedStyle(paragraph).opacity)
        const card = document.getElementById(firstProject)

        if (titleAlpha > 0.01) record('heading')
        if (titleAlpha >= 0.99) record('heading settled')
        if (paragraphAlpha > 0.01) record('paragraph')
        if (paragraphAlpha >= 0.99) record('paragraph settled')
        if (card?.hasAttribute('data-project-entering')) record('project')
        if (document.querySelector('.skills-category-pill[data-work-entering]')) record('category')
      }

      return { order, times }
    }, projectStops[0].id),
    drag(1),
  ])
  expect(entrance.order).toEqual([
    'heading',
    'heading settled',
    'paragraph',
    'paragraph settled',
    'project',
    'category',
  ])
  expect(entrance.times['heading settled'] - entrance.times.heading).toBeGreaterThan(450)
  expect(entrance.times.paragraph - entrance.times['heading settled']).toBeGreaterThan(100)
  expect(entrance.times['paragraph settled'] - entrance.times.paragraph).toBeGreaterThan(500)
  await expect.poll(progress).toBeCloseTo(skillStart + workIntroSettle, 2)
  const wheel = page.locator('ul.skills-browser')
  const intro = wheel.locator(':scope > li[data-wheel-static]:first-child')
  await expect(wheel.locator(':scope > :not(li)')).toHaveCount(0)
  await expect(page.locator('.skills-project-caption')).toHaveCount(0)
  await expect(intro).toHaveCSS('opacity', '1')
  await expect(intro).toHaveCSS('transform', 'none')
  const first = wheel.locator('.skills-category-pill').first()
  const headerBounds = (await page.locator('.site-header').boundingBox())!
  const introBounds = (await intro.boundingBox())!
  const projectBounds = (await page.locator('.skills-projects').boundingBox())!
  const pillBounds = (await first.boundingBox())!
  expect(introBounds.y - (headerBounds.y + headerBounds.height)).toBeGreaterThanOrEqual(24)
  expect(projectBounds.y - (introBounds.y + introBounds.height)).toBeGreaterThanOrEqual(12)
  expect(pillBounds.y - (projectBounds.y + projectBounds.height)).toBeGreaterThanOrEqual(12)
  expect(introBounds.x).toBeCloseTo(pillBounds.x, 1)
  await page.screenshot({ path: test.info().outputPath('work-opening-mobile.png') })
  await page.locator(`#${projectStops[0].id}`).getByRole('button').click({ trial: true })
  await drag(-1)
  await expect.poll(progress).toBeCloseTo(skillTitleEnd, 2)
  await expect(intro).toHaveCSS('opacity', '0')
})
