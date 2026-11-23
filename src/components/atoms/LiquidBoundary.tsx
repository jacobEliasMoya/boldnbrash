'use client'

import { useEffect, useId, useRef } from 'react'
import type { MotionValue } from 'motion/react'
import { introCompleteEvent } from '@/hooks/useIntroReady'
import type { ExperienceDock } from '@/components/organisms/experienceTimeline'
import {
  closedLiquidCurve,
  liquidFrameCorner,
  liquidFrameOverlap,
  liquidPull,
  wordmarkPullPower,
  wordmarkPullRadius,
} from './liquidContour'

export function LiquidBoundary({
  headerY,
  wordmarkY,
  scrollProgress,
  scrollRecess,
  experienceDock,
}: {
  headerY: MotionValue<number>
  wordmarkY: MotionValue<number>
  scrollProgress: MotionValue<number>
  scrollRecess: MotionValue<number>
  experienceDock: MotionValue<ExperienceDock | null>
}) {
  const root = useRef<SVGSVGElement>(null)
  const surround = useRef<SVGSVGElement>(null)
  const parked = useRef<SVGPathElement>(null)
  const scrollLiquid = useRef<SVGPathElement>(null)
  const boundaryPaint = useRef<SVGGElement>(null)
  const surroundPaint = useRef<SVGGElement>(null)
  const dockCut = useRef<SVGPathElement>(null)
  const dockShoulders = useRef<SVGPathElement>(null)
  const dockRecoil = useRef<SVGPathElement>(null)
  const maskId = useId()

  useEffect(() => {
    const svg = root.current
    const path = svg?.querySelector('path')
    const surroundPath = surroundPaint.current?.querySelector('path')
    const parkedPath = parked.current

    if (!svg || !path) return

    const media = window.matchMedia(
      '(max-width: 760px), (prefers-reduced-motion: reduce), (pointer: coarse)',
    )
    let frameInset = 12
    let width = 0
    let height = 0
    let perimeter = 1
    let corner = liquidFrameCorner
    let segments: number[] = []
    let basePoints: ReturnType<typeof pointAt>[] = []
    let position = 0
    let targetPosition = 0
    let depth = 0
    let targetDepth = 0
    let radius = 110
    let targetRadius = 110
    let power = 2
    let targetPower = 2
    let frame = 0
    let previous = 0
    let idle = false
    let idleTimer = 0
    let parkedGeometry = ''
    let scrollGeometry = ''
    let scrollTop = 31
    let scrollBottom = 31
    let scrollReach = 23
    let scrollRadius = 46
    let surroundLeft = 0
    let surroundTop = 0
    let experienceOwnsFloor = false
    let pointerFloorPresence = 1

    function paintExperience(shape: ExperienceDock | null) {
      const ownsFloor = shape !== null

      if (ownsFloor !== experienceOwnsFloor) {
        experienceOwnsFloor = ownsFloor

        // Remove the competing pull before the recoil mask can cut it off from the frame.
        if (ownsFloor) pointerFloorPresence = 0

        paintPointerContour()
        schedule()
      }

      const masked = shape?.cut || shape?.recoil

      for (const group of [boundaryPaint.current, surroundPaint.current]) {
        if (masked) group?.setAttribute('mask', `url(#${maskId})`)
        else group?.removeAttribute('mask')
      }

      const transform = shape ? `translate(${shape.x - surroundLeft} ${shape.y - surroundTop})` : ''
      dockCut.current?.setAttribute('transform', transform)
      dockCut.current?.setAttribute('d', shape?.cut ?? '')
      dockShoulders.current?.setAttribute('transform', transform)
      dockShoulders.current?.setAttribute('d', shape?.shoulders ?? '')
      dockRecoil.current?.setAttribute('transform', transform)
      dockRecoil.current?.setAttribute('d', shape?.recoil ?? '')
    }

    svg.dataset.mode = media.matches ? 'static' : 'pointer'

    function armIdle() {
      window.clearTimeout(idleTimer)

      if (media.matches || document.hidden) return

      idleTimer = window.setTimeout(() => {
        if (
          media.matches ||
          document.hidden ||
          document.documentElement.dataset.introLoading === 'true' ||
          document.querySelector('dialog[open]') ||
          (document.hasFocus() &&
            document.activeElement?.matches('[data-liquid-header]:focus-visible'))
        )
          return

        idle = true
        targetPosition = position
        svg!.dataset.mode = 'idle'
        schedule()
      }, 2500)
    }

    function activity() {
      idle = false
      svg!.dataset.mode = media.matches ? 'static' : 'pointer'
      armIdle()
    }

    const wrap = (value: number) => ((value % perimeter) + perimeter) % perimeter
    const arcDelta = (from: number, to: number) => wrap(to - from + perimeter / 2) - perimeter / 2

    function pointAt(distance: number) {
      let s = wrap(distance)
      let segment = 0
      while (segment < 7 && s > segments[segment]) {
        s -= segments[segment]
        segment++
      }
      if (segment === 0) return { x: corner + s, y: 0, nx: 0, ny: 1, edge: 'top' }
      if (segment === 2) return { x: width, y: corner + s, nx: -1, ny: 0, edge: 'right' }
      if (segment === 4) return { x: width - corner - s, y: height, nx: 0, ny: -1, edge: 'bottom' }
      if (segment === 6) return { x: 0, y: height - corner - s, nx: 1, ny: 0, edge: 'left' }
      const quadrant = (segment - 1) / 2
      const angle = -Math.PI / 2 + (quadrant * Math.PI) / 2 + s / corner
      const cx = quadrant < 2 ? width - corner : corner
      const cy = quadrant === 0 || quadrant === 3 ? corner : height - corner
      return {
        x: cx + Math.cos(angle) * corner,
        y: cy + Math.sin(angle) * corner,
        nx: -Math.cos(angle),
        ny: -Math.sin(angle),
        edge: ['top-right', 'bottom-right', 'bottom-left', 'top-left'][quadrant],
      }
    }

    let outside = ''
    let flatPath = ''
    let flatPathPainted = false

    function contour(position: number, depth: number, radius: number, power: number) {
      const direction = pointAt(position)
      const points = basePoints.map((base, i) => {
        const s = (perimeter * i) / basePoints.length
        const amount = liquidPull(Math.abs(arcDelta(position, s)), depth, radius, power)
        return { x: base.x + direction.nx * amount, y: base.y + direction.ny * amount }
      })
      return outside + closedLiquidCurve(points)
    }

    function paintPointerContour() {
      const distanceFromFloor = height - pointAt(position).y
      const awayFromFloor = Math.max(0, Math.min(1, (distanceFromFloor - corner) / (2 * corner)))
      const presence = pointerFloorPresence + (1 - pointerFloorPresence) * awayFromFloor
      const visibleDepth = depth * presence
      const flat = visibleDepth < 0.01

      if (flat && flatPathPainted) return

      path!.setAttribute('d', flat ? flatPath : contour(position, visibleDepth, radius, power))
      flatPathPainted = flat
    }

    function paint(time: number) {
      const dt = previous ? Math.min(time - previous, 50) : 16

      previous = time

      const ease = 1 - Math.exp(-dt / 160)

      if (idle) {
        // A quiet clockwise lap, starting exactly where the pointer left the pull.
        targetPosition = wrap(targetPosition + (perimeter * dt) / 36000)
        targetDepth = 18 + Math.sin(time / 2200) * 2
        targetRadius = 130
        targetPower = 2
      }

      // One mass travels the shortest route around the perimeter, including corners.
      position = wrap(position + arcDelta(position, targetPosition) * ease)
      depth += (targetDepth - depth) * ease
      radius += (targetRadius - radius) * ease
      power += (targetPower - power) * ease

      // Use the pointer's existing easing when handing the floor back after Experience.
      if (!experienceOwnsFloor) pointerFloorPresence += (1 - pointerFloorPresence) * ease

      paintPointerContour()

      const scrollY =
        scrollTop + Math.max(0, height - scrollTop - scrollBottom) * scrollProgress.get()
      const scrollDepth = scrollReach * (1 - Math.max(0, Math.min(1, scrollRecess.get())))
      const scrollKey = `${width}:${height}:${scrollY}:${scrollDepth}:${scrollRadius}`

      if (scrollKey !== scrollGeometry) {
        const rightEdge = segments[0] + segments[1] + Math.max(0, scrollY - corner)

        if (scrollDepth > 0) {
          scrollLiquid.current?.setAttribute(
            'd',
            contour(rightEdge, scrollDepth, scrollRadius, 2.5),
          )
        } else {
          scrollLiquid.current?.removeAttribute('d')
        }

        scrollGeometry = scrollKey
      }

      const bounds = (surround.current ?? svg!).getBoundingClientRect()
      const wordmark =
        window.innerWidth > 760
          ? document
              .querySelector<HTMLElement>('.site-header .wordmark-text')
              ?.getBoundingClientRect()
          : undefined
      const parkedDepth = 68 + headerY.get() + wordmarkY.get()
      const parkedVisible = !!wordmark?.width && parkedDepth > 0

      if (wordmark?.width && parkedVisible) {
        const anchor = wrap(wordmark.left + wordmark.width / 2 - bounds.left - frameInset - corner)
        const key = `${width}:${height}:${anchor}:${wordmark.width}:${parkedDepth}`

        if (key !== parkedGeometry) {
          parkedPath?.setAttribute(
            'd',
            contour(anchor, parkedDepth, wordmarkPullRadius(wordmark.width), wordmarkPullPower),
          )
          parkedGeometry = key
        }
      } else if (parkedGeometry) {
        parkedPath?.removeAttribute('d')
        parkedGeometry = ''
      }

      for (const control of document.querySelectorAll<HTMLElement>('[data-liquid-header]')) {
        const label = control.querySelector('.nav-label, .theme-toggle-track, span') ?? control
        const rect = label.getBoundingClientRect()
        const contrast = control.querySelector<HTMLElement>('.nav-label-contrast')

        if (contrast) {
          // Clip the contrast copy to the actual liquid edge instead of flipping
          // the whole label when a single corner touches it.
          const contains = (x: number, y: number) => {
            const point = new DOMPoint(
              rect.left + x - bounds.left - frameInset,
              rect.top + y - bounds.top - frameInset,
            )

            return (
              !!(parkedVisible && parkedPath?.isPointInFill(point)) ||
              (!media.matches && path!.isPointInFill(point))
            )
          }
          const hidden =
            (media.matches && !parkedVisible) ||
            !rect.width ||
            !!control.closest('[inert]') ||
            getComputedStyle(control).visibility === 'hidden'

          if (hidden) contrast.style.clipPath = 'inset(0 0 100% 0)'
          else {
            const edge = Array.from({ length: 25 }, (_, index) => {
              const x = (rect.width * index) / 24
              let low = 0
              let high = rect.height

              if (!contains(x, 0)) high = 0
              else if (contains(x, rect.height)) low = rect.height
              else
                for (let step = 0; step < 7; step++) {
                  const middle = (low + high) / 2

                  if (contains(x, middle)) low = middle
                  else high = middle
                }

              return `${x}px ${(low + high) / 2}px`
            })

            contrast.style.clipPath = `polygon(0 0, 100% 0, ${edge.reverse().join(', ')})`
          }

          control.dataset.liquidCovered = 'false'

          continue
        }

        // Check the edges as well as the centre; contrast must change before a letter disappears.
        const covered =
          !media.matches &&
          rect.width > 0 &&
          [0, 0.5, 1].some((x) =>
            [0, 0.5, 1].some((y) =>
              path!.isPointInFill(
                new DOMPoint(
                  rect.left + rect.width * x - bounds.left - frameInset,
                  rect.top + rect.height * y - bounds.top - frameInset,
                ),
              ),
            ),
          )

        control.dataset.liquidCovered = String(covered)
      }

      svg!.dataset.edge = pointAt(position).edge
      svg!.dataset.pullDepth = depth.toFixed(2)
      svg!.dataset.pullPosition = position.toFixed(2)

      const settled =
        Math.abs(arcDelta(position, targetPosition)) +
          Math.abs(depth - targetDepth) +
          Math.abs(radius - targetRadius) +
          Math.abs(power - targetPower) +
          (experienceOwnsFloor ? 0 : 1 - pointerFloorPresence) <
        0.01

      frame = settled && !idle ? 0 : requestAnimationFrame(paint)

      if (settled && !idle) previous = 0
    }

    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint)
    }

    function measure() {
      const bounds = (surround.current ?? svg!).getBoundingClientRect()
      surroundLeft = bounds.left
      surroundTop = bounds.top

      frameInset =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-inset')) ||
        12
      width = Math.max(1, bounds.width - 2 * frameInset)
      height = Math.max(1, bounds.height - 2 * frameInset)

      const styles = getComputedStyle(document.documentElement)
      const thumbHeight = parseFloat(styles.getPropertyValue('--scroll-pill-height')) || 46
      const edgeInset =
        parseFloat(styles.getPropertyValue('--scroll-pill-edge-inset')) || frameInset
      const topInset = parseFloat(styles.getPropertyValue('--scroll-pill-top-inset')) || edgeInset

      scrollTop = topInset - frameInset + thumbHeight / 2
      scrollBottom = edgeInset - frameInset + thumbHeight / 2
      scrollReach = parseFloat(styles.getPropertyValue('--scroll-liquid-depth')) || 23
      scrollRadius = parseFloat(styles.getPropertyValue('--scroll-liquid-radius')) || 46
      path!.setAttribute('transform', `translate(${frameInset} ${frameInset})`)
      surroundPath?.setAttribute('transform', `translate(${frameInset} ${frameInset})`)
      parkedPath?.setAttribute('transform', `translate(${frameInset} ${frameInset})`)
      scrollLiquid.current?.setAttribute('transform', `translate(${frameInset} ${frameInset})`)
      corner = Math.min(liquidFrameCorner, width / 2, height / 2)

      const quarter = (Math.PI * corner) / 2
      segments = [
        width - 2 * corner,
        quarter,
        height - 2 * corner,
        quarter,
        width - 2 * corner,
        quarter,
        height - 2 * corner,
        quarter,
      ]
      perimeter = segments.reduce((sum, length) => sum + length, 0)
      const sampleCount = Math.ceil(perimeter / 5)
      basePoints = Array.from({ length: sampleCount }, (_, index) =>
        pointAt((perimeter * index) / sampleCount),
      )
      outside = `M${-frameInset},${-frameInset} H${width + frameInset} V${height + frameInset} H${-frameInset} Z `
      flatPath = outside + closedLiquidCurve(basePoints)
      flatPathPainted = false
      // The subpixel overlap keeps the antialiased join solid.
      surroundPath?.setAttribute(
        'd',
        outside +
          closedLiquidCurve(
            basePoints.map((base) => ({
              x: base.x + base.nx * liquidFrameOverlap,
              y: base.y + base.ny * liquidFrameOverlap,
            })),
          ),
      )
      position = wrap(position)
      targetPosition = wrap(targetPosition)
      paintExperience(experienceDock.get())
      schedule()
    }

    function connect(link: HTMLElement | null, proximity = 1) {
      if (!link) return false

      const rect = link.getBoundingClientRect()
      const bounds = svg!.getBoundingClientRect()
      const label =
        link
          .querySelector<HTMLElement>('.nav-label, .theme-toggle-track, span')
          ?.getBoundingClientRect() ?? rect
      const isLogo = link.classList.contains('wordmark')
      const pull = Math.min(1, proximity / 0.85)

      targetPosition = wrap(rect.left + rect.width / 2 - bounds.left - frameInset - corner)
      targetRadius = 110 + (label.width * (isLogo ? 0.7 : 0.6) + (isLogo ? 20 : 16) - 110) * pull
      targetDepth = Math.max(
        targetDepth,
        Math.min(isLogo ? 68 : 56, label.bottom - bounds.top - frameInset + (isLogo ? 12 : 4)) *
          pull,
      )
      targetPower = 2 + 2 * pull

      return true
    }

    function move(event: PointerEvent) {
      if (media.matches || event.pointerType !== 'mouse') return

      if ((event.target as Element).closest('.mobile-menu-toggle, .mobile-menu-close')) {
        reset()

        return
      }

      activity()

      const bounds = svg!.getBoundingClientRect()
      const x = Math.max(0, Math.min(width, event.clientX - bounds.left - frameInset))
      const y = Math.max(0, Math.min(height, event.clientY - bounds.top - frameInset))
      let projected = targetPosition
      let nearestDistanceToFrame = Infinity

      for (let s = 0; s < perimeter; s += 5) {
        const point = pointAt(s)
        const distance = Math.hypot(point.x - x, point.y - y)

        if (distance < nearestDistanceToFrame) {
          projected = s
          nearestDistanceToFrame = distance
        }
      }

      const current = pointAt(targetPosition)
      const currentDistance = Math.hypot(current.x - x, current.y - y)

      if (
        depth < 0.5 ||
        nearestDistanceToFrame < 80 ||
        nearestDistanceToFrame + 18 < currentDistance
      )
        targetPosition = projected

      targetDepth = 5 + 37 * Math.exp(-nearestDistanceToFrame / 100)
      targetRadius = 110 + targetDepth
      targetPower = 2

      let nearest: HTMLElement | null = null
      let nearestDistance = 90
      const selector = '[data-liquid-header]:not(:disabled)'

      for (const link of document.querySelectorAll<HTMLElement>(selector)) {
        if (link.closest('[inert]') || !link.checkVisibility()) continue

        const rect = link.getBoundingClientRect()

        if (!rect.width || !rect.height) continue

        const distance = Math.hypot(
          Math.max(rect.left - event.clientX, 0, event.clientX - rect.right),
          Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom),
        )

        if (distance < nearestDistance) {
          nearest = link
          nearestDistance = distance
        }
      }

      const proximity = Math.max(0, 1 - nearestDistance / 90) ** 1.5
      const nearCorner = Math.min(x, width - x) < 45 && Math.min(y, height - y) < 45

      if (
        proximity > 0.08 &&
        (!nearCorner || (event.target as Element).closest('[data-liquid-header]'))
      )
        connect(nearest, proximity)

      if (depth < 0.5) position = wrap(targetPosition)

      schedule()
    }

    function focus(event: FocusEvent) {
      if (media.matches) return

      if ((event.target as Element).closest('.mobile-menu-toggle, .mobile-menu-close')) {
        reset()

        return
      }

      activity()
      targetDepth = 0

      if (
        connect(
          (event.target as Element).closest<HTMLElement>('[data-liquid-header]:not(:disabled)'),
        )
      )
        schedule()
    }

    function reset() {
      idle = false
      window.clearTimeout(idleTimer)
      svg!.dataset.mode = media.matches ? 'static' : 'pointer'
      targetDepth = 0
      schedule()
    }

    function unfocus(event: FocusEvent) {
      if (media.matches) return

      activity()
      targetDepth = 0
      connect(
        (event.relatedTarget as Element | null)?.closest<HTMLElement>(
          '[data-liquid-header]:not(:disabled)',
        ) ?? null,
      )
      schedule()
    }

    function releasePointer() {
      reset()
      armIdle()
    }

    function preferenceChanged() {
      reset()

      if (!media.matches) armIdle()
    }

    function visibilityChanged() {
      if (document.hidden) reset()
      else armIdle()
    }

    const observer = new ResizeObserver(measure)

    observer.observe(svg)

    if (surround.current) observer.observe(surround.current)

    const wordmarkAnchor = document.querySelector('.site-header .logo-anchor')

    if (wordmarkAnchor) observer.observe(wordmarkAnchor)

    const stopFollowing = [headerY, wordmarkY, scrollProgress, scrollRecess].map((value) =>
      value.on('change', schedule),
    )
    const stopExperience = experienceDock.on('change', paintExperience)

    measure()
    armIdle()
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', releasePointer)
    window.addEventListener('blur', releasePointer)
    window.addEventListener('focus', armIdle)
    window.addEventListener('wheel', activity, { passive: true })
    document.addEventListener('keydown', activity)
    document.addEventListener('visibilitychange', visibilityChanged)
    window.addEventListener(introCompleteEvent, armIdle)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', unfocus)
    media.addEventListener('change', preferenceChanged)

    return () => {
      cancelAnimationFrame(frame)
      stopFollowing.forEach((unsubscribe) => unsubscribe())
      stopExperience()
      document.querySelectorAll<HTMLElement>('[data-liquid-covered]').forEach((control) => {
        delete control.dataset.liquidCovered
      })
      window.clearTimeout(idleTimer)
      observer.disconnect()
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', releasePointer)
      window.removeEventListener('blur', releasePointer)
      window.removeEventListener('focus', armIdle)
      window.removeEventListener('wheel', activity)
      document.removeEventListener('keydown', activity)
      document.removeEventListener('visibilitychange', visibilityChanged)
      window.removeEventListener(introCompleteEvent, armIdle)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', unfocus)
      media.removeEventListener('change', preferenceChanged)
    }
  }, [headerY, wordmarkY, scrollProgress, scrollRecess, experienceDock, maskId])

  return (
    <>
      <svg ref={root} className="liquid-boundary" aria-hidden="true" focusable="false">
        <g ref={boundaryPaint}>
          <path fillRule="evenodd" />
        </g>
      </svg>
      <svg ref={surround} className="liquid-surround" aria-hidden="true" focusable="false">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-2" y="-2" width="101%" height="101%">
            <rect x="-2" y="-2" width="101%" height="101%" fill="white" />
            <path ref={dockCut} className="liquid-experience-cut" fill="black" />
            <path ref={dockRecoil} className="liquid-experience-recoil" fill="black" />
          </mask>
        </defs>
        <g ref={surroundPaint}>
          <path fillRule="evenodd" />
          <path ref={parked} className="liquid-wordmark-parked" fillRule="evenodd" />
          <path ref={scrollLiquid} className="liquid-scroll-pill" fillRule="evenodd" />
          <path ref={dockShoulders} className="liquid-experience-shoulders" />
        </g>
      </svg>
    </>
  )
}
