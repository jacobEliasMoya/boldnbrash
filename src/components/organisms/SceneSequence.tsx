'use client'

import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  animate,
  motionValue,
  stagger,
  motion,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
  useSpring,
} from 'motion/react'
import {
  sceneDuration,
  heroFillEnd,
  heroParagraphEnd,
  heroWalkOutStart,
  heroWalkOutEnd,
  sceneStops,
  aboutIntroEnd,
  experienceStart,
  experienceEnd,
  sectionScrollRanges,
  getScrollSection,
  skillSegments,
  skillStart,
  skillParagraphEnd,
  skillTravel,
  projectStops,
} from './skillsTimeline'
import { BlendedLogo } from '@/components/atoms/BlendedLogo'
import { BlendedNav } from '@/components/atoms/BlendedNav'
import { LiquidBoundary } from '@/components/atoms/LiquidBoundary'
import { DotIcon } from '@/components/atoms/dot-icons/DotIcon'
import { ScrollPill } from '@/components/atoms/ScrollPill'
import { ThemeToggle } from '@/components/atoms/ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { heroAnimationTravel, heroExitStart } from '@/components/atoms/heroFrames'
import { getPortalBounds } from '@/components/atoms/portalBounds'
import {
  circleRevealTransition,
  getIntroPeriodGeometry,
  getPeriodOpening,
  introPeriodRevealDuration,
} from '@/components/atoms/periodOpening'
import {
  toPlaybackTime,
  fromPlaybackTime,
  toShowcaseTime,
  fromShowcaseTime,
} from './scrollPlayback'
import { ExperienceMotion } from './ExperienceMotion'
import type { ExperienceDock } from './experienceTimeline'
import { useIntroReady } from '@/hooks/useIntroReady'
import { useClientReady } from '@/hooks/useClientReady'
import {
  useHeaderEntrance,
  getMobileHeaderPop,
  mobileHeaderRest,
  mobileHeaderEntered,
} from '@/hooks/useHeaderEntrance'

const scenes = [
  { id: 'top', label: 'Home' },
  { id: 'skills', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'contact', label: 'Contact' },
]
// Matching path commands let Motion gather both glyphs into the same point.
const showcasePlayPath = 'M8 5.5 L18 12 L8 18.5 L8 5.5 M8 12 L8 12 L8 12 L8 12'
const showcasePausePath = 'M9 6 L9 10 L9 14 L9 18 M15 6 L15 10 L15 14 L15 18'
const showcaseCenterPath = 'M12 12 L12 12 L12 12 L12 12 M12 12 L12 12 L12 12 L12 12'
const showcasePlayOvershoot = 'M7.5 4.7 L18.7 12 L7.5 19.3 L7.5 4.7 M7.5 12 L7.5 12 L7.5 12 L7.5 12'
const showcasePauseOvershoot =
  'M8.6 5.3 L8.6 9.8 L8.6 14.2 L8.6 18.7 M15.4 5.3 L15.4 9.8 L15.4 14.2 L15.4 18.7'
const heroRevealTravel = sceneStops[1] - heroWalkOutEnd
const wordmarkDropStart = -100

const origins = [
  [50, 50],
  [65, 30],
  [82, 72],
]

export function SceneSequence({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  const introReady = useIntroReady()
  const clientReady = useClientReady()
  const headerEntrance = useHeaderEntrance(scenes.length)
  const headerEntranceY = useMotionValue(-24)
  const wordmarkEntranceY = useMotionValue(wordmarkDropStart)
  const timeline = useMotionValue(0)
  const experienceProgress = useMotionValue(0)
  const experienceDock = useMotionValue<ExperienceDock | null>(null)
  const scrollProgress = useMotionValue(0)
  const scrollRecess = useSpring(1, { stiffness: 340, damping: 34, mass: 0.85 })
  const [scrollSection, setScrollSection] = useState(0)
  const scrollRange = sectionScrollRanges[scrollSection]
  const track = useRef<HTMLDivElement>(null)
  const panels = useRef<(HTMLElement | null)[]>([])
  const sceneOpenings = useRef<(SVGCircleElement | null)[]>([])
  const [enhanced, setEnhanced] = useState(false)
  const [active, setActive] = useState(0)
  const activeScene = scenes[active].id
  const experienceActive = activeScene === 'about' && scrollRange.label === 'Experience'
  const headerTone = activeScene === 'contact' ? 'dark' : 'paper'
  const [menuOpen, setMenuOpen] = useState(false)
  const toggleShowcase = useRef<(() => void) | null>(null)
  const resumeShowcaseAfterAboutDrop = useRef<(() => void) | null>(null)
  const [showcasePlaying, setShowcasePlaying] = useState(false)

  useEffect(() => {
    if (
      !enhanced ||
      !introReady ||
      reduceMotion ||
      (activeScene !== 'skills' && activeScene !== 'about')
    )
      return

    const panel = panels.current[active]

    if (!panel) return

    const letters = Array.from(panel.querySelectorAll<HTMLElement>('[data-intro-drop="letter"]'))
    const words = Array.from(panel.querySelectorAll<HTMLElement>('[data-intro-drop="word"]'))
    const tokens = [...letters, ...words]
    const secondLine = letters.filter((letter) => letter.closest('.skills-title-line:nth-child(2)'))
    const firstLine = letters.slice(0, letters.length - secondLine.length)
    const letterGap = 0.036
    const spring = { type: 'spring', duration: 0.45, bounce: 0.1 } as const
    const appear = { type: 'tween' as const, duration: spring.duration, times: [0, 0.001, 1] }

    // Prepare every token before making the heading visible to the scene reveal.
    for (const token of tokens) token.style.opacity = '0'

    // Compress the loader's stagger for the longer headings, then hand off to the words.
    const entrance = animate([
      [
        firstLine,
        { y: ['-0.85em', '0em'], opacity: [0, 1, 1] },
        { ...spring, delay: stagger(letterGap), opacity: appear },
      ],
      [
        secondLine,
        { y: ['-0.18em', '0em'], opacity: [0, 1, 1] },
        {
          ...spring,
          at: firstLine.length * letterGap,
          delay: stagger(letterGap),
          opacity: appear,
        },
      ],
      [
        words,
        { y: ['-0.8em', '0em'], opacity: [0, 1, 1] },
        {
          ...spring,
          at: (letters.length - 1) * letterGap + 0.24,
          delay: stagger(0.042),
          opacity: appear,
        },
      ],
    ])
    panel.dataset.introDropStarted = ''

    let disposed = false

    void entrance.then(() => {
      if (disposed) return

      panel.dataset.introDropComplete = ''
      if (activeScene === 'about') resumeShowcaseAfterAboutDrop.current?.()

      window.dispatchEvent(new Event('scroll'))
    })

    return () => {
      disposed = true
      panel.removeAttribute('data-intro-drop-started')
      panel.removeAttribute('data-intro-drop-complete')
      entrance.stop()

      for (const token of tokens) {
        token.style.removeProperty('opacity')
        token.style.removeProperty('transform')
      }
    }
  }, [active, activeScene, enhanced, introReady, reduceMotion])

  // Layout and floating copies share one entrance clock, so they cannot reset the liquid.
  useEffect(() => {
    if (!clientReady) return

    if (headerEntrance.mobile || reduceMotion) {
      headerEntranceY.jump(0)
      wordmarkEntranceY.jump(0)

      return
    }

    const headerControl = animate(headerEntranceY, introReady ? 0 : -24, {
      duration: introReady ? 0.7 : 0,
      ease: [0.22, 1, 0.36, 1],
    })
    const control = animate(wordmarkEntranceY, introReady ? 0 : wordmarkDropStart, {
      duration: introReady ? 0.7 : 0,
      delay: introReady ? headerEntrance.logoDelay : 0,
      ease: [0.32, 0, 0.24, 1],
    })

    return () => {
      headerControl.stop()
      control.stop()
    }
  }, [
    clientReady,
    introReady,
    headerEntrance.mobile,
    headerEntrance.logoDelay,
    reduceMotion,
    wordmarkEntranceY,
    headerEntranceY,
  ])

  useEffect(() => {
    const root = document.documentElement

    // Track the input method so focus indicators follow keyboard navigation.
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Tab' || event.key.startsWith('Arrow')) root.dataset.keyboardNavigation = ''
    }

    function pointer() {
      delete root.dataset.keyboardNavigation
    }

    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    document.addEventListener('touchstart', pointer, { passive: true, capture: true })
    document.addEventListener('wheel', pointer, { passive: true, capture: true })

    return () => {
      document.removeEventListener('keydown', keyboard, true)
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('touchstart', pointer, true)
      document.removeEventListener('wheel', pointer, true)
      delete root.dataset.keyboardNavigation
    }
  }, [])

  useEffect(() => {
    const element = track.current

    if (!element) return

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const x = motionValue(0)
    const y = motionValue(0)
    let stopX: (() => void) | undefined
    let stopY: (() => void) | undefined
    const unsubscribeX = x.on('change', (value) =>
      element.style.setProperty('--background-x', `${value}px`),
    )
    const unsubscribeY = y.on('change', (value) =>
      element.style.setProperty('--background-y', `${value}px`),
    )

    function update(nextX: number, nextY: number) {
      stopX?.()
      stopY?.()

      if (media.matches) {
        x.jump(0)
        y.jump(0)

        return
      }

      const spring = { type: 'spring' as const, stiffness: 75, damping: 22 }
      const horizontal = animate(x, nextX, spring)
      const vertical = animate(y, nextY, spring)

      stopX = () => horizontal.stop()
      stopY = () => vertical.stop()
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

      stopX?.()
      stopY?.()
      x.jump(0)
      y.jump(0)
      element!.style.removeProperty('--background-x')
      element!.style.removeProperty('--background-y')
    }

    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', reset)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    media.addEventListener('change', preferenceChanged)

    return () => {
      stopX?.()
      stopY?.()
      unsubscribeX()
      unsubscribeY()
      x.destroy()
      y.destroy()
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
    let stopPlayback: (() => void) | undefined
    let displayed = 0
    let requested = 0
    let inputDirection = 0
    let pillSection = 0
    let pillRecessTarget = 1
    let hasScrolled = false
    let gesturePlayback = false
    let gestureTargetClock = 0
    const playbackClock = motionValue(0)
    let snapTimer = 0
    let stopSnap: (() => void) | undefined
    let snapping = false
    let snapExpectedY = 0

    const transitionRanges = [
      { start: heroWalkOutEnd, end: sceneStops[1] },
      { start: skillParagraphEnd, end: skillStart },
      ...sceneStops.slice(2).map((end) => ({ start: end - 1, end })),
      { start: aboutIntroEnd, end: experienceStart },
    ].sort((first, second) => first.start - second.start)
    let sceneTransition: {
      range: (typeof transitionRanges)[number]
      direction: number
      stop?: () => void
    } | null = null
    let transitionLatch: { direction: number; lastInput: number } | null = null
    let transitionIntent = { direction: 0, pixels: 0, time: 0 }
    let transitionExpectedY = 0
    let lastSkillProgress = -1
    let lastSkillIntro = -1
    let lastSkillTextIntro = -1
    let lastAboutIntro = -1
    let lastJakeProgress = -1
    let lastHeroParagraph = -1
    let lastHeroFill = -1
    let stopShowcasePlayback: (() => void) | undefined
    let showcaseExpectedY = 0

    function cancelSceneTransition() {
      sceneTransition?.stop?.()
      sceneTransition = null
      transitionLatch = null
      track.current?.removeAttribute('data-transitioning')
    }

    // Finish each scene reveal as one animation before accepting another transition.
    function triggerSceneTransition(
      pixels: number,
      proposed: number,
      start: number,
      distance: number,
      touchInput: boolean,
    ) {
      const direction = Math.sign(pixels)
      const now = performance.now()

      const ranges = direction > 0 ? transitionRanges : [...transitionRanges].reverse()
      const range =
        sceneTransition?.range ??
        ranges.find((range) =>
          direction > 0
            ? proposed > range.start && displayed < range.end - 0.001
            : proposed < range.end && displayed > range.start + 0.001,
        )

      if (!range) return false

      // Gesture locks prevent skipping another reveal, not scrolling within a scene.
      if (touchInput && touch?.transitionDirection === direction && !sceneTransition) return true

      if (!sceneTransition && transitionLatch) {
        const gap = now - transitionLatch.lastInput
        const freshWheelTick = Math.abs(pixels) >= 100 && gap >= 60

        if (transitionLatch.direction === direction && gap < 500 && !freshWheelTick) {
          transitionLatch.lastInput = now

          return true
        }

        transitionLatch = null
      }

      if (sceneTransition?.direction === direction) {
        transitionLatch = { direction, lastInput: now }

        return true
      }

      if (!sceneTransition) {
        if (transitionIntent.direction !== direction || now - transitionIntent.time > 180)
          transitionIntent = { direction, pixels: 0, time: now }

        transitionIntent.pixels += Math.abs(pixels)
        transitionIntent.time = now

        if (transitionIntent.pixels < 12) return false
      }

      cancelSnap()
      sceneTransition?.stop?.()
      stopPlayback?.()
      stopPlayback = undefined

      const target = direction > 0 ? range.end : range.start
      const transition = { range, direction, stop: undefined as (() => void) | undefined }

      sceneTransition = transition
      // The initiating click may already have queued a scroll event at this position.
      transitionExpectedY = scrollY

      if (touchInput && touch) touch.transitionDirection = direction

      transitionLatch = { direction, lastInput: now }
      track.current?.setAttribute('data-transitioning', direction > 0 ? 'forward' : 'backward')

      const duration =
        range.end === skillStart || range.end === experienceStart
          ? introPeriodRevealDuration
          : circleRevealTransition.duration
      const control = animate(displayed, target, {
        duration: Math.max(
          0.24,
          (duration * Math.abs(target - displayed)) / (range.end - range.start),
        ),
        ease: circleRevealTransition.ease,
        onUpdate: (value) => {
          displayed = requested = value
          gestureTargetClock = toPlaybackTime(value)
          playbackClock.jump(gestureTargetClock)
          window.scrollTo({ top: start + (distance * value) / sceneDuration, behavior: 'instant' })
          transitionExpectedY = scrollY
          timeline.jump(value)
          renderScene(value)
        },
        onComplete: () => {
          if (sceneTransition !== transition) return

          sceneTransition = null
          track.current?.removeAttribute('data-transitioning')
          displayed = requested = target
          renderScene(target)
          settleFocus()
        },
      })

      transition.stop = () => control.stop()

      return true
    }

    function cancelSnap() {
      window.clearTimeout(snapTimer)
      stopSnap?.()
      stopSnap = undefined
      snapping = false
      track.current?.removeAttribute('data-snapping')
    }

    // After input settles, align the work timeline with the nearest complete project.
    function armSnap() {
      window.clearTimeout(snapTimer)

      if (snapping || sceneTransition || media.matches) return

      snapTimer = window.setTimeout(() => {
        const node = track.current

        if (
          !node ||
          touch ||
          document.hidden ||
          document.querySelector('dialog[open]') ||
          node.closest('[data-menu-open]')
        )
          return

        // The reveal's final scroll position can round up by a fraction of a pixel.
        // Leave the first card at the reveal boundary until the visitor scrolls again.
        if (requested <= skillStart + 0.01 || displayed > skillStart + skillTravel) return

        const nearest = projectStops.reduce((best, stop) =>
          Math.abs(skillStart + stop.position - requested) <
          Math.abs(skillStart + best.position - requested)
            ? stop
            : best,
        )
        const target = skillStart + nearest.position

        // Every pause lands on a complete project, including between skill categories.
        if (Math.abs(target - displayed) < 0.003) return

        const start = scrollY
        const trackTop = scrollY + node.getBoundingClientRect().top
        const distance = node.offsetHeight - (node.firstElementChild?.clientHeight ?? innerHeight)
        const destination = trackTop + (distance * target) / sceneDuration
        const duration = 480 + Math.min(1, Math.abs(target - displayed)) * 260

        snapping = true
        node.dataset.snapping = 'true'

        const control = animate(start, destination, {
          duration: duration / 1000,
          ease: [0.65, 0, 0.35, 1],
          onUpdate: (top) => {
            window.scrollTo({ top, behavior: 'instant' })
            snapExpectedY = window.scrollY
            update()
          },
          onComplete: () => {
            snapping = false
            stopSnap = undefined
            node.removeAttribute('data-snapping')
          },
        })

        stopSnap = () => control.stop()
      }, 420)
    }

    // Route wheel and touch input through the same scene and project boundaries.
    function introTextReady(index: number) {
      return media.matches || panels.current[index]?.hasAttribute('data-intro-drop-complete')
    }

    function advanceInput(pixels: number, target: Element | null, touchInput = false) {
      const node = track.current

      if (!node || media.matches || !pixels) return false

      if (target?.closest('dialog, input, textarea, select, [contenteditable="true"]')) return false

      const direction = Math.sign(pixels)
      const introEnd = current === 1 ? skillParagraphEnd : current === 2 ? aboutIntroEnd : null

      // Consume forward input during the drop instead of queuing a fill jump behind it.
      if (
        direction > 0 &&
        introEnd !== null &&
        displayed >= sceneStops[current] - 0.005 &&
        displayed <= introEnd &&
        !introTextReady(current)
      )
        return true

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

      gesturePlayback = touchInput
      const readingIntro =
        introEnd !== null && requested >= sceneStops[current] && requested <= introEnd + 0.01

      // Mobile's clipped skills surface can consume native scroll chaining.
      // Forward the same travel to the document after nested scroll areas have
      // had a chance to handle it; keep the skills timeline free of a queue.
      if (current === 1 || readingIntro) {
        let travel = touchInput ? pixels * 1.25 : pixels

        if (!sceneTransition && readingIntro) {
          const readingSpeed = current === 2 ? 0.65 : 1
          travel *= readingSpeed

          // Cap how far a wheel burst can lead the painted intro. Preserve small
          // deltas and leave enough room for the words to pass at a readable pace.
          if (!touchInput) {
            const lead = Math.max(0, 0.12 * readingSpeed - direction * (requested - displayed))

            travel =
              direction *
              Math.min(Math.abs(travel), 56 * readingSpeed, (lead * distance) / sceneDuration)
          }

          if (direction > 0 && displayed < introEnd - 0.02) {
            const endY = start + (introEnd * distance) / sceneDuration

            travel = Math.min(travel, Math.max(0, endY - scrollY))
          }

          if (!travel) return true
        }

        if (
          current === 1 &&
          touchInput &&
          touch &&
          displayed >= skillStart &&
          displayed <= skillStart + skillTravel
        ) {
          if (touch.projectSwipe?.direction !== direction) {
            const position = requested - skillStart
            const next =
              direction > 0
                ? projectStops.findIndex((stop) => stop.position > position + 0.01)
                : projectStops.reduce(
                    (last, stop, index) => (stop.position < position - 0.01 ? index : last),
                    -1,
                  )
            const destination = projectStops[next]

            if (destination) {
              const interval = Math.max(
                1,
                Math.min(projectStops.length - 1, direction > 0 ? next : next + 1),
              )
              const gap = projectStops[interval].position - projectStops[interval - 1].position
              const swipeTravel = Math.max(120, Math.min(160, innerHeight * 0.2))

              touch.projectSwipe = {
                direction,
                gain: (gap * distance) / sceneDuration / swipeTravel,
                limit: start + ((skillStart + destination.position) * distance) / sceneDuration,
              }
            } else {
              touch.projectSwipe = null
            }
          }

          if (touch.projectSwipe) {
            const remaining = Math.max(0, direction * (touch.projectSwipe.limit - scrollY))

            travel = direction * Math.min(Math.abs(pixels) * touch.projectSwipe.gain, remaining)

            if (!travel) return true
          }
        }

        const proposed = ((window.scrollY + travel - start) / distance) * sceneDuration

        if (triggerSceneTransition(pixels, proposed, start, distance, touchInput)) return true

        window.scrollTo({ top: window.scrollY + travel, behavior: 'instant' })
        update()

        if (touchInput) gestureTargetClock = toPlaybackTime(requested)

        return true
      }

      const nativeProgress = Math.max(
        0,
        Math.min(sceneDuration, ((window.scrollY - start) / distance) * sceneDuration),
      )
      const currentClock = toPlaybackTime(displayed)

      if (inputDirection && inputDirection !== direction) {
        // Reverse immediately rather than inheriting forward spring momentum.
        playbackClock.jump(currentClock)
      }

      const base =
        inputDirection && inputDirection !== direction
          ? currentClock
          : touchInput
            ? gestureTargetClock
            : toPlaybackTime(nativeProgress)

      inputDirection = direction

      const inputGain = touchInput ? (current === 0 ? 0.005 : 0.003) : 0.0015
      const desired =
        base +
        direction * (touchInput ? Math.abs(pixels) : Math.min(Math.abs(pixels), 120)) * inputGain
      const limit =
        direction > 0 && current === 0 && displayed < heroWalkOutEnd - 0.02
          ? heroWalkOutEnd
          : sceneDuration
      const bounded = Math.max(0, Math.min(toPlaybackTime(limit), desired))

      if (triggerSceneTransition(pixels, fromPlaybackTime(bounded), start, distance, touchInput))
        return true

      // Accumulate fractional gesture travel before the browser rounds scrollY.
      if (touchInput) gestureTargetClock = bounded

      window.scrollTo({
        top: start + (distance * fromPlaybackTime(bounded)) / sceneDuration,
        behavior: 'instant',
      })
      update()

      return true
    }

    function normalizeWheel(event: WheelEvent) {
      if (
        event.ctrlKey ||
        event.defaultPrevented ||
        !event.deltaY ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      )
        return

      cancelSnap()

      if (document.documentElement.dataset.introLoading === 'true') {
        event.preventDefault()

        return
      }

      const pixels =
        event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1)
      const target = event.target instanceof Element ? event.target : null

      if (advanceInput(pixels, target)) event.preventDefault()
    }

    let touch: {
      x: number
      y: number
      lastY: number
      axis: 'vertical' | 'horizontal' | null
      target: Element | null
      projectSwipe: { direction: number; gain: number; limit: number } | null
      transitionDirection: number
    } | null = null

    function startTouch(event: TouchEvent) {
      cancelSnap()

      const target = event.target instanceof Element ? event.target : null

      if (event.touches.length !== 1 || media.matches || target?.closest('.site-scrollbar')) {
        touch = null

        return
      }

      const point = event.touches[0]

      gestureTargetClock = toPlaybackTime(requested)
      transitionLatch = null
      touch = {
        x: point.clientX,
        y: point.clientY,
        lastY: point.clientY,
        axis: null,
        target,
        projectSwipe: null,
        transitionDirection: 0,
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
      if (touch.target?.closest('dialog, input, textarea, select, [contenteditable="true"]')) return

      const point = event.touches[0]

      if (!touch.axis) {
        const dx = Math.abs(point.clientX - touch.x)
        const dy = Math.abs(point.clientY - touch.y)

        if (Math.max(dx, dy) < 6) return

        touch.axis = dy >= dx ? 'vertical' : 'horizontal'
      }

      const pixels = touch.lastY - point.clientY

      touch.lastY = point.clientY

      if (touch.axis === 'vertical' && advanceInput(pixels, touch.target, true))
        event.preventDefault()
    }

    function endTouch() {
      if (!touch) return

      touch = null
      armSnap()
    }

    function render(value: number, immediate = false) {
      if ((sceneTransition || stopShowcasePlayback) && !immediate) return

      const next = Math.max(0, Math.min(sceneDuration, value))

      if (next === requested && stopPlayback && !immediate && !snapping) return

      requested = next
      stopPlayback?.()
      stopPlayback = undefined

      if (immediate || snapping || media.matches) {
        displayed = requested
        playbackClock.jump(toPlaybackTime(displayed))

        if (immediate) gesturePlayback = false

        renderScene(displayed)

        return
      }

      const currentTime = toPlaybackTime(displayed)
      const targetTime = toPlaybackTime(requested)
      const difference = Math.abs(targetTime - currentTime)
      const heroPlayback = Math.min(displayed, requested) < heroWalkOutEnd
      const introPlayback =
        (current === 1 && Math.min(displayed, requested) < skillParagraphEnd) ||
        (current === 2 && Math.min(displayed, requested) < aboutIntroEnd)

      if (difference < 0.000001) {
        displayed = requested
        renderScene(displayed)
        settleFocus()

        return
      }

      // Keep velocity when a new gesture target arrives. Use the same spring for
      // wheel and touch through the walk and text fill so a wheel notch cannot restart an ease-out.
      const control = animate(playbackClock, targetTime, {
        ...(introPlayback
          ? {
              type: 'spring' as const,
              stiffness: 230,
              damping: 30,
              mass: 0.9,
              restDelta: 0.0005,
              restSpeed: 0.005,
            }
          : gesturePlayback || heroPlayback
            ? {
                type: 'spring' as const,
                stiffness: 420,
                damping: 42,
                mass: 0.9,
                restDelta: 0.0005,
                restSpeed: 0.005,
              }
            : current === 1
              ? { type: 'tween' as const, duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }
              : {
                  type: 'tween' as const,
                  duration: Math.min(difference, 0.3),
                  ease: [0.22, 1, 0.36, 1] as const,
                }),
        onUpdate: (time) => {
          displayed = fromPlaybackTime(time)
          renderScene(displayed)
        },
        onComplete: () => {
          stopPlayback = undefined
          displayed = requested
          renderScene(displayed)
          settleFocus()
        },
      })

      stopPlayback = () => control.stop()
    }

    function update() {
      if (frame) cancelAnimationFrame(frame)

      frame = 0

      if (sceneTransition) return

      const node = track.current

      if (!node) return

      if (media.matches) {
        let visible = 0

        panels.current.forEach((panel, index) => {
          if (panel && panel.getBoundingClientRect().top <= innerHeight * 0.4) visible = index
        })

        if (scrollY > 0 && scrollY + innerHeight >= document.documentElement.scrollHeight - 1) {
          visible = scenes.length - 1
        }

        if (visible !== current) {
          current = visible
          setActive(visible)
        }

        return
      }

      const bounds = node.getBoundingClientRect()
      const travel = Math.max(
        1,
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight),
      )
      const rawProgress = Math.max(
        0,
        Math.min(sceneDuration, (-bounds.top / travel) * sceneDuration),
      )
      const boundary = transitionRanges
        .flatMap(({ start, end }) => [start, end])
        .find((stop) => (Math.abs(stop - rawProgress) * travel) / sceneDuration < 1)
      const progress = boundary ?? rawProgress

      if (
        Math.abs(progress - requested) > 0.001 &&
        document.documentElement.dataset.introLoading !== 'true'
      ) {
        hasScrolled = true
      }

      timeline.set(progress)
      render(timeline.get())
    }

    // Keep section controls, hero progress, and panel reveals on the same timeline.
    function renderScene(value: number) {
      if (media.matches) return

      const progress = Math.max(0, Math.min(sceneDuration, value))
      experienceProgress.set(
        Math.max(0, Math.min(1, (progress - experienceStart) / (experienceEnd - experienceStart))),
      )
      const section = getScrollSection(progress)
      const range = sectionScrollRanges[section]
      const nextStart = sectionScrollRanges[section + 1]?.start
      const departure =
        nextStart === undefined
          ? 0
          : Math.max(0, Math.min(1, (progress - range.end) / ((nextStart - range.end) * 0.32)))
      const recess = hasScrolled ? departure * departure * (3 - 2 * departure) : 1
      const sectionChanged = section !== pillSection

      if (sectionChanged) {
        // Reset the vertical position while the pill and its liquid are offscreen.
        scrollRecess.jump(1)
        pillSection = section
        setScrollSection(section)
      }

      scrollProgress.set(
        Math.max(0, Math.min(1, (progress - range.start) / (range.end - range.start))),
      )

      if (sectionChanged || recess !== pillRecessTarget) {
        scrollRecess.set(recess)
        pillRecessTarget = recess
      }

      if (track.current) {
        track.current.dataset.playbackProgress = String(progress)
        track.current.dataset.playbackTime = String(toPlaybackTime(progress))
      }

      const exit = Math.max(
        0,
        Math.min(1, (progress - heroWalkOutStart) / (heroWalkOutEnd - heroWalkOutStart)),
      )
      const jakeTravel =
        Math.min(progress, heroExitStart) + exit * (heroAnimationTravel - heroExitStart)
      const jakeProgress = jakeTravel / heroAnimationTravel
      const paragraph = Math.max(
        0,
        Math.min(1, (progress - heroFillEnd) / (heroParagraphEnd - heroFillEnd)),
      )
      const hero = panels.current[0]

      if (jakeProgress !== lastJakeProgress || paragraph !== lastHeroParagraph) {
        lastJakeProgress = jakeProgress
        lastHeroParagraph = paragraph

        if (hero) hero.dataset.jakeProgress = String(jakeProgress)

        window.dispatchEvent(
          new CustomEvent('portfolio:hero-progress', {
            detail: { progress: jakeProgress, paragraph },
          }),
        )
      }

      const heroFill = Math.max(
        0,
        Math.min(1, (progress - heroAnimationTravel) / (heroFillEnd - heroAnimationTravel)),
      )

      if (hero && heroFill !== lastHeroFill) {
        lastHeroFill = heroFill
        hero.dataset.particleGather = String(heroFill)
        hero.querySelectorAll<HTMLElement>('.hero-letter').forEach((letter, index, letters) => {
          const letterFill = Math.max(0, Math.min(1, heroFill * letters.length - index))

          letter.style.setProperty('--letter-fill', `${letterFill * 100}%`)
        })
      }

      const skillProgress = Math.max(0, Math.min(1, (progress - skillStart) / skillTravel))
      const skillIntro = Math.max(
        0,
        Math.min(1, (progress - sceneStops[1]) / (skillStart - sceneStops[1])),
      )
      const skillTextIntro = introTextReady(1) ? skillIntro : 0

      if (
        skillProgress !== lastSkillProgress ||
        skillIntro !== lastSkillIntro ||
        skillTextIntro !== lastSkillTextIntro
      ) {
        lastSkillProgress = skillProgress
        lastSkillIntro = skillIntro
        lastSkillTextIntro = skillTextIntro
        window.dispatchEvent(
          new CustomEvent('portfolio:skills-progress', {
            detail: { progress: skillProgress, intro: skillIntro, textIntro: skillTextIntro },
          }),
        )
      }

      const aboutIntro = introTextReady(2)
        ? Math.max(0, Math.min(1, (progress - sceneStops[2]) / (aboutIntroEnd - sceneStops[2])))
        : 0

      if (aboutIntro !== lastAboutIntro) {
        lastAboutIntro = aboutIntro
        window.dispatchEvent(new CustomEvent('portfolio:about-intro', { detail: aboutIntro }))
      }

      let visible = 0

      // Reveal each panel from the portal in the preceding scene.
      panels.current.forEach((panel, index) => {
        if (!panel) return

        const reveal =
          index === 0
            ? 1
            : index === 1
              ? Math.max(0, Math.min(1, (progress - heroWalkOutEnd) / heroRevealTravel))
              : Math.max(0, Math.min(1, progress - sceneStops[index] + 1))

        if (index > 0 && (reveal === 0 || reveal === 1)) {
          panel.style.clipPath = reveal === 1 ? 'none' : 'circle(0px)'

          const ring = sceneOpenings.current[index]

          if (ring) ring.style.visibility = 'hidden'
        } else if (index > 0) {
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
          const startingRadius =
            (index === 1 || scenes[index].id === 'about') && portalBounds
              ? portalBounds.width / 2
              : 0
          const aperture = getPeriodOpening(reveal, startingRadius, radius)

          panel.style.clipPath =
            reveal === 1 ? 'none' : `circle(${aperture.innerRadius}px at ${x}px ${y}px)`

          const ring = sceneOpenings.current[index]

          if (ring) {
            ring.style.visibility = reveal > 0 && reveal < 1 ? 'visible' : 'hidden'
            ring.setAttribute('cx', String(x))
            ring.setAttribute('cy', String(y))
            ring.setAttribute('r', String(aperture.ringRadius))
            ring.setAttribute('stroke-width', String(aperture.ringWidth))
          }
        }

        panel.style.visibility = index === 0 || reveal > 0 ? 'visible' : 'hidden'

        if (scenes[index].id === 'about') {
          const options = panel.querySelector<HTMLElement>('.about-reveal')
          const intro = panel.querySelector<HTMLElement>('.about-introduction')
          const opening = Math.max(
            0,
            Math.min(1, (progress - aboutIntroEnd) / (experienceStart - aboutIntroEnd)),
          )

          if (options && intro) {
            options.inert = opening < 1
            intro.inert = opening >= 1
            panel.dataset.aboutStage =
              opening === 0 ? 'intro' : opening >= 1 ? 'profile' : 'opening'

            const period = intro.querySelector('.about-next .skills-title-period')

            if (period) {
              const { x, y, dot, radius } = getIntroPeriodGeometry(
                options.getBoundingClientRect(),
                period.getBoundingClientRect(),
              )
              const aperture = opening > 0 ? getPeriodOpening(opening, dot, radius).innerRadius : 0

              options.style.clipPath = `circle(${aperture}px at ${x}px ${y}px)`
            }
          }
        }

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

        if (panel.inert !== hidden) panel.inert = hidden

        if (panel.getAttribute('aria-hidden') !== String(hidden)) {
          panel.setAttribute('aria-hidden', String(hidden))
        }
      })
    }

    // Defer focus until navigation finishes so focus does not interrupt scrolling.
    function settleFocus() {
      if (pendingFocus !== null) {
        const panel = panels.current[pendingFocus]
        const profile =
          panel?.dataset.aboutStage === 'profile'
            ? panel.querySelector<HTMLElement>('.experience')
            : null

        const destination = profile ?? panel

        destination?.focus({ preventScroll: true })
        pendingFocus = null
      }
    }

    function schedule() {
      if (stopShowcasePlayback) {
        if (Math.abs(scrollY - showcaseExpectedY) <= 1) return

        pauseShowcase()
      }

      if (sceneTransition) {
        if (Math.abs(scrollY - transitionExpectedY) <= 2) return

        cancelSceneTransition()
      }

      if (snapping && Math.abs(window.scrollY - snapExpectedY) > 2) cancelSnap()

      armSnap()

      if (!frame) frame = window.requestAnimationFrame(update)
    }

    function resizeScene() {
      const node = track.current

      if (node && current === 2 && !media.matches && !sceneTransition && !stopShowcasePlayback) {
        // Browser chrome can resize the stage while a pill is parked at the floor.
        const start = scrollY + node.getBoundingClientRect().top
        const distance =
          node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)

        window.scrollTo({
          top: start + (distance * requested) / sceneDuration,
          behavior: 'instant',
        })
      }

      schedule()
    }

    function setup() {
      pauseShowcase()
      cancelSceneTransition()
      cancelSnap()

      const enabled = !media.matches

      history.scrollRestoration = enabled ? 'manual' : previousScrollRestoration
      setEnhanced(enabled)

      if (!enabled) {
        sceneOpenings.current.forEach((ring) => {
          if (ring) ring.style.visibility = 'hidden'
        })
        timeline.stop()
        stopPlayback?.()
        stopPlayback = undefined
        panels.current.forEach((panel) => {
          if (!panel) return

          panel.style.clipPath = ''
          panel.style.visibility = ''
          panel.inert = false
          panel.removeAttribute('aria-hidden')

          if (scenes[panels.current.indexOf(panel)]?.id === 'about') {
            panel.removeAttribute('data-about-stage')
            panel
              .querySelectorAll<HTMLElement>('.about-reveal, .about-introduction')
              .forEach((layer) => {
                layer.inert = false
                layer.style.removeProperty('clip-path')
              })
          }
        })
      }

      schedule()
    }

    function resolveHash(hash: string) {
      const project = projectStops.find((stop) => `#${stop.id}` === hash)

      if (project) {
        return {
          index: scenes.findIndex((scene) => scene.id === 'skills'),
          position: skillStart + project.position,
        }
      }

      const options = hash === '#about-profile'

      return {
        index: hash
          ? scenes.findIndex((scene) => `#${scene.id}` === (options ? '#about' : hash))
          : 0,
        position: options ? experienceStart : undefined,
      }
    }

    function navigate(event: MouseEvent) {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')

      if (!anchor || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return

      const hash = anchor.getAttribute('href')
      if (!hash) return

      const { index, position } = resolveHash(hash)

      if (index < 0 || !track.current || media.matches) return

      event.preventDefault()
      history.pushState(null, '', hash)

      if (
        hash === '#about-profile' &&
        current === index &&
        anchor.classList.contains('about-next')
      ) {
        const node = track.current

        // Skip the reading distance, then use the same circular expansion as a scroll.
        goTo(index, true, aboutIntroEnd)
        const start = window.scrollY + node.getBoundingClientRect().top
        const distance =
          node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)

        pendingFocus = index

        if (triggerSceneTransition(120, experienceStart, start, distance, false)) return
      }

      goTo(index, true, position)
    }

    function goTo(index: number, immediate = true, position = sceneStops[index]) {
      pauseShowcase()
      cancelSceneTransition()
      cancelSnap()

      const node = track.current

      if (!node) return

      const start = window.scrollY + node.getBoundingClientRect().top
      const distance =
        node.offsetHeight - (node.firstElementChild?.clientHeight ?? window.innerHeight)

      // Direct navigation lands on a fully opened scene.
      window.scrollTo({
        top: start + (distance * position) / sceneDuration,
        behavior: 'instant',
      })
      pendingFocus = index

      if (immediate) {
        timeline.jump(position)
        render(position, true)
      }

      update()

      if (!timeline.isAnimating()) settleFocus()
    }

    function selectSkill(event: Event) {
      cancelSceneTransition()
      cancelSnap()

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

      pauseShowcase()
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

    function seekScroll(event: Event) {
      pauseShowcase()

      const fraction = (event as CustomEvent<number>).detail
      const node = track.current

      if (!node || media.matches || !Number.isFinite(fraction)) return

      cancelSceneTransition()
      cancelSnap()
      pendingFocus = null

      const range = sectionScrollRanges[getScrollSection(displayed)]
      const position = range.start + Math.max(0, Math.min(1, fraction)) * (range.end - range.start)
      const start = scrollY + node.getBoundingClientRect().top
      const distance = node.offsetHeight - (node.firstElementChild?.clientHeight ?? innerHeight)

      window.scrollTo({ top: start + (distance * position) / sceneDuration, behavior: 'instant' })
      timeline.jump(position)
      render(position, true)
    }

    // Restore deep links using the same navigation path as the scene controls.
    function restoreHash() {
      const { index, position } = resolveHash(window.location.hash)

      if (index >= 0 && !media.matches) goTo(index, true, position)
    }

    function pauseShowcase() {
      if (!stopShowcasePlayback) return

      stopShowcasePlayback()
      stopShowcasePlayback = undefined
      setShowcasePlaying(false)
    }

    function interruptShowcase(event: Event) {
      if (
        event.target instanceof Element &&
        event.target.closest('.showcase-toggle') &&
        (event.type === 'pointerdown' ||
          (event instanceof KeyboardEvent && ['Enter', ' '].includes(event.key)))
      )
        return

      pauseShowcase()
    }

    function interruptNestedScroll(event: Event) {
      if (event.target instanceof Element) pauseShowcase()
    }

    toggleShowcase.current = () => {
      if (stopShowcasePlayback) {
        pauseShowcase()

        return
      }

      const node = track.current

      if (!node || media.matches) return

      cancelSceneTransition()
      cancelSnap()
      stopPlayback?.()
      stopPlayback = undefined
      cancelAnimationFrame(frame)
      frame = 0
      pendingFocus = null
      hasScrolled = true

      const start = scrollY + node.getBoundingClientRect().top
      const distance = node.offsetHeight - (node.firstElementChild?.clientHeight ?? innerHeight)
      const from = displayed >= sceneDuration - 0.01 ? 0 : toShowcaseTime(displayed)
      const end = toShowcaseTime(sceneDuration)
      const aboutStartTime = toShowcaseTime(sceneStops[2])
      const aboutReadingEndTime = toShowcaseTime(aboutIntroEnd)
      let stopSegment: (() => void) | undefined

      showcaseExpectedY = scrollY

      const playFrame = (time: number) => {
        const position = Math.min(sceneDuration, fromShowcaseTime(time))

        window.scrollTo({ top: start + (distance * position) / sceneDuration, behavior: 'instant' })
        showcaseExpectedY = scrollY
        timeline.jump(position)
        render(position, true)
      }

      setShowcasePlaying(true)

      function playSegment(first: number, last: number, onComplete: () => void) {
        const control = animate(first, last, {
          duration: last - first,
          ease: 'linear',
          onUpdate: playFrame,
          onComplete,
        })

        stopSegment = () => control.stop()
      }

      function finishShowcase() {
        stopShowcasePlayback = undefined
        setShowcasePlaying(false)
      }

      function readAbout(first: number) {
        const resume = () => {
          resumeShowcaseAfterAboutDrop.current = null
          playSegment(first, end, finishShowcase)
        }

        // Keep the reading clock at the scene entrance until the drop finishes.
        if (introTextReady(2)) resume()
        else resumeShowcaseAfterAboutDrop.current = resume
      }

      stopShowcasePlayback = () => {
        stopSegment?.()
        resumeShowcaseAfterAboutDrop.current = null
      }

      if (from < aboutStartTime) playSegment(from, aboutStartTime, () => readAbout(aboutStartTime))
      else if (from < aboutReadingEndTime) readAbout(from)
      else playSegment(from, end, finishShowcase)
    }

    const stopRendering = timeline.on('change', render)

    setup()

    const initialScroll = window.scrollY
    let initial = requestAnimationFrame(() => {
      initial = requestAnimationFrame(() => {
        // A user can start scrolling before the initial two-frame setup completes.
        if (!window.location.hash && window.scrollY !== initialScroll) return

        restoreHash()
      })
    })

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('pointerdown', cancelSnap, { passive: true })
    window.addEventListener('keydown', cancelSnap)
    window.addEventListener('blur', cancelSnap)
    window.addEventListener('wheel', normalizeWheel, { passive: false })
    document.addEventListener('touchstart', startTouch, { passive: true })
    document.addEventListener('touchmove', moveTouch, { passive: false })
    document.addEventListener('touchend', endTouch, { passive: true })
    document.addEventListener('touchcancel', endTouch, { passive: true })
    window.addEventListener('resize', resizeScene)
    document.addEventListener('click', navigate)
    window.addEventListener('portfolio:select-skill', selectSkill)
    window.addEventListener('portfolio:select-scene', selectScene)
    window.addEventListener('portfolio:seek-scroll', seekScroll)
    window.addEventListener('popstate', restoreHash)
    window.addEventListener('hashchange', restoreHash)
    media.addEventListener('change', setup)
    window.addEventListener('pointerdown', interruptShowcase, true)
    window.addEventListener('wheel', pauseShowcase, { passive: true, capture: true })
    window.addEventListener('keydown', interruptShowcase, true)
    window.addEventListener('resize', pauseShowcase)
    document.addEventListener('touchmove', pauseShowcase, { passive: true, capture: true })
    document.addEventListener('scroll', interruptNestedScroll, { passive: true, capture: true })
    document.addEventListener('visibilitychange', pauseShowcase)

    return () => {
      toggleShowcase.current = null
      stopShowcasePlayback?.()
      window.removeEventListener('pointerdown', interruptShowcase, true)
      window.removeEventListener('wheel', pauseShowcase, true)
      window.removeEventListener('keydown', interruptShowcase, true)
      window.removeEventListener('resize', pauseShowcase)
      document.removeEventListener('touchmove', pauseShowcase, true)
      document.removeEventListener('scroll', interruptNestedScroll, true)
      document.removeEventListener('visibilitychange', pauseShowcase)
      history.scrollRestoration = previousScrollRestoration
      cancelSceneTransition()
      stopRendering()
      timeline.stop()
      playbackClock.destroy()
      cancelAnimationFrame(frame)
      stopPlayback?.()
      cancelAnimationFrame(initial)
      cancelSnap()
      window.removeEventListener('pointerdown', cancelSnap)
      window.removeEventListener('keydown', cancelSnap)
      window.removeEventListener('blur', cancelSnap)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('wheel', normalizeWheel)
      document.removeEventListener('touchstart', startTouch)
      document.removeEventListener('touchmove', moveTouch)
      document.removeEventListener('touchend', endTouch)
      document.removeEventListener('touchcancel', endTouch)
      window.removeEventListener('resize', resizeScene)
      document.removeEventListener('click', navigate)
      window.removeEventListener('portfolio:select-skill', selectSkill)
      window.removeEventListener('portfolio:select-scene', selectScene)
      window.removeEventListener('portfolio:seek-scroll', seekScroll)
      window.removeEventListener('popstate', restoreHash)
      window.removeEventListener('hashchange', restoreHash)
      media.removeEventListener('change', setup)
    }
  }, [timeline, scrollProgress, scrollRecess, experienceProgress])

  // Switching from document flow to a sticky stage changes the track geometry.
  useEffect(() => {
    if (enhanced) window.dispatchEvent(new Event('scroll'))
  }, [enhanced])

  const showcasePath = showcasePlaying ? showcasePausePath : showcasePlayPath
  const showcaseOvershoot = showcasePlaying ? showcasePauseOvershoot : showcasePlayOvershoot

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <div
        className="portfolio"
        data-enhanced={enhanced ? '' : undefined}
        data-menu-open={menuOpen ? '' : undefined}
        data-experience-active={experienceActive ? '' : undefined}
      >
        <LiquidBoundary
          headerY={headerEntranceY}
          wordmarkY={wordmarkEntranceY}
          scrollProgress={scrollProgress}
          scrollRecess={scrollRecess}
          experienceDock={experienceDock}
        />
        {enhanced && introReady && !menuOpen && (
          <ScrollPill
            progress={scrollProgress}
            recess={scrollRecess}
            section={scrollRange.label ?? scenes[scrollRange.sceneIndex].label}
          />
        )}
        <a className="skip-link" href="#skills">
          Skip to selected work
        </a>
        <header id="portfolio-header">
          <motion.div
            className={`site-header tone-${headerTone}`}
            initial={false}
            animate={clientReady ? { opacity: introReady ? 1 : 0 } : undefined}
            style={clientReady ? { y: headerEntranceY } : undefined}
            transition={{
              duration: reduceMotion || headerEntrance.mobile ? 0 : 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <BlendedLogo
              headerY={headerEntranceY}
              enabled={enhanced}
              ready={introReady}
              tone={headerTone}
            >
              <motion.a
                className="wordmark"
                data-liquid-header
                href="#top"
                aria-label="Jacob Moya home"
                initial={false}
                animate={
                  clientReady
                    ? headerEntrance.mobile
                      ? introReady
                        ? mobileHeaderEntered
                        : mobileHeaderRest
                      : { opacity: 1, scale: 1 }
                    : undefined
                }
                style={clientReady ? { y: wordmarkEntranceY } : undefined}
                transition={{
                  ...(headerEntrance.mobile
                    ? getMobileHeaderPop(headerEntrance.logoDelay, reduceMotion)
                    : { duration: 0.7, ease: [0.32, 0, 0.24, 1] as const }),
                  ...(reduceMotion ? { duration: 0 } : {}),
                  delay: reduceMotion ? 0 : headerEntrance.logoDelay,
                }}
              >
                <span className="wordmark-text" aria-hidden="true">
                  Jacob Moya
                  <span className="nav-label-contrast wordmark-contrast" data-text="Jacob Moya" />
                </span>
                <span className="wordmark-symbol" aria-hidden="true" />
              </motion.a>
            </BlendedLogo>
            <BlendedNav enabled={enhanced} ready={introReady} tone={headerTone}>
              {scenes.map((scene, index) => (
                <motion.a
                  key={scene.id}
                  whileHover={reduceMotion ? undefined : 'hover'}
                  whileFocus={reduceMotion ? undefined : 'hover'}
                  href={`#${scene.id}`}
                  data-liquid-header
                  aria-current={active === index ? 'location' : undefined}
                  aria-label={scene.id === 'top' ? 'Home' : undefined}
                  initial={false}
                  animate={
                    clientReady
                      ? introReady
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: -12 }
                      : undefined
                  }
                  transition={{
                    duration: reduceMotion ? 0 : 0.55,
                    delay: reduceMotion ? 0 : headerEntrance.linkDelay(index),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <motion.span
                    className="nav-label"
                    initial="idle"
                    variants={{ idle: { y: 0, rotate: 0 }, hover: { y: -3, rotate: -3 } }}
                    transition={{ type: 'spring', stiffness: 340, damping: 22, mass: 0.8 }}
                  >
                    {scene.id === 'top' ? (
                      <svg className="nav-home-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3.5 10.7 12 3.8l8.5 6.9v9.1h-6v-5.6h-5v5.6h-6Z" />
                      </svg>
                    ) : (
                      scene.label
                    )}
                    <span className="nav-label-contrast" aria-hidden="true">
                      {scene.id === 'top' ? (
                        <svg className="nav-home-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3.5 10.7 12 3.8l8.5 6.9v9.1h-6v-5.6h-5v5.6h-6Z" />
                        </svg>
                      ) : (
                        scene.label
                      )}
                    </span>
                  </motion.span>
                  <motion.span
                    className="desktop-section-marker"
                    aria-hidden="true"
                    initial={false}
                    animate={
                      active === index ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }
                    }
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: 'spring', stiffness: 340, damping: 26 }
                    }
                  />
                </motion.a>
              ))}
            </BlendedNav>
            {enhanced && introReady && (
              <BlendedLogo enabled={enhanced} ready={introReady} tone={headerTone} control>
                <motion.button
                  type="button"
                  className="showcase-toggle"
                  initial={headerEntrance.mobile ? mobileHeaderRest : { opacity: 0, y: -24 }}
                  animate={headerEntrance.mobile ? mobileHeaderEntered : { opacity: 1, y: 0 }}
                  transition={
                    headerEntrance.mobile
                      ? getMobileHeaderPop(headerEntrance.playDelay, reduceMotion)
                      : {
                          duration: reduceMotion ? 0 : headerEntrance.duration,
                          delay: reduceMotion ? 0 : headerEntrance.playDelay,
                          ease: [0.22, 1, 0.36, 1],
                        }
                  }
                  data-liquid-header
                  aria-label={showcasePlaying ? 'Pause showcase' : 'Play showcase'}
                  onClick={() => toggleShowcase.current?.()}
                  whileTap={{ scale: 0.92 }}
                >
                  <span aria-hidden="true">
                    <DotIcon kind={showcasePlaying ? 'pause' : 'play'} animateOnChange />
                    <svg
                      className="showcase-rounded-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      focusable="false"
                    >
                      <motion.path
                        initial={false}
                        animate={{
                          d: reduceMotion
                            ? showcasePath
                            : [null, showcaseCenterPath, showcaseOvershoot, showcasePath],
                        }}
                        transition={{
                          duration: reduceMotion ? 0 : 0.3,
                          times: [0, 0.38, 0.83, 1],
                          ease: ['easeIn', 'easeOut', 'easeInOut'],
                        }}
                      />
                    </svg>
                  </span>
                </motion.button>
              </BlendedLogo>
            )}
            <BlendedLogo enabled={enhanced} ready={introReady} tone={headerTone} control>
              <ThemeToggle linkCount={scenes.length} />
            </BlendedLogo>
            <MobileMenu
              scenes={scenes}
              active={active}
              tone={headerTone}
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
          </motion.div>
        </header>
        <main
          ref={track}
          className="scene-track"
          data-duration={sceneDuration}
          style={enhanced ? { height: `calc(100svh * ${1 + sceneDuration * 0.9})` } : undefined}
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
                {scenes[index].id === 'about' ? (
                  <ExperienceMotion.Provider
                    value={{ enhanced, progress: experienceProgress, dock: experienceDock }}
                  >
                    {child}
                  </ExperienceMotion.Provider>
                ) : (
                  child
                )}
              </section>
            ))}
            <svg className="scene-period-opening" aria-hidden="true" focusable="false">
              {scenes.slice(1).map((scene, index) => (
                <circle
                  key={scene.id}
                  ref={(node) => {
                    sceneOpenings.current[index + 1] = node
                  }}
                />
              ))}
            </svg>
          </div>
        </main>
      </div>
    </MotionConfig>
  )
}
