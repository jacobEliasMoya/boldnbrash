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

test('one mobile swipe advances a project and reverses across category gaps', async ({ page }) => {
  const boundary = projectStops.findIndex((stop, index) => index > 0 && stop.skillIndex !== projectStops[index - 1].skillIndex) - 1
  for (const index of [0, boundary]) {
    const stop = projectStops[index]
    await page.evaluate(({ index, offset }) => window.dispatchEvent(new CustomEvent('portfolio:select-skill', {
      detail: { index, offset }, cancelable: true,
    })), { index: stop.skillIndex, offset: stop.projectIndex + 0.95 })
    const progress = () => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
    const initial = skillStart + stop.position
    await expect.poll(async () => Math.abs(await progress() - initial)).toBeLessThan(0.01)
    await swipe(page, '.skills-browser', 600, 420)
    await expect.poll(async () => Math.abs(await progress() - (skillStart + projectStops[index + 1].position)), { timeout: 5000 }).toBeLessThan(0.01)
    await swipe(page, '.skills-browser', 420, 600)
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
