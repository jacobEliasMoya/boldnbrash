'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export function HeroEcho({
  children,
  className,
  offset,
}: {
  children: ReactNode
  className: string
  offset: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.span
      className={`${className} motion-reduce:transform-none!`}
      initial={reduceMotion ? false : { y: offset }}
      animate={{ y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.span>
  )
}
