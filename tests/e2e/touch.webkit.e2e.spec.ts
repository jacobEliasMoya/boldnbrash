import { expect, test, type Page } from '@playwright/test'

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
    .toBeGreaterThan(0.05)
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
