'use client'

import { useRef, type ReactNode } from 'react'

export function SceneProject({
  title,
  category,
  number,
  artwork,
  children,
}: {
  title: string
  category: string
  number: string
  artwork: ReactNode
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const previousOverflow = useRef('')
  function open() {
    previousOverflow.current = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.current?.showModal()
  }
  function close() {
    dialog.current?.close()
  }
  return (
    <>
      <article className="scene-project">
        <div className="card-scoop" aria-hidden="true" />
        <p className="eyebrow">{number} —</p>
        <h3>{title}</h3>
        <p className="project-category">{category}</p>
        <div className="artwork-frame">{artwork}</div>
        <button className="project-open" onClick={open} aria-haspopup="dialog">
          View project <span className="sr-only">— {title}</span>
          <b aria-hidden="true">↗</b>
        </button>
      </article>
      <dialog
        ref={dialog}
        className="project-dialog"
        aria-label={title}
        onClose={() => {
          document.documentElement.style.overflow = previousOverflow.current
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
      >
        <div className="dialog-sheet">
          <button className="dialog-close" onClick={close} autoFocus>
            Close <span aria-hidden="true">×</span>
          </button>
          <p className="eyebrow">{number} / Selected work</p>
          <h2>{title}</h2>
          <p className="project-category">{category}</p>
          <div className="dialog-artwork">{artwork}</div>
          <div className="project-story">{children}</div>
        </div>
      </dialog>
    </>
  )
}
