'use client'

import { IntroDropText } from '@/components/atoms/IntroDropText'

import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  cancelFrame,
  easeOut,
  frame,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type MotionStyle,
} from 'motion/react'
import { TechnologyIcons } from '@/components/atoms/TechnologyIcon'
import { ProjectCover } from '@/components/atoms/ProjectCover'
import { ProjectCTA } from '@/components/atoms/ProjectCTA'
import { ProjectDialog } from './ProjectDialog'
import { WorkPillMotion } from './ExperienceMotion'
import {
  pillWheelDepth,
  pillWheelOpacity,
  pillWheelRotation,
  pillWheelVertical,
  compactPillBottom,
  workCompactDepth,
  workCompactPitch,
  workPillClearance,
  workPillScale,
} from './pillWheel'
import { getIntroPeriodGeometry, getPeriodOpening } from '@/components/atoms/periodOpening'
import { useWorkPillEntrance } from '@/hooks/useWorkPillEntrance'
import {
  clamp,
  getWorkOpeningTiming,
  projectStops,
  skills,
  skillTitleFillPortion,
  skillSegments,
  skillTravel,
  workProjectId,
} from './skillsTimeline'

type Project = (typeof skills)[number]['projects'][number]

type OpenProject = (project: Project, trigger: HTMLButtonElement) => void

const workProjectsCopy =
  'See what I’ve built across client websites, design systems, and developer tools, plus a few experiments in 3D and AI.'

type WheelBounds = { upperClearance: number; pillHeights: number[] }

function useSkillWheelPose(
  index: number,
  ringPosition: MotionValue<number>,
  radius: number,
  compact: boolean,
  bounds: MotionValue<WheelBounds>,
) {
  const distance = useTransform(ringPosition, (position) => index - position)
  const rotateX = useTransform(distance, (value) =>
    pillWheelRotation(value, compact, workCompactPitch),
  )
  const y = useTransform(distance, (value) => pillWheelVertical(value, radius))
  const z = useTransform(distance, (value) =>
    pillWheelDepth(value, radius, compact, workCompactDepth),
  )
  // Tuck the outgoing pill into the wheel as it tilts, using the same scroll clock.
  const scale = useTransform(distance, (value) => {
    const recede = easeOut(clamp(-value / 0.8))

    return workPillScale * (1 - 0.2 * recede)
  })
  const opacity = useTransform(() => {
    const value = distance.get()
    const { upperClearance, pillHeights } = bounds.get()
    const halfHeight = (pillHeights[index] ?? 0) / 2
    const tilt = (rotateX.get() * Math.PI) / 180
    const top = y.get() - halfHeight * Math.cos(tilt)
    const baseOpacity = pillWheelOpacity(value) * clamp((value + 1.75) / 0.45)

    if (value >= 0 || baseOpacity === 0) return baseOpacity

    const fadeRoom = clamp(upperClearance - halfHeight, 1, workPillClearance)

    // Use the unprojected edge to clear the content above even if 3D transforms flatten.
    return baseOpacity * clamp((upperClearance + top) / fadeRoom)
  })
  const visibility = useTransform(distance, (value) =>
    value <= 0 && value > -1.75 ? 'visible' : 'hidden',
  )
  const zIndex = useTransform(distance, (value) => 20 - Math.round(Math.abs(value) * 4))

  return { rotateX, y, z, opacity, visibility, zIndex, scale }
}

function SkillCategoryPill({
  index,
  active,
  animated,
  ringPosition,
  radius,
  compact = false,
  bounds,
  onSelect,
}: {
  index: number
  active: boolean
  animated: boolean
  ringPosition: MotionValue<number>
  radius: number
  compact?: boolean
  bounds: MotionValue<WheelBounds>
  onSelect: (index: number) => void
}) {
  const skill = skills[index]
  const pose = useSkillWheelPose(index, ringPosition, radius, compact, bounds)
  const Item = animated ? motion.li : motion.div

  return (
    <Item
      className="skills-category-pill"
      data-active={active ? '' : undefined}
      style={
        animated ? ({ ...pose, '--work-pill-scale': workPillScale } as MotionStyle) : undefined
      }
    >
      <div className="skills-category-current" data-skill={skill.name}>
        <span className="skills-category-number" aria-hidden="true">
          0{index + 1}
        </span>
        <div className="skills-category-copy">
          <TechnologyIcons technologies={skill.technologies} className="skills-technologies" />
          <h3>
            {skill.name}
            {index === skills.length - 1 && active ? (
              <>
                <span data-portal-glyph>.</span>
                <span className="skills-about-portal" data-portal="about" aria-hidden="true" />
              </>
            ) : (
              '.'
            )}
          </h3>
        </div>
        {skill.note && <p className="skills-category-note">{skill.note}</p>}
        {animated && (
          <button
            type="button"
            className="skills-pill-toggle"
            aria-label={`Select ${skill.name}`}
            aria-pressed={active}
            aria-controls={`skills-projects-${index}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(index)}
          />
        )}
      </div>
    </Item>
  )
}

function SkillProject({
  index,
  active,
  animated,
  onOpenProject,
}: {
  index: number
  active: boolean
  animated: boolean
  onOpenProject: OpenProject
}) {
  const skill = skills[index]
  const project = skill.projects[0]

  return (
    <div
      id={`skills-projects-${index}`}
      className="skills-project-stage skills-project-deck"
      role="group"
      aria-label={`Projects in ${skill.name}`}
      data-skill={skill.name}
      aria-hidden={animated && !active}
      inert={animated && !active}
    >
      <div className="skills-project-window">
        <article
          id={workProjectId(project.title)}
          className="scene-project skill-project-card"
          aria-label={project.title}
          aria-hidden={animated && !active}
          style={{ '--information-reveal': 1 } as CSSProperties}
        >
          <div className="artwork-frame project-cover" data-artwork={project.artwork}>
            <ProjectCover artwork={project.artwork} title={project.title} />
          </div>
          <div className="skill-project-ribbon">
            <ProjectCTA
              title={project.title}
              description={project.description}
              onOpen={(trigger) => onOpenProject(project, trigger)}
            />
          </div>
        </article>
      </div>
    </div>
  )
}

function SkillsWheelIntroCopy() {
  return (
    <>
      <h3>A Few Things I&rsquo;ve Made.</h3>
      <p>{workProjectsCopy}</p>
    </>
  )
}

function SkillsWheelIntro({ compact }: { compact: boolean }) {
  const progress = useContext(WorkPillMotion)?.progress
  const { copyStart, copyEnd } = getWorkOpeningTiming(compact)

  // Follow the scene opening while staying independent of the category wheel.
  const opacity = useTransform(() => {
    const travel = (progress?.get() ?? 0) * skillTravel

    return easeOut(clamp((travel - copyStart) / (copyEnd - copyStart)))
  })
  const visibility = useTransform(opacity, (value) => (value > 0 ? 'visible' : 'hidden'))

  return (
    <motion.li className="skills-wheel-intro" data-wheel-static style={{ opacity, visibility }}>
      <SkillsWheelIntroCopy />
    </motion.li>
  )
}

export function SkillsScene() {
  const [selection, setSelection] = useState({ intro: 0, textIntro: 0 })
  const [pinned, setPinned] = useState(false)
  const [openedProject, setOpenedProject] = useState<Project | null>(null)
  const [projectOrigin, setProjectOrigin] = useState<{ x: number; y: number } | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const reduceMotion = useReducedMotion()
  const animated = pinned && !reduceMotion
  const wheel = useRef<HTMLUListElement>(null)
  const projects = useRef<HTMLDivElement>(null)
  const pendingCategoryFocus = useRef<number | null>(null)
  const [radius, setRadius] = useState(340)
  const [compactWheel, setCompactWheel] = useState(false)
  const ringPosition = useMotionValue(0)
  const wheelBounds = useMotionValue<WheelBounds>({
    upperClearance: Infinity,
    pillHeights: [],
  })
  const [categoryIndex, setCategoryIndex] = useState(0)

  // Category selection follows the visible wheel, independently of the project wipe.
  useMotionValueEvent(ringPosition, 'change', (position) => {
    setCategoryIndex(Math.round(clamp(position, 0, skills.length - 1)))
  })
  useWorkPillEntrance(wheel, animated, ringPosition, radius, compactWheel)

  useLayoutEffect(() => {
    const element = wheel.current

    if (!element || !animated) return

    const intro = element.querySelector<HTMLElement>('[data-wheel-static]')
    const pills = Array.from(element.querySelectorAll<HTMLElement>('.skills-category-pill'))
    const projectDeck = projects.current

    const measure = () => {
      const compact = window.matchMedia('(max-width: 900px)').matches
      const layout = getComputedStyle(element)
      const sharedRows = layout.gridTemplateRows.startsWith('subgrid')
      const sharedColumns = layout.gridTemplateColumns.startsWith('subgrid')
      const stacked = sharedRows && !sharedColumns
      const pillHeights = pills.map((pill) => pill.offsetHeight * workPillScale)
      const tallest = Math.max(0, ...pillHeights)
      const focusedHeight = pillHeights[categoryIndex] ?? tallest

      // Reserve the focused pill's natural size without stretching its surface.
      element.parentElement?.style.setProperty('--work-pill-row-height', `${focusedHeight}px`)

      const performance = element.parentElement
      if (stacked && performance && intro) {
        const gap = parseFloat(getComputedStyle(performance).rowGap) || 0
        const available = Math.max(
          0,
          performance.clientHeight - intro.offsetHeight - focusedHeight - gap * 2,
        )

        // Give the card 80% of its former slot and distribute the freed room
        // outside the complete stack, rather than between its three elements.
        performance.style.setProperty('--work-project-row-height', `${available * 0.8}px`)
      } else {
        performance?.style.removeProperty('--work-project-row-height')
      }

      const anchor = pills[0]
      const center = anchor.offsetTop
      const height = element.clientHeight
      // The final shared row contains the rotating pills.
      const orbitHeight = sharedRows ? 2 * (height - center) : height
      const contentBottom =
        stacked && projectDeck
          ? projectDeck.getBoundingClientRect().bottom - element.getBoundingClientRect().top
          : intro
            ? intro.offsetTop + intro.offsetHeight
            : -Infinity
      const upperClearance = center - contentBottom - 4
      let compactRadius = Math.max(80, orbitHeight * 0.6)
      const maximumRadius = (tallest + workPillClearance) * Math.SQRT2

      // Keep the orbit tight and expand it only as far as the tilted edges require.
      while (
        compact &&
        compactRadius < maximumRadius &&
        compactPillBottom(1, tallest, compactRadius) > -tallest / 2 - workPillClearance
      ) {
        compactRadius += 4
      }

      setCompactWheel(compact)
      setRadius(compact ? compactRadius : Math.max(130, height * 0.46))
      element.style.setProperty('--work-wheel-center', `${center}px`)
      element.style.setProperty(
        '--work-wheel-center-x',
        sharedColumns ? `${anchor.offsetLeft + anchor.offsetWidth / 2}px` : '50%',
      )
      wheelBounds.set({ upperClearance, pillHeights })
    }

    measure()

    const observer = new ResizeObserver(measure)

    observer.observe(element)
    if (intro) observer.observe(intro)
    if (projectDeck) observer.observe(projectDeck)
    pills.forEach((pill) => observer.observe(pill))

    return () => observer.disconnect()
  }, [animated, categoryIndex, wheelBounds])

  const scene = useRef<HTMLDivElement>(null)
  const period = useRef<HTMLSpanElement>(null)
  const [portal, setPortal] = useState({ x: 0, y: 0, radius: 0, dot: 0, borderWidth: 12 })
  const revealStart = skillTitleFillPortion
  const fillDuration = skillTitleFillPortion / 2
  const expansion = animated ? clamp((selection.intro - revealStart) / (1 - revealStart)) : 1
  const titleFill = (line: number) =>
    animated ? clamp(selection.textIntro / fillDuration - line) * 100 : 0
  const openingRadius =
    expansion > 0 ? getPeriodOpening(expansion, portal.dot, portal.radius).innerRadius : 0

  useLayoutEffect(() => {
    const element = scene.current
    const dot = period.current

    if (!element || !dot) return

    let disposed = false
    const measure = () => {
      if (disposed) return

      setPortal({
        ...getIntroPeriodGeometry(element.getBoundingClientRect(), dot.getBoundingClientRect()),
        borderWidth:
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue('--frame-inset'),
          ) || 12,
      })
    }

    measure()

    const observer = new ResizeObserver(measure)

    observer.observe(element)
    observer.observe(dot)

    const heading = element.querySelector('.skills-heading')

    if (heading) {
      observer.observe(heading)
      heading.querySelectorAll('.skills-title-fill').forEach((line) => observer.observe(line))
    }

    document.fonts.ready.then(measure)

    return () => {
      disposed = true
      observer.disconnect()
    }
  }, [animated])
  useLayoutEffect(() => {
    if (pendingCategoryFocus.current === categoryIndex) {
      const focusCategory = () => {
        pendingCategoryFocus.current = null
        wheel.current
          ?.querySelectorAll<HTMLButtonElement>('.skills-pill-toggle')
          [categoryIndex]?.focus({ preventScroll: true })
      }

      frame.postRender(focusCategory)

      return () => cancelFrame(focusCategory)
    }
  }, [categoryIndex])
  useEffect(() => {
    function update(event: Event) {
      const { intro, textIntro } = (event as CustomEvent<{ intro: number; textIntro: number }>)
        .detail

      setPinned(true)
      setSelection((previous) => {
        const unchanged = previous.intro === intro && previous.textIntro === textIntro

        return unchanged ? previous : { intro, textIntro }
      })
    }

    window.addEventListener('portfolio:skills-progress', update)

    return () => window.removeEventListener('portfolio:skills-progress', update)
  }, [])

  function selectSkill(index: number) {
    window.dispatchEvent(
      new CustomEvent('portfolio:select-skill', {
        detail: {
          index,
          offset:
            projectStops.find((stop) => stop.skillIndex === index)!.position -
            skillSegments[index].start,
        },
        cancelable: true,
      }),
    )
  }

  function openProject(project: Project, button: HTMLButtonElement) {
    trigger.current = button

    const bounds = (
      button.querySelector('.skill-project-band-arrow .dot-icon') ?? button
    ).getBoundingClientRect()

    setProjectOrigin({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 })
    setOpenedProject(project)
  }

  return (
    <div
      ref={scene}
      className="skills-scene skills-index skills-duet scene-content"
      data-playing={animated ? '' : undefined}
      style={
        {
          '--skills-portal-x': `${portal.x}px`,
          '--skills-portal-y': `${portal.y}px`,
          '--skills-portal-radius': `${openingRadius}px`,
        } as CSSProperties
      }
    >
      <div className="skills-heading" aria-hidden={animated && expansion === 1}>
        <div className="skills-title-stack">
          <h2 aria-label="Here’s What I’m Building.">
            <span className="skills-title-line" aria-hidden="true">
              <span
                className="skills-title-fill"
                data-intro-title=""
                style={{ '--title-fill': `${titleFill(0)}%` } as CSSProperties}
              >
                <IntroDropText text="Here’s What" />
              </span>
            </span>
            <span className="skills-title-line" aria-hidden="true">
              <span
                className="skills-title-fill"
                data-intro-title=""
                style={{ '--title-fill': `${titleFill(1)}%` } as CSSProperties}
              >
                <IntroDropText text="I’m Building" />
              </span>
              <span ref={period} className="skills-title-period" data-intro-drop="letter" />
            </span>
          </h2>
        </div>
      </div>
      {animated ? (
        <div
          className="skills-reveal intro-period-reveal"
          data-revealed={expansion === 1 ? '' : undefined}
          inert={expansion < 1}
          aria-hidden={expansion < 1}
        >
          <div className="skills-performance">
            <div ref={projects} className="skills-projects">
              {skills.map((skill, index) => (
                <SkillProject
                  key={skill.name}
                  index={index}
                  active={categoryIndex === index}
                  animated
                  onOpenProject={openProject}
                />
              ))}
            </div>
            {/* Preserve list semantics in Safari with list markers hidden. */}
            <ul
              ref={wheel}
              className="skills-browser"
              role="list"
              aria-label="Skill categories"
              onKeyDown={(event) => {
                if (
                  !(event.target instanceof HTMLButtonElement) ||
                  !event.target.classList.contains('skills-pill-toggle')
                )
                  return

                const last = skills.length - 1
                let next = categoryIndex

                switch (event.key) {
                  case 'ArrowUp':
                  case 'ArrowLeft':
                    next = Math.max(0, next - 1)

                    break
                  case 'ArrowDown':
                  case 'ArrowRight':
                    next = Math.min(last, next + 1)

                    break
                  case 'Home':
                    next = 0

                    break
                  case 'End':
                    next = last

                    break
                  default:
                    return
                }

                event.preventDefault()

                if (next === categoryIndex) return

                pendingCategoryFocus.current = next
                selectSkill(next)
              }}
            >
              <SkillsWheelIntro compact={compactWheel} />
              {skills.map((skill, index) => (
                <SkillCategoryPill
                  key={skill.name}
                  index={index}
                  active={categoryIndex === index}
                  animated
                  ringPosition={ringPosition}
                  radius={radius}
                  compact={compactWheel}
                  bounds={wheelBounds}
                  onSelect={selectSkill}
                />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="skills-fallback">
          <div className="skills-wheel-intro">
            <SkillsWheelIntroCopy />
          </div>
          {skills.map((skill, index) => (
            <section className="skills-pair" key={skill.name} aria-label={skill.name}>
              <SkillProject index={index} active animated={false} onOpenProject={openProject} />
              <SkillCategoryPill
                index={index}
                active
                animated={false}
                radius={radius}
                ringPosition={ringPosition}
                bounds={wheelBounds}
                onSelect={selectSkill}
              />
            </section>
          ))}
        </div>
      )}
      {categoryIndex !== skills.length - 1 && (
        <span className="skills-index-portal" data-portal="about" aria-hidden="true" />
      )}
      <ProjectDialog
        project={openedProject}
        origin={projectOrigin}
        onClose={() => {
          setOpenedProject(null)
          trigger.current?.focus({ preventScroll: true })
        }}
      />
    </div>
  )
}
