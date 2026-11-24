'use client'

import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { IntroDropText } from '@/components/atoms/IntroDropText'
import { WordEmphasis } from '@/components/atoms/WordEmphasis'
import {
  clamp,
  getIntroParagraphProgress,
  skillParagraphEndPortion,
  skillTitleFillPortion,
} from './skillsTimeline'
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
  const intro = progress * skillParagraphEndPortion
  const fill = (line: number) =>
    ({
      '--title-fill': `${clamp(intro / (skillTitleFillPortion / 2) - line) * 100}%`,
    }) as CSSProperties
  const paragraph = getIntroParagraphProgress(intro)

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
            text="Hey, I’m Jacob, a software engineer in Southern California. I’m curious about how things work, and I like making things fun to use."
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
  return (
    <li
      className="experience-role"
      data-role={record.id}
      data-portal={last ? 'contact' : undefined}
    >
      <span className="experience-number" aria-hidden="true">
        {String(number).padStart(2, '0')}
      </span>
      <div className="experience-copy">
        <p className="experience-meta">
          {record.employer} <span className="experience-dates">{record.dates}</span>
        </p>
        <h3>{record.role}</h3>
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
    const list = element.querySelector('ol')!
    const viewport = window.visualViewport
    let viewportWidth = 0
    let floor = 0
    let x = 0
    let y = 0
    let top = 0
    let inset = 0
    let gap = 0
    let boxes: { width: number; height: number; radius: number }[] = []
    let painted: ReturnType<typeof getExperiencePositions> = []

    const paint = () => {
      const position = progress.get()
      const poses = getExperiencePositions(
        position,
        boxes.map((box) => box.height),
        top,
        floor,
        gap,
        inset,
        viewportWidth <= 900,
      )
      let shape: ExperienceDock | null = null

      for (const [index, role] of roles.entries()) {
        const pose = poses[index]
        const previous = painted[index]
        const box = boxes[index]
        const outline = pose.entering
          ? getExperienceDock(
              { ...box, x: viewportWidth / 2, top: pose.y },
              floor,
              inset,
              viewportWidth,
              pose.release,
            )
          : null

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

        role.inert = !pose.visible || (pose.entering && !pose.featured)
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
      x = bounds.left
      y = bounds.top
      viewportWidth = bounds.width
      // Mobile browser chrome can change the visible floor without changing the layout viewport.
      floor =
        (viewport && viewport.scale === 1 ? viewport.offsetTop + viewport.height : innerHeight) - y
      inset = parseFloat(styles.getPropertyValue('--frame-inset')) || 12
      gap = parseFloat(getComputedStyle(list).rowGap) || 20
      top = title.getBoundingClientRect().bottom - y + gap

      // Measure the layout box so the previous pose's tilt cannot distort the mask.
      boxes = roles.map((role) => {
        const pillStyles = getComputedStyle(role)

        return {
          width: parseFloat(pillStyles.width),
          height: parseFloat(pillStyles.height),
          radius: parseFloat(pillStyles.borderTopLeftRadius),
        }
      })

      element.style.setProperty('--experience-list-top', `${top}px`)
      element.style.setProperty('--experience-wheel-center', `${(top + floor - inset) / 2}px`)
      paint()
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    observer.observe(title)
    roles.forEach((role) => observer.observe(role))
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

      for (const role of roles) {
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
