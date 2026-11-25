'use client'

import { IntroDropText } from '@/components/atoms/IntroDropText'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  cancelFrame,
  frame,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type MotionStyle,
} from 'motion/react'
import { ProjectCover } from '@/components/atoms/ProjectCover'
import { ProjectCTA } from '@/components/atoms/ProjectCTA'
import { WordEmphasis } from '@/components/atoms/WordEmphasis'
import { ProjectDialog } from './ProjectDialog'
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
  getIntroParagraphProgress,
  getSkillFrame,
  projectStops,
  skills,
  skillParagraphEndPortion,
  skillTitleFillPortion,
  workProjectId,
} from './skillsTimeline'

type Project = (typeof skills)[number]['projects'][number]

type OpenProject = (project: Project, trigger: HTMLButtonElement) => void

const introText =
  'See what I’ve built across client websites, design systems, and developer tools, plus a few experiments in 3D and AI.'

function SkillCategoryPill({
  index,
  active,
  animated,
  ringPosition,
  radius,
  compact = false,
  onSelect,
}: {
  index: number
  active: boolean
  animated: boolean
  ringPosition: MotionValue<number>
  radius: number
  compact?: boolean
  onSelect: (index: number) => void
}) {
  const skill = skills[index]
  // A perspective ring brings the active skill forward while its neighbours tilt away.
  const distance = useTransform(ringPosition, (position) => index - position)
  const rotation = useTransform(distance, (value) =>
    pillWheelRotation(value, compact, workCompactPitch),
  )
  const vertical = useTransform(distance, (value) => pillWheelVertical(value, radius))
  const depth = useTransform(distance, (value) =>
    pillWheelDepth(value, radius, compact, workCompactDepth),
  )
  const opacity = useTransform(distance, (value) => {
    // Finish fading the outgoing pill before removing it from the wheel.
    return pillWheelOpacity(value) * clamp((value + 1.75) / 0.45)
  })
  const visibility = useTransform(distance, (value) =>
    value <= 0 && value > -1.75 ? 'visible' : 'hidden',
  )
  const order = useTransform(distance, (value) => 20 - Math.round(Math.abs(value) * 4))

  return (
    <motion.div
      role={animated ? 'listitem' : undefined}
      className="skills-category-pill"
      data-active={active ? '' : undefined}
      style={
        {
          rotateX: animated ? rotation : 0,
          y: animated ? vertical : 0,
          z: animated ? depth : 0,
          opacity: animated ? opacity : 1,
          scale: animated ? workPillScale : 1,
          visibility: animated ? visibility : 'visible',
          zIndex: animated ? order : 1,
          '--work-pill-scale': workPillScale,
        } as MotionStyle
      }
    >
      <div className="skills-category-current" data-skill={skill.name}>
        <span className="skills-category-number" aria-hidden="true">
          0{index + 1}
        </span>
        <div className="skills-category-copy">
          <p className="skills-technologies">{skill.technologies.join(' \u00b7 ')}</p>
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
    </motion.div>
  )
}

function SkillProjects({
  index,
  active,
  projectPosition,
  animated,
  onOpenProject,
}: {
  index: number
  active: boolean
  projectPosition: number
  animated: boolean
  onOpenProject: OpenProject
}) {
  const skill = skills[index]
  const first = projectStops.findIndex((stop) => stop.skillIndex === index)
  const localPosition = projectPosition - first
  const projectIndex = Math.round(clamp(localPosition, 0, skill.projects.length - 1))
  const outgoing = Math.floor(projectPosition)
  const incoming = Math.ceil(projectPosition)
  const visible = !animated || (first <= incoming && first + skill.projects.length - 1 >= outgoing)

  return (
    <div
      id={`skills-projects-${index}`}
      className="skills-project-stage skills-project-deck"
      role="group"
      aria-label={`Projects in ${skill.name}`}
      data-skill={skill.name}
      data-project={projectIndex}
      data-visible={visible ? 'true' : undefined}
      aria-hidden={animated && !active}
      inert={animated && !active}
      style={{
        zIndex: animated ? 100 + index : 1,
      }}
    >
      <div className="skills-project-caption">
        <span>{skill.name}</span>
      </div>
      <div className="skills-project-window">
        {skill.projects.map((project, position) => (
          <article
            key={`${skill.name}-${project.title}`}
            id={workProjectId(project.title)}
            className="scene-project skill-project-card"
            aria-label={project.title}
            data-visible={
              !animated || first + position === outgoing || first + position === incoming
                ? 'true'
                : undefined
            }
            aria-hidden={animated && (!active || position !== projectIndex)}
            inert={animated && (!active || position !== projectIndex)}
            style={
              {
                '--card-reveal':
                  first + position === incoming && incoming !== outgoing
                    ? `${(projectPosition - outgoing) * 150}%`
                    : '150%',
                '--information-reveal': 1,
                zIndex: 100 + position,
              } as CSSProperties
            }
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
        ))}
      </div>
    </div>
  )
}

export function SkillsScene() {
  const [selection, setSelection] = useState({ ...getSkillFrame(0), intro: 0, textIntro: 0 })
  const [pinned, setPinned] = useState(false)
  const [openedProject, setOpenedProject] = useState<Project | null>(null)
  const [projectOrigin, setProjectOrigin] = useState<{ x: number; y: number } | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const reduceMotion = useReducedMotion()
  const animated = pinned && !reduceMotion
  const wheel = useRef<HTMLDivElement>(null)
  const pendingCategoryFocus = useRef<number | null>(null)
  const [radius, setRadius] = useState(340)
  const [compactWheel, setCompactWheel] = useState(false)
  const ringPosition = useMotionValue(0)
  useWorkPillEntrance(wheel, animated, ringPosition, radius, compactWheel)

  useLayoutEffect(() => {
    const element = wheel.current

    if (!element || !animated) return

    const measure = () => {
      const compact = window.matchMedia('(max-width: 900px)').matches
      const pills = Array.from(element.querySelectorAll<HTMLElement>('.skills-category-pill'))
      const tallest = Math.max(0, ...pills.map((pill) => pill.offsetHeight * workPillScale))
      let compactRadius = Math.max(80, element.clientHeight * 0.6)
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
      setRadius(compact ? compactRadius : Math.max(130, element.clientHeight * 0.46))
    }

    measure()

    const observer = new ResizeObserver(measure)

    observer.observe(element)
    element.querySelectorAll('.skills-category-pill').forEach((pill) => observer.observe(pill))

    return () => observer.disconnect()
  }, [animated])

  const scene = useRef<HTMLDivElement>(null)
  const period = useRef<HTMLSpanElement>(null)
  const [portal, setPortal] = useState({ x: 0, y: 0, radius: 0, dot: 0, borderWidth: 12 })
  const revealStart = skillParagraphEndPortion
  const fillDuration = skillTitleFillPortion / 2
  const paragraphProgress = getIntroParagraphProgress(selection.textIntro)
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
    if (pendingCategoryFocus.current === selection.index) {
      const focusCategory = () => {
        pendingCategoryFocus.current = null
        wheel.current
          ?.querySelectorAll<HTMLButtonElement>('.skills-pill-toggle')
          [selection.index]?.focus({ preventScroll: true })
      }

      frame.postRender(focusCategory)

      return () => cancelFrame(focusCategory)
    }
  }, [selection.index])
  useEffect(() => {
    function update(event: Event) {
      const { progress, intro, textIntro } = (
        event as CustomEvent<{ progress: number; intro: number; textIntro: number }>
      ).detail

      const next = getSkillFrame(progress)

      // Commit the wipe and card visibility together when crossing a project stop.
      setPinned(true)
      setSelection((previous) => {
        const unchanged =
          previous.projectPosition === next.projectPosition &&
          previous.intro === intro &&
          previous.textIntro === textIntro

        return unchanged ? previous : { ...next, intro, textIntro }
      })
    }

    window.addEventListener('portfolio:skills-progress', update)

    return () => window.removeEventListener('portfolio:skills-progress', update)
  }, [])

  function selectSkill(index: number) {
    window.dispatchEvent(
      new CustomEvent('portfolio:select-skill', {
        detail: { index, offset: 0.95 },
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
        <div className="skills-intro-slot">
          <p className="skills-intro">
            <WordEmphasis
              text={introText}
              progress={paragraphProgress}
              enabled={animated}
              scrollReveal
            />
          </p>
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
            <div className="skills-projects">
              {skills.map((skill, index) => (
                <SkillProjects
                  key={skill.name}
                  index={index}
                  active={selection.index === index}
                  projectPosition={selection.projectPosition}
                  animated
                  onOpenProject={openProject}
                />
              ))}
            </div>
            <div
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
                let next = selection.index

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

                if (next === selection.index) return

                pendingCategoryFocus.current = next
                selectSkill(next)
              }}
            >
              {skills.map((skill, index) => (
                <SkillCategoryPill
                  key={skill.name}
                  index={index}
                  active={selection.index === index}
                  animated
                  ringPosition={ringPosition}
                  radius={radius}
                  compact={compactWheel}
                  onSelect={selectSkill}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="skills-fallback">
          {skills.map((skill, index) => (
            <section className="skills-pair" key={skill.name} aria-label={skill.name}>
              <SkillProjects
                index={index}
                active
                projectPosition={0}
                animated={false}
                onOpenProject={openProject}
              />
              <SkillCategoryPill
                index={index}
                active
                animated={false}
                radius={radius}
                ringPosition={ringPosition}
                onSelect={selectSkill}
              />
            </section>
          ))}
        </div>
      )}
      {selection.index !== skills.length - 1 && (
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
