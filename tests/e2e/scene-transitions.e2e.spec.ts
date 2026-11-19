import { expect, test } from '@playwright/test'
import { sceneStops, skillStart } from '../../src/components/organisms/skillsTimeline'

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
})

test('one scroll completes a page reveal and backscroll reverses it', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 2 })))
  const progress = () => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
  await page.mouse.move(500, 400)
  await page.mouse.wheel(0, 60)
  await expect.poll(progress).toBeCloseTo(sceneStops[3], 2)

  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 2 })))
  await page.mouse.wheel(0, 60)
  await expect(page.locator('.scene-track')).toHaveAttribute('data-transitioning', 'forward')
  await page.mouse.wheel(0, -60)
  await expect.poll(progress).toBeCloseTo(sceneStops[2], 2)
})

test('continued momentum finishes one reveal without skipping the next page', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })))
  await page.mouse.move(500, 400)
  for (let index = 0; index < 14; index++) {
    await page.mouse.wheel(0, 50)
    await page.waitForTimeout(80)
  }
  await expect.poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(skillStart, 2)
})

test('a short mobile drag opens the skills circle and a reverse drag closes it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:select-scene', { detail: 1 })))
  const drag = (direction: number) => page.locator('.skills-scene').evaluate(async (element, direction) => {
    const send = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: 180, clientY: y }] })
      element.dispatchEvent(event)
    }
    send('touchstart', 450)
    for (let step = 1; step <= 3; step++) {
      send('touchmove', 450 - direction * step * 12)
      await new Promise(requestAnimationFrame)
    }
    send('touchend', 450 - direction * 36)
  }, direction)
  await drag(1)
  await expect.poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(skillStart, 2)
  await drag(-1)
  await expect.poll(() => page.locator('.scene-track').getAttribute('data-playback-progress').then(Number))
    .toBeCloseTo(sceneStops[1], 2)
})
