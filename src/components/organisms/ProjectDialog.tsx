'use client'

import { useEffect, useRef } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
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

export function ProjectDialog({ project, onClose }: {
  project: ProjectDetails | null
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const reduced = useReducedMotion()
  const closing = useRef(false)
  const stopAnimation = useRef<(() => void) | null>(null)

  useEffect(() => {
    const element = dialog.current
    if (!project || !element) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    closing.current = false
    element.showModal()
    const control = animate(element, {
      opacity: [0, 1],
      y: reduced ? [0, 0] : [24, 0],
      scale: reduced ? [1, 1] : [0.98, 1],
      '--project-backdrop-opacity': [0, 1],
    }, { duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] })
    stopAnimation.current = () => control.stop()
    return () => {
      stopAnimation.current?.()
      document.documentElement.style.overflow = previousOverflow
    }
  }, [project, reduced])

  async function close() {
    const element = dialog.current
    if (!element || closing.current) return
    closing.current = true
    stopAnimation.current?.()
    const control = animate(element, {
      opacity: 0,
      y: reduced ? 0 : 12,
      scale: reduced ? 1 : 0.99,
      '--project-backdrop-opacity': 0,
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
            whileHover={reduced ? undefined : { rotate: 90, scale: 1.06 }}
            whileTap={reduced ? undefined : { scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 24 }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
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
                  View on GitHub <span aria-hidden="true">{'\u2197'}</span>
                </motion.a>
              ) : <span className="project-detail-credit">Jacob Moya</span>}
              <button type="button" className="project-detail-back" onClick={() => void close()}>
                Back to projects
              </button>
            </footer>
          </div>
        </div>
      )}
    </dialog>
  )
}
