import { expect, test, type Page } from '@playwright/test'
import {
  heroFillEnd,
  heroParagraphEnd,
  heroWalkOutStart,
  heroWalkOutEnd,
  skillParagraphEnd,
  sceneStops,
  skillSegments,
  skills,
  skillStart,
  skillTravel,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
})

test('reduced motion avoids loading the mini Jake sequence', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })

  const frames: string[] = []

  page.on('request', (request) => {
    if (request.url().includes('/images/mini-jacob/')) frames.push(request.url())
  })
  await page.goto(baseURL)
  await expect(page.locator('.particle-logo')).toHaveCount(0)
  await expect(page.locator('.hero-mini-jacob')).toHaveCSS('opacity', '0')
  expect(frames).toHaveLength(0)
})

test.use({ viewport: { width: 1440, height: 900 } })

test('Jake walks in with the particle effect disabled', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('.particle-logo')).toHaveCount(0)

  const watermark = await page.locator('#top').evaluate((hero) => {
    const backdrop = getComputedStyle(hero, '::before')

    return { color: backdrop.backgroundColor, opacity: backdrop.opacity }
  })

  expect(watermark).toEqual({ color: 'rgb(56, 20, 255)', opacity: '0.09' })
  await expect(page.locator('.hero-mark-animation')).toHaveAttribute('data-mode', 'idle')
  await page.setViewportSize({ width: 390, height: 844 })

  const mobileSize = await page
    .locator('#top')
    .evaluate((hero) => getComputedStyle(hero, '::before').maskSize)

  expect(parseFloat(mobileSize)).toBe(390 * 2)
  await page.setViewportSize({ width: 320, height: 568 })

  const longestLine = page.locator('.hero-line').last()
  const rightEdge = await longestLine.evaluate((line) => {
    const range = document.createRange()

    range.selectNodeContents(line)

    return range.getBoundingClientRect().right
  })

  expect(rightEdge).toBeLessThan(308)
})

test('Jake turns toward his travel direction and keeps his gait forward when scrolling reverses', async ({
  page,
}) => {
  await page.goto(baseURL)

  const avatar = page.locator('.hero-mini-jacob')

  await expect(page.locator('.hero-mark-animation')).toHaveAttribute('data-mode', 'idle', {
    timeout: 15000,
  })

  let previousStep = 0
  let previousCenter = Number(await avatar.getAttribute('data-center'))

  for (const [progress, facing] of [
    [0.35, 'right'],
    [0.17, 'left'],
    [0.43, 'right'],
  ] as const) {
    await scrollTimeline(page, heroWalkOutStart + progress * (heroWalkOutEnd - heroWalkOutStart))
    await expect(avatar).toHaveAttribute('data-facing', facing)

    const center = Number(await avatar.getAttribute('data-center'))

    expect(facing === 'right' ? center > previousCenter : center < previousCenter).toBe(true)

    const step = Number(await avatar.getAttribute('data-walk-step'))

    expect(step).toBeGreaterThan(previousStep)
    await expect(avatar).toHaveAttribute('data-source-frame', String([4, 5, 6, 7][step % 4]))
    previousStep = step
    previousCenter = center
  }
})

test('large wheel bursts have a bounded queue and reverse immediately', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })
  await expect(page.locator('.hero-mark-animation')).toHaveAttribute('data-mode', 'idle')

  const track = page.locator('.scene-track')

  await page.mouse.move(900, 400)

  for (let index = 0; index < 15; index++) {
    if (index === 7) await page.mouse.move(100, 45)

    await page.mouse.wheel(0, 10000)
  }

  const queued = await track.evaluate((element) => {
    const stage = element.firstElementChild as HTMLElement
    const native =
      (-element.getBoundingClientRect().top /
        ((element as HTMLElement).offsetHeight - stage.clientHeight)) *
      Number((element as HTMLElement).dataset.duration)

    return { native, displayed: Number((element as HTMLElement).dataset.playbackProgress) }
  })

  expect(queued.native - queued.displayed).toBeLessThan(0.22)
  expect(queued.native).toBeLessThan(0.65)

  const before = Number(await track.getAttribute('data-playback-progress'))

  await page.mouse.wheel(0, -10000)
  await expect
    .poll(async () => Number(await track.getAttribute('data-playback-progress')))
    .toBeLessThan(before)
})

test('fast scrolling does not interrupt Jake’s automatic walk-in', async ({ page }) => {
  await page.goto(baseURL)

  const avatar = page.locator('.hero-mini-jacob')

  await avatar.evaluate((element, exitEnd) => {
    const samples: { frame: number; time: number }[] = []
    const observer = new MutationObserver(() => {
      if (samples.length === 0) {
        const track = document.querySelector<HTMLElement>('.scene-track')!
        const distance = track.offsetHeight - track.firstElementChild!.clientHeight

        window.scrollTo(0, (distance * (exitEnd + 0.05)) / Number(track.dataset.duration))
      }

      samples.push({ frame: Number(element.getAttribute('data-frame')), time: performance.now() })
      ;(element as HTMLElement).dataset.frameTimes = JSON.stringify(samples)

      if (element.getAttribute('data-direction') === 'out') observer.disconnect()
    })

    observer.observe(element, { attributes: true, attributeFilter: ['data-frame'] })
  }, heroWalkOutEnd)
  await expect(page.locator('.hero-mark-animation')).toHaveAttribute('data-mode', 'gone', {
    timeout: 15000,
  })

  const samples = JSON.parse((await avatar.getAttribute('data-frame-times'))!) as {
    frame: number
    time: number
  }[]

  expect(samples[samples.length - 1].time - samples[0].time).toBeGreaterThan(600)
  expect(samples.slice(0, -1).some(({ frame }) => frame >= 5 && frame < 8)).toBe(true)
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '100%')
})

test('Jake walks in automatically, then scroll plays his wave and exit', async ({ page }) => {
  await page.goto(baseURL)

  const mark = page.locator('.hero-mark-animation')
  const avatar = page.locator('.hero-mini-jacob')
  const firstLetter = page.locator('.hero-letter').first()

  await expect(mark).toHaveAttribute('data-mode', 'idle', { timeout: 15000 })
  await expect(avatar).toHaveAttribute('data-frame', '8')
  expect(await page.evaluate(() => scrollY)).toBe(0)

  for (const frame of [9, 11, 14, 15]) {
    await scrollTimeline(page, (0.35 * (frame - 7.5)) / 7.5)
    await expect(avatar).toHaveAttribute('data-frame', String(frame))
    await expect(firstLetter).toHaveCSS('--letter-fill', '0%')
  }

  await expect(mark).toHaveAttribute('data-mode', 'idle')
  await scrollTimeline(page, 0.4)
  await expect(mark).toHaveAttribute('data-mode', 'idle')
  await scrollTimeline(page, heroWalkOutStart - 0.05)
  await expect(mark).toHaveAttribute('data-mode', 'idle')
  await expect(firstLetter).toHaveCSS('--letter-fill', '100%')

  let previousCenter = 289

  for (const step of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await scrollTimeline(
      page,
      heroWalkOutStart + ((heroWalkOutEnd - heroWalkOutStart) * (step + 0.2)) / 10,
    )
    await expect(avatar).toHaveAttribute('data-frame', String([4, 5, 6, 7][step % 4]))
    await expect(avatar).toHaveAttribute('data-direction', 'out')

    const center = Number(await avatar.getAttribute('data-center'))

    expect(center).toBeGreaterThan(previousCenter)
    previousCenter = center
    await expect(firstLetter).toHaveCSS('--letter-fill', '100%')
  }

  await scrollTimeline(page, heroWalkOutEnd)
  await expect(mark).toHaveAttribute('data-mode', 'gone')
  await expect(avatar).toHaveCSS('opacity', '0')
  await expect(page.locator('#skills')).toHaveCSS('visibility', 'hidden')
  await scrollTimeline(page, 0.8)
  await expect(firstLetter).toHaveCSS('--letter-fill', '100%')

  const secondLine = page.locator('.hero-line').nth(1).locator('.hero-letter').first()

  await expect(secondLine).toHaveCSS('--letter-fill', '100%')
  await expect(page.locator('.hero-letter').last()).toHaveCSS('--letter-fill', '0%')

  for (const selector of ['.hero-greeting', '.hero-greeting .name-pill', '.hero-description']) {
    await expect(page.locator(selector)).toHaveCSS('background-image', 'none')
  }

  await scrollTimeline(page, 0.7)
  await expect(secondLine).toHaveCSS('--letter-fill', '0%')
  await scrollTimeline(page, 0.4)
  await expect(mark).toHaveAttribute('data-mode', 'idle')
  await expect(avatar).toHaveAttribute('data-direction', 'in')
  await expect(avatar).toHaveCSS('opacity', '1')
})

test('the desktop wordmark drip enters with the wordmark', async ({ page }) => {
  await page.goto(baseURL)

  const drip = page.locator('.liquid-wordmark-parked')
  const wordmark = page.locator('.liquid-blended-logo .wordmark')

  await expect(drip).not.toHaveAttribute('d')
  await expect.poll(async () => (await wordmark.boundingBox())?.y).toBeLessThan(-40)
  await expect(wordmark).toHaveCSS('opacity', '1')
  await expect(wordmark).toHaveCSS('transform', 'none', { timeout: 15000 })
  await expect(drip).not.toHaveAttribute('opacity')
  await expect(drip).toHaveAttribute('d', /^M/)
})

test('header controls stay readable over a solid liquid boundary', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })

  const home = page
    .getByRole('navigation', { name: 'Portfolio' })
    .getByRole('link', { name: 'Home' })

  await expect(home.locator('.nav-label > .nav-home-icon')).toBeVisible()
  await expect(home).toHaveCSS('font-family', /JetBrains Mono/)
  await expect(home).toHaveCSS('font-weight', '800')
  await expect(home.locator('.nav-label > .nav-home-icon')).toHaveCSS('stroke', 'none')
  await expect(page.locator('.nav-highlight')).toHaveCount(0)

  for (const control of [
    page.getByRole('link', { name: 'About', exact: true }),
    page.getByRole('link', { name: 'Jacob Moya home' }),
    page.getByRole('button', { name: 'Night mode' }),
  ]) {
    await control.hover()
    await expect
      .poll(async () =>
        Number(await page.locator('.liquid-boundary').getAttribute('data-pull-depth')),
      )
      .toBeGreaterThan(25)
    const contrast = control.locator('.nav-label-contrast')

    if (await contrast.count()) {
      await expect(contrast).toHaveCSS('color', 'rgb(255, 255, 255)')
      await expect(contrast).not.toHaveCSS('clip-path', 'inset(0px 0px 100%)')
    } else {
      await expect(control.locator('.theme-toggle-track')).toHaveCSS('color', 'rgb(255, 255, 255)')
    }
    await expect(control.locator('..')).toHaveCSS('mix-blend-mode', 'normal')
    await expect(page.locator('.liquid-boundary')).toHaveCSS('mix-blend-mode', 'normal')
  }

  await expect(page.locator('.liquid-boundary path')).toHaveCount(1)
  await page.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page.locator('.liquid-blended-nav')).toHaveAttribute('data-tone', 'paper')
  await expect(page.locator('.liquid-blended-nav')).toHaveCSS('color', 'rgb(8, 8, 9)')
  await expect(page.locator('.liquid-blended-nav')).toHaveCSS('mix-blend-mode', 'normal')
})

test('outer liquid motion cannot shift content in desktop mobile testing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseURL}/#skills`)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })

  const liquid = page.locator('.liquid-boundary')

  await expect(liquid).toHaveCSS('contain', 'strict')
  await expect(liquid).toHaveCSS('overflow-anchor', 'none')

  const snapshot = () =>
    page.evaluate(() => {
      const heading = document.querySelector('.skills-heading')!.getBoundingClientRect()

      return {
        x: scrollX,
        y: scrollY,
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        left: heading.left,
        top: heading.top,
      }
    })
  const initial = await snapshot()

  for (const [x, y] of [
    [190, 12],
    [360, 30],
    [363, 400],
    [360, 810],
    [190, 830],
    [12, 810],
    [12, 400],
    [30, 30],
  ]) {
    await page.mouse.move(x, y)
    await page.waitForTimeout(120)
    expect(await snapshot()).toEqual(initial)
  }

  // Mobile uses the static boundary; pointer motion must not start an idle lap.
  await expect(liquid).toHaveAttribute('data-mode', 'static')
  await expect(liquid).toHaveAttribute('data-pull-depth', '0.00')
  expect(await snapshot()).toEqual(initial)
})

test('the liquid takes a gentle idle lap and yields to the pointer', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })

  const liquid = page.locator('.liquid-boundary')

  await page.mouse.move(1400, 450)
  await expect(liquid).toHaveAttribute('data-mode', 'pointer')
  await expect(liquid).toHaveAttribute('data-mode', 'idle', { timeout: 6000 })

  const start = Number(await liquid.getAttribute('data-pull-position'))

  await expect
    .poll(async () => Math.abs(Number(await liquid.getAttribute('data-pull-position')) - start))
    .toBeGreaterThan(15)
  await expect
    .poll(async () => Number(await liquid.getAttribute('data-pull-depth')))
    .toBeGreaterThan(15)
  await page.mouse.move(700, 150)
  await expect(liquid).toHaveAttribute('data-mode', 'pointer')
})

test('the liquid still idles when the cursor leaves the visible page', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })
  await page.mouse.move(1400, 450)
  await page.locator('html').evaluate((element) => element.dispatchEvent(new Event('pointerleave')))

  const liquid = page.locator('.liquid-boundary')

  await expect(liquid).toHaveAttribute('data-mode', 'idle', { timeout: 5000 })

  const before = Number(await liquid.getAttribute('data-pull-position'))

  await expect
    .poll(async () => Math.abs(Number(await liquid.getAttribute('data-pull-position')) - before))
    .toBeGreaterThan(30)
})

test('the edge scroll pill seeks and carries its liquid with it', async ({ page }) => {
  await page.goto(baseURL)

  const slider = page.getByRole('slider', { name: 'Home scroll position' })
  const liquid = page.locator('.liquid-scroll-pill')

  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('.site-scrollbar')).toHaveAttribute('inert', '')
  await expect(liquid).not.toHaveAttribute('d')
  await scrollTimeline(page, heroWalkOutEnd / 4)
  await expect(slider).toHaveAttribute('aria-valuetext', '25% of Home')
  await expect(page.locator('.site-scrollbar')).toHaveCSS('transform', 'none')
  await expect(liquid).toHaveAttribute('d', /^M/)

  const initialLiquid = await liquid.getAttribute('d')
  const bounds = (await slider.boundingBox())!

  expect(900 - bounds.y - bounds.height).toBeCloseTo(45, 0)
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
  await expect(slider).toHaveAttribute('aria-valuetext', '50% of Home')
  await expect(liquid).not.toHaveAttribute('d', initialLiquid!)
  await slider.press('ArrowDown')
  await expect(slider).toHaveAttribute('aria-valuetext', '52% of Home')
  await slider.press('End')
  await expect(slider).toHaveAttribute('aria-valuetext', '100% of Home')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await slider.press('Home')
  await expect(slider).toHaveAttribute('aria-valuetext', '0% of Home')

  await scrollTimeline(page, (heroWalkOutEnd + sceneStops[1]) / 2)
  await expect(page.locator('.site-scrollbar')).toHaveAttribute('inert', '')
  await scrollTimeline(page, sceneStops[1])
  await expect(page.getByRole('slider', { name: 'Work scroll position' })).toHaveAttribute(
    'aria-valuetext',
    '0% of Work',
  )

  const thumb = page.locator('.site-scrollbar-thumb')

  expect((await thumb.boundingBox())!.height).toBeCloseTo(45.9, 1)
  expect((await thumb.boundingBox())!.y).toBeCloseTo(45, 0)

  const workSlider = page.getByRole('slider', { name: 'Work scroll position', exact: true })

  await workSlider.press('End')
  await expect(workSlider).toHaveAttribute('aria-valuetext', '100% of Work')
  await expect(page.locator('.skills-reveal')).toHaveAttribute('inert', '')
  await scrollTimeline(page, (skillParagraphEnd + skillStart) / 2)
  await expect(page.locator('.site-scrollbar')).toHaveAttribute('inert', '')
  await scrollTimeline(page, skillStart)
  await expect(page.getByRole('slider', { name: 'Work projects scroll position' })).toHaveAttribute(
    'aria-valuetext',
    '0% of Work projects',
  )
  expect((await thumb.boundingBox())!.y).toBeCloseTo(45, 0)
  await page.setViewportSize({ width: 1440, height: 600 })
  await expect(thumb).toHaveCSS('height', '36px')
  await expect(liquid).not.toHaveAttribute('d', /NaN/)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(thumb).toHaveCSS('width', '10px')
  expect((await thumb.boundingBox())!.height).toBeCloseTo(35.45, 1)
  await expect(page.locator('.site-scrollbar-input')).toHaveCSS('width', '24px')
  await expect(thumb).toHaveCSS('background-color', 'rgb(255, 200, 87)')
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark'
  })
  await expect(thumb).toHaveCSS('background-color', 'rgb(85, 48, 220)')
})

test('a touch drag on the scroll pill follows the finger until release', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await scrollTimeline(page, heroWalkOutEnd / 4)

  const slider = page.getByRole('slider', { name: 'Home scroll position' })

  await expect(slider).toHaveAttribute('aria-valuetext', '25% of Home')
  await expect(page.locator('.site-scrollbar')).toHaveCSS('transform', 'none')

  const thumb = (await page.locator('.site-scrollbar-thumb').boundingBox())!
  const travel = (await page.locator('.site-scrollbar-travel').boundingBox())!
  const client = await page.context().newCDPSession(page)

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: thumb.x + thumb.width / 2, y: thumb.y + thumb.height / 2 }],
  })

  for (const position of [0.6, 0.8, 0.4]) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: thumb.x - 35, y: travel.y + travel.height * position }],
    })
    await expect(slider).toHaveAttribute('aria-valuetext', `${position * 100}% of Home`)
  }

  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(slider).toHaveAttribute('aria-valuetext', '40% of Home')
})

test('scenes open with scroll and close again in reverse', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page).toHaveTitle(/Jacob Moya/)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
    'Plan It. Build It. Launch It.',
  )
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#top')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('#about')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await scrollTimeline(page, sceneStops[1] + 0.1)
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')

  const nav = page.getByRole('navigation', { name: 'Portfolio' })
  const work = nav.getByRole('link', { name: 'Work', exact: true })
  const home = nav.getByRole('link', { name: 'Home', exact: true })

  await expect(work).toHaveAttribute('aria-current', 'location')
  await expect(work.locator('.desktop-section-marker')).toHaveCSS('opacity', '1')
  await expect(home.locator('.desktop-section-marker')).toHaveCSS('opacity', '0')
  await expect(page.locator('#top')).toHaveJSProperty('inert', true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await expect(home.locator('.desktop-section-marker')).toHaveCSS('opacity', '1')
  await expect(page.locator('#skills')).toHaveJSProperty('inert', true)
})

test('the Work reveal starts at the visible period on desktop and mobile', async ({ page }) => {
  test.setTimeout(60000)

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto(baseURL)

    const period = page.locator('.hero-period')

    await expect(page.locator('#top')).toHaveAttribute('data-period-ready', 'true', {
      timeout: 15000,
    })
    await scrollTimeline(page, heroWalkOutEnd)
    await expect(page.locator('.hero-period-glyph')).toHaveCSS('--letter-fill', '100%')

    const bounds = (await period.boundingBox())!
    const screenshot = await period.screenshot()
    const inkCenter = await page.evaluate(async (png) => {
      const image = new Image()

      image.src = 'data:image/png;base64,' + png
      await image.decode()

      const canvas = document.createElement('canvas')

      canvas.width = image.width
      canvas.height = image.height

      const context = canvas.getContext('2d')!

      context.drawImage(image, 0, 0)

      const { data } = context.getImageData(0, 0, image.width, image.height)
      let left = image.width,
        top = image.height,
        right = -1,
        bottom = -1

      for (let y = 0; y < image.height; y++) {
        // Negative letter spacing can paint the preceding letter across the crop's left edge.
        for (let x = Math.floor(image.width / 4); x < image.width; x++) {
          const offset = (y * image.width + x) * 4

          if (data[offset] > 100 || data[offset + 1] > 100 || data[offset + 2] < 150) continue

          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
      }

      return { x: (left + right + 1) / 2, y: (top + bottom + 1) / 2, found: right >= left }
    }, screenshot.toString('base64'))

    expect(inkCenter.found).toBe(true)
    await scrollTimeline(page, heroWalkOutEnd + 0.05)

    const origin = page.locator('.scene-period-opening circle').first()
    const panelBounds = (await page.locator('#skills').boundingBox())!

    expect(
      Math.abs(Number(await origin.getAttribute('cx')) + panelBounds.x - bounds.x - inkCenter.x),
    ).toBeLessThan(3)
    expect(
      Math.abs(Number(await origin.getAttribute('cy')) + panelBounds.y - bounds.y - inkCenter.y),
    ).toBeLessThan(3)
  }
})

test('section reveals remain partial until further scrolling and reverse with scroll', async ({
  page,
}) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')

  const scrollToProgress = async (progress: number) => {
    await page.evaluate((value) => {
      const track = document.querySelector<HTMLElement>('.scene-track')!
      const stage = track.firstElementChild as HTMLElement
      const start = scrollY + track.getBoundingClientRect().top

      window.scrollTo(
        0,
        start +
          ((track.offsetHeight - stage.clientHeight) * value) / Number(track.dataset.duration),
      )
    }, progress)
  }

  await scrollToProgress(1)

  const panel = page.locator('#skills')

  await expect(panel).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '100%')
  await expect(page.locator('.hero-letter').nth(5)).toHaveCSS('--letter-fill', '100%')

  const description = page.locator('.hero-description')
  const words = description.locator('.word-emphasis')
  const firstWordMiddle =
    heroFillEnd + (heroParagraphEnd - heroFillEnd) / (2 * (await words.count()))

  await scrollToProgress(firstWordMiddle)
  await expect(words.first()).not.toHaveCSS('transform', 'none')
  await expect(panel).toHaveCSS('visibility', 'hidden')

  const descriptionSize = await description.evaluate(
    (element) => getComputedStyle(element).fontSize,
  )

  await expect(page.locator('#skills .skills-intro')).toHaveCSS('font-size', descriptionSize)
  await scrollToProgress(heroWalkOutEnd + 0.1)
  await expect(panel).toHaveCSS('visibility', 'visible')
  await page.waitForTimeout(1000)

  const radius = () => panel.evaluate((el) => parseFloat(getComputedStyle(el).clipPath.slice(7)))
  const partial = await radius()

  expect(partial).toBeGreaterThan(0)
  await expect(panel).not.toHaveCSS('clip-path', 'none')
  await scrollToProgress(heroWalkOutEnd + 0.32)
  await expect.poll(radius).toBeGreaterThan(partial * 1.5)
  await scrollToProgress(heroWalkOutEnd + 0.04)
  await expect.poll(radius).toBeLessThan(partial)
  await scrollToProgress(sceneStops[1])
  await expect(panel).toHaveCSS('clip-path', 'none')
  await scrollToProgress(0)
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '0%')
  await expect(page.locator('#skills')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
})

test('about navigation and history work by keyboard', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await page.getByRole('link', { name: 'About', exact: true }).click()
  await expect(page).toHaveURL(/#about$/)
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false')
  await page.getByRole('link', { name: 'Read more about Jacob' }).click()
  await expect(page.locator('#about .about-reveal')).toHaveCSS('clip-path', /^circle\(/)
  await expect(page.getByRole('heading', { name: 'Experience.' })).toBeVisible()
  await page.getByRole('link', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', /^mailto:/)
  await page.goBack()
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false')
  await page.goto(`${baseURL}/#skills`)
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
})

test('mobile retains reveals and scrollable content; reduced motion retains document flow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.locator('#skills')).toHaveJSProperty('inert', true)
  await page.getByRole('link', { name: 'Explore selected projects and skills' }).click()
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await scrollTimeline(page, skillStart + skillSegments[1].start + 0.95)
  await page.getByRole('button', { name: 'Select Headless CMS', exact: true }).click()
  await expect(page.locator('.skills-project-deck[aria-hidden="false"]')).toHaveAttribute(
    'data-skill',
    'Headless CMS',
  )
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page
    .getByRole('dialog', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'About.', exact: true })
    .click()
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).not.toBeVisible()
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false')
  await expect(
    page.getByRole('heading', { name: 'Curious by nature. Hands on by choice.' }),
  ).toBeInViewport()

  const work = page.locator('#about')

  await work.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(work.locator('.scene-footnote').last()).toBeInViewport()
  await page.getByRole('link', { name: 'Jacob Moya home' }).click()
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')
  await expect(page.locator('#contact')).not.toHaveJSProperty('inert', true)
})

async function scrollTimeline(page: Page, value: number, settled = true) {
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await page.evaluate(
    ({ position, segments, start, end }) => {
      if (position >= start && position <= end) {
        const relative = position - start
        const index = segments.reduce(
          (chosen, segment, i) => (segment.start <= relative ? i : chosen),
          0,
        )

        window.dispatchEvent(
          new CustomEvent('portfolio:select-skill', {
            detail: { index, offset: relative - segments[index].start },
            cancelable: true,
          }),
        )

        return
      }
      window.dispatchEvent(new Event('pointerdown'))

      const track = document.querySelector<HTMLElement>('.scene-track')!
      const stage = track.firstElementChild as HTMLElement
      const trackTop = scrollY + track.getBoundingClientRect().top

      window.scrollTo(
        0,
        trackTop +
          ((track.offsetHeight - stage.clientHeight) * position) / Number(track.dataset.duration),
      )
    },
    { position: value, segments: skillSegments, start: skillStart, end: skillStart + skillTravel },
  )

  if (settled)
    await expect
      .poll(
        async () =>
          Math.abs(
            Number(await page.locator('.scene-track').getAttribute('data-playback-progress')) -
              value,
          ),
        { timeout: 90000 },
      )
      .toBeLessThan(0.005)
}

test('skill categories retain the card layout, stack, and scroll progression', async ({ page }) => {
  test.setTimeout(120000)
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')

  for (const [index, skill] of skills.entries()) {
    for (const [position, project] of skill.projects.entries()) {
      await scrollTimeline(page, skillStart + skillSegments[index].start + position + 1.1)
      await expect(
        page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
      ).toHaveText(`${skill.name}.`)
      await expect(
        page.locator('.skills-category-pill[data-active] .skills-technologies'),
      ).toHaveText(skill.technologies.join(' \u00b7 '))

      const card = page.getByRole('article', { name: project.title, exact: true })

      await expect(card).toBeInViewport()
      await expect(card.locator('.skill-project-information')).toHaveCSS('opacity', '1')
      await expect(page.locator('#about')).toHaveJSProperty('inert', true)
    }
  }

  await scrollTimeline(page, skillStart + skillTravel - 0.05)
  await expect(page.locator('#about')).toHaveJSProperty('inert', true)
  await scrollTimeline(page, sceneStops[2])
  await expect(page.locator('#about')).toHaveAttribute('aria-hidden', 'false')
  await scrollTimeline(page, skillStart + 1.1)
  await expect(
    page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
  ).toHaveText('Frontend Development.')
  await expect(page.locator('.skills-project-deck[aria-hidden="false"]')).toHaveAttribute(
    'data-project',
    '0',
  )
})

test('category controls and project details work by keyboard', async ({ page }) => {
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await scrollTimeline(page, skillStart + skillSegments[1].start + 0.95)

  const cms = page.getByRole('button', { name: 'Select Headless CMS', exact: true })

  await expect(cms).toHaveAttribute('aria-pressed', 'true')
  await cms.focus()
  await cms.press('ArrowLeft')

  const frontend = page.getByRole('button', { name: 'Select Frontend Development', exact: true })

  await expect(frontend).toBeFocused()
  await frontend.press('ArrowRight')
  await expect(cms).toBeFocused()
  await cms.press('Enter')
  await expect(
    page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
  ).toHaveText('Headless CMS')
  await scrollTimeline(page, skillStart + skillSegments[1].start + 1.1)

  const read = page
    .getByRole('article', { name: 'RegisteredAgents', exact: true })
    .getByRole('button', { name: /Read project/ })

  await read.focus()
  await read.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'RegisteredAgents', exact: true })

  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Strapi / GraphQL')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(read).toBeFocused()
})

test('mobile category controls stay usable and project information fits the cards', async ({
  page,
}) => {
  test.setTimeout(120000)

  for (const height of [844, 600]) {
    await page.setViewportSize({ width: 390, height })
    await page.goto(baseURL + '/#skills')
    await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
    await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')

    for (const skill of skills) {
      await scrollTimeline(page, skillStart + skillSegments[skills.indexOf(skill)].start + 0.95)
      await expect
        .poll(() =>
          page
            .locator('.skills-category-pill')
            .nth(skills.indexOf(skill))
            .evaluate((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m43)),
        )
        .toBeLessThan(1)
      await page.getByRole('button', { name: 'Select ' + skill.name, exact: true }).click()
      await expect(
        page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
      ).toHaveText(`${skill.name}.`)
      await scrollTimeline(page, skillStart + skillSegments[skills.indexOf(skill)].start + 1.1)

      const card = page.getByRole('article', { name: skill.projects[0].title, exact: true })

      await expect(card).toBeVisible()
      await expect
        .poll(() =>
          card.evaluate((element) => {
            const bounds = element.getBoundingClientRect()
            const info = element
              .querySelector('.skill-project-information')!
              .getBoundingClientRect()
            const button = element.querySelector('button')!.getBoundingClientRect()

            return (
              info.top >= button.top &&
              info.bottom <= button.bottom &&
              button.bottom <= bounds.bottom
            )
          }),
        )
        .toBe(true)
    }
  }
})

test('mobile night mode shares the header and menu styling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })

  const headerToggle = page.locator('.liquid-blended-control .theme-toggle')
  const track = '.theme-toggle-track'

  await expect(headerToggle.locator(track)).toHaveCSS('background-color', 'rgb(33, 29, 41)')
  await page.getByRole('button', { name: 'Open menu' }).click()

  const hiddenTray = page.locator('.profile-links-menu')

  await expect.poll(async () => (await hiddenTray.boundingBox())?.y ?? 0).toBeGreaterThan(844)

  const socials = page.getByRole('navigation', { name: 'Social and contact links' })
  const closeButton = page.getByRole('button', { name: 'Close menu' })
  const closeDots = closeButton.locator('.mobile-menu-close-dots i')

  await expect(closeDots).toHaveCount(5)

  const footerLiquid = page.locator('.mobile-menu-liquid-footer')

  await expect(socials).toHaveCSS('transform', 'none')
  await expect(closeDots.nth(2)).toHaveCSS('background-color', 'rgb(8, 8, 9)')
  await expect(footerLiquid).toHaveAttribute('d', /^M.+Z$/)
  await expect(footerLiquid).toHaveCSS('fill', 'rgb(0, 0, 0)')
  await expect(socials.getByRole('link', { name: /GitHub/ })).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  )

  const githubIcon = socials.getByRole('link', { name: /GitHub/ })

  await expect(githubIcon).toHaveCSS('width', '40px')
  await expect(githubIcon.locator('svg')).toHaveCSS('width', '24px')
  await expect(socials.getByRole('link', { name: /LinkedIn/ })).toBeVisible()
  await expect(socials.getByRole('link', { name: 'Email', exact: true })).toHaveAttribute(
    'href',
    'mailto:jemoya1994@gmail.com',
  )
  await expect(socials.getByRole('link', { name: 'Call', exact: true })).toHaveAttribute(
    'href',
    'tel:+19096446073',
  )

  const sms = new URL(
    (await socials.getByRole('link', { name: 'Text message' }).getAttribute('href'))!,
  )

  expect(sms.protocol).toBe('sms:')
  expect(sms.pathname).toBe('+19096446073')
  expect(sms.searchParams.get('body')).toBe(
    'Hey Jake, I came across your portfolio and would love to chat about working together.',
  )

  const panelBounds = (await page.locator('.mobile-menu-panel').boundingBox())!
  const socialBounds = (await socials.boundingBox())!

  expect(panelBounds.y + panelBounds.height - socialBounds.y - socialBounds.height).toBeCloseTo(
    12,
    0,
  )

  const menuToggle = page.locator('.mobile-menu-heading .theme-toggle')

  await expect(menuToggle.locator(track)).toHaveCSS('background-color', 'rgb(33, 29, 41)')
  await expect(menuToggle.locator('.theme-toggle-thumb')).toHaveCSS('width', '24px')
  await expect(menuToggle.locator('.theme-toggle-thumb')).toHaveCSS(
    'background-color',
    'rgb(255, 200, 87)',
  )
  await menuToggle.click()
  await expect(menuToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(closeDots.nth(2)).toHaveCSS('background-color', 'rgb(239, 235, 225)')
  await expect(page.locator('.mobile-menu-liquid')).toHaveCSS('fill', 'rgb(255, 255, 255)')
  await expect(footerLiquid).toHaveCSS('fill', 'rgb(255, 255, 255)')
  await expect(socials.getByRole('link', { name: /GitHub/ })).toHaveCSS('color', 'rgb(16, 16, 20)')
  await closeButton.click()

  const closingMenu = page.locator('.mobile-menu-dialog[data-transitioning]')

  await expect(closingMenu.locator('.profile-links-menu')).toHaveCSS('transform', 'none')

  for (const link of await closingMenu.locator('.mobile-menu-links > a').all()) {
    await expect(link).toHaveCSS('opacity', '1')
  }

  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).not.toBeVisible()
})

test('mobile menu opens from the toggle, traps navigation, and restores focus after dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.locator('html')).toHaveAttribute('data-mobile-nav-ready', 'true')

  const toggle = page.getByRole('button', { name: 'Open menu' })

  for (const navigation of await page.locator('.desktop-navigation').all()) {
    await expect(navigation).not.toBeVisible()
  }

  const toggleBounds = (await toggle.boundingBox())!
  const documentWidth = await page.evaluate(() => document.documentElement.clientWidth)

  await expect(page.locator('html')).toHaveCSS('scrollbar-gutter', 'auto')
  await page.evaluate(() => {
    const observer = new MutationObserver(() => {
      const panel = document.querySelector('.mobile-menu-panel')

      if (!panel) return

      document.documentElement.dataset.menuInitialClip = getComputedStyle(panel).clipPath

      const ring = document.querySelector('.mobile-menu-entry-ring circle')!

      document.documentElement.dataset.menuInitialRingDiameter = String(
        2 * Number(ring.getAttribute('r')) + Number(ring.getAttribute('stroke-width')),
      )
      observer.disconnect()
    })

    observer.observe(document.body, { childList: true, subtree: true })
  })
  await toggle.click()

  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })

  await expect(menu).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-menu-initial-clip', /^circle\(0px /)

  const mergedDiameter = 7 * Math.sqrt(3)

  expect(
    Number(await page.locator('html').getAttribute('data-menu-initial-ring-diameter')),
  ).toBeCloseTo(mergedDiameter, 1)

  const dotCenters = await toggle.locator('i').evaluateAll((dots) =>
    dots.map((dot) => {
      const bounds = dot.getBoundingClientRect()

      return {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        width: bounds.width,
      }
    }),
  )

  for (const dot of dotCenters) {
    expect(dot.x).toBeCloseTo(toggleBounds.x + toggleBounds.width / 2, 0)
    expect(dot.y).toBeCloseTo(toggleBounds.y + toggleBounds.height / 2, 0)
    expect(dot.width).toBeCloseTo(mergedDiameter, 1)
  }

  const entryRing = menu.locator('.mobile-menu-entry-ring circle')

  await expect.poll(() => entryRing.getAttribute('stroke-width')).toBe('0')
  expect(Number(await entryRing.getAttribute('cx'))).toBeCloseTo(
    toggleBounds.x + toggleBounds.width / 2,
    0,
  )
  expect(Number(await entryRing.getAttribute('cy'))).toBeCloseTo(
    toggleBounds.y + toggleBounds.height / 2,
    0,
  )
  await expect(menu.locator('.mobile-menu-links').getByRole('link')).toHaveCount(4)
  await expect(menu.getByRole('link', { name: 'Jacob Moya home' })).toHaveCount(1)
  await expect(entryRing).toHaveCSS('visibility', 'hidden')
  await expect
    .poll(() => menu.evaluate((element) => element.contains(document.activeElement)))
    .toBe(true)
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(documentWidth)

  const closeButton = menu.getByRole('button', { name: 'Close menu' })

  await closeButton.focus()
  await expect(closeButton).toHaveCSS('outline-style', 'none')
  await page.keyboard.press('Tab')
  await expect(menu.locator('.mobile-menu-links').getByRole('link').first()).toBeFocused()
  await expect(menu.locator('.mobile-menu-links').getByRole('link').first()).toHaveCSS(
    'outline-style',
    'solid',
  )
  await page.keyboard.press('Shift+Tab')
  await expect(closeButton).toBeFocused()
  await expect(closeButton.locator('i')).toHaveCount(5)

  const closeBounds = (await closeButton.boundingBox())!

  await page.keyboard.press('Escape')
  const closeReveal = menu.locator('.mobile-menu-reveal circle')

  await expect(closeReveal).toBeVisible()

  const closedDots = await closeButton.locator('i').evaluateAll((dots) =>
    dots.map((dot) => {
      const bounds = dot.getBoundingClientRect()

      return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
    }),
  )

  for (const dot of closedDots) {
    expect(dot.x).toBeCloseTo(closeBounds.x + closeBounds.width / 2, 0)
    expect(dot.y).toBeCloseTo(closeBounds.y + closeBounds.height / 2, 0)
  }

  expect(Number(await closeReveal.getAttribute('cx'))).toBeCloseTo(
    closeBounds.x + closeBounds.width / 2,
    0,
  )
  expect(Number(await closeReveal.getAttribute('cy'))).toBeCloseTo(
    closeBounds.y + closeBounds.height / 2,
    0,
  )
  await expect(page.locator('.mobile-menu-panel')).toHaveCSS('opacity', '1')
  await expect
    .poll(async () => Number(await closeReveal.getAttribute('r')))
    .toBeGreaterThan(mergedDiameter / 2 + 1)
  await expect(menu).not.toBeVisible()
  await expect(page.locator('#top')).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(documentWidth)
  await toggle.click()
  await menu.getByRole('button', { name: 'Close menu' }).click()
  await expect(menu).not.toBeVisible()
  await expect(page.locator('#top')).toBeFocused()
  await expect
    .poll(() =>
      toggle.locator('i').evaluateAll((dots) => {
        const left = dots[1].getBoundingClientRect()
        const right = dots[2].getBoundingClientRect()

        return right.left - left.left
      }),
    )
    .toBeGreaterThan(11)
  await toggle.click()
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).not.toBeVisible()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('every mobile menu selection expands into its section and restores scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')

  for (const [label, id] of [
    ['Work', 'skills'],
    ['About', 'about'],
    ['Contact', 'contact'],
    ['Home', 'top'],
  ]) {
    await page.getByRole('button', { name: 'Open menu' }).click()

    const menu = page.getByRole('dialog', { name: 'Mobile navigation' })

    await expect
      .poll(() =>
        page
          .locator('.mobile-menu-panel')
          .evaluate((element) =>
            Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m43),
          ),
      )
      .toBeLessThan(0.05)

    const link = menu.getByRole('link', { name: label + '.', exact: true })

    await expect(link).toHaveCSS('transform', 'none')

    const period = link.locator('.mobile-menu-period')

    await expect(period).toHaveCSS('background-color', 'rgb(8, 8, 9)')

    const bounds = (await link.locator('.mobile-menu-number').boundingBox())!

    await link.click()

    const reveal = page.locator('.mobile-menu-reveal')

    await expect(reveal).toHaveAttribute('data-destination', id)

    const ring = reveal.locator('circle')

    await expect(reveal).toHaveCSS('stroke', 'rgb(8, 8, 9)')
    expect(
      Math.abs(Number(await ring.getAttribute('cx')) - (bounds.x + bounds.width / 2)),
    ).toBeLessThan(1)
    expect(
      Math.abs(Number(await ring.getAttribute('cy')) - (bounds.y + bounds.height / 2)),
    ).toBeLessThan(1)
    await expect.poll(() => ring.getAttribute('stroke-width')).toBe('0')
    await expect(menu).not.toBeVisible()
    await expect(page).toHaveURL(new RegExp('#' + id + '$'))
    await expect(page.locator('#' + id)).toHaveAttribute('aria-hidden', 'false')
    await expect(page.locator('#' + id)).toBeFocused()
    await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})

test('mobile menu handles reduced motion, small screens, and switching to desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 10000 })

  const toggle = page.getByRole('button', { name: 'Open menu' })

  await toggle.click()

  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })

  for (const link of await menu.getByRole('link').all()) await expect(link).toBeInViewport()

  const longestTitle = menu
    .getByRole('link', { name: 'Contact.', exact: true })
    .locator('.mobile-menu-label')

  await expect(longestTitle).toBeInViewport({ ratio: 1 })
  await menu.getByRole('link', { name: 'Contact.', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page).toHaveURL(/#contact$/)
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
  await toggle.click()
  await expect(menu).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(menu).not.toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Portfolio' })).toBeVisible()
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
})

test('mobile header stays transparent and the menu settles without depth jitter', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  await expect(page.locator('.site-header')).toHaveCSS('box-shadow', 'none')

  const samples = page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const depths: number[] = []
        const start = performance.now()

        function sample() {
          const panel = document.querySelector('.mobile-menu-panel')

          if (panel) depths.push(new DOMMatrixReadOnly(getComputedStyle(panel).transform).m43)

          if (performance.now() - start < 1600) requestAnimationFrame(sample)
          else resolve(depths)
        }

        requestAnimationFrame(sample)
      }),
  )

  await page.getByRole('button', { name: 'Open menu' }).click()

  const depths = await samples

  expect(depths.every((value) => Math.abs(value) < 0.5)).toBe(true)

  const panel = page.locator('.mobile-menu-panel')

  await expect
    .poll(() =>
      panel.evaluate((element) =>
        Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m43),
      ),
    )
    .toBeLessThan(0.5)
  await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).not.toBeVisible()
})

test('the ring keeps each skill centered through project reveals on desktop and mobile', async ({
  page,
}) => {
  test.setTimeout(120000)

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto(baseURL + '/#skills')
    await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')

    const list = page.getByRole('list', { name: 'Skill categories' })

    for (const index of [0, 1, skills.length - 1]) {
      const pill = list.locator('.skills-category-pill').nth(index)

      for (const phase of [0.95]) {
        await scrollTimeline(page, skillStart + skillSegments[index].start + phase)
        await expect
          .poll(() =>
            pill.evaluate((element) => {
              const container = element.parentElement!
              const bounds = element.getBoundingClientRect()

              return Math.abs(
                bounds.top +
                  bounds.height / 2 -
                  (container.getBoundingClientRect().top + container.clientHeight / 2),
              )
            }),
          )
          .toBeLessThan(2)
        await expect
          .poll(() =>
            pill.evaluate((element) =>
              Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m43),
            ),
          )
          .toBeLessThan(1)
      }
    }
  }
})

test.describe('mobile wheel input', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('wheel advances and reverses the skills introduction fill on a touch device', async ({
    page,
  }) => {
    await page.goto(`${baseURL}/#skills`)
    await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })

    const lines = page.locator('#skills .skills-title-fill')

    await expect(lines.first()).toHaveCSS('--title-fill', '0%')
    await page.mouse.move(180, 400)
    await page.mouse.wheel(0, 120)

    const firstFill = () =>
      lines
        .first()
        .evaluate((line) => parseFloat(getComputedStyle(line).getPropertyValue('--title-fill')))

    await expect.poll(firstFill).toBeGreaterThan(8)
    await expect(lines.nth(1)).toHaveCSS('--title-fill', '0%')
    await page.mouse.wheel(0, -120)
    await expect.poll(firstFill).toBeLessThan(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
})

test('mobile navigation waits for liquid coverage and completed lettering before opening', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()

  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })

  await expect(menu.locator('.mobile-menu-entry-ring circle')).toHaveCSS('visibility', 'hidden')
  await menu.evaluate((element) => {
    const link = element.querySelector<HTMLAnchorElement>('a[href="#contact"]')!
    const label = link.querySelector<HTMLElement>('.mobile-menu-label-fill')!
    const samples: { fill: number; covered: boolean; opening: boolean }[] = []

    function sample() {
      const panel = element.querySelector('.mobile-menu-panel')!.getBoundingClientRect()
      const number = link.querySelector('.mobile-menu-number')!.getBoundingClientRect()
      const path = element.querySelector<SVGPathElement>('.mobile-menu-liquid path')!
      const fill = parseFloat(getComputedStyle(label).getPropertyValue('--letter-fill'))
      const covered = [number.top + 1, number.bottom - 1].every((y) =>
        path.isPointInFill(new DOMPoint(number.right - panel.left - 1, y - panel.top)),
      )
      const opening = !!element.querySelector('.mobile-menu-reveal')

      samples.push({ fill, covered, opening })

      if (opening) element.setAttribute('data-sequence', JSON.stringify(samples))
      else requestAnimationFrame(sample)
    }

    sample()
    link.click()
  })
  await expect(menu).toHaveAttribute('data-sequence')

  const samples = JSON.parse((await menu.getAttribute('data-sequence'))!) as {
    fill: number
    covered: boolean
    opening: boolean
  }[]

  expect(samples.some((sample) => !sample.covered && sample.fill === 0)).toBe(true)
  expect(samples.some((sample) => sample.fill > 0 && sample.fill < 100)).toBe(true)
  expect(samples.filter((sample) => sample.fill > 0).every((sample) => sample.covered)).toBe(true)
  expect(samples.at(-1)).toMatchObject({ fill: 100, opening: true })
  await expect(menu).not.toBeVisible()
  await expect(page).toHaveURL(/#contact$/)
})

test('mobile liquid selector follows wheel, swipe, and keyboard focus while covering only numbers', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await page.getByRole('button', { name: 'Open menu', exact: true }).click()

  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })
  const links = menu.locator('.mobile-menu-links')
  const highlighted = links.locator('a[data-highlighted]')

  await expect(highlighted).toHaveAttribute('href', '#top')
  await expect(menu.locator('.mobile-menu-entry-ring circle')).toHaveCSS('visibility', 'hidden')
  await links.dispatchEvent('wheel', { deltaY: 70 })
  await expect(highlighted).toHaveAttribute('href', '#skills')
  await expect(highlighted.locator('.mobile-menu-label-fill')).toHaveCSS('--letter-fill', '100%')
  await expect(links.locator('a[href="#top"] .mobile-menu-label-fill')).toHaveCSS(
    '--letter-fill',
    '0%',
  )
  await expect
    .poll(() =>
      menu.evaluate((element) => {
        const path = element.querySelector<SVGPathElement>('.mobile-menu-liquid path')!
        const bounds = element
          .querySelector('[data-highlighted] .mobile-menu-number')!
          .getBoundingClientRect()
        const label = element
          .querySelector('[data-highlighted] .mobile-menu-label')!
          .getBoundingClientRect()

        return (
          path.isPointInFill(
            new DOMPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2),
          ) && !path.isPointInFill(new DOMPoint(label.left + 1, label.top + label.height / 2))
        )
      }),
    )
    .toBe(true)

  const frame = await menu.locator('.mobile-menu-panel').evaluate((panel) => {
    const style = getComputedStyle(panel, '::after')

    return { inset: parseFloat(style.top), radius: parseFloat(style.borderTopLeftRadius) }
  })

  expect(frame.inset).toBe(12)
  expect(frame.radius).toBe(25)
  await links.evaluate((element) => {
    for (const [type, y] of [
      ['pointerdown', 504],
      ['pointermove', 552],
      ['pointerup', 552],
    ] as const) {
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: 'touch',
          isPrimary: true,
          pointerId: 1,
          clientY: y,
        }),
      )
    }
  })
  await expect(highlighted).toHaveAttribute('href', '#about')
  await expect(menu).toBeVisible()
  await links.evaluate((element) => {
    for (const [type, y] of [
      ['pointerdown', 552],
      ['pointermove', 504],
      ['pointerup', 504],
    ] as const) {
      element.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerType: 'touch',
          isPrimary: true,
          pointerId: 1,
          clientY: y,
        }),
      )
    }
  })
  await expect(highlighted).toHaveAttribute('href', '#skills')
  await menu.getByRole('link', { name: 'Contact.', exact: true }).focus()
  await expect(highlighted).toHaveAttribute('href', '#contact')
  await expect(highlighted.locator('.mobile-menu-label-fill')).toHaveCSS('--letter-fill', '100%')
  await page.setViewportSize({ width: 320, height: 844 })

  const fits = await links
    .locator('.mobile-menu-label')
    .evaluateAll((labels) =>
      labels.every((label) => label.getBoundingClientRect().right <= innerWidth - 20),
    )

  expect(fits).toBe(true)
  await menu.getByRole('link', { name: 'About.', exact: true }).click()
  await expect(menu).not.toBeVisible()
  await expect(page).toHaveURL(/#about$/)
})
