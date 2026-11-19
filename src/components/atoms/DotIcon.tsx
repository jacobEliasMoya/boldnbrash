'use client'

import { useEffect, useRef } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'

export function DotIcon({ kind = 'arrow', controls }: {
  kind?: 'arrow' | 'up' | 'close'
  controls?: ReturnType<typeof useAnimationControls>
}) {
  const localControls = useAnimationControls()
  const reduced = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const animation = controls ?? localControls
  useEffect(() => {
    if (controls || reduced) return
    const parent = svg.current?.closest('a, button')
    if (!parent) return
    let busy = false
    async function pulse() {
      if (busy) return
      busy = true
      await localControls.start('gather')
      await localControls.start('idle')
      busy = false
    }
    const click = () => { void pulse() }
    parent.addEventListener('click', click)
    return () => {
      parent.removeEventListener('click', click)
      localControls.stop()
    }
  }, [controls, reduced, localControls])
  const dots = kind === 'close'
    ? [[6, 6], [18, 6], [12, 12], [6, 18], [18, 18]]
    : kind === 'up'
      ? [[12, 4], [6, 10], [18, 10], [12, 10], [12, 15], [12, 20]]
      : [[6, 6], [12, 6], [18, 6], [18, 12], [18, 18], [12, 12], [6, 18]]
  return (
    <motion.svg ref={svg} className="dot-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"
      initial="idle" animate={animation} variants={{
        idle: { scale: 1, transition: { duration: reduced ? 0 : 0.16 } },
        gather: {
          scale: reduced ? 1 : [1, 0.86, 1.08, 1],
          transition: { duration: reduced ? 0 : 0.28, times: [0, 0.45, 0.75, 1], ease: 'easeInOut' },
        },
      }}>
      {dots.map(([cx, cy]) => (
        <motion.circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.3"
          variants={{ idle: { cx, cy, r: 2.3 }, gather: { cx: 12, cy: 12, r: 3.8 } }}
          transition={{ duration: reduced ? 0 : 0.18, ease: [0.4, 0, 0.2, 1] }} />
      ))}
    </motion.svg>
  )
}
