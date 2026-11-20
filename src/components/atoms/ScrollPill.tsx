'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'

export function ScrollPill({ progress, recess, section }: {
  progress: MotionValue<number>
  recess: MotionValue<number>
  section: string
}) {
  const [value, setValue] = useState(() => progress.get() * 100)
  const [hidden, setHidden] = useState(() => recess.get() > 0.8)
  const travel = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; offset: number } | null>(null)
  const frame = useRef(0)
  const top = useTransform(progress, (position) => `${position * 100}%`)
  const x = useTransform(recess, (position) => 26 * position)
  useMotionValueEvent(progress, 'change', (position) => setValue(position * 100))
  useMotionValueEvent(recess, 'change', (position) => setHidden(position > 0.8))

  function seek(percent: number) {
    window.dispatchEvent(new CustomEvent('portfolio:seek-scroll', { detail: percent / 100 }))
  }

  function seekAt(y: number) {
    const bounds = travel.current?.getBoundingClientRect()
    if (bounds?.height) seek(100 * (y - bounds.top) / bounds.height)
  }

  function startDrag(event: PointerEvent<HTMLInputElement>) {
    if (!event.isPrimary || event.button !== 0 || !travel.current) return
    event.preventDefault()
    const bounds = travel.current.getBoundingClientRect()
    const center = bounds.top + progress.get() * bounds.height
    const offset = event.clientY - center
    const halfThumbHeight = bounds.top - event.currentTarget.getBoundingClientRect().top
    drag.current = { id: event.pointerId, offset: Math.abs(offset) <= halfThumbHeight ? offset : 0 }
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    seekAt(event.clientY - drag.current.offset)
  }

  function moveDrag(event: PointerEvent<HTMLInputElement>) {
    if (drag.current?.id !== event.pointerId) return
    const y = event.clientY - drag.current.offset
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => seekAt(y))
  }

  function endDrag(event: PointerEvent<HTMLInputElement>) {
    if (drag.current?.id !== event.pointerId) return
    cancelAnimationFrame(frame.current)
    if (event.type === 'pointerup') seekAt(event.clientY - drag.current.offset)
    drag.current = null
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  return (
    <motion.div className="site-scrollbar" style={{ x }} inert={hidden}>
      <div ref={travel} className="site-scrollbar-travel" aria-hidden="true">
        <motion.span className="site-scrollbar-thumb" style={{ top }} />
      </div>
      <input
        type="range"
        className="site-scrollbar-input"
        aria-label={`${section} scroll position`}
        aria-orientation="vertical"
        aria-valuetext={`${Math.round(value)}% of ${section}`}
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(event) => seek(event.currentTarget.valueAsNumber)}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          seek(value + (event.key === 'ArrowDown' ? 2 : -2))
        }}
      />
    </motion.div>
  )
}
