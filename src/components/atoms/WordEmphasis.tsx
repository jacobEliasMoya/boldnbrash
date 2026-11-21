'use client'

import { Fragment } from 'react'
import { motion, useReducedMotion, type MotionStyle } from 'motion/react'

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
}: {
  text: string
  progress: number
  enabled?: boolean
}) {
  const reducedMotion = useReducedMotion()

  if (!enabled) return text

  const tokens = text.split(/(\s+)/)
  const wordCount = tokens.filter((token) => /\S/.test(token)).length
  let wordIndex = 0

  return tokens.map((token, index) => {
    if (!/\S/.test(token)) return <Fragment key={index}>{token}</Fragment>

    // Keep the same markup during hydration; reduced motion only changes the visual state.
    const phase = reducedMotion ? 0 : progress * wordCount - wordIndex++
    const style: MotionStyle & { '--word-emphasis': string } = getWordEmphasis(phase)

    return (
      <motion.span key={index} className="word-emphasis" style={style}>
        {token}
      </motion.span>
    )
  })
}
