'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { PlatformArtwork, SystemArtwork } from '@/components/atoms/ProjectArtwork'
import { clamp, getSkillFrame, projectStops, skills } from './skillsTimeline'

type Project = (typeof skills)[number]['projects'][number]
type OpenProject = (project: Project, trigger: HTMLButtonElement) => void

function SkillCategoryPill({
  index,
  active,
  animated,
  ringPosition,
  radius,
  onSelect,
}: {
  index: number
  active: boolean
  animated: boolean
  ringPosition: MotionValue<number>
  radius: number
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
  const rotation = useTransform(distance, (value) => clamp(-value * 38, -81, 81))
  const vertical = useTransform(distance, (value) => Math.sin((value * Math.PI) / 4) * radius)
  const depth = useTransform(distance, (value) => (Math.cos((value * Math.PI) / 4) - 1) * radius)

  const fade = useTransform(distance, (value) => clamp(1 - Math.abs(value) * 0.42))
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
        opacity: animated ? fade : 1,
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
  const visible = !animated || (localPosition > -1 && localPosition < skill.projects.length)
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
            data-visible={!animated || Math.abs(position - localPosition) < 1 ? 'true' : undefined}
            aria-hidden={animated && (!active || position !== projectIndex)}
            inert={animated && (!active || position !== projectIndex)}
            style={
              {
                '--card-depth':
                  (position >= localPosition
                    ? (position - localPosition) * 520
                    : (position - localPosition) * 320) + 'px',
                '--card-opacity':
                  position >= localPosition
                    ? 1 - (1 - clamp((0.8 - (position - localPosition)) / 0.8)) ** 3
                    : clamp(1 - (localPosition - position) / 0.7) ** 2,
                '--card-blur': Math.max(0, localPosition - position) * 5 + 'px',
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
  const ringPosition = useMotionValue(0)
  useLayoutEffect(() => {
    const element = wheel.current
    if (!element || !animated) return
    const measure = () => setRadius(Math.max(150, element.clientHeight * 0.52))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [animated])
  const introFade = animated ? clamp((selection.intro - 0.5) / 0.5) : 0
  const entrance = animated ? clamp((selection.intro - 0.7) / 0.3) : 1
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
      className="skills-scene skills-index skills-duet scene-content"
      data-playing={animated ? '' : undefined}
      style={{ '--skills-intro-fade': introFade, '--skills-entrance': entrance } as CSSProperties}
    >
      <div className="skills-heading" aria-hidden={animated && introFade === 1}>
        <p className="eyebrow">
          <span>02 &mdash;</span> Skills
        </p>
        <h2 aria-label="What I use. What I build.">
          {['What I use.', 'What I build.'].map((line, lineIndex) => (
            <span className="skills-title-line" aria-hidden="true" key={line}>
              {Array.from(line).map((letter, letterIndex) => {
                const index = (lineIndex === 0 ? 0 : 11) + letterIndex
                const fill = animated ? clamp((selection.intro / 0.44) * 26 - index) : 1
                const fall = animated
                  ? clamp((selection.intro - 0.58 - (index / 24) * 0.14) / 0.26)
                  : 0
                return (
                  <span
                    className="skills-title-letter"
                    key={letterIndex}
                    style={
                      {
                        '--letter-fill': fill * 100 + '%',
                        transform:
                          'translate3d(' +
                          ((index % 3) - 1) * 3 * fall +
                          'px, ' +
                          (80 + (index % 3) * 8) * fall * fall +
                          'px, ' +
                          -80 * fall +
                          'px) rotate(' +
                          (index % 2 ? -1 : 1) * (3 + (index % 3)) * fall +
                          'deg)',
                      } as CSSProperties
                    }
                  >
                    {letter === ' ' ? '\u00a0' : letter}
                  </span>
                )
              })}
            </span>
          ))}
        </h2>
        <p className="skills-intro">Check out how I use my tech!</p>
      </div>
      {animated ? (
        <div className="skills-performance" inert={entrance < 0.5} aria-hidden={entrance < 0.5}>
          <div ref={wheel} className="skills-browser" role="list" aria-label="Skill categories">
            {skills.map((skill, index) => (
              <SkillCategoryPill
                key={skill.name}
                index={index}
                active={selection.index === index}
                animated
                ringPosition={ringPosition}
                radius={radius}
                onSelect={selectSkill}
              />
            ))}
          </div>
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
        </div>
      ) : (
        <div className="skills-fallback">
          {skills.map((skill, index) => (
            <section className="skills-pair" key={skill.name} aria-label={skill.name}>
              <SkillCategoryPill
                index={index}
                active
                animated={false}
                radius={radius}
                ringPosition={ringPosition}
                onSelect={selectSkill}
              />
              <SkillProjects
                index={index}
                active
                projectPosition={0}
                animated={false}
                onOpenProject={openProject}
              />
            </section>
          ))}
        </div>
      )}
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
                View on GitHub <b aria-hidden="true">&nearr;</b>
              </a>
            )}
          </div>
        )}
      </dialog>
    </div>
  )
}
