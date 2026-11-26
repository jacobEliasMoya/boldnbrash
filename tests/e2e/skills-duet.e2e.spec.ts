import { expect, test, type Page } from '@playwright/test'
import {
  aboutIntroEnd,
  aboutTitleEnd,
  projectStops,
  sceneStops,
  skillStart,
  skills,
  skillSegments,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function scrollToPhase(page: Page, position: number) {
  await page.evaluate(
    ({ value, segments, start, end }) => {
      if (value >= start && value < end) {
        const relative = value - start
        const index = segments.reduce(
          (selected, segment, i) => (segment.start <= relative ? i : selected),
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

      window.scrollTo(
        0,
        scrollY +
          track.getBoundingClientRect().top +
          ((track.offsetHeight - stage.clientHeight) * value) / Number(track.dataset.duration),
      )
    },
    { value: position, segments: skillSegments, start: skillStart, end: sceneStops[2] - 1 },
  )
  await expect
    .poll(
      async () =>
        Math.abs(
          Number(await page.locator('.scene-track').getAttribute('data-playback-progress')) -
            position,
        ),
      { timeout: 20000 },
    )
    .toBeLessThan(0.01)
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test.describe(`paired scroll ${viewport.width}`, () => {
    test.use({ viewport })
    test('About paragraph drops in word by word as the visitor scrolls', async ({ page }) => {
      await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
      await page.goto(`${baseURL}/#about`)
      await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })

      const panel = page.locator('#about')
      const paragraph = panel.locator('p.skills-intro')
      const words = paragraph.locator('.word-emphasis')
      const heading = panel.locator('.skills-heading h2')
      await expect(panel).toHaveAttribute('data-intro-drop-complete', '')
      await expect(heading).toBeInViewport()

      const titleEnd = aboutTitleEnd
      const wordTravel = (aboutIntroEnd - titleEnd) / ((await words.count()) + 3)
      const visibleWords = () =>
        words.evaluateAll((elements) =>
          elements.flatMap((element, index) =>
            Number(getComputedStyle(element).opacity) > 0 ? [index] : [],
          ),
        )

      const scene = (await panel.boundingBox())!
      const centered = (await heading.boundingBox())!
      const centerX = scene.x + scene.width / 2
      const centerY = scene.y + scene.height / 2

      // The heading fills at the center, then lifts to make room for the paragraph.
      expect(Math.abs(centered.x + centered.width / 2 - centerX)).toBeLessThan(1)
      expect(Math.abs(centered.y + centered.height / 2 - centerY)).toBeLessThan(1)
      await expect.poll(visibleWords).toEqual([])

      await scrollToPhase(page, titleEnd - 0.1)
      expect((await heading.boundingBox())!.y).toBeCloseTo(centered.y, 0)

      await scrollToPhase(page, titleEnd + wordTravel * 1.65)
      await expect.poll(visibleWords).toEqual([0, 1])
      await expect(words.first()).not.toHaveCSS('transform', 'none')
      await expect(words.first()).toHaveCSS('--word-emphasis', '0%')
      await expect(panel.locator('.skills-title-fill').last()).toHaveCSS('--title-fill', '100%')
      const lifting = (await heading.boundingBox())!
      expect(lifting.y).toBeLessThan(centered.y - 2)

      await scrollToPhase(page, titleEnd + wordTravel * 3.55)
      await expect(words.first()).not.toHaveCSS('--word-emphasis', '0%')
      await expect(words.last()).toHaveCSS('opacity', '0')

      const playback = () =>
        page.locator('.scene-track').getAttribute('data-playback-progress').then(Number)
      const beforeWheel = await playback()

      await page
        .locator('.scene-track')
        .dispatchEvent('wheel', { deltaY: 1800, bubbles: true, cancelable: true })
      await expect.poll(playback).toBeGreaterThan(beforeWheel + 0.02)
      expect(await playback()).toBeLessThan(beforeWheel + 0.13)

      await scrollToPhase(page, aboutIntroEnd + 0.03)
      await expect(words.last()).toHaveCSS('opacity', '1')
      await expect(words.last()).toHaveCSS('transform', 'none')
      const settled = (await heading.boundingBox())!
      const copy = (await paragraph.boundingBox())!
      expect(settled.y).toBeLessThan(lifting.y - 2)
      expect(Math.abs((settled.y + copy.y + copy.height) / 2 - centerY)).toBeLessThan(1)

      // The circle still opens from the period after the heading has moved.
      const clipOffset = () =>
        panel.evaluate((section) => {
          const canvas = section.querySelector('.intro-period-reveal')!
          const period = section.querySelector('.skills-title-period')!.getBoundingClientRect()
          const bounds = canvas.getBoundingClientRect()
          const clip = getComputedStyle(canvas).clipPath.match(/at ([\d.]+)px ([\d.]+)px/)

          if (!clip) return Infinity

          return Math.hypot(
            Number(clip[1]) - (period.left + period.width / 2 - bounds.left),
            Number(clip[2]) - (period.top + period.height / 2 - bounds.top),
          )
        })

      await expect.poll(clipOffset).toBeLessThan(1)

      await scrollToPhase(page, titleEnd - 0.1)
      await expect.poll(visibleWords).toEqual([])
      expect((await heading.boundingBox())!.y).toBeCloseTo(centered.y, 0)
    })

    test('period expands into the canvas behind the synchronized pill and project motion', async ({
      page,
    }) => {
      test.setTimeout(60000)
      await page.addInitScript(() => sessionStorage.setItem('portfolio:intro-seen', '1'))
      await page.goto(`${baseURL}/#skills`)
      await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })

      const work = page.locator('#skills')
      const intro = work.locator('.skills-heading')

      await expect(work).toHaveAttribute('data-intro-drop-complete', '')
      await expect(intro).toHaveCSS('opacity', '1')
      await expect(intro.locator('p')).toHaveCount(0)

      const bounds = (await intro.boundingBox())!
      const sceneBounds = (await work.boundingBox())!

      expect(
        Math.abs(bounds.x + bounds.width / 2 - (sceneBounds.x + sceneBounds.width / 2)),
      ).toBeLessThan(3)
      await expect(page.locator('.skills-reveal')).toHaveAttribute('inert', '')
      await page.screenshot({ path: `test-results/duet-intro-${viewport.width}.png` })
      await expect(page.locator('.skills-scroll-cue')).toHaveCount(0)
      await expect(page.getByRole('heading', { name: 'Here’s What I’m Building.' })).toBeVisible()

      for (const line of await intro.locator('[data-intro-title]').all()) {
        await expect(line).toBeInViewport({ ratio: 1 })
      }

      await scrollToPhase(page, sceneStops[1] + (skillStart - sceneStops[1]) * 0.46)
      await expect(intro).toHaveCSS('opacity', '1')
      await expect(page.locator('.skills-title-letter')).toHaveCount(0)

      const initialRadius = Number(
        await page
          .locator('.skills-scene')
          .evaluate((el) =>
            parseFloat(getComputedStyle(el).getPropertyValue('--skills-portal-radius')),
          ),
      )

      await scrollToPhase(page, sceneStops[1] + (skillStart - sceneStops[1]) * 0.8)
      await page.screenshot({ path: 'test-results/intro-expanding-' + viewport.width + '.png' })

      const expandedRadius = Number(
        await page
          .locator('.skills-scene')
          .evaluate((el) =>
            parseFloat(getComputedStyle(el).getPropertyValue('--skills-portal-radius')),
          ),
      )

      expect(expandedRadius).toBeGreaterThan(initialRadius)
      await expect(intro).toHaveCSS('opacity', '1')
      await expect(intro).toHaveCSS('transform', 'none')
      await expect(page.locator('.skills-reveal')).toHaveCSS(
        'background-color',
        'rgb(255, 255, 255)',
      )
      await expect(page.locator('.skills-project-deck').first()).toHaveAttribute(
        'aria-hidden',
        'false',
      )
      await expect(page.locator('.skills-performance')).not.toHaveCSS('opacity', '0')
      await scrollToPhase(page, skillStart - 0.1)
      await expect(page.locator('.skills-category-pill').first()).toHaveCSS('visibility', 'hidden')
      const firstStop = skillStart + projectStops[0].position
      const nextStop = skillStart + projectStops[1].position
      await scrollToPhase(page, firstStop)
      await expect(intro).toHaveAttribute('aria-hidden', 'true')
      const categoryCopy = work.locator('.skills-wheel-intro')
      await expect(categoryCopy.getByRole('heading')).toHaveText(skills[0].copy.title)
      await expect(categoryCopy.locator('p')).toHaveText(skills[0].copy.description)
      const projectSlot = (await work.locator('.skills-projects').boundingBox())!

      const currentSkill = page.locator('.skills-category-pill[data-active]')

      await expect(currentSkill).toContainText('Frontend Development')
      await expect(page.locator('.skills-category-pill .skill-project-card')).toHaveCount(0)

      const firstProject = page.getByRole('article', {
        name: 'Astro Platform',
        exact: true,
      })

      await expect(firstProject).toBeVisible()

      const left = (await currentSkill.boundingBox())!
      const right = (await firstProject.boundingBox())!

      if (viewport.width > 900) expect(left.x).toBeGreaterThan(right.x + right.width)
      else {
        expect(left.y).toBeGreaterThan(right.y + right.height)

        const heading = (await page.locator('.skills-wheel-intro').first().boundingBox())!
        const above = right.y - heading.y - heading.height
        const below = left.y - right.y - right.height

        // The subtitle's trailing line space needs a small optical correction.
        expect(Math.abs(above + 4 - below)).toBeLessThan(2)
        expect(Math.min(above, below)).toBeGreaterThan(16)

        const stage = (await page.locator('.skills-performance').boundingBox())!
        const reservedPillHeight = await page
          .locator('.skills-performance')
          .evaluate((stack) =>
            parseFloat(getComputedStyle(stack).getPropertyValue('--work-pill-row-height')),
          )
        const stackCenter = (heading.y + left.y + reservedPillHeight) / 2

        expect(Math.abs(stackCenter - stage.y - stage.height / 2)).toBeLessThan(2)
      }

      await page.screenshot({ path: `test-results/duet-project-${viewport.width}.png` })

      // Hold a gesture while sampling the project and category between snap points.
      await page.locator('.skills-performance').evaluate((target) => {
        const event = new Event('touchstart', { bubbles: true })

        Object.defineProperty(event, 'touches', { value: [{ clientX: 180, clientY: 480 }] })
        target.dispatchEvent(event)
      })
      const turn = firstStop + (nextStop - firstStop) * 0.35
      const movingCard = page.locator('[data-project-entering]')
      const outgoingCard = page.locator('[data-project-exiting]')
      const nextCard = page.locator(`#${projectStops[1].id}`)
      const readOffset = () =>
        movingCard.evaluate((card) => new DOMMatrixReadOnly(getComputedStyle(card).transform).m41)

      await scrollToPhase(page, turn)
      await expect(movingCard).toHaveCount(1)
      await expect(outgoingCard).toHaveCount(1)
      await expect
        .poll(() =>
          outgoingCard.evaluate(
            (card) => new DOMMatrixReadOnly(getComputedStyle(card).transform).m43,
          ),
        )
        .toBeLessThan(0)
      await expect
        .poll(() => outgoingCard.evaluate((card) => Number(getComputedStyle(card).opacity)))
        .toBeLessThan(1)
      await expect.poll(readOffset).toBeLessThan(0)
      const turningOffset = await readOffset()
      await page.screenshot({ path: `test-results/duet-turn-${viewport.width}.png` })

      await scrollToPhase(page, nextStop)
      await expect(nextCard).toHaveCSS('transform', 'none')
      await expect(nextCard).toHaveAttribute('aria-hidden', 'false')
      await scrollToPhase(page, turn)
      await expect.poll(async () => Math.abs((await readOffset()) - turningOffset)).toBeLessThan(1)

      await page.locator('.skills-performance').dispatchEvent('touchend')
      await scrollToPhase(page, nextStop)
      await expect(currentSkill).toContainText(skills[1].name)
      await expect(categoryCopy.getByRole('heading')).toHaveText(skills[1].copy.title)
      await expect(categoryCopy.locator('p')).toHaveText(skills[1].copy.description)
      const newProjectSlot = (await work.locator('.skills-projects').boundingBox())!
      expect(newProjectSlot.height).toBeCloseTo(projectSlot.height, 1)
      expect(newProjectSlot.y).toBeCloseTo(projectSlot.y, 1)

      const second = page.getByRole('article', { name: skills[1].projects[0].title, exact: true })

      await expect(second).toBeVisible()
      await second.getByRole('button', { name: /Read project/ }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('button', { name: /Close/ }).click()
      await scrollToPhase(page, firstStop)
      await expect(firstProject).toBeVisible()

      // Every category uses the same navigation path as its optional direct-select control.
      for (const index of skills.keys()) {
        await page.evaluate(
          ({ index, offset }) =>
            window.dispatchEvent(
              new CustomEvent('portfolio:select-skill', {
                detail: { index, offset },
                cancelable: true,
              }),
            ),
          { index, offset: projectStops[index].position - skillSegments[index].start },
        )
        await expect(currentSkill).toContainText(skills[index].name)
        await expect(
          page.getByRole('article', { name: skills[index].projects[0].title, exact: true }),
        ).toBeVisible()
      }

      const overflowingLabels = await page
        .locator('.skills-category-copy :is(h3, .skills-technologies)')
        .evaluateAll((labels) =>
          labels
            .filter((label) => label.scrollWidth > label.clientWidth + 1)
            .map((label) => label.textContent),
        )

      expect(overflowingLabels).toEqual([])

      await expect(page.locator('.skills-category-pill').last()).toHaveCSS('opacity', '1')
      await expect(page.locator('.skills-browser')).toHaveCSS('touch-action', 'pan-y pinch-zoom')
    })
  })
}

test('reduced motion presents each skill beside its projects without hiding content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${baseURL}/#skills`)
  await expect(page.locator('.skills-performance')).toHaveCount(0)
  await expect(page.locator('.skills-pair')).toHaveCount(skills.length)
  await expect(page.locator('.skills-fallback article[aria-hidden="true"]')).toHaveCount(0)
  await expect(page.locator('.skills-fallback .skills-wheel-title')).toHaveText(
    skills.map(({ copy }) => copy.title),
  )
  await expect(page.locator('.skills-fallback .skills-wheel-description')).toHaveText(
    skills.map(({ copy }) => copy.description),
  )
})

test('period opening follows changes to the heading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseURL}/#skills`)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  await page.locator('#skills .skills-heading').evaluate((heading) => {
    heading.querySelectorAll('[data-intro-title]')[1].textContent = 'New stuff'
  })
  await expect
    .poll(() =>
      page.locator('.skills-scene').evaluate((scene) => {
        const bounds = scene.getBoundingClientRect()
        const dot = scene.querySelector('.skills-title-period')!.getBoundingClientRect()
        const style = getComputedStyle(scene)
        const x = parseFloat(style.getPropertyValue('--skills-portal-x'))
        const y = parseFloat(style.getPropertyValue('--skills-portal-y'))

        return Math.hypot(
          x - (dot.left + dot.width / 2 - bounds.left),
          y - (dot.top + dot.height / 2 - bounds.top),
        )
      }),
    )
    .toBeLessThan(0.5)
})

test('Work fills the departing pill and swaps the heading before the paragraph', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 15000 })
  const first = skillStart + projectStops[0].position
  const next = skillStart + projectStops[1].position
  const fills = () =>
    page
      .locator('.skills-category-title-fill')
      .evaluateAll((titles) =>
        titles.map((title) => parseFloat(getComputedStyle(title).getPropertyValue('--title-fill'))),
      )
  const empty = skills.map(() => 0)

  for (const [start, end, departing] of [
    [first, next, 0],
    [next, first, 1],
  ]) {
    await scrollToPhase(page, start)
    const distance = end - start
    await scrollToPhase(page, start + distance * 0.14)
    await expect.poll(async () => (await fills())[departing]).toBeGreaterThan(40)
    expect((await fills()).filter((_, index) => index !== departing)).toEqual(empty.slice(1))

    // The entering title stays clear through the handoff, including a canceled turn.
    for (const fraction of [0.42, 0.64, 0.84, 0.14]) {
      await scrollToPhase(page, start + distance * fraction)
      await expect.poll(fills).toEqual(empty)
    }

    await scrollToPhase(page, end)
    await expect.poll(fills).toEqual(empty)
  }

  const copy = page.locator('.skills-browser .skills-wheel-intro')

  for (const stop of [projectStops[1], projectStops[0]]) {
    const previous = skills[stop.skillIndex === 1 ? 0 : 1].copy
    await expect(copy.getByRole('heading', { name: previous.title })).toBeVisible()
    await expect(copy.locator('h3')).toHaveCSS('opacity', '1')
    await expect(copy.locator('p')).toHaveText(previous.description)
    await expect(copy.locator('p')).toHaveCSS('opacity', '1')

    const nextCopy = skills[stop.skillIndex].copy

    const swap = await copy.evaluate(
      async (intro, { detail, nextCopy }) => {
        const heading = intro.querySelector('h3')!
        const paragraph = intro.querySelector('p')!
        const oldDescription = paragraph.textContent
        const height = intro.getBoundingClientRect().height
        let headingFaded = false
        let paragraphFaded = false
        let headingSettledFirst = true
        let layoutStayedStill = true

        window.dispatchEvent(
          new CustomEvent('portfolio:select-skill', { detail, cancelable: true }),
        )

        const deadline = performance.now() + 3500
        while (performance.now() < deadline) {
          await new Promise(requestAnimationFrame)
          const headingAlpha = Number(getComputedStyle(heading).opacity)
          const paragraphAlpha = Number(getComputedStyle(paragraph).opacity)
          const titleIsCurrent = heading.getAttribute('aria-label') === nextCopy.title
          const descriptionIsCurrent = paragraph.textContent === nextCopy.description

          headingFaded ||= headingAlpha > 0 && headingAlpha < 1
          paragraphFaded ||= paragraphAlpha > 0 && paragraphAlpha < 1
          layoutStayedStill &&= intro.getBoundingClientRect().height === height

          if (paragraphAlpha < 1 || paragraph.textContent !== oldDescription) {
            headingSettledFirst &&= titleIsCurrent && headingAlpha === 1
          }

          if (descriptionIsCurrent && paragraphAlpha === 1) break
        }

        return { headingFaded, paragraphFaded, headingSettledFirst, layoutStayedStill }
      },
      {
        detail: {
          index: stop.skillIndex,
          offset: stop.position - skillSegments[stop.skillIndex].start,
        },
        nextCopy,
      },
    )

    await expect(copy.getByRole('heading')).toHaveText(nextCopy.title)
    await expect(copy.locator('p')).toHaveText(nextCopy.description)
    await expect(copy.locator('p')).toHaveCSS('opacity', '1')
    expect(swap).toEqual({
      headingFaded: true,
      paragraphFaded: true,
      headingSettledFirst: true,
      layoutStayedStill: true,
    })
  }
})

test('desktop Work commits short wheel gestures in either direction', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${baseURL}/#${projectStops[0].id}`)
  await expect(page.locator('.portfolio-loader')).toHaveCount(0, { timeout: 12000 })
  const track = page.locator('.scene-track')
  const first = skillStart + projectStops[0].position
  const next = skillStart + projectStops[1].position
  const position = async () => Number(await track.getAttribute('data-playback-progress'))

  await expect.poll(async () => Math.abs((await position()) - first)).toBeLessThan(0.01)
  const work = page.locator('.skills-performance')

  await work.hover()

  // Small accidental movement stays put; an intentional short tick commits.
  await page.mouse.wheel(0, 8)
  await page.waitForTimeout(1100)
  await expect.poll(async () => Math.abs((await position()) - first)).toBeLessThan(0.01)
  await page.mouse.wheel(0, 24)
  await expect
    .poll(async () => Math.abs((await position()) - next), { timeout: 5000 })
    .toBeLessThan(0.01)

  await work.dispatchEvent('wheel', { deltaY: -1, deltaMode: 1, bubbles: true, cancelable: true })
  await expect
    .poll(async () => Math.abs((await position()) - first), { timeout: 5000 })
    .toBeLessThan(0.01)
})
