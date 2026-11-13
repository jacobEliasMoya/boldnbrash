'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useBlendBounds } from './BlendedNav'

export function BlendedLogo({
  children,
  enabled,
  ready,
  control = false,
  menu = false,
}: {
  children: ReactNode
  enabled: boolean
  ready: boolean
  control?: boolean
  menu?: boolean
}) {
  const { anchor, bounds } = useBlendBounds<HTMLSpanElement>(enabled, ready)
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
          <div
            className={control ? 'liquid-blended-control' : 'liquid-blended-logo'}
            inert={!ready}
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  )
}
