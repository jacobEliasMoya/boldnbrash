import { expect, test, type Page } from '@playwright/test'
import { projectStops, skillStart } from '../../src/components/organisms/skillsTimeline'

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

test('vertical touch input advances and reverses the scene clock', async ({ page }) => {
  await page.locator('.scene-top').evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const consumed = await swipe(page, '.hero-copy', 620, 220)
  expect(consumed.every(Boolean)).toBe(true)
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

test('walking follows short swipes at different speeds without a playback queue', async ({ page }) => {
  test.setTimeout(60000)
  for (const { steps, interval } of [{ steps: 8, interval: 16 }, { steps: 2, interval: 64 }, { steps: 20, interval: 25 }]) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 0 })))
    const result = await page.evaluate(async ({ steps, interval }) => {
      const target = document.querySelector('.hero-copy')!
      const track = document.querySelector<HTMLElement>('.scene-track')!
      const send = (type: string, y: number) => {
        const event = new Event(type, { bubbles: true, cancelable: true })
        Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }] })
        target.dispatchEvent(event)
      }
      const read = () => {
        const rect = track.getBoundingClientRect()
        return {
          visible: Number(track.dataset.playbackProgress),
          target: -rect.top / (track.offsetHeight - track.firstElementChild!.clientHeight) * Number(track.dataset.duration),
        }
      }
      send('touchstart', 650)
      for (let index = 1; index <= steps; index++) {
        send('touchmove', 650 - 400 * index / steps)
        await new Promise((resolve) => setTimeout(resolve, interval))
      }
      send('touchend', 250)
      const released = read()
      await new Promise((resolve) => setTimeout(resolve, 600))
      return { released, settled: read() }
    }, { steps, interval })
    // The same thumb travel must not be dropped when events arrive in larger chunks.
    expect(result.released.target).toBeGreaterThan(0.47)
    expect(result.released.target).toBeLessThan(0.52)
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
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }] })
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
    const destination = -rect.top / (track.offsetHeight - track.firstElementChild!.clientHeight) * Number(track.dataset.duration)
    return { forward, reversed, settled: progress(), destination }
  })
  expect(result.forward).toBeGreaterThan(0.05)
  expect(result.reversed).toBeLessThan(result.forward - 0.015)
  expect(Math.abs(result.settled - result.destination)).toBeLessThan(0.005)
})

test('skills introduction fill responds to mobile wheel input and vertical swipes', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })))
  const first = page.locator('.skills-title-fill').first()
  await expect(first).toHaveCSS('--title-fill', '0%')
  await first.dispatchEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })
  await expect.poll(async () => parseFloat(await first.evaluate((line) =>
    getComputedStyle(line).getPropertyValue('--title-fill')))).toBeGreaterThan(20)
  const consumed = await swipe(page, '.skills-title-fill', 620, 320)
  expect(consumed.every(Boolean)).toBe(true)
  await expect(first).toHaveCSS('--title-fill', '100%')
  await swipe(page, '.skills-title-fill', 320, 620)
  await expect.poll(async () => parseFloat(await first.evaluate((line) =>
    getComputedStyle(line).getPropertyValue('--title-fill')))).toBeLessThan(70)
})

test('a short thumb swipe advances a project and reverses across category gaps', async ({ page }) => {
  test.setTimeout(60000)
  const boundary = projectStops.findIndex((stop, index) => index > 0 && stop.skillIndex !== projectStops[index - 1].skillIndex) - 1
  for (const index of [0, boundary]) {
    const stop = projectStops[index]
    await page.evaluate(({ index, offset }) => window.dispatchEvent(new CustomEvent('portfolio:select-skill', {
      detail: { index, offset }, cancelable: true,
    })), { index: stop.skillIndex, offset: stop.projectIndex + 0.95 })
    const progress = () => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
    const initial = skillStart + stop.position
    await expect.poll(async () => Math.abs(await progress() - initial)).toBeLessThan(0.01)
    await swipe(page, '.skills-browser', 600, 480)
    await expect.poll(async () => Math.abs(await progress() - (skillStart + projectStops[index + 1].position)), { timeout: 5000 }).toBeLessThan(0.01)
    await swipe(page, '.skills-browser', 480, 600)
    await expect.poll(async () => Math.abs(await progress() - initial), { timeout: 5000 }).toBeLessThan(0.01)
    await swipe(page, '.skills-browser', 600, 570)
    await expect.poll(async () => Math.abs(await progress() - initial), { timeout: 5000 }).toBeLessThan(0.01)
  }
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
