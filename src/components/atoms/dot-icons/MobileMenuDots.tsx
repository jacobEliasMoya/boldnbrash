'use client'

import { motion, useTransform, type MotionValue } from 'motion/react'

export function MenuTriangleDots({ gather }: { gather: MotionValue<number> }) {
  const top = useTransform(gather, (progress) => -7 * (1 - progress))
  const bottom = useTransform(gather, (progress) => 3.5 * (1 - progress))
  const left = useTransform(gather, (progress) => -6 * (1 - progress))
  const right = useTransform(gather, (progress) => 6 * (1 - progress))
  const scale = useMergedDotScale(gather)

  return (
    <>
      <motion.i style={{ x: 0, y: top, scale }} />
      <motion.i style={{ x: left, y: bottom, scale }} />
      <motion.i style={{ x: right, y: bottom, scale }} />
    </>
  )
}

export function MenuCloseDots({ gather }: { gather: MotionValue<number> }) {
  const positive = useTransform(gather, (progress) => 6 * (1 - progress))
  const negative = useTransform(gather, (progress) => -6 * (1 - progress))
  const scale = useMergedDotScale(gather)

  return (
    <>
      <motion.i style={{ x: negative, y: negative, scale }} />
      <motion.i style={{ x: positive, y: negative, scale }} />
      <motion.i style={{ x: 0, y: 0, scale }} />
      <motion.i style={{ x: negative, y: positive, scale }} />
      <motion.i style={{ x: positive, y: positive, scale }} />
    </>
  )
}

function useMergedDotScale(gather: MotionValue<number>) {
  return useTransform(gather, (progress) => Math.sqrt(1 + 2 * Math.max(0, Math.min(1, progress))))
}
