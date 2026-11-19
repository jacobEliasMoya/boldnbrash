'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'

export function ProjectCTA({ title, description, onOpen }: {
  title: string
  description: string
  onOpen: (trigger: HTMLButtonElement) => void
}) {
  const reduced = useReducedMotion()
  const hovered = useRef(false)
  const focused = useRef(false)
  const target = useMotionValue(0)
  const pointer = useMotionValue(0.5)
  const fill = useSpring(target, { stiffness: 190, damping: 24, mass: 0.9 })
  const center = useSpring(pointer, { stiffness: 190, damping: 24, mass: 0.9 })
  const trailing = useSpring(pointer, { stiffness: 115, damping: 22, mass: 1.1 })
  const path = useTransform(() => {
    const amount = reduced ? target.get() : fill.get()
    const head = (reduced ? 0.5 : center.get()) * 200
    const tail = (reduced ? 0.5 : trailing.get()) * 200
    const points = Array.from({ length: 41 }, (_, index) => {
      const y = index * 5
      const depth = 70 * amount * (
        0.78 * Math.exp(-(((y - head) / 95) ** 2)) +
        0.22 * Math.exp(-(((y - tail) / 115) ** 2))
      )
      return `${1000 - depth},${y}`
    })
    return `M1000,0 L${points.join(' L')} L1000,200 Z`
  })
  function update() {
    target.set(hovered.current || focused.current ? 1 : 0)
  }

  return (
    <motion.button
      type="button"
      className="skill-project-band"
      aria-haspopup="dialog"
      aria-label={`Read project - ${title}`}
      onClick={(event) => onOpen(event.currentTarget)}
      onHoverStart={() => { hovered.current = true; update() }}
      onHoverEnd={() => { hovered.current = false; update() }}
      onFocus={() => { focused.current = true; pointer.set(0.5); update() }}
      onBlur={() => { focused.current = false; update() }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return
        const bounds = event.currentTarget.getBoundingClientRect()
        pointer.set(Math.max(0.15, Math.min(0.85, (event.clientY - bounds.top) / bounds.height)))
      }}
      whileHover={reduced ? undefined : { '--band-arrow-x': '3px', '--band-arrow-y': '-3px' }}
      whileFocus={reduced ? undefined : { '--band-arrow-x': '3px', '--band-arrow-y': '-3px' }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    >
      <svg className="project-cta-liquid" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <motion.path d={path} />
      </svg>
      <span className="skill-project-band-copy">
        <span className="skill-project-title" role="heading" aria-level={4}>{title}</span>
        <span className="skill-project-information">{description}</span>
      </span>
      <span className="skill-project-band-arrow" aria-hidden="true">{'\u2197'}</span>
    </motion.button>
  )
}
