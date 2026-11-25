'use client'

import { DotIcon } from '@/components/atoms/dot-icons/DotIcon'
import { playDotClick } from './dot-icons/dotMotion'
import { useEffect, useRef } from 'react'
import { openLiquidCurve } from './liquidContour'
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'

export function ProjectCTA({
  title,
  description,
  onOpen,
}: {
  title: string
  description: string
  onOpen: (trigger: HTMLButtonElement) => void
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const size = useMotionValue({ width: 1000, height: 200 })
  const viewBox = useTransform(size, ({ width, height }) => `0 0 ${width} ${height}`)
  const reduced = useReducedMotion()

  useEffect(() => {
    const button = buttonRef.current

    if (!button) return

    // Measure the real ribbon so the liquid retains its shape at every aspect ratio.
    const measure = () =>
      size.set({ width: Math.max(1, button.clientWidth), height: Math.max(1, button.clientHeight) })
    const observer = new ResizeObserver(measure)
    observer.observe(button)
    measure()

    return () => observer.disconnect()
  }, [size])

  const arrowControls = useAnimationControls()
  const opening = useRef(false)
  const hovered = useRef(false)
  const focused = useRef(false)
  const target = useMotionValue(0)
  const pointer = useMotionValue(0.5)
  const fill = useSpring(target, { stiffness: 190, damping: 24, mass: 0.9 })
  const center = useSpring(pointer, { stiffness: 190, damping: 24, mass: 0.9 })
  const trailing = useSpring(pointer, { stiffness: 115, damping: 22, mass: 1.1 })
  const path = useTransform(() => {
    const amount = reduced ? target.get() : fill.get()
    const { width, height } = size.get()
    const head = (reduced ? 0.5 : center.get()) * height
    const tail = (reduced ? 0.5 : trailing.get()) * height
    const reach = Math.min(width * 0.16, height * 0.58)
    const points = Array.from({ length: 41 }, (_, index) => {
      const y = (index * height) / 40
      const depth =
        reach *
        amount *
        (0.78 * Math.exp(-(((y - head) / (height * 0.475)) ** 2)) +
          0.22 * Math.exp(-(((y - tail) / (height * 0.575)) ** 2)))

      return { x: width - depth, y }
    })

    return `M${width} 0 ${openLiquidCurve(points, 'L')} L${width} ${height} Z`
  })

  function update() {
    target.set(hovered.current || focused.current ? 1 : 0)
  }

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      className="skill-project-band"
      aria-haspopup="dialog"
      aria-label={`Read project - ${title} ${description}`}
      onClick={async (event) => {
        if (opening.current) return

        opening.current = true

        const button = event.currentTarget

        if (!reduced) await playDotClick(arrowControls)

        onOpen(button)
      }}
      onHoverStart={() => {
        hovered.current = true
        update()
      }}
      onHoverEnd={() => {
        hovered.current = false
        update()
      }}
      onFocus={() => {
        opening.current = false
        arrowControls.set('idle')
        focused.current = true
        pointer.set(0.5)
        update()
      }}
      onBlur={() => {
        focused.current = false
        update()
      }}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse') return

        const bounds = event.currentTarget.getBoundingClientRect()

        pointer.set(Math.max(0.15, Math.min(0.85, (event.clientY - bounds.top) / bounds.height)))
      }}
      whileHover={reduced ? undefined : { '--band-arrow-x': '3px', '--band-arrow-y': '-3px' }}
      whileFocus={reduced ? undefined : { '--band-arrow-x': '3px', '--band-arrow-y': '-3px' }}
      transition={{ type: 'spring', stiffness: 340, damping: 22 }}
    >
      <motion.svg
        className="project-cta-liquid"
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <motion.path d={path} />
      </motion.svg>
      <span className="skill-project-band-copy">
        <span className="skill-project-title">{title}</span>{' '}
        <span className="skill-project-information">{description}</span>
      </span>
      <span className="skill-project-band-arrow" aria-hidden="true">
        <DotIcon controls={arrowControls} />
      </span>
    </motion.button>
  )
}
