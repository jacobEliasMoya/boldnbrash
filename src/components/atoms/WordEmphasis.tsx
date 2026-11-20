'use client'

import { Fragment, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function WordEmphasis({ text, progress, enabled = true }: {
  text: string
  progress: number
  enabled?: boolean
}) {
  const reducedMotion = useReducedMotion()
  if (!enabled || reducedMotion) return text

  const tokens = text.split(/(\s+)/)
  const wordCount = tokens.filter((token) => /\S/.test(token)).length
  let wordIndex = 0
  return tokens.map((token, index) => {
    if (!/\S/.test(token)) return <Fragment key={index}>{token}</Fragment>
    const phase = progress * wordCount - wordIndex++
    const lift = phase > 0 && phase < 1 ? Math.sin(Math.PI * phase) : 0
    return (
      <motion.span
        key={index}
        className="word-emphasis"
        style={{
          y: -3 * lift,
          scale: 1 + 0.1 * lift,
          rotate: 5 * lift * Math.sin(2 * Math.PI * phase),
          '--word-emphasis': `${lift * 100}%`,
        } as CSSProperties}
      >
        {token}
      </motion.span>
    )
  })
}
