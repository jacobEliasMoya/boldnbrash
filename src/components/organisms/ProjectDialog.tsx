'use client'

import { DotIcon } from '@/components/atoms/DotIcon'
import { useEffect, useRef } from 'react'
import { animate, motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { ProjectCover } from '@/components/atoms/ProjectCover'

type ProjectDetails = {
  title: string
  description: string
  category: string
  artwork: string
  details: readonly string[]
  sourceUrl?: string
  status?: string
}

export function ProjectDialog({ project, origin, onClose }: {
  project: ProjectDetails | null
  origin: { x: number; y: number } | null
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const reduced = useReducedMotion()
  const closeIconControls = useAnimationControls()
  const closing = useRef(false)
  const stopAnimation = useRef<(() => void) | null>(null)

  useEffect(() => {
    const element = dialog.current
    if (!project || !element) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    closing.current = false
    closeIconControls.set('idle')
    element.showModal()
    const x = origin?.x ?? innerWidth / 2
    const y = origin?.y ?? innerHeight / 2
    const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2
    const control = animate(element, {
      opacity: 1,
      clipPath: [`circle(${reduced ? reach : 4}px at ${x}px ${y}px)`, `circle(${reach}px at ${x}px ${y}px)`],
    }, { duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] })
    void control.then(() => { if (element.open) element.style.clipPath = 'none' })
    stopAnimation.current = () => control.stop()
    return () => {
      stopAnimation.current?.()
      document.documentElement.style.overflow = previousOverflow
    }
  }, [project, origin, reduced, closeIconControls])

  async function close() {
    const element = dialog.current
    if (!element || closing.current) return
    closing.current = true
    stopAnimation.current?.()
    if (!reduced) await closeIconControls.start('gather')
    const control = animate(element, {
      opacity: 0,
    }, { duration: reduced ? 0 : 0.18, ease: [0.4, 0, 1, 1] })
    stopAnimation.current = () => control.stop()
    await control
    if (element.open) element.close()
  }

  return (
    <dialog
      ref={dialog}
      className="project-dialog project-detail-modal"
      aria-labelledby="project-detail-title"
      onClose={onClose}
      onCancel={(event) => { event.preventDefault(); void close() }}
      onClick={(event) => { if (event.target === event.currentTarget) void close() }}
    >
      {project && (
        <div className="project-detail-window">
        <div className="project-detail-layout">
          <div className="project-detail-cover project-cover" data-artwork={project.artwork} aria-hidden="true">
            <ProjectCover artwork={project.artwork} title={project.title} />
            <span className="project-detail-cover-label">{project.category}</span>
          </div>
          <motion.button
            className="project-detail-close"
            aria-label="Close project"
            type="button"
            autoFocus
            onClick={() => void close()}
            whileHover={reduced ? undefined : { scale: 1.06 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
          >
            <DotIcon kind="close" controls={closeIconControls} />
          </motion.button>
          <div className="project-detail-content">
            <div className="project-detail-meta">
              <span>{project.category}</span>
              {project.status && <span className="project-detail-status">{project.status}</span>}
            </div>
            <h2 id="project-detail-title">{project.title}</h2>
            <p className="project-detail-summary">{project.description}</p>
            <div className="project-detail-story">
              {project.details.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <footer className="project-detail-footer">
              {project.sourceUrl ? (
                <motion.a
                  href={project.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={reduced ? undefined : { y: -2 }}
                  transition={{ type: 'spring', stiffness: 340, damping: 24 }}
                  className="project-detail-source"
                >
                  View on GitHub <span aria-hidden="true"><DotIcon /></span>
                </motion.a>
              ) : <span className="project-detail-credit">Jacob Moya</span>}
              <button type="button" className="project-detail-back" onClick={() => void close()}>
                Back to projects
              </button>
            </footer>
          </div>
        </div>
        </div>
      )}
    </dialog>
  )
}
