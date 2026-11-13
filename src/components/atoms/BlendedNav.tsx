'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function useBlendBounds<T extends HTMLElement>(
  enabled: boolean,
  ready: boolean,
  visibleOnly = false,
) {
  const anchor = useRef<T>(null)
  const [bounds, setBounds] = useState<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  useEffect(() => {
    if (!enabled || !anchor.current) return
    const measure = () => {
      if (
        visibleOnly &&
        (!anchor.current!.checkVisibility() || anchor.current!.closest('[inert]'))
      ) {
        setBounds(null)
        return
      }
      const rect = anchor.current!.getBoundingClientRect()
      setBounds({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    }
    const observer = new ResizeObserver(followLayout)
    observer.observe(anchor.current)
    // The header finishes its entrance after its dimensions have settled.
    let frame = 0
    let started = performance.now()
    const followEntrance = () => {
      measure()
      if (performance.now() - started < 1200) frame = requestAnimationFrame(followEntrance)
    }
    frame = requestAnimationFrame(followEntrance)
    function followLayout() {
      started = performance.now()
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(followEntrance)
    }
    window.addEventListener('resize', followLayout)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', followLayout)
    }
  }, [enabled, ready, visibleOnly])
  return { anchor, bounds }
}

export function BlendedNav({
  children,
  enabled,
  ready,
  tone = 'paper',
}: {
  children: ReactNode
  enabled: boolean
  ready: boolean
  tone?: 'paper' | 'dark'
}) {
  const { anchor, bounds } = useBlendBounds<HTMLElement>(enabled, ready)
  return (
    <>
      <nav
        ref={anchor}
        className="desktop-navigation"
        aria-label="Portfolio"
        aria-hidden={enabled || undefined}
        inert={enabled || undefined}
        style={enabled ? { visibility: 'hidden' } : undefined}
      >
        {children}
      </nav>
      {enabled &&
        bounds &&
        createPortal(
          <nav
            className="desktop-navigation liquid-blended-nav"
            data-tone={tone}
            inert={!ready}
            aria-label="Portfolio"
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
            }}
          >
            {children}
          </nav>,
          document.body,
        )}
    </>
  )
}
