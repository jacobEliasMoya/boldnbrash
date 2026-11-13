'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, MotionConfig, useReducedMotion, useMotionValue } from 'motion/react'
import { sceneDuration, sceneStops, skillSegments, skillStart, skillTravel } from './skillsTimeline'
import { BlendedLogo } from '@/components/atoms/BlendedLogo'
import { BlendedNav } from '@/components/atoms/BlendedNav'
import { LiquidBoundary } from '@/components/atoms/LiquidBoundary'
import { ThemeToggle } from '@/components/atoms/ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { heroAnimationTravel } from '@/components/atoms/heroFrames'
import { getPortalBounds } from '@/components/atoms/portalBounds'
import { toPlaybackTime, fromPlaybackTime } from './scrollPlayback'
import { useIntroReady } from '@/hooks/useIntroReady'

const scenes = [
  { id: 'top', label: 'Home' },
  { id: 'skills', label: 'Skills' },
  { id: 'work', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]
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
  const introReady = useIntroReady()
  const timeline = useMotionValue(0)
  const track = useRef<HTMLDivElement>(null)
  const panels = useRef<(HTMLElement | null)[]>([])
  const [enhanced, setEnhanced] = useState(false)
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const element = track.current
    if (!element) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let previous = 0
    let x = 0
    let y = 0
    let targetX = 0
    let targetY = 0

    function paint(time: number) {
      const delta = previous ? Math.min(time - previous, 50) : 16
      previous = time
      const ease = 1 - Math.exp(-delta / 240)
      x += (targetX - x) * ease
      y += (targetY - y) * ease
      const settled = Math.abs(targetX - x) + Math.abs(targetY - y) < 0.02
      if (settled) {
        x = targetX
        y = targetY
      }
      element!.style.setProperty('--background-x', `${x.toFixed(3)}px`)
      element!.style.setProperty('--background-y', `${y.toFixed(3)}px`)
      frame = settled ? 0 : requestAnimationFrame(paint)
      if (settled) previous = 0
    }
    function update(nextX: number, nextY: number) {
      targetX = nextX
      targetY = nextY
      if (!frame) frame = requestAnimationFrame(paint)
    }
    function reset() {
      update(0, 0)
    }
    function move(event: PointerEvent) {
      if (media.matches || event.pointerType !== 'mouse' || document.hidden) return
      // A distant layer moves against the pointer, with much less travel than the logo.
      update(
        (0.5 - event.clientX / window.innerWidth) * 28,
        (0.5 - event.clientY / window.innerHeight) * 20,
      )
    }
    function preferenceChanged() {
      if (!media.matches) return
      cancelAnimationFrame(frame)
      frame = previous = x = y = targetX = targetY = 0
      element!.style.removeProperty('--background-x')
      element!.style.removeProperty('--background-y')
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    media.addEventListener('change', preferenceChanged)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', reset)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
      media.removeEventListener('change', preferenceChanged)
      element.style.removeProperty('--background-x')
      element.style.removeProperty('--background-y')
    }
  }, [])

  useEffect(() => {
    const previousScrollRestoration = history.scrollRestoration
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')

    let frame = 0
    let current = 0
    let pendingFocus: number | null = null
    let playbackFrame = 0
    let displayed = 0
    let requested = 0
    let previousPlaybackTime = 0
    let inputDirection = 0

    function advanceInput(pixels: number, target: Element | null) {
      const node = track.current
      if (!node || media.matches || !pixels) return false
      if (target?.closest('dialog, input, textarea, select, [contenteditable="true"]')) return false
      const direction = Math.sign(pixels)
      while (target && target !== node) {
        const element = target as HTMLElement
        const overflow = getComputedStyle(element).overflowY
        if (
          (overflow === 'auto' || overflow === 'scroll') &&
          element.scrollHeight > element.clientHeight + 1
        ) {
          if (
            direction > 0
              ? element.scrollTop + element.clientHeight < element.scrollHeight - 1
              : element.scrollTop > 1
          )
            return false
        }
        target = target.parentElement
      }
      const start = window.scrollY + node.getBoundingClientRect().top
      const distance =
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)
      if (distance <= 0) return false
      const nativeProgress = Math.max(
        0,
        Math.min(sceneDuration, ((window.scrollY - start) / distance) * sceneDuration),
      )
      const currentClock = toPlaybackTime(displayed)
      const base =
        inputDirection && inputDirection !== direction
          ? currentClock
          : toPlaybackTime(nativeProgress)
      inputDirection = direction
      const desired = base + direction * Math.min(Math.abs(pixels), 120) * 0.0015
      const bounded = Math.max(
        0,
        Math.min(
          toPlaybackTime(sceneDuration),
          Math.max(currentClock - 0.9, Math.min(currentClock + 0.9, desired)),
        ),
      )
      window.scrollTo({
        top: start + (distance * fromPlaybackTime(bounded)) / sceneDuration,
        behavior: 'instant',
      })
      update()
      return true
    }

    function normalizeWheel(event: WheelEvent) {
      if (document.documentElement.dataset.introLoading === 'true') {
        event.preventDefault()
        return
      }
      if (event.ctrlKey || event.defaultPrevented) return
      const pixels =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1)
      if (advanceInput(pixels, event.target instanceof Element ? event.target : null))
        event.preventDefault()
    }

    let touch: {
      x: number
      y: number
      lastY: number
      axis: 'vertical' | 'horizontal' | null
      target: Element | null
    } | null = null
    function startTouch(event: TouchEvent) {
      if (event.touches.length !== 1 || media.matches) {
        touch = null
        return
      }
      const point = event.touches[0]
      touch = {
        x: point.clientX,
        y: point.clientY,
        lastY: point.clientY,
        axis: null,
        target: event.target instanceof Element ? event.target : null,
      }
    }
    function moveTouch(event: TouchEvent) {
      if (event.touches.length !== 1 || media.matches) {
        touch = null
        return
      }
      if (document.documentElement.dataset.introLoading === 'true') {
        if (event.cancelable) event.preventDefault()
        return
      }
      if (!touch || event.defaultPrevented || !event.cancelable) return
      // These surfaces own their gestures; pinch zoom and form controls stay native.
      if (
        touch.target?.closest(
          'dialog, input, textarea, select, [contenteditable="true"], .skills-browser',
        )
      )
        return
      const point = event.touches[0]
      if (!touch.axis) {
        const dx = Math.abs(point.clientX - touch.x)
        const dy = Math.abs(point.clientY - touch.y)
        if (Math.max(dx, dy) < 6) return
        touch.axis = dy >= dx ? 'vertical' : 'horizontal'
      }
      const pixels = touch.lastY - point.clientY
      touch.lastY = point.clientY
      if (touch.axis === 'vertical' && advanceInput(pixels, touch.target)) event.preventDefault()
    }
    function endTouch() {
      touch = null
    }

    function render(value: number, immediate = false) {
      requested = Math.max(0, Math.min(sceneDuration, value))
      if (immediate) {
        cancelAnimationFrame(playbackFrame)
        playbackFrame = 0
        displayed = requested
        renderScene(displayed)
        return
      }
      if (!playbackFrame) {
        previousPlaybackTime = performance.now()
        playbackFrame = requestAnimationFrame(advancePlayback)
      }
    }

    function advancePlayback(time: number) {
      playbackFrame = 0
      if (media.matches) return
      const delta = Math.min(50, time - previousPlaybackTime)
      previousPlaybackTime = time
      const currentTime = toPlaybackTime(displayed)
      const targetTime = toPlaybackTime(requested)
      const difference = targetTime - currentTime
      const step = Math.sign(difference) * Math.min(Math.abs(difference), delta / 1000)
      displayed = fromPlaybackTime(currentTime + step)
      renderScene(displayed)
      if (Math.abs(difference) > delta / 1000 + 0.000001) {
        playbackFrame = requestAnimationFrame(advancePlayback)
      } else {
        displayed = requested
        renderScene(displayed)
        settleFocus()
      }
    }
    function update() {
      frame = 0
      const node = track.current
      if (!node || media.matches) return
      const bounds = node.getBoundingClientRect()
      const travel = Math.max(
        1,
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight),
      )
      const progress = Math.max(0, Math.min(sceneDuration, (-bounds.top / travel) * sceneDuration))
      timeline.set(progress)
      render(timeline.get())
    }

    function renderScene(value: number) {
      if (media.matches) return
      const progress = Math.max(0, Math.min(sceneDuration, value))
      if (track.current) {
        track.current.dataset.playbackProgress = String(progress)
        track.current.dataset.playbackTime = String(toPlaybackTime(progress))
      }
      const jakeProgress = Math.max(0, Math.min(1, progress / heroAnimationTravel))
      if (panels.current[0]) panels.current[0].dataset.jakeProgress = String(jakeProgress)
      window.dispatchEvent(
        new CustomEvent('portfolio:hero-progress', { detail: { progress: jakeProgress } }),
      )
      const heroFill = Math.max(
        0,
        Math.min(1, (progress - heroAnimationTravel) / (heroFillTravel - heroAnimationTravel)),
      )
      if (panels.current[0]) panels.current[0].dataset.particleGather = String(heroFill)
      panels.current[0]?.querySelectorAll<HTMLElement>('.hero-letter').forEach((letter) => {
        const index = Number(letter.dataset.fillIndex ?? 0)
        const letterFill = Math.max(0, Math.min(1, heroFill * 18 - index))
        letter.style.setProperty('--letter-fill', `${letterFill * 100}%`)
      })
      const skillProgress = Math.max(0, Math.min(1, (progress - skillStart) / skillTravel))
      window.dispatchEvent(
        new CustomEvent('portfolio:skills-progress', {
          detail: {
            progress: skillProgress,
            intro: Math.max(0, Math.min(1, progress - sceneStops[1])),
          },
        }),
      )
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
          const portalBounds = portal ? getPortalBounds(portal) : undefined
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
        cancelAnimationFrame(playbackFrame)
        playbackFrame = 0
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

    function goTo(index: number, immediate = true) {
      const node = track.current
      if (!node) return
      const start = window.scrollY + node.getBoundingClientRect().top
      const distance =
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)
      // Direct navigation lands on a fully opened scene.
      window.scrollTo({
        top: start + (distance * sceneStops[index]) / sceneDuration,
        behavior: 'instant',
      })
      pendingFocus = index
      if (immediate) {
        timeline.jump(sceneStops[index])
        render(sceneStops[index], true)
      }
      update()
      if (!timeline.isAnimating()) settleFocus()
    }

    function selectSkill(event: Event) {
      const detail = (event as CustomEvent<number | { index: number; offset: number }>).detail
      const index = typeof detail === 'number' ? detail : detail.index
      const offset = typeof detail === 'number' ? 0.95 : detail.offset
      if (!Number.isInteger(index) || index < 0 || index >= skillSegments.length || media.matches)
        return
      if (!Number.isFinite(offset) || offset < 0 || offset > skillSegments[index].duration) return
      const node = track.current
      if (!node) return
      const start = window.scrollY + node.getBoundingClientRect().top
      const distance =
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)
      event.preventDefault()
      const position = skillStart + skillSegments[index].start + Math.max(0.001, offset)
      window.scrollTo({ top: start + (distance * position) / sceneDuration, behavior: 'instant' })
      timeline.jump(position)
      render(position, true)
      update()
    }

    function selectScene(event: Event) {
      const index = (event as CustomEvent<number>).detail
      if (!Number.isInteger(index) || index < 0 || index >= scenes.length || media.matches) return
      event.preventDefault()
      history.pushState(null, '', `#${scenes[index].id}`)
      if (panels.current[index]) panels.current[index]!.scrollTop = 0
      goTo(index, true)
    }

    function restoreHash() {
      const index = window.location.hash
        ? scenes.findIndex((scene) => `#${scene.id}` === window.location.hash)
        : 0
      if (index >= 0 && !media.matches) goTo(index, true)
    }

    const stopRendering = timeline.on('change', render)
    setup()
    const initialScroll = window.scrollY
    const initial = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // A user can start scrolling before the initial two-frame setup completes.
        if (!window.location.hash && window.scrollY !== initialScroll) return
        restoreHash()
      }),
    )
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('wheel', normalizeWheel, { passive: false })
    document.addEventListener('touchstart', startTouch, { passive: true })
    document.addEventListener('touchmove', moveTouch, { passive: false })
    document.addEventListener('touchend', endTouch, { passive: true })
    document.addEventListener('touchcancel', endTouch, { passive: true })
    window.addEventListener('resize', schedule)
    document.addEventListener('click', navigate)
    window.addEventListener('portfolio:select-skill', selectSkill)
    window.addEventListener('portfolio:select-scene', selectScene)
    window.addEventListener('popstate', restoreHash)
    window.addEventListener('hashchange', restoreHash)
    media.addEventListener('change', setup)

    return () => {
      history.scrollRestoration = previousScrollRestoration
      stopRendering()
      timeline.stop()
      cancelAnimationFrame(frame)
      cancelAnimationFrame(playbackFrame)
      cancelAnimationFrame(initial)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('wheel', normalizeWheel)
      document.removeEventListener('touchstart', startTouch)
      document.removeEventListener('touchmove', moveTouch)
      document.removeEventListener('touchend', endTouch)
      document.removeEventListener('touchcancel', endTouch)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('click', navigate)
      window.removeEventListener('portfolio:select-skill', selectSkill)
      window.removeEventListener('portfolio:select-scene', selectScene)
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
      <div
        className="portfolio"
        data-enhanced={enhanced ? '' : undefined}
        data-menu-open={menuOpen ? '' : undefined}
      >
        <LiquidBoundary />
        <a className="skip-link" href="#work">
          Skip to selected work
        </a>
        <motion.header
          className={`site-header tone-${active === 0 || active === 3 ? 'paper' : 'dark'}`}
          initial={reduceMotion ? false : { opacity: 0, y: -24 }}
          animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -24 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <BlendedLogo
            enabled={enhanced}
            ready={introReady}
            tone={active === 0 || active === 3 ? 'paper' : 'dark'}
          >
            <motion.a
              className="wordmark"
              data-liquid-header
              href="#top"
              aria-label="Jacob Moya home"
              initial={reduceMotion ? false : { opacity: 0, y: -14 }}
              animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion ? 0 : 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span aria-hidden="true">JacobMoya</span>
            </motion.a>
          </BlendedLogo>
          <BlendedNav
            enabled={enhanced}
            ready={introReady}
            tone={active === 0 || active === 3 ? 'paper' : 'dark'}
          >
            {scenes.map((scene, index) => (
              <motion.a
                key={scene.id}
                href={`#${scene.id}`}
                data-liquid-header
                aria-current={active === index ? 'location' : undefined}
                aria-label={scene.id === 'top' ? 'Home' : undefined}
                initial={reduceMotion ? false : { opacity: 0, y: -12 }}
                animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.55,
                  delay: reduceMotion ? 0 : 0.12 + index * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
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
          </BlendedNav>
          <BlendedLogo
            enabled={enhanced}
            ready={introReady}
            tone={active === 0 || active === 3 ? 'paper' : 'dark'}
            control
          >
            <ThemeToggle />
          </BlendedLogo>
          <MobileMenu
            scenes={scenes}
            active={active}
            introReady={introReady}
            onOpenChange={setMenuOpen}
            onNavigate={(index) => {
              const handled = !window.dispatchEvent(
                new CustomEvent('portfolio:select-scene', { detail: index, cancelable: true }),
              )
              if (!handled) {
                history.pushState(null, '', `#${scenes[index].id}`)
                panels.current[index]?.scrollIntoView({ behavior: 'instant' })
              }
            }}
          />
        </motion.header>
        <main
          ref={track}
          className="scene-track"
          data-duration={sceneDuration}
          style={enhanced ? { height: `${100 + sceneDuration * 160}dvh` } : undefined}
        >
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
