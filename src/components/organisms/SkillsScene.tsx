'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { PlatformArtwork, SystemArtwork } from '@/components/atoms/ProjectArtwork'
import { getPeriodOpening } from '@/components/atoms/periodOpening'
import { clamp, getSkillFrame, projectStops, skills } from './skillsTimeline'

type Project = (typeof skills)[number]['projects'][number]
type OpenProject = (project: Project, trigger: HTMLButtonElement) => void

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
  const distance = useTransform(ringPosition, (position) => {
    return (
      ((((index - position + skills.length / 2) % skills.length) + skills.length) % skills.length) -
      skills.length / 2
    )
  })
  const rotation = useTransform(distance, (value) => clamp(-value * (compact ? 62 : 38), -81, 81))
  const vertical = useTransform(distance, (value) => Math.sin((value * Math.PI) / 4) * radius)
  const depth = useTransform(distance, (value) => (Math.cos((value * Math.PI) / 4) - 1) * radius * (compact ? 3.5 : 1))
  const opacity = useTransform(distance, (value) => compact ? 1 - clamp(Math.abs(value)) * 0.65 : 1)
  const visibility = useTransform(distance, (value) => Math.abs(value) < 1.75 ? 'visible' : 'hidden')
  const scaleX = useSpring(0.82, { stiffness: 340, damping: 17, mass: 0.8 })
  const scaleY = useSpring(0.82, { stiffness: 260, damping: 14, mass: 0.8 })
  useEffect(() => {
    if (!animated) return
    let focused: boolean | undefined
    const update = (value: number) => {
      // Pop only as the item reaches the centre, rather than halfway through a turn.
      const next = active && Math.abs(value) < 0.12
      if (next === focused) return
      focused = next
      scaleX.set(next ? 0.94 : 0.82)
      scaleY.set(next ? 0.94 : 0.82)
    }
    update(distance.get())
    return distance.on('change', update)
  }, [active, animated, distance, scaleX, scaleY])

  const order = useTransform(distance, (value) => 20 - Math.round(Math.abs(value) * 4))
  return (
    <motion.div
      role="listitem"
      className="skills-category-pill"
      data-active={active ? '' : undefined}
      style={{
        rotateX: animated ? rotation : 0,
        y: animated ? vertical : 0,
        z: animated ? depth : 0,
        opacity: animated ? opacity : 1,
        scaleX: animated ? scaleX : 1,
        scaleY: animated ? scaleY : 1,
        visibility: animated ? visibility : 'visible',
        zIndex: animated ? order : 1,
      }}
    >
      <div className="skills-category-current" data-skill={skill.name}>
        <p className="eyebrow">
          0{index + 1} / 0{skills.length} &mdash; What I build
        </p>
        <h3>{skill.name}</h3>
        <p className="skills-technologies">{skill.technologies.join(' \u00b7 ')}</p>
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
  const reveal = projectPosition - outgoing
  const visible = !animated || (first <= incoming && first + skill.projects.length - 1 >= outgoing)
  return (
    <div
      id={`skills-projects-${index}`}
      className="skills-project-stage skills-project-deck"
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
        <span>
          0{projectIndex + 1} / 0{skill.projects.length}
        </span>
      </div>
      <div className="skills-project-window">
        {skill.projects.map((project, position) => (
          <article
            key={`${skill.name}-${project.title}`}
            className="scene-project skill-project-card"
            aria-label={project.title}
            data-visible={!animated || first + position === outgoing || first + position === incoming ? 'true' : undefined}
            aria-hidden={animated && (!active || position !== projectIndex)}
            inert={animated && (!active || position !== projectIndex)}
            style={
              {
                '--card-reveal': `${first + position === incoming && incoming !== outgoing ? reveal * 150 : 150}%`,
                '--information-reveal': 1,
                zIndex: 100 + position,
              } as CSSProperties
            }
          >
            <div className="card-scoop" aria-hidden="true" />
            <p className="eyebrow">0{position + 1} — Project</p>
            <h4>{project.title}</h4>
            {'status' in project && <p className="skill-project-status">{project.status}</p>}
            <p className="project-category">{project.category}</p>
            <div className="artwork-frame">
              {project.artwork === 'system' ? (
                <SystemArtwork />
              ) : project.artwork === 'platform' ? (
                <PlatformArtwork />
              ) : (
                <div className="skill-project-specimen" aria-hidden="true">
                  <span>
                    {project.artwork === 'terminal'
                      ? 'Go / CLI'
                      : project.artwork === 'model'
                        ? 'Blender / Low-poly'
                        : project.artwork === 'automation'
                          ? 'Python / Image tools'
                          : 'Ollama / Local models'}
                  </span>
                  <strong>
                    {project.artwork === 'terminal'
                      ? `> ${project.title}_`
                      : project.artwork === 'model'
                        ? '3D'
                        : project.artwork === 'automation'
                          ? 'Batch / Images'
                          : 'Local / AI'}
                  </strong>
                </div>
              )}
            </div>
            <p className="skill-project-information">{project.description}</p>
            <button
              type="button"
              className="project-open"
              aria-haspopup="dialog"
              onClick={(event) => {
                onOpenProject(project, event.currentTarget)
              }}
            >
              Read project <span className="sr-only">— {project.title}</span>
              <b aria-hidden="true">↗</b>
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

export function SkillsScene() {
  const [selection, setSelection] = useState({ ...getSkillFrame(0), intro: 0 })
  const [pinned, setPinned] = useState(false)
  const [openedProject, setOpenedProject] = useState<Project | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const previousOverflow = useRef('')
  const trigger = useRef<HTMLButtonElement | null>(null)
  const reduceMotion = useReducedMotion()
  const animated = pinned && !reduceMotion
  const wheel = useRef<HTMLDivElement>(null)
  const [radius, setRadius] = useState(340)
  const [compactWheel, setCompactWheel] = useState(false)
  const ringPosition = useMotionValue(0)
  useLayoutEffect(() => {
    const element = wheel.current
    if (!element || !animated) return
    const measure = () => {
      const compact = window.matchMedia('(max-width: 900px)').matches
      setCompactWheel(compact)
      setRadius(compact ? Math.max(80, element.clientHeight * 0.6) : Math.max(130, element.clientHeight * 0.46))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [animated])
  const scene = useRef<HTMLDivElement>(null)
  const period = useRef<HTMLSpanElement>(null)
  const [portal, setPortal] = useState({ x: 0, y: 0, radius: 0, dot: 0, borderWidth: 12 })
  const expansion = animated ? clamp((selection.intro - 0.4) / 0.6) : 1
  const entrance = expansion === 1 ? 1 : 0
  const opening = getPeriodOpening(expansion, portal.dot, portal.radius, portal.borderWidth)
  useLayoutEffect(() => {
    const element = scene.current
    const dot = period.current
    if (!element || !dot) return
    let disposed = false
    const measure = () => {
      if (disposed) return
      const bounds = element.getBoundingClientRect()
      const point = dot.getBoundingClientRect()
      const x = point.left + point.width / 2 - bounds.left
      const y = point.top + point.height / 2 - bounds.top
      setPortal({
        x, y, dot: point.width / 2,
        borderWidth: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-inset')) || 12,
        radius: Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y)) + 2,
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
    ringPosition.set(selection.ringPosition)
  }, [selection.ringPosition, ringPosition])
  useEffect(() => {
    function update(event: Event) {
      const { progress, intro } = (event as CustomEvent<{ progress: number; intro: number }>).detail
      setPinned(true)
      setSelection({ ...getSkillFrame(progress), intro })
    }
    window.addEventListener('portfolio:skills-progress', update)
    return () => window.removeEventListener('portfolio:skills-progress', update)
  }, [])
  useEffect(() => {
    if (!openedProject) return
    previousOverflow.current = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => {
      document.documentElement.style.overflow = previousOverflow.current
    }
  }, [openedProject])
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
    setOpenedProject(project)
  }
  return (
    <div
      ref={scene}
      className="skills-scene skills-index skills-duet scene-content"
      data-playing={animated ? '' : undefined}
      style={{
        '--skills-portal-x': `${portal.x}px`,
        '--skills-portal-y': `${portal.y}px`,
        '--skills-portal-radius': `${opening.innerRadius}px`,
      } as CSSProperties}
    >
      <div className="skills-heading" aria-hidden={animated && expansion === 1}>
        <div className="skills-title-stack">
          <div className="skills-title-shadow" aria-hidden="true">
            <span>My tech.</span>
            <span>And stuff.</span>
          </div>
          <h2 aria-label="My tech. And stuff.">
            <span className="skills-title-line" aria-hidden="true">
              <span className="skills-title-fill" style={{ '--title-fill': `${animated ? clamp(selection.intro / 0.18) * 100 : 0}%` } as CSSProperties}>My tech.</span>
            </span>
            <span className="skills-title-line" aria-hidden="true">
              <span className="skills-title-fill" style={{ '--title-fill': `${animated ? clamp((selection.intro - 0.18) / 0.18) * 100 : 0}%` } as CSSProperties}>And stuff</span><span ref={period} className="skills-title-period" />
            </span>
          </h2>
        </div>
        <p className="skills-intro">Check out how I spend my time when I’m not working, being a dad, or playing guitar.</p>
      </div>
      {animated && expansion > 0 && expansion < 1 && (
        <svg className="skills-period-opening" aria-hidden="true" focusable="false">
          <circle cx={portal.x} cy={portal.y} r={opening.ringRadius} strokeWidth={opening.ringWidth} />
        </svg>
      )}
      {animated ? (
        <div className="skills-reveal" inert={entrance < 1} aria-hidden={entrance < 1}>
        <div className="skills-performance">
          <div className="skills-projects" aria-label="Related projects">
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
          <div ref={wheel} className="skills-browser" role="list" aria-label="Skill categories">
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
      <span className="skills-index-portal" data-portal="approach" aria-hidden="true" />
      <dialog
        ref={dialog}
        className="project-dialog"
        aria-label={openedProject?.title}
        onClose={() => {
          setOpenedProject(null)
          trigger.current?.focus({ preventScroll: true })
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        {openedProject && (
          <div className="dialog-sheet">
            <button className="dialog-close" autoFocus onClick={() => dialog.current?.close()}>
              Close <span aria-hidden="true">×</span>
            </button>
            <p className="eyebrow">Skills &amp; Work</p>
            <h2>{openedProject.title}</h2>
            <p className="project-category">{openedProject.category}</p>
            <div className="project-story">
              {openedProject.details.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {'sourceUrl' in openedProject && (
              <a
                className="project-open"
                href={openedProject.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                View on GitHub <b aria-hidden="true">&nearr;</b>
              </a>
            )}
          </div>
        )}
      </dialog>
    </div>
  )
}
