'use client'

import { motion, type MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBlendBounds } from './BlendedNav'

export function BlendedLogo({
  children,
  enabled,
  ready,
  tone = 'paper',
  control = false,
  menu = false,
  headerY,
}: {
  children: ReactNode
  enabled: boolean
  ready: boolean
  tone?: 'paper' | 'dark'
  control?: boolean
  menu?: boolean
  headerY?: MotionValue<number>
}) {
  const { anchor, bounds } = useBlendBounds<HTMLSpanElement>(enabled, ready, false, headerY)

  return (
    <>
      <span
        ref={anchor}
        className={menu ? 'header-menu-anchor' : control ? 'header-control-anchor' : 'logo-anchor'}
        aria-hidden={enabled || undefined}
        inert={enabled || undefined}
        style={enabled ? { visibility: 'hidden' } : undefined}
      >
        {children}
      </span>
      {enabled &&
        bounds &&
        createPortal(
          <motion.div
            className={control ? 'liquid-blended-control' : 'liquid-blended-logo'}
            data-tone={tone}
            inert={!ready}
            style={{
              y: headerY,
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
            }}
          >
            {children}
          </motion.div>,
          document.getElementById('portfolio-header') ?? document.body,
        )}
    </>
  )
}
