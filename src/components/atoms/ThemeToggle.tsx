'use client'

import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export function ThemeToggle({ initialTheme }: { initialTheme: 'dark' | 'light' }) {
  const [theme, setTheme] = useState(initialTheme)

  const selector = useRef<HTMLSpanElement>(null)

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    document.cookie = `portfolio-theme=${nextTheme}; Max-Age=31536000; Path=/; SameSite=Lax`

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function applyTheme() {
      document.documentElement.dataset.theme = nextTheme

      setTheme(nextTheme)

      if (!reduceMotion && selector.current) {
        const target = nextTheme === 'dark' ? '100%' : '0%'
        const start = nextTheme === 'dark' ? '0%' : '100%'
        selector.current.getAnimations().forEach((animation) => animation.cancel())
        selector.current.animate(
          [
            { translate: start, scale: '1' },
            { translate: '50%', scale: '1.65 1', offset: 0.52 },
            { translate: target, scale: '1' },
          ],
          { duration: 440, easing: 'ease-in-out' },
        )
      }
    }

    if (document.startViewTransition && !reduceMotion) {
      document.startViewTransition(() => flushSync(applyTheme))
    } else {
      applyTheme()
    }
  }

  return (
    <button
      type="button"
      aria-label="Night mode"
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
      className="group relative isolate inline-flex h-8 w-20 shrink-0 cursor-pointer items-center rounded-full border border-rule bg-surface p-1 hover:border-accent"
    >
      <span
        ref={selector}
        aria-hidden="true"
        className="absolute inset-y-1 left-1 -z-10 w-[calc(50%-0.25rem)] rounded-full bg-lime group-aria-pressed:translate-x-full"
      />
      <span aria-hidden="true" className="grid flex-1 place-items-center text-on-lime group-aria-pressed:text-muted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="size-3.5">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
        </svg>
      </span>
      <span aria-hidden="true" className="grid flex-1 place-items-center text-muted group-aria-pressed:text-on-lime">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" className="size-3.5">
          <path d="M20.5 14.1A8.7 8.7 0 0 1 9.9 3.5a8.7 8.7 0 1 0 10.6 10.6Z" />
        </svg>
      </span>
    </button>
  )
}
