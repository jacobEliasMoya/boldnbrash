'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useIntroReady } from '@/hooks/useIntroReady'
import {
  useHeaderEntrance,
  getMobileHeaderPop,
  mobileHeaderRest,
  mobileHeaderEntered,
} from '@/hooks/useHeaderEntrance'

function subscribe(onChange: () => void) {
  window.addEventListener('portfolio:theme', onChange)
  window.addEventListener('storage', onChange)

  return () => {
    window.removeEventListener('portfolio:theme', onChange)
    window.removeEventListener('storage', onChange)
  }
}

const toggleSpring = { type: 'spring' as const, stiffness: 340, damping: 26 }

export function ThemeToggle({
  inline = false,
  linkCount,
}: {
  inline?: boolean
  linkCount?: number
}) {
  const headerEntrance = useHeaderEntrance(linkCount)
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  )

  const introReady = useIntroReady()
  const reduceMotion = useReducedMotion()
  const pressScale = useMotionValue(1)
  const busy = useRef(false)

  useEffect(() => () => pressScale.stop(), [pressScale])

  function toggleTheme() {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'

    document.documentElement.dataset.theme = theme

    try {
      localStorage.setItem('portfolio-theme', theme)
    } catch {
      // Storage is optional.
    }

    window.dispatchEvent(new Event('portfolio:theme'))
  }

  async function pressToggle() {
    if (busy.current) return

    if (reduceMotion) {
      toggleTheme()

      return
    }

    // Keep rapid clicks from overlapping the press and release animation.
    busy.current = true
    await animate(pressScale, 0.89, { duration: 0.1, ease: 'easeOut' })
    toggleTheme()
    await animate(pressScale, 1, toggleSpring)
    busy.current = false
  }

  return (
    <motion.button
      className="theme-toggle"
      initial={
        headerEntrance.mobile && !inline ? mobileHeaderRest : { opacity: 0, y: inline ? 0 : -24 }
      }
      animate={
        headerEntrance.mobile && !inline
          ? { ...(introReady ? mobileHeaderEntered : mobileHeaderRest), y: 0 }
          : { opacity: introReady ? 1 : 0, y: inline || introReady ? 0 : -24 }
      }
      transition={{
        ...(headerEntrance.mobile && !inline
          ? getMobileHeaderPop(headerEntrance.themeDelay, reduceMotion)
          : { duration: headerEntrance.duration, ease: [0.22, 1, 0.36, 1] as const }),
        ...(reduceMotion ? { duration: 0 } : {}),
        delay: reduceMotion ? 0 : inline ? 0.12 : headerEntrance.themeDelay,
      }}
      data-liquid-header
      type="button"
      aria-label="Night mode"
      aria-pressed={dark}
      onClick={pressToggle}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <svg
          className="theme-toggle-sun"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
        </svg>
        <svg
          className="theme-toggle-moon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a8.7 8.7 0 1 0 10.6 10.6Z" />
        </svg>
        {/* Keep the thumb in the track's coordinate space during header and menu motion. */}
        <motion.span
          className="theme-toggle-thumb"
          initial={false}
          animate={{ x: dark ? 28 : 0 }}
          style={{ scale: pressScale }}
          transition={reduceMotion ? { duration: 0 } : toggleSpring}
        />
      </span>
    </motion.button>
  )
}
