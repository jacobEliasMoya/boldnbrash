'use client'

import { useEffect, useRef } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { createLiquidFrame, liquidContour } from './liquidContour'

export const loaderProgressDuration = 0.6

export function LoaderProgress({
  progress,
  presence,
}: {
  progress: number
  presence: MotionValue<number>
}) {
  const root = useRef<HTMLDivElement>(null)
  const size = useMotionValue({
    width: 0,
    height: 0,
    inset: 12,
    pillWidth: 46,
    pillHeight: 14,
    liquidDepth: 23,
    liquidRadius: 46,
  })
  const paintedProgress = useMotionValue(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    const control = animate(paintedProgress, progress / 100, {
      duration: reduced ? 0 : loaderProgressDuration,
      ease: [0.65, 0, 0.35, 1],
    })

    return () => control.stop()
  }, [progress, paintedProgress, reduced])

  useEffect(() => {
    const element = root.current

    if (!element) return

    const measure = () => {
      const bounds = element.getBoundingClientRect()
      const styles = getComputedStyle(document.documentElement)
      const inset = parseFloat(styles.getPropertyValue('--frame-inset')) || 12
      const pillWidth = parseFloat(styles.getPropertyValue('--scroll-pill-height')) || 46
      const pillHeight = parseFloat(styles.getPropertyValue('--scroll-pill-width')) || 14

      const liquidDepth = parseFloat(styles.getPropertyValue('--scroll-liquid-depth')) || 23
      const liquidRadius = parseFloat(styles.getPropertyValue('--scroll-liquid-radius')) || 46

      size.set({
        width: bounds.width,
        height: bounds.height,
        inset,
        pillWidth,
        pillHeight,
        liquidDepth,
        liquidRadius,
      })
    }
    const observer = new ResizeObserver(measure)

    observer.observe(element)
    measure()

    return () => observer.disconnect()
  }, [size])

  const frameGeometry = useTransform(size, (value) =>
    createLiquidFrame(
      Math.max(1, value.width - value.inset * 2),
      Math.max(1, value.height - value.inset * 2),
      value.inset,
    ),
  )
  const left = useTransform(size, (value) => value.inset + 25 + (value.width <= 760 ? 18 : 32) + 12)
  const width = useTransform(() => {
    const dimensions = size.get()
    const maxWidth = Math.max(dimensions.pillWidth, dimensions.width - left.get() * 2)

    return (
      dimensions.pillWidth +
      Math.max(0, Math.min(1, paintedProgress.get())) * (maxWidth - dimensions.pillWidth)
    )
  })
  const frame = useTransform(() => {
    const dimensions = size.get()
    const boundary = frameGeometry.get()
    const maxWidth = Math.max(dimensions.pillWidth, dimensions.width - left.get() * 2)
    // Share the pill's animation clock so its liquid cannot lag behind its growth.
    const progress = paintedProgress.get()
    const emerged = Math.max(0, presence.get())
    const liquidWidth =
      dimensions.pillWidth + Math.max(0, Math.min(1, progress)) * (maxWidth - dimensions.pillWidth)
    const center = left.get() - dimensions.inset + liquidWidth / 2
    const bottomStart = boundary.segments.slice(0, 4).reduce((total, length) => total + length, 0)
    const position = bottomStart + boundary.width - boundary.corner - center

    // Render the actual scroller liquid, stretched along the growing pill's footprint.
    return liquidContour(
      boundary,
      position,
      dimensions.liquidDepth * emerged,
      dimensions.liquidRadius,
      2.5,
      Math.max(0, (liquidWidth - dimensions.pillWidth) / 2),
    )
  })
  const visibility = useTransform(size, (value) => (value.width ? 'visible' : 'hidden'))
  const frameInset = useTransform(size, (value) => value.inset)
  const height = useTransform(size, (value) => value.pillHeight)
  const y = useTransform(presence, (value) => 26 * (1 - value))

  return (
    <div
      ref={root}
      className="portfolio-loader-progress"
      role="progressbar"
      aria-label="Loading portfolio assets"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
    >
      <motion.svg width="100%" height="100%" aria-hidden="true" style={{ visibility }}>
        <motion.path
          className="loader-progress-frame"
          d={frame}
          style={{ x: frameInset, y: frameInset }}
          fillRule="evenodd"
        />
      </motion.svg>
      <motion.div
        className="loader-progress-pill"
        style={{ x: left, y, width, height, visibility }}
        aria-hidden="true"
      />
    </div>
  )
}
