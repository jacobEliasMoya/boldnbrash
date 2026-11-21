'use client'

import { useEffect, useRef } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import { dotGatherDuration, dotReboundScale, dotReboundTransition, playDotClick } from './dotMotion'

const dotPatterns = {
  arrow: [
    [6, 6],
    [12, 6],
    [18, 6],
    [18, 12],
    [18, 18],
    [12, 12],
    [6, 18],
  ],
  up: [
    [12, 4],
    [6, 10],
    [18, 10],
    [12, 10],
    [12, 15],
    [12, 20],
  ],
  close: [
    [6, 6],
    [18, 6],
    [12, 12],
    [6, 18],
    [18, 18],
  ],
  play: [
    [6, 5],
    [6, 12],
    [6, 19],
    [12, 8.5],
    [18, 12],
    [12, 15.5],
  ],
  pause: [
    [8, 6.8],
    [8, 12],
    [8, 17.2],
    [16, 6.8],
    [16, 12],
    [16, 17.2],
  ],
} as const

export function DotIcon({
  kind = 'arrow',
  controls,
  animateOnChange = false,
}: {
  kind?: keyof typeof dotPatterns
  controls?: ReturnType<typeof useAnimationControls>
  animateOnChange?: boolean
}) {
  const localControls = useAnimationControls()
  const reduced = useReducedMotion()
  const svg = useRef<SVGSVGElement>(null)
  const previousKind = useRef(kind)
  const animation = controls ?? localControls

  useEffect(() => {
    if (controls || reduced || animateOnChange) return

    const parent = svg.current?.closest('a, button')

    if (!parent) return

    let busy = false

    async function pulse() {
      if (busy) return

      busy = true
      await playDotClick(localControls)
      await localControls.start('idle')
      busy = false
    }

    const click = () => {
      void pulse()
    }

    parent.addEventListener('click', click)

    return () => {
      parent.removeEventListener('click', click)
      localControls.stop()
    }
  }, [controls, reduced, localControls, animateOnChange])

  useEffect(() => {
    const changed = previousKind.current !== kind

    previousKind.current = kind

    if (!changed || !animateOnChange || controls || reduced) return

    let cancelled = false

    void (async () => {
      await playDotClick(localControls)

      if (!cancelled) await localControls.start('idle')
    })()

    return () => {
      cancelled = true
      localControls.stop()
    }
  }, [kind, animateOnChange, controls, reduced, localControls])

  return (
    <motion.svg
      ref={svg}
      className="dot-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      initial="idle"
      animate={animation}
      variants={{
        idle: { scale: 1, transition: { duration: reduced ? 0 : 0.16 } },
        gather: {
          scale: reduced ? 1 : 0.86,
          transition: { duration: reduced ? 0 : dotGatherDuration },
        },
        rebound: {
          scale: reduced ? 1 : dotReboundScale,
          transition: reduced ? { duration: 0 } : dotReboundTransition,
        },
      }}
    >
      {dotPatterns[kind].map(([cx, cy], index) => (
        <motion.circle
          key={index}
          cx={cx}
          cy={cy}
          r="2.3"
          variants={{
            idle: { cx, cy, r: 2.3 },
            gather: { cx: 12, cy: 12, r: 3.8 },
            rebound: { cx: 12, cy: 12, r: 3.8 },
          }}
          transition={{ duration: reduced ? 0 : dotGatherDuration, ease: [0.4, 0, 0.2, 1] }}
        />
      ))}
    </motion.svg>
  )
}
