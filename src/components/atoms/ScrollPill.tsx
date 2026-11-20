'use client'

import { useState } from 'react'
import { motion, useMotionValueEvent, useTransform, type MotionValue } from 'motion/react'

export function ScrollPill({ progress, recess, section }: {
  progress: MotionValue<number>
  recess: MotionValue<number>
  section: string
}) {
  const [value, setValue] = useState(() => progress.get() * 100)
  const [hidden, setHidden] = useState(() => recess.get() > 0.8)
  const top = useTransform(progress, (position) => `${position * 100}%`)
  const x = useTransform(recess, (position) => 26 * position)
  useMotionValueEvent(progress, 'change', (position) => setValue(position * 100))
  useMotionValueEvent(recess, 'change', (position) => setHidden(position > 0.8))

  function seek(percent: number) {
    window.dispatchEvent(new CustomEvent('portfolio:seek-scroll', { detail: percent / 100 }))
  }

  return (
    <motion.div className="site-scrollbar" style={{ x }} inert={hidden}>
      <div className="site-scrollbar-travel" aria-hidden="true">
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
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
          event.preventDefault()
          seek(value + (event.key === 'ArrowDown' ? 2 : -2))
        }}
      />
    </motion.div>
  )
}
