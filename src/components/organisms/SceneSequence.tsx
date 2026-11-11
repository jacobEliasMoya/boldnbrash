'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, MotionConfig, useReducedMotion, useSpring } from 'motion/react'

const scenes = [
  { id: 'top', label: 'Home' },
  { id: 'skills', label: 'Skills' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]
const sceneStops = [0, 1.4, 4, 5, 6]
const skillStart = 1.4
const skillTravel = 1.6
const heroFillTravel = 1
const heroRevealTravel = sceneStops[1] - heroFillTravel

const origins = [
  [50, 50],
  [85, 80],
  [19, 84],
  [82, 72],
]

export function SceneSequence({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const timeline = useSpring(0, { stiffness: 160, damping: 30, mass: 0.5 })
  const track = useRef<HTMLDivElement>(null)
  const panels = useRef<(HTMLElement | null)[]>([])
  const [enhanced, setEnhanced] = useState(false)
  const [active, setActive] = useState(0)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  useEffect(() => {
    const previousScrollRestoration = history.scrollRestoration
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0
    let current = 0
    let pendingFocus: number | null = null
    function update() {
      frame = 0
      const node = track.current
      if (!node || media.matches) return
      const bounds = node.getBoundingClientRect()
      const travel = Math.max(
        1,
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight),
      )
      const progress = Math.max(0, Math.min(6, (-bounds.top / travel) * 6))
      timeline.set(progress)
      render(timeline.get())
    }

    function render(value: number) {
      if (media.matches) return
      const progress = Math.max(0, Math.min(6, value))
      const heroFill = Math.max(0, Math.min(1, progress / heroFillTravel))
      panels.current[0]?.querySelectorAll<HTMLElement>('.hero-letter').forEach((letter) => {
        const index = Number(letter.dataset.fillIndex ?? 0)
        const letterFill = Math.max(0, Math.min(1, heroFill * 18 - index))
        letter.style.setProperty('--letter-fill', `${letterFill * 100}%`)
      })
      const skillProgress = Math.max(0, Math.min(1, (progress - skillStart) / skillTravel))
      const entrance = Math.max(0, Math.min(1, (progress - heroFillTravel) / heroRevealTravel))
      const skillsPanel = panels.current[1]
      skillsPanel?.style.setProperty(
        '--wheel-angle',
        `${(1 - entrance) * 65 - skillProgress * 288}deg`,
      )
      skillsPanel?.style.setProperty('--wheel-entry', `${(1 - entrance) * 30}vw`)
      window.dispatchEvent(new CustomEvent('portfolio:skills-progress', { detail: skillProgress }))
      let visible = 0
      panels.current.forEach((panel, index) => {
        if (!panel) return
        const reveal =
          index === 0
            ? 1
            : index === 1
              ? Math.max(0, Math.min(1, (progress - heroFillTravel) / heroRevealTravel))
              : Math.max(0, Math.min(1, progress - sceneStops[index] + 1))
        if (index > 0) {
          const portal = panels.current[index - 1]?.querySelector(
            `[data-portal="${scenes[index].id}"]`,
          )
          const portalBounds = portal?.getBoundingClientRect()
          const panelBounds = panel.getBoundingClientRect()
          const [fallbackX, fallbackY] = origins[index - 1]
          const x = portalBounds
            ? portalBounds.left + portalBounds.width / 2 - panelBounds.left
            : (panelBounds.width * fallbackX) / 100
          const y = portalBounds
            ? portalBounds.top + portalBounds.height / 2 - panelBounds.top
            : (panelBounds.height * fallbackY) / 100
          // Measure the farthest corner so the opening always covers wide and tall screens.
          const radius = Math.hypot(
            Math.max(x, panelBounds.width - x),
            Math.max(y, panelBounds.height - y),
          )
          const startingRadius = index === 1 && portalBounds ? portalBounds.width / 2 : 0
          const openingRadius = startingRadius + reveal * (radius - startingRadius)
          panel.style.clipPath =
            reveal === 1 ? 'none' : `circle(${openingRadius}px at ${x}px ${y}px)`
        }
        panel.style.visibility = index === 0 || reveal > 0 ? 'visible' : 'hidden'
        if (reveal > 0.7) visible = index
      })
      if (visible !== current) {
        current = visible
        setActive(visible)
      }
      panels.current.forEach((panel, index) => {
        if (!panel) return
        const hidden = index !== visible
        // Keep clipped controls out of the tab order and accessibility tree.
        if (hidden && panel.contains(document.activeElement)) {
          const focusedElement = document.activeElement as HTMLElement
          focusedElement.blur()
        }
        panel.inert = hidden
        panel.setAttribute('aria-hidden', String(hidden))
      })
    }

    function settleFocus() {
      if (pendingFocus !== null) {
        panels.current[pendingFocus]?.focus({ preventScroll: true })
        pendingFocus = null
      }
    }

    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(update)
    }

    function setup() {
      const enabled = !media.matches
      history.scrollRestoration = enabled ? 'manual' : previousScrollRestoration
      setEnhanced(enabled)
      if (!enabled) {
        timeline.stop()
        panels.current.forEach((panel) => {
          if (!panel) return
          panel.style.clipPath = ''
          panel.style.visibility = ''
          panel.inert = false
          panel.removeAttribute('aria-hidden')
        })
      }
      schedule()
    }

    function navigate(event: MouseEvent) {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!anchor || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      const index = scenes.findIndex((scene) => `#${scene.id}` === anchor.getAttribute('href'))
      if (index < 0 || !track.current || media.matches) return
      event.preventDefault()
      history.pushState(null, '', `#${scenes[index].id}`)
      goTo(index)
    }

    function goTo(index: number, immediate = false) {
      const node = track.current
      if (!node) return
      const start = window.scrollY + node.getBoundingClientRect().top
      const distance =
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)
      // Direct navigation lands on a fully opened scene.
      window.scrollTo({
        top: start + (distance * sceneStops[index]) / 6,
        behavior: 'instant',
      })
      pendingFocus = index
      if (immediate) {
        timeline.jump(sceneStops[index])
        render(sceneStops[index])
      }
      update()
      if (!timeline.isAnimating()) settleFocus()
    }

    function selectSkill(event: Event) {
      const index = (event as CustomEvent<number>).detail
      if (!Number.isInteger(index) || index < 0 || index > 4 || media.matches) return
      const node = track.current
      if (!node) return
      const start = window.scrollY + node.getBoundingClientRect().top
      const distance =
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)
      event.preventDefault()
      const position = skillStart + (index / 4) * skillTravel
      window.scrollTo({
        top: start + (distance * position) / 6,
        behavior: 'instant',
      })
      update()
    }

    function restoreHash() {
      const index = window.location.hash
        ? scenes.findIndex((scene) => `#${scene.id}` === window.location.hash)
        : 0
      if (index >= 0 && !media.matches) goTo(index, true)
    }

    const stopRendering = timeline.on('change', render)
    const stopFocus = timeline.on('animationComplete', settleFocus)
    setup()
    const initial = requestAnimationFrame(() => requestAnimationFrame(restoreHash))
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('click', navigate)
    window.addEventListener('portfolio:select-skill', selectSkill)
    window.addEventListener('popstate', restoreHash)
    window.addEventListener('hashchange', restoreHash)
    media.addEventListener('change', setup)

    return () => {
      history.scrollRestoration = previousScrollRestoration
      stopRendering()
      stopFocus()
      timeline.stop()
      cancelAnimationFrame(frame)
      cancelAnimationFrame(initial)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('click', navigate)
      window.removeEventListener('portfolio:select-skill', selectSkill)
      window.removeEventListener('popstate', restoreHash)
      window.removeEventListener('hashchange', restoreHash)
      media.removeEventListener('change', setup)
    }
  }, [timeline])

  // Switching from document flow to a sticky stage changes the track geometry.
  useEffect(() => {
    if (enhanced) window.dispatchEvent(new Event('scroll'))
  }, [enhanced])

  return (
    <MotionConfig reducedMotion="user">
      <div className="portfolio" data-enhanced={enhanced ? '' : undefined}>
        <a className="skip-link" href="#work">
          Skip to selected work
        </a>
        <motion.header
          className={`site-header tone-${active === 3 ? 'paper' : 'dark'}`}
          initial={reduceMotion ? false : { opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <a className="wordmark" href="#top" aria-label="Jacob Moya home">
            <span className="header-monogram" aria-hidden="true" />
          </a>
          <nav aria-label="Portfolio" onMouseLeave={() => setHoveredNav(null)}>
            {scenes.map((scene, index) => (
              <motion.a
                key={scene.id}
                href={`#${scene.id}`}
                aria-current={active === index ? 'location' : undefined}
                aria-label={scene.id === 'top' ? 'Home' : undefined}
                onHoverStart={() => setHoveredNav(scene.id)}
                onFocus={() => setHoveredNav(scene.id)}
                onBlur={() => setHoveredNav(null)}
                initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.55,
                  delay: reduceMotion ? 0 : 0.12 + index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {(hoveredNav ?? scenes[active].id) === scene.id && (
                  <motion.span
                    className="nav-highlight"
                    layoutId="nav-highlight"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 420, damping: 34 }
                    }
                    aria-hidden="true"
                  />
                )}
                <span className="nav-label">
                  {scene.id === 'top' ? (
                    <svg className="nav-home-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3.5 10.7 12 3.8l8.5 6.9v9.1h-6v-5.6h-5v5.6h-6Z" />
                    </svg>
                  ) : (
                    scene.label
                  )}
                </span>
              </motion.a>
            ))}
          </nav>
        </motion.header>
        <main ref={track} className="scene-track">
          <div className="scene-stage">
            {Children.map(children, (child, index) => (
              <section
                id={scenes[index].id}
                ref={(node) => {
                  panels.current[index] = node
                }}
                className={`scene scene-${scenes[index].id}`}
                tabIndex={-1}
                aria-label={scenes[index].label}
              >
                {child}
              </section>
            ))}
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
