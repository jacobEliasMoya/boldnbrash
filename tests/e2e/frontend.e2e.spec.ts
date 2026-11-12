import { expect, test, type Page } from '@playwright/test'
import {
  sceneStops,
  skillSegments,
  skills,
  skillStart,
  skillTravel,
} from '../../src/components/organisms/skillsTimeline'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('reduced motion retains the monogram without loading the mini Jake sequence', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const frames: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/images/mini-jacob/')) frames.push(request.url())
  })
  await page.goto(baseURL)
  await expect(page.locator('.particle-logo')).toBeVisible()
  await expect(page.locator('.hero-mini-jacob')).toHaveCSS('opacity', '0')
  expect(frames).toHaveLength(0)
})

test.use({ viewport: { width: 1440, height: 900 } })

test('fast scrolling cannot skip Jake frames or start highlighting before his entrance finishes', async ({
  page,
}) => {
  await page.goto(baseURL)
  const avatar = page.locator('.hero-mini-jacob')
  await expect(avatar).toHaveAttribute('data-frame', '0')
  await avatar.evaluate((element) => {
    const samples = [{ frame: 0, time: performance.now() }]
    const observer = new MutationObserver(() => {
      samples.push({ frame: Number(element.getAttribute('data-frame')), time: performance.now() })
      ;(element as HTMLElement).dataset.frameTimes = JSON.stringify(samples)
      if (element.getAttribute('data-direction') === 'out') observer.disconnect()
    })
    observer.observe(element, { attributes: true, attributeFilter: ['data-frame'] })
  })
  await scrollTimeline(page, 0.9)
  await page.waitForTimeout(120)
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '0%')
  await expect(page.locator('.hero-mark-animation')).toHaveAttribute('data-mode', 'gone', {
    timeout: 6000,
  })
  const samples = JSON.parse((await avatar.getAttribute('data-frame-times'))!) as {
    frame: number
    time: number
  }[]
  expect(samples[samples.length - 1].time - samples[0].time).toBeGreaterThan(1500)
  for (let index = 1; index < samples.length; index++)
    if (samples[index - 1].frame !== 17)
      expect(Math.abs(samples[index].frame - samples[index - 1].frame)).toBeLessThanOrEqual(1)
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '100%')
})

test('scroll plays the original entrance and wave then mirrors the walk out', async ({ page }) => {
  await page.goto(baseURL)
  const mark = page.locator('.hero-mark-animation')
  const avatar = page.locator('.hero-mini-jacob')
  const firstLetter = page.locator('.hero-letter').first()
  await expect(avatar).toHaveAttribute('data-frame', '0')
  for (const frame of [3, 6, 9, 11, 13, 16, 17]) {
    await scrollTimeline(page, (0.35 * frame) / 17)
    await expect(avatar).toHaveAttribute('data-frame', String(frame))
    await expect(firstLetter).toHaveCSS('--letter-fill', '0%')
  }
  await expect(mark).toHaveAttribute('data-mode', 'idle')
  await scrollTimeline(page, 0.4)
  await expect(mark).toHaveAttribute('data-mode', 'idle')
  let previousCenter = 318.5
  for (const step of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    await scrollTimeline(page, 0.42 + ((0.65 - 0.42) * (step + 0.2)) / 10)
    await expect(avatar).toHaveAttribute('data-frame', String(5 + (step % 5)))
    await expect(avatar).toHaveAttribute('data-direction', 'out')
    const center = Number(await avatar.getAttribute('data-center'))
    expect(center).toBeGreaterThan(previousCenter)
    previousCenter = center
    await expect(firstLetter).toHaveCSS('--letter-fill', '0%')
  }
  await scrollTimeline(page, 0.8)
  await expect(mark).toHaveAttribute('data-mode', 'gone')
  await expect(avatar).toHaveCSS('opacity', '0')
  await expect(firstLetter).toHaveCSS('--letter-fill', '100%')
  await scrollTimeline(page, 0.4)
  await expect(mark).toHaveAttribute('data-mode', 'idle')
  await expect(avatar).toHaveAttribute('data-direction', 'in')
  await expect(avatar).toHaveCSS('opacity', '1')
})

test('navigation includes Home and moves one shared highlight between links', async ({ page }) => {
  await page.goto(baseURL)
  const home = page.getByRole('navigation', { name: 'Portfolio' }).getByRole('link', {
    name: 'Home',
  })
  await expect(home.locator('.nav-home-icon')).toBeVisible()
  await expect(home.locator('.nav-highlight')).toHaveCount(1)
  const work = page.getByRole('link', { name: 'Work', exact: true })
  await expect(work).toHaveCSS('transform', 'none')
  await work.hover()
  await expect(work.locator('.nav-highlight')).toHaveCount(1)
  await expect(page.locator('.site-header .nav-highlight')).toHaveCount(1)
})

test('scenes open with scroll and close again in reverse', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page).toHaveTitle(/Jacob Moya/)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Build.Break.Repeat')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 2.2))
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#top')).toHaveJSProperty('inert', true)
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.locator('#skills')).toHaveJSProperty('inert', true)
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
  await scrollToProgress(1.1)
  await expect(panel).toHaveCSS('visibility', 'visible')
  await page.waitForTimeout(1000)
  const radius = () => panel.evaluate((el) => parseFloat(getComputedStyle(el).clipPath.slice(7)))
  const partial = await radius()
  expect(partial).toBeGreaterThan(0)
  await expect(panel).not.toHaveCSS('clip-path', 'none')
  await scrollToProgress(1.32)
  await expect.poll(radius).toBeGreaterThan(partial * 1.5)
  await scrollToProgress(1.04)
  await expect.poll(radius).toBeLessThan(partial)
  await scrollToProgress(1.4)
  await expect(panel).toHaveCSS('clip-path', 'none')
  await scrollToProgress(0)
  await expect(page.locator('.hero-letter').first()).toHaveCSS('--letter-fill', '0%')
  await expect(page.locator('#skills')).toHaveCSS('visibility', 'hidden')
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
})

test('direct navigation, history, and project dialogs work by keyboard', async ({ page }) => {
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  await page.getByRole('link', { name: 'Work', exact: true }).click()
  await expect(page).toHaveURL(/#work$/)
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  const button = page.getByRole('button', { name: /View project.*Platform modernization/ })
  await button.focus()
  await button.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Platform modernization' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(/more than 50 state sites/)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(button).toBeFocused()
  await page.getByRole('link', { name: 'Contact', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Get in touch' })).toHaveAttribute('href', /^mailto:/)
  await page.goBack()
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
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
  await page.getByRole('link', { name: 'Explore my skills' }).click()
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  await page.getByRole('button', { name: 'Show projects for Headless CMS', exact: true }).click()
  await expect(
    page.locator('.skills-category-pill[data-active] .skills-project-stage'),
  ).toHaveAttribute('data-skill', 'Headless CMS')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page
    .getByRole('dialog', { name: 'Mobile navigation' })
    .getByRole('link', { name: 'Work.', exact: true })
    .click()
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).not.toBeVisible()
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  await expect(page.getByRole('heading', { name: 'Selected work.' })).toBeInViewport()
  const work = page.locator('#work')
  expect(await work.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)
  await work.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(work.locator('.scene-project').last()).toBeInViewport()
  await page.getByRole('link', { name: 'Jacob Moya home' }).click()
  await expect(page.locator('#top')).toHaveAttribute('aria-hidden', 'false')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload()
  await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')
  await expect(page.locator('#contact')).not.toHaveJSProperty('inert', true)
})

async function scrollTimeline(page: Page, value: number) {
  await page.evaluate((position) => {
    const track = document.querySelector<HTMLElement>('.scene-track')!
    const stage = track.firstElementChild as HTMLElement
    const start = scrollY + track.getBoundingClientRect().top
    window.scrollTo(
      0,
      start +
        ((track.offsetHeight - stage.clientHeight) * position) / Number(track.dataset.duration),
    )
  }, value)
}

test('skill categories retain the card layout, stack, and scroll progression', async ({ page }) => {
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  const heading = page.locator('.skills-heading')
  const origin = (await heading.boundingBox())!
  for (const [index, skill] of skills.entries()) {
    for (const [position, project] of skill.projects.entries()) {
      await scrollTimeline(page, skillStart + skillSegments[index].start + position + 1.1)
      await expect(
        page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
      ).toHaveText(skill.name)
      await expect(
        page.locator('.skills-category-pill[data-active] .skills-technologies'),
      ).toHaveText(skill.technologies.join(' \u00b7 '))
      const card = page.getByRole('article', { name: project.title, exact: true })
      await expect(card).toBeInViewport()
      await expect(card.locator('.skill-project-information')).toHaveCSS('opacity', '1')
      expect(Math.abs((await heading.boundingBox())!.y - origin.y)).toBeLessThan(1)
      await expect(page.locator('#work')).toHaveJSProperty('inert', true)
    }
  }
  await scrollTimeline(page, skillStart + skillTravel - 0.05)
  await expect(page.locator('#work')).toHaveJSProperty('inert', true)
  await scrollTimeline(page, sceneStops[2])
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
  await scrollTimeline(page, skillStart + 1.1)
  await expect(
    page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
  ).toHaveText('Frontend Development')
  await expect(
    page.locator('.skills-category-pill[data-active] .skills-project-stage'),
  ).toHaveAttribute('data-project', '0')
})

test('category controls and project details work by keyboard', async ({ page }) => {
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  const cms = page.getByRole('button', { name: 'Show projects for Headless CMS', exact: true })
  await cms.focus()
  await cms.press('Enter')
  await expect(
    page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
  ).toHaveText('Headless CMS')
  await scrollTimeline(page, skillStart + skillSegments[1].start + 1.1)
  const read = page
    .getByRole('article', { name: 'RegisteredAgents.com', exact: true })
    .getByRole('button', { name: /Read project/ })
  await read.focus()
  await read.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'RegisteredAgents.com' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Strapi and GraphQL')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(read).toBeFocused()
})

test('mobile category controls stay usable and project information fits the cards', async ({
  page,
}) => {
  test.setTimeout(60000)
  for (const height of [844, 600]) {
    await page.setViewportSize({ width: 390, height })
    await page.goto(baseURL + '/#skills')
    await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
    for (const skill of skills) {
      await scrollTimeline(page, skillStart + skillSegments[skills.indexOf(skill)].start + 0.02)
      await expect
        .poll(() =>
          page
            .locator('.skills-category-pill')
            .nth(skills.indexOf(skill))
            .evaluate((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m43)),
        )
        .toBeLessThan(1)
      await page
        .getByRole('button', { name: 'Show projects for ' + skill.name, exact: true })
        .click()
      await expect(
        page.locator('.skills-category-pill[data-active] .skills-category-current h3').last(),
      ).toHaveText(skill.name)
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
            return info.bottom <= button.top && button.bottom <= bounds.bottom
          }),
        )
        .toBe(true)
    }
  }
})

test('reduced motion retains category selection and shows projects in flow', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')
  for (const project of skills[0].projects)
    await expect(page.getByRole('article', { name: project.title, exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Show projects for Backend & Developer Tools', exact: true })
    .click()
  await expect(page.getByRole('article', { name: 'GitGo', exact: true })).toBeVisible()
  await expect(page.locator('.skills-category-pill[data-active] .skill-project-card')).toHaveCount(
    skills[2].projects.length,
  )
})

test('mobile menu drops in, traps navigation, and restores focus after dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  const toggle = page.getByRole('button', { name: 'Open menu' })
  await expect(
    page.getByRole('navigation', { name: 'Portfolio', includeHidden: true }),
  ).not.toBeVisible()
  await toggle.click()
  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('link')).toHaveCount(5)
  await expect(menu.getByRole('button', { name: 'Close menu' })).toBeFocused()
  await expect(page.locator('html')).toHaveCSS('overflow', 'hidden')
  await page.keyboard.press('Escape')
  await expect(menu).not.toBeVisible()
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expect(page.locator('html')).not.toHaveCSS('overflow', 'hidden')
  await toggle.click()
  await menu.getByRole('button', { name: 'Close menu' }).click()
  await expect(menu).not.toBeVisible()
  await expect(toggle).toBeFocused()
})

test('every mobile menu selection expands into its section and restores scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL)
  await expect(page.locator('.portfolio')).toHaveAttribute('data-enhanced', '')
  for (const [label, id, color] of [
    ['Skills', 'skills', 'rgb(56, 20, 255)'],
    ['Work', 'work', 'rgb(56, 20, 255)'],
    ['About', 'about', 'rgb(239, 235, 225)'],
    ['Contact', 'contact', 'rgb(56, 20, 255)'],
    ['Home', 'top', 'rgb(8, 8, 9)'],
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
    const period = link.locator('.mobile-menu-period')
    await expect(period).toHaveCSS('background-color', color)
    const bounds = (await period.boundingBox())!
    await link.click()
    const reveal = page.locator('.mobile-menu-reveal')
    await expect(reveal).toHaveAttribute('data-destination', id)
    await expect(reveal).toHaveCSS('background-color', color)
    const clip = await reveal.evaluate((element) => getComputedStyle(element).clipPath)
    const origin = clip.match(/at ([\d.]+)px ([\d.]+)px/)!
    expect(Math.abs(Number(origin[1]) - (bounds.x + bounds.width / 2))).toBeLessThan(1)
    expect(Math.abs(Number(origin[2]) - (bounds.y + bounds.height / 2))).toBeLessThan(1)
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
  const toggle = page.getByRole('button', { name: 'Open menu' })
  await toggle.click()
  const menu = page.getByRole('dialog', { name: 'Mobile navigation' })
  for (const link of await menu.getByRole('link').all()) await expect(link).toBeInViewport()
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

test('mobile header stays transparent and the menu falls into place along the Z axis', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(baseURL + '/#skills')
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
  expect(depths.some((value) => value > 50)).toBe(true)
  const panel = page.locator('.mobile-menu-panel')
  await expect
    .poll(() =>
      panel.evaluate((element) =>
        Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m43),
      ),
    )
    .toBeLessThan(0.5)
  await expect(panel).toHaveCSS('background-color', 'rgba(8, 8, 9, 0.92)')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Mobile navigation' })).not.toBeVisible()
})

test('the category pill contains the heading and stack and expands into its projects', async ({
  page,
}) => {
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  const pill = page.locator('.skills-category-pill[data-active]')
  const toggle = page.getByRole('button', { name: 'Show projects for Frontend Development' })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(pill.getByRole('heading', { name: 'Frontend Development' })).toBeVisible()
  await expect(pill.locator('.skills-technologies')).toBeVisible()
  await expect
    .poll(() => pill.evaluate((element) => (element as HTMLElement).offsetHeight))
    .toBeLessThan(220)
  const closedHeight = await pill.evaluate((element) => (element as HTMLElement).offsetHeight)
  expect(closedHeight).toBeLessThan(220)
  await toggle.click()
  const card = pill.getByRole('article', { name: skills[0].projects[0].title, exact: true })
  await expect(card).toBeInViewport()
  await expect
    .poll(() => pill.evaluate((element) => (element as HTMLElement).offsetHeight))
    .toBeGreaterThan(closedHeight * 2)
  await page.getByRole('button', { name: 'Hide projects for Frontend Development' }).click()
  await expect(card).not.toBeVisible()
  await expect
    .poll(() => pill.evaluate((element) => (element as HTMLElement).offsetHeight))
    .toBeLessThan(220)
})

test('category pills remain operable with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(baseURL + '/#skills')
  const card = page.getByRole('article', { name: skills[0].projects[0].title, exact: true })
  await expect(card).toBeVisible()
  await page.getByRole('button', { name: 'Hide projects for Frontend Development' }).click()
  await expect(card).not.toBeVisible()
  await page.getByRole('button', { name: 'Show projects for Frontend Development' }).click()
  await expect(card).toBeVisible()
})

test('all skill categories are listed as matching expandable pills', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  const list = page.getByRole('list', { name: 'Skill categories' })
  await expect(list.getByRole('listitem')).toHaveCount(skills.length)
  for (const skill of skills) {
    await scrollTimeline(page, skillStart + skillSegments[skills.indexOf(skill)].start + 0.02)
    const pill = list
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: skill.name, exact: true }) })
    await expect
      .poll(() =>
        pill.evaluate((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m43)),
      )
      .toBeLessThan(1)
    await expect(pill.getByRole('heading', { name: skill.name, exact: true })).toBeVisible()
    await expect(pill.locator('.skills-technologies')).toHaveText(
      skill.technologies.join(' \u00b7 '),
    )
    await pill.getByRole('button', { name: 'Show projects for ' + skill.name, exact: true }).click()
    await expect(
      pill.getByRole('button', { name: 'Hide projects for ' + skill.name, exact: true }),
    ).toHaveAttribute('aria-expanded', 'true')
    await expect(
      pill.getByRole('article', { name: skill.projects[0].title, exact: true }),
    ).toBeVisible()
    await expect(list.locator('.skills-category-pill[data-expanded]')).toHaveCount(1)
  }
  await expect(page.locator('.skills-index-controls')).toHaveCount(0)
})

test('skills form a closed ring with the last above the centered first', async ({ page }) => {
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
  const list = page.getByRole('list', { name: 'Skill categories' })
  const pills = list.getByRole('listitem')
  await expect(list).toHaveCSS('overflow-y', 'hidden')
  await expect
    .poll(() => pills.first().evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.99)
  const geometry = await pills.evaluateAll((nodes) =>
    nodes.map((node) => {
      const bounds = node.getBoundingClientRect()
      return {
        center: bounds.top + bounds.height / 2,
        opacity: Number(getComputedStyle(node).opacity),
        depth: new DOMMatrixReadOnly(getComputedStyle(node).transform).m43,
      }
    }),
  )
  expect(geometry[skills.length - 1].center).toBeLessThan(geometry[0].center)
  expect(geometry[1].center).toBeGreaterThan(geometry[0].center)
  expect(geometry[skills.length - 1].opacity).toBeLessThan(0.7)
  expect(geometry[skills.length - 1].depth).toBeLessThan(-100)
  await scrollTimeline(page, skillStart + skillTravel)
  await expect
    .poll(() => pills.first().evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.99)
  await expect
    .poll(() =>
      pills
        .first()
        .evaluate((el) => Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m43)),
    )
    .toBeLessThan(1)
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'true')
  await scrollTimeline(page, sceneStops[2])
  await expect(page.locator('#work')).toHaveAttribute('aria-hidden', 'false')
})

test('reduced motion keeps the skill list flat and fully opaque', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(baseURL + '/#skills')
  await expect(page.locator('.portfolio')).not.toHaveAttribute('data-enhanced')
  for (const pill of await page
    .getByRole('list', { name: 'Skill categories' })
    .getByRole('listitem')
    .all()) {
    await expect(pill).toHaveCSS('transform', 'none')
    await expect(pill).toHaveCSS('opacity', '1')
  }
})

test('the ring keeps each skill centered through project reveals on desktop and mobile', async ({
  page,
}) => {
  test.setTimeout(60000)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto(baseURL + '/#skills')
    await expect(page.locator('#skills')).toHaveAttribute('aria-hidden', 'false')
    const list = page.getByRole('list', { name: 'Skill categories' })
    for (const index of [0, 1, skills.length - 1]) {
      const pill = list.getByRole('listitem').nth(index)
      for (const phase of [0.02, 0.95]) {
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
