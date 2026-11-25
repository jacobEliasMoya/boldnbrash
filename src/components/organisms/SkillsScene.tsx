'use client'

import { IntroDropText } from '@/components/atoms/IntroDropText'

import {
  Fragment,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  animate,
  cancelFrame,
  cubicBezier,
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
  getSkillFrame,
  getWorkOpeningTiming,
  projectStops,
  skills,
  skillTitleFillPortion,
  skillSegments,
  skillTravel,
  workIntroCopyTiming,
  workProjectId,
} from './skillsTimeline'

type Project = (typeof skills)[number]['projects'][number]
type OpenProject = (project: Project, trigger: HTMLButtonElement) => void

type CategoryTitleSweep = { stop: number; fill: number; complete: boolean }

const titleSweepPeak = 0.2
const titleSweepEnd = 0.3
const workStopTolerance = 0.003
const copyEase = cubicBezier(0.36, 0.1, 0.64, 0.9)

type WheelBounds = {
  upperClearance: number
  pillHeights: number[]
  pillCenterOffsets: number[]
}

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
    const { upperClearance, pillHeights, pillCenterOffsets } = bounds.get()
    const clearance = upperClearance + (pillCenterOffsets[index] ?? 0)
    const halfHeight = (pillHeights[index] ?? 0) / 2
    const tilt = (rotateX.get() * Math.PI) / 180
    const top = y.get() - halfHeight * Math.cos(tilt)
    const baseOpacity = pillWheelOpacity(value) * clamp((value + 1.75) / 0.45)

    if (value >= 0 || baseOpacity === 0) return baseOpacity

    const fadeRoom = clamp(clearance - halfHeight, 1, workPillClearance)

    // Use the unprojected edge to clear the content above even if 3D transforms flatten.
    return baseOpacity * clamp((clearance + top) / fadeRoom)
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
  categoryTitleSweep,
  radius,
  compact = false,
  bounds,
  onSelect,
}: {
  index: number
  active: boolean
  animated: boolean
  ringPosition: MotionValue<number>
  categoryTitleSweep: MotionValue<CategoryTitleSweep>
  radius: number
  compact?: boolean
  bounds: MotionValue<WheelBounds>
  onSelect: (index: number) => void
}) {
  const skill = skills[index]
  const pose = useSkillWheelPose(index, ringPosition, radius, compact, bounds)
  const titleFill = useTransform(() => {
    const { stop, fill } = categoryTitleSweep.get()
    const turn = Math.abs(index - ringPosition.get())

    if (projectStops[stop].skillIndex !== index || fill === 0) return '0%'

    // Compact layouts can start the turn early to clear the arriving pill.
    const facing = clamp(1 - turn / 0.08)

    return `${fill * facing * 100}%`
  })
  const Item = animated ? motion.li : motion.div
  const title = (
    <>
      {skill.name}
      {index === skills.length - 1 && active ? (
        <>
          <span data-portal-glyph>.</span>
          <span className="skills-about-portal" data-portal="about" aria-hidden="true" />
        </>
      ) : (
        '.'
      )}
    </>
  )

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
            {animated ? (
              <motion.span
                className="skills-title-fill skills-category-title-fill"
                style={{ '--title-fill': titleFill } as MotionStyle}
              >
                {title}
              </motion.span>
            ) : (
              title
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

function SkillsWheelIntro({ compact, categoryIndex }: { compact: boolean; categoryIndex: number }) {
  const progress = useContext(WorkPillMotion)?.progress
  const { copyStart } = getWorkOpeningTiming(compact)
  const { headingEnd, paragraphStart, end } = workIntroCopyTiming

  // Scrubbing back through the opening retraces the same two fades.
  const copy = useTransform(() => {
    const travel = (progress?.get() ?? 0) * skillTravel

    return clamp(travel - copyStart, 0, end)
  })
  const [opened, setOpened] = useState(() => copy.get() === end)
  const [visibleTitle, setVisibleTitle] = useState(categoryIndex)
  const [visibleDescription, setVisibleDescription] = useState(categoryIndex)
  const titleOpacity = useMotionValue(1)
  const descriptionOpacity = useMotionValue(1)
  const titleAlpha = useTransform(
    () => copyEase(clamp(copy.get() / headingEnd)) * titleOpacity.get(),
  )
  const descriptionAlpha = useTransform(() => {
    const reveal = clamp((copy.get() - paragraphStart) / (end - paragraphStart))

    return copyEase(reveal) * descriptionOpacity.get()
  })
  const titleY = useTransform(titleAlpha, [0, 1], [4, 0])

  useMotionValueEvent(copy, 'change', (value) => {
    if (value === end) {
      setVisibleTitle(categoryIndex)
      setVisibleDescription(categoryIndex)
      setOpened(true)
      return
    }

    if (copy.getPrevious() !== end) return

    setOpened(false)
    titleOpacity.jump(1)
    descriptionOpacity.jump(1)
  })

  useLayoutEffect(() => {
    if (!opened) return

    let control: ReturnType<typeof animate> | undefined

    function swapCopy(
      visible: number,
      opacity: MotionValue<number>,
      replace: (index: number) => void,
      onShown?: () => void,
    ) {
      const isCurrent = visible === categoryIndex
      const target = isCurrent ? 1 : 0
      const distance = Math.abs(opacity.get() - target)

      if (isCurrent && distance === 0) {
        onShown?.()
        return
      }

      // Hold the outgoing sentence briefly after the new title settles.
      const holdSentence = opacity === descriptionOpacity && !isCurrent && distance === 1

      // Commit the text while it's hidden. The next render brings it back in.
      control = animate(opacity, target, {
        type: 'tween',
        duration: distance * (isCurrent ? 0.74 : 0.36),
        delay: holdSentence ? 0.18 : 0,
        ease: copyEase,
        onComplete: () => {
          if (isCurrent) onShown?.()
          else replace(categoryIndex)
        },
      })
    }

    swapCopy(visibleTitle, titleOpacity, setVisibleTitle, () => {
      swapCopy(visibleDescription, descriptionOpacity, setVisibleDescription)
    })

    return () => control?.stop()
  }, [categoryIndex, descriptionOpacity, opened, titleOpacity, visibleDescription, visibleTitle])

  const opacity = useTransform(copy, (value) => (value > 0 ? 1 : 0))
  const visibility = useTransform(copy, (value) => (value > 0 ? 'visible' : 'hidden'))
  const title = skills[opened ? visibleTitle : categoryIndex].copy.title
  const description = skills[opened ? visibleDescription : categoryIndex].copy.description

  return (
    <motion.li className="skills-wheel-intro" data-wheel-static style={{ opacity, visibility }}>
      {/* Each row reserves room for its longest text, including during the swap. */}
      {skills.map(({ name, copy }) => (
        <Fragment key={name}>
          <span className="skills-wheel-title" aria-hidden="true">
            {copy.title}
          </span>
          <span className="skills-wheel-description" aria-hidden="true">
            {copy.description}
          </span>
        </Fragment>
      ))}
      <motion.h3
        className="skills-wheel-title"
        aria-label={title}
        style={{ opacity: titleAlpha, y: titleY }}
      >
        {title}
      </motion.h3>
      <motion.p className="skills-wheel-description" style={{ opacity: descriptionAlpha }}>
        {description}
      </motion.p>
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
  const workProgress = useContext(WorkPillMotion)?.progress
  const projectPosition = useTransform(
    () => getSkillFrame(workProgress?.get() ?? 0).projectPosition,
  )
  const categoryTitleSweep = useMotionValue<CategoryTitleSweep>({
    stop: 0,
    fill: 0,
    complete: false,
  })

  useMotionValueEvent(projectPosition, 'change', (position) => {
    const nearest = Math.round(position)
    if (Math.abs(position - nearest) < workStopTolerance) {
      categoryTitleSweep.set({ stop: nearest, fill: 0, complete: false })
      return
    }

    const earlier = Math.floor(position)
    const later = Math.ceil(position)
    const sweep = categoryTitleSweep.get()
    let stop = sweep.stop

    // Keep the same source until the scroll lands on or passes a project stop.
    if (stop !== earlier && stop !== later) {
      const previous = projectPosition.getPrevious() ?? position
      stop = position > previous ? earlier : later
    }

    const travel = Math.abs(position - stop)

    // A completed sweep stays clear if the gesture reverses before it settles.
    const complete = (stop === sweep.stop && sweep.complete) || travel >= titleSweepEnd
    const fill = complete
      ? 0
      : clamp(travel / titleSweepPeak) *
        clamp((titleSweepEnd - travel) / (titleSweepEnd - titleSweepPeak))

    categoryTitleSweep.set({ stop, fill, complete })
  })

  const wheelBounds = useMotionValue<WheelBounds>({
    upperClearance: Infinity,
    pillHeights: [],
    pillCenterOffsets: [],
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
      const pillCenterOffsets = pillHeights.map((height) => (stacked ? (height - tallest) / 2 : 0))
      const performance = element.parentElement

      // Hold the stack steady through a turn. Shorter pills still start at the same top edge.
      performance?.style.setProperty('--work-pill-row-height', `${tallest}px`)
      pills.forEach((pill, index) => {
        pill.style.setProperty('--work-pill-center-offset', `${pillCenterOffsets[index]}px`)
      })

      if (stacked && performance && intro) {
        const gap = parseFloat(getComputedStyle(performance).rowGap) || 0
        const available = Math.max(
          0,
          performance.clientHeight - intro.offsetHeight - tallest - gap * 2,
        )

        // Give the card 80% of its former slot and distribute the freed room
        // outside the complete stack, rather than between its three elements.
        performance.style.setProperty('--work-project-row-height', `${available * 0.8}px`)
      } else {
        performance?.style.removeProperty('--work-project-row-height')
      }

      const anchor = pills[0]
      const center = anchor.offsetTop - pillCenterOffsets[0]
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
      wheelBounds.set({ upperClearance, pillHeights, pillCenterOffsets })
    }

    measure()

    const observer = new ResizeObserver(measure)

    observer.observe(element)
    if (intro) observer.observe(intro)
    if (projectDeck) observer.observe(projectDeck)
    pills.forEach((pill) => observer.observe(pill))

    return () => observer.disconnect()
  }, [animated, wheelBounds])

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
              <SkillsWheelIntro compact={compactWheel} categoryIndex={categoryIndex} />
              {skills.map((skill, index) => (
                <SkillCategoryPill
                  key={skill.name}
                  index={index}
                  active={categoryIndex === index}
                  animated
                  ringPosition={ringPosition}
                  categoryTitleSweep={categoryTitleSweep}
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
          {skills.map((skill, index) => (
            <section className="skills-pair" key={skill.name} aria-label={skill.name}>
              <div className="skills-wheel-intro skills-fallback-copy">
                <h3 className="skills-wheel-title">{skill.copy.title}</h3>
                <p className="skills-wheel-description">{skill.copy.description}</p>
              </div>
              <SkillProject index={index} active animated={false} onOpenProject={openProject} />
              <SkillCategoryPill
                index={index}
                active
                animated={false}
                radius={radius}
                ringPosition={ringPosition}
                categoryTitleSweep={categoryTitleSweep}
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
