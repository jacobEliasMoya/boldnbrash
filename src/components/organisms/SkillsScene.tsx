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
import { clamp, getSkillPosition, skillSegments, skills } from './skillsTimeline'

type Project = (typeof skills)[number]['projects'][number]

function SkillCategoryPill({
  index,
  active,
  phase,
  animated,
  reduceMotion,
  ringPosition,
  radius,
  onToggle,
  onOpenProject,
}: {
  index: number
  active: boolean
  phase: number
  animated: boolean
  reduceMotion: boolean | null
  ringPosition: MotionValue<number>
  radius: number
  onToggle: (index: number, expanded: boolean) => void
  onOpenProject: (project: Project, trigger: HTMLButtonElement) => void
}) {
  const skill = skills[index]
  const [pillHeight, setPillHeight] = useState(150)
  const pill = useRef<HTMLDivElement>(null)
  const category = useRef<HTMLDivElement>(null)
  const growth = active && animated ? clamp(phase / 0.45) : 0
  const reveal = active
    ? animated
      ? Math.min(
          clamp((phase - 0.2) / 0.35),
          clamp((skillSegments[index].duration - 0.28 - phase) / 0.3),
        )
      : 1
    : 0
  const cardPosition = clamp(phase - 0.55, 0, skill.projects.length - 0.001)
  const projectIndex = Math.floor(cardPosition)
  const cardTravel = Math.min(
    skill.projects.length - 1,
    projectIndex + clamp((cardPosition - projectIndex - 0.75) / 0.25),
  )
  // Every pill sits on the same closed vertical ring, including the last above the first.
  const angle = useTransform(ringPosition, (position) => {
    const steps =
      ((((index - position + skills.length / 2) % skills.length) + skills.length) % skills.length) -
      skills.length / 2
    return steps * (360 / skills.length)
  })
  const stepAngle = 360 / skills.length
  const rotation = useTransform(angle, (value) => clamp((-value * 32.4) / stepAngle, -81, 81))
  const vertical = useTransform(angle, (value) => Math.sin((value * Math.PI) / 180) * radius * 0.78)
  const depth = useTransform(
    angle,
    (value) => (Math.cos((value * Math.PI) / 180) - 1) * radius * 0.85,
  )
  const fade = useTransform(angle, (value) =>
    Math.pow(
      Math.max(0, Math.cos((value * Math.PI) / 180)),
      Math.log(0.466) / Math.log(Math.cos((stepAngle * Math.PI) / 180)),
    ),
  )
  const order = useTransform(angle, (value) =>
    Math.round(100 + Math.cos((value * Math.PI) / 180) * 50),
  )

  useLayoutEffect(() => {
    const heading = category.current,
      container = pill.current
    if (!heading || !container) return
    function measure() {
      const style = getComputedStyle(container!)
      setPillHeight(
        heading!.offsetHeight +
          parseFloat(style.paddingTop) +
          parseFloat(style.paddingBottom) +
          parseFloat(style.borderTopWidth) +
          parseFloat(style.borderBottomWidth),
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(heading)
    return () => observer.disconnect()
  }, [])
  return (
    <motion.div
      ref={pill}
      role="listitem"
      data-active={active ? '' : undefined}
      className="skills-category-pill"
      data-expanded={reveal > 0 ? '' : undefined}
      initial={false}
      animate={{ '--pill-reveal': reveal }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.6, bounce: 0 }}
      style={
        {
          '--pill-height': `${pillHeight}px`,
          y: animated ? vertical : 0,
          rotateX: animated ? rotation : 0,
          z: animated ? depth : 0,
          opacity: animated ? fade : 1,
          zIndex: animated ? order : 1,
        } as CSSProperties
      }
    >
      <div
        ref={category}
        className="skills-category-current"
        aria-live={active ? 'polite' : 'off'}
        aria-atomic="true"
        data-skill={skill.name}
      >
        <p className="eyebrow">
          0{index + 1} / 0{skills.length} — What I build
        </p>
        <h3 style={{ '--category-scale': 1 + growth * 0.06 } as CSSProperties}>{skill.name}</h3>
        <p className="skills-technologies">{skill.technologies.join(' · ')}</p>
        {skill.note && <p className="skills-category-note">{skill.note}</p>}
        <button
          type="button"
          className="skills-pill-toggle"
          aria-label={`${reveal > 0 ? 'Hide' : 'Show'} projects for ${skill.name}`}
          aria-expanded={reveal > 0}
          aria-controls={`skills-pill-projects-${index}`}
          onClick={() => onToggle(index, reveal > 0)}
        />
      </div>
      <div
        id={`skills-pill-projects-${index}`}
        className="skills-project-stage"
        aria-label={`Projects in ${skill.name}`}
        data-skill={skill.name}
        data-project={projectIndex}
        aria-hidden={reveal === 0}
        inert={reveal === 0}
      >
        <div className="skills-project-caption">
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
              aria-hidden={reveal === 0 || (animated && position !== projectIndex)}
              inert={reveal === 0 || (animated && position !== projectIndex)}
              style={
                {
                  '--card-offset': `${(position - cardTravel + 1 - reveal) * 112}%`,
                  '--card-rotation': `${-(position - cardTravel + 1 - reveal) * 18}deg`,
                  '--card-depth': `${-Math.abs(position - cardTravel + 1 - reveal) * 140}px`,
                  '--card-opacity': clamp(1 - Math.abs(position - cardTravel + 1 - reveal) * 0.55),
                  '--information-reveal': animated ? clamp((phase - 0.65 - position) / 0.35) : 1,
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
    </motion.div>
  )
}

export function SkillsScene() {
  const [selection, setSelection] = useState({ index: 0, phase: 0, intro: 0 })
  const [pinned, setPinned] = useState(false)
  const [openedProject, setOpenedProject] = useState<Project | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)
  const browser = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null),
    previousOverflow = useRef(''),
    trigger = useRef<HTMLButtonElement | null>(null)
  const reduceMotion = useReducedMotion()
  const animated = pinned && !reduceMotion
  const [radius, setRadius] = useState(280)
  const ringTarget = useMotionValue(0)
  const ringPosition = useSpring(ringTarget, { stiffness: 110, damping: 26, mass: 0.8 })
  useEffect(() => {
    const segment = skillSegments[selection.index]
    const turn = clamp((selection.phase - (segment.duration - 0.28)) / 0.28)
    ringTarget.set(selection.index + turn)
  }, [selection.index, selection.phase, ringTarget])
  useLayoutEffect(() => {
    const container = browser.current
    if (!container || !animated) return
    const measure = () =>
      setRadius(
        (container.clientHeight * 0.48 * Math.sin((72 * Math.PI) / 180)) /
          Math.sin((2 * Math.PI) / skills.length),
      )
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [animated])
  useEffect(() => {
    function update(event: Event) {
      setPinned(true)
      const { progress, intro } = (event as CustomEvent<{ progress: number; intro: number }>).detail
      setSelection({ ...getSkillPosition(progress), intro })
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
  function toggleProjects(index: number, expanded: boolean) {
    if (!animated) {
      setExpandedIndex(expanded ? null : index)
      return
    }
    const offset = expanded ? 0 : 0.95
    const handled = !window.dispatchEvent(
      new CustomEvent('portfolio:select-skill', { detail: { index, offset }, cancelable: true }),
    )
    if (!handled) setSelection({ index, phase: offset, intro: 1 })
  }
  return (
    <div className="skills-scene skills-index scene-content">
      <div className="skills-heading">
        <p className="eyebrow">
          <span>02 —</span> Skills
        </p>
        <h2>
          The tools.
          <br />
          The thinking.
        </h2>
        <p className="skills-intro">
          What I build, the tools I reach for, and the work behind them.
        </p>
      </div>
      <div ref={browser} className="skills-browser" role="list" aria-label="Skill categories">
        {skills.map((skill, index) => (
          <SkillCategoryPill
            key={skill.name}
            index={index}
            active={animated ? selection.index === index : expandedIndex === index}
            phase={animated && selection.index === index ? selection.phase : 0}
            animated={animated}
            reduceMotion={reduceMotion}
            ringPosition={ringPosition}
            radius={radius}
            onToggle={toggleProjects}
            onOpenProject={(project, button) => {
              trigger.current = button
              setOpenedProject(project)
            }}
          />
        ))}
      </div>
      <span className="skills-index-portal" data-portal="work" aria-hidden="true" />
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
            <p className="eyebrow">Skills</p>
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
                View on GitHub <b aria-hidden="true">?</b>
              </a>
            )}
          </div>
        )}
      </dialog>
    </div>
  )
}
