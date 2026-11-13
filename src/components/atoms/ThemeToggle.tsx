'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useBlendBounds } from './BlendedNav'
import { useIntroReady } from '@/hooks/useIntroReady'

function subscribe(onChange: () => void) {
  window.addEventListener('portfolio:theme', onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener('portfolio:theme', onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme === 'dark',
    () => false,
  )

  const introReady = useIntroReady()
  const { anchor: thumb, bounds } = useBlendBounds<HTMLSpanElement>(introReady, dark, true)

  function toggleTheme() {
    const theme = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('portfolio-theme', theme)
    } catch {
      /* Storage is optional. */
    }
    window.dispatchEvent(new Event('portfolio:theme'))
  }

  return (
    <>
      <button
        className="theme-toggle"
        data-liquid-header
        type="button"
        aria-label="Night mode"
        aria-pressed={dark}
        onClick={toggleTheme}
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
          <span ref={thumb} className="theme-toggle-thumb" style={{ opacity: 0 }} />
        </span>
      </button>
      {introReady &&
        bounds &&
        createPortal(
          <span
            className="theme-toggle-floating-thumb"
            aria-hidden="true"
            style={{
              left: bounds.left,
              top: bounds.top,
              width: bounds.width,
              height: bounds.height,
              background: dark ? '#a28aff' : '#3814ff',
              color: dark ? '#101014' : '#fff',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {dark ? (
                <path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a8.7 8.7 0 1 0 10.6 10.6Z" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
                </>
              )}
            </svg>
          </span>,
          document.body,
        )}
    </>
  )
}
