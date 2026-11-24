'use client'

import { Fragment } from 'react'
import { easeOut, motion, useReducedMotion, type MotionStyle } from 'motion/react'

const wordEntrySteps = 3

export function getWordEmphasis(phase: number) {
  const lift = phase > 0 && phase < 1 ? Math.sin(Math.PI * phase) : 0

  return {
    y: -3 * lift,
    scale: 1 + 0.1 * lift,
    rotate: 5 * lift * Math.sin(2 * Math.PI * phase),
    '--word-emphasis': `${lift * 100}%`,
  }
}

export function WordEmphasis({
  text,
  progress,
  enabled = true,
  scrollReveal = false,
}: {
  text: string
  progress: number
  enabled?: boolean
  scrollReveal?: boolean
}) {
  const reducedMotion = useReducedMotion()

  if (!enabled) return text

  const tokens = text.split(/(\s+)/)
  const wordCount = tokens.filter((token) => /\S/.test(token)).length
  const revealSteps = scrollReveal && !reducedMotion ? wordEntrySteps : 0
  const firstWord = tokens[0] ? 0 : 1

  return tokens.map((token, index) => {
    if (!/\S/.test(token)) return <Fragment key={index}>{token}</Fragment>

    // The split keeps whitespace between words, including any leading space.
    const wordIndex = index / 2 - firstWord
    const phase = reducedMotion ? 0 : progress * (wordCount + revealSteps) - wordIndex

    const style: MotionStyle & { '--word-emphasis': string } = getWordEmphasis(phase - revealSteps)

    // The next word starts after a third of the drop. The color pulse follows each landing.
    if (revealSteps && phase < revealSteps) {
      const entry = Math.max(0, phase)
      style.opacity = Math.min(1, entry * 2)
      style.y = -12 * (1 - easeOut(entry / revealSteps))
    }

    return (
      <motion.span key={index} className="word-emphasis" style={style}>
        {token}
      </motion.span>
    )
  })
}
