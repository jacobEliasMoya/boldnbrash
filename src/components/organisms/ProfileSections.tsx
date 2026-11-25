'use client'

import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { IntroDropText } from '@/components/atoms/IntroDropText'
import { TechnologyIcons } from '@/components/atoms/TechnologyIcon'
import { WordEmphasis } from '@/components/atoms/WordEmphasis'
import { aboutTitleFillPortion, clamp, getAboutParagraphProgress } from './skillsTimeline'
import { ExperienceMotion } from './ExperienceMotion'
import {
  experienceRoles,
  getExperienceDock,
  getExperiencePositions,
  type ExperienceDock,
} from './experienceTimeline'

function AboutIntroduction({ enhanced }: { enhanced: boolean }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = (event: Event) => setProgress((event as CustomEvent<number>).detail)

    window.addEventListener('portfolio:about-intro', update)

    return () => window.removeEventListener('portfolio:about-intro', update)
  }, [])

  // Fill both title lines before scroll starts revealing the paragraph.
  const fill = (line: number) =>
    ({
      '--title-fill': `${clamp(progress / (aboutTitleFillPortion / 2) - line) * 100}%`,
    }) as CSSProperties
  const paragraph = getAboutParagraphProgress(progress)

  return (
    <div className="about-introduction skills-heading">
      <h2 aria-label="Get To Know Me Some More">
        <span className="skills-title-line">
          <span className="skills-title-fill" data-intro-title="" style={fill(0)}>
            <IntroDropText text="Get To Know" />
          </span>
        </span>
        <span className="skills-title-line">
          <span className="skills-title-fill" data-intro-title="" style={fill(1)}>
            <IntroDropText text="Me Some More" />
          </span>
          <a href="#about-profile" className="about-next" aria-label="Read more about Jacob">
            <span className="skills-title-period" data-intro-drop="letter" aria-hidden="true" />
          </a>
        </span>
      </h2>
      <div className="skills-intro-slot">
        <p className="skills-intro">
          <WordEmphasis
            text="Hey, I’m Jacob. I’m a software engineer in Southern California. I like taking things apart to see how they work, then putting my own spin on them. I want the things I make to be useful and a little fun to figure out."
            progress={paragraph}
            enabled={enhanced}
            scrollReveal
          />
        </p>
      </div>
    </div>
  )
}

function ExperienceRole({
  record,
  number,
  last,
}: {
  record: (typeof experienceRoles)[number]
  number: number
  last: boolean
}) {
  const titleId = `${record.id}-title`

  return (
    <li
      className="experience-role"
      data-role={record.id}
      data-portal={last ? 'contact' : undefined}
    >
      <header className="experience-header">
        <div className="experience-meta">
          <span>{String(number).padStart(2, '0')}</span> <span>{record.employer}</span>{' '}
          <span className="experience-dates">{record.dates}</span>
        </div>
        <h3 className="experience-title" id={titleId}>
          {record.role}
        </h3>
      </header>
      <div className="experience-disclosure">
        <div className="experience-body" role="region" aria-labelledby={titleId}>
          <div className="experience-content">
            {record.detail && <p className="experience-detail">{record.detail}</p>}
            {(record.keyWork.length > 0 || record.technologies.length > 0) && (
              <div className="experience-columns">
                {record.keyWork.length > 0 && (
                  <div className="experience-key-work">
                    <h4>Key Work</h4>
                    <ul role="list">
                      {record.keyWork.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {record.technologies.length > 0 && (
                  <div className="experience-tech">
                    <h4>Tech</h4>
                    <TechnologyIcons
                      className="experience-technologies"
                      technologies={record.technologies}
                    />
                  </div>
                )}
              </div>
            )}
            {record.stats.length > 0 && (
              <dl className="experience-stats">
                {record.stats.map(({ value, label }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </li>
  )
}

export function ProfileSections() {
  const motion = useContext(ExperienceMotion)
  const root = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const enhanced = motion?.enhanced ?? false
  const progress = motion?.progress
  const dock = motion?.dock

  useLayoutEffect(() => {
    const element = root.current
    const title = heading.current

    if (!enhanced || !element || !title || !progress || !dock) return

    const roles = Array.from(element.querySelectorAll<HTMLElement>('.experience-role'))
    const parts = roles.map((role) => ({
      header: role.querySelector<HTMLElement>('.experience-header')!,
      disclosure: role.querySelector<HTMLElement>('.experience-disclosure')!,
      body: role.querySelector<HTMLElement>('.experience-body')!,
      content: role.querySelector<HTMLElement>('.experience-content')!,
    }))
    const list = element.querySelector('ol')!
    const viewport = window.visualViewport
    let viewportWidth = 0
    let floor = 0
    let x = 0
    let y = 0
    let top = 0
    let inset = 0
    let gap = 0
    let perspective = 0
    let boxes: { width: number; closedHeight: number; openHeight: number; radius: number }[] = []
    let painted: ReturnType<typeof getExperiencePositions> = []

    const paint = () => {
      const position = progress.get()
      const poses = getExperiencePositions(
        position,
        boxes,
        top,
        floor,
        gap,
        inset,
        viewportWidth <= 900,
        perspective,
      )
      let shape: ExperienceDock | null = null

      for (const [index, role] of roles.entries()) {
        const pose = poses[index]
        const previous = painted[index]
        const box = boxes[index]
        const { disclosure, body } = parts[index]
        const outline = pose.entering
          ? getExperienceDock(
              { ...box, height: pose.height, x: viewportWidth / 2, top: pose.y },
              floor,
              inset,
              viewportWidth,
              pose.release,
            )
          : null

        // The disclosure, shell, and liquid cutout use this frame's exact pose.
        if (pose.disclosure !== previous?.disclosure) {
          disclosure.style.height = `${pose.height - box.closedHeight}px`
          if (pose.disclosure === 0 && body.scrollTop > 0) body.scrollTop = 0
        }

        // A short screen's inner scroll takes over once the body is fully open.
        const readable = pose.disclosure === 1
        if (!previous || readable !== (previous.disclosure === 1)) {
          disclosure.inert = !readable
          disclosure.setAttribute('aria-hidden', String(!readable))
        }

        if (pose.y !== previous?.y) role.style.setProperty('--experience-y', `${pose.y}px`)

        if (pose.tilt !== previous?.tilt) {
          role.style.setProperty('--experience-tilt', `${pose.tilt}deg`)
          role.toggleAttribute('data-receding', pose.tilt !== 0)
        }

        if (pose.depth !== previous?.depth)
          role.style.setProperty('--experience-depth', `${pose.depth}px`)
        if (pose.opacity !== previous?.opacity)
          role.style.setProperty('--experience-opacity', String(pose.opacity))
        if (pose.visible !== previous?.visible) role.dataset.visible = String(pose.visible)

        role.inert = !pose.visible || !pose.interactive
        role.toggleAttribute('data-docked', outline?.touching ?? false)

        if (pose.featured !== previous?.featured) {
          if (pose.featured) role.setAttribute('aria-current', 'true')
          else role.removeAttribute('aria-current')
        }

        if (outline) shape = { ...outline, x, y }
      }

      painted = poses
      // Move the frame opening in the same update as the CSS pill.
      dock.set(shape)
      element.toggleAttribute('data-experience-started', position > 0)
    }

    const measure = () => {
      const bounds = element.getBoundingClientRect()
      const styles = getComputedStyle(element)
      const wheelStyles = getComputedStyle(list)
      x = bounds.left
      y = bounds.top
      viewportWidth = bounds.width
      // Mobile browser chrome can change the visible floor without changing the layout viewport.
      floor =
        (viewport && viewport.scale === 1 ? viewport.offsetTop + viewport.height : innerHeight) - y
      inset = parseFloat(styles.getPropertyValue('--frame-inset')) || 12
      gap = parseFloat(wheelStyles.rowGap) || 20
      perspective = parseFloat(wheelStyles.perspective) || Infinity
      top = title.getBoundingClientRect().bottom - y + gap

      // The landing slot fits the open role. Measure untransformed boxes so a wheel
      // tilt or disclosure animation cannot move the header or distort the mask.
      const available = Math.max(0, floor - inset - gap - top)
      const measurements = roles.map((role, index) => {
        const pillStyles = getComputedStyle(role)
        const { header, content } = parts[index]
        const headerHeight = parseFloat(getComputedStyle(header).height)
        const contentHeight = parseFloat(getComputedStyle(content).height)
        const room = Math.max(0, available - headerHeight)

        return {
          width: parseFloat(pillStyles.width),
          closedHeight: headerHeight,
          openHeight: headerHeight + Math.min(room, contentHeight),
          radius: parseFloat(pillStyles.borderTopLeftRadius),
          room,
          overflow: contentHeight > room + 1,
        }
      })
      boxes = measurements

      // A resize can give the same disclosure phase a different pixel height.
      painted = []

      for (const [index, { room, overflow }] of measurements.entries()) {
        const { body } = parts[index]
        const height = `${room}px`

        if (body.style.getPropertyValue('--experience-body-room') !== height)
          body.style.setProperty('--experience-body-room', height)

        if (overflow && body.tabIndex !== 0) body.tabIndex = 0
        if (!overflow && body.hasAttribute('tabindex')) body.removeAttribute('tabindex')
      }

      element.style.setProperty('--experience-list-top', `${top}px`)
      element.style.setProperty('--experience-wheel-center', `${(top + floor - inset) / 2}px`)
      paint()
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(title)
    parts.forEach(({ header, content }) => {
      observer.observe(header)
      observer.observe(content)
    })
    const stop = progress.on('change', paint)

    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
    measure()

    return () => {
      observer.disconnect()
      stop()
      viewport?.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', measure)
      dock.set(null)
      element.removeAttribute('data-experience-started')

      for (const [index, role] of roles.entries()) {
        const { body, disclosure } = parts[index]

        disclosure.style.removeProperty('height')
        disclosure.inert = false
        disclosure.removeAttribute('aria-hidden')
        body.style.removeProperty('--experience-body-room')
        body.removeAttribute('tabindex')
        role.inert = false
        role.removeAttribute('data-visible')
        role.removeAttribute('data-docked')
        role.removeAttribute('data-receding')
        role.removeAttribute('aria-current')
      }
    }
  }, [enhanced, progress, dock])

  return (
    <div className="about-pages">
      <AboutIntroduction enhanced={enhanced} />
      <div className="about-reveal intro-period-reveal">
        <div ref={root} id="about-profile" className="experience" tabIndex={-1}>
          <h2 ref={heading} className="experience-heading">
            Experience.
          </h2>
          <p className="experience-guide">Scroll to explore</p>
          <div className="experience-stage">
            <ol className="experience-roles" aria-label="Job experience">
              {experienceRoles.map((record, index) => (
                <ExperienceRole
                  key={record.id}
                  record={record}
                  number={index + 1}
                  last={index === experienceRoles.length - 1}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
