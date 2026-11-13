'use client'

import { useEffect, useRef } from 'react'
import { introCompleteEvent } from '@/hooks/useIntroReady'

export function LiquidBoundary() {
  const root = useRef<SVGSVGElement>(null)
  const surround = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = root.current
    const path = svg?.querySelector('path')
    const surroundPath = surround.current?.querySelector('path')
    if (!svg || !path) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)')
    let frameInset = 12
    let width = 0
    let height = 0
    let perimeter = 1
    let corner = 25
    let segments: number[] = []
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
    function contour() {
      const direction = pointAt(position)
      const count = Math.ceil(perimeter / 5)
      const basePoints = Array.from({ length: count }, (_, i) => pointAt((perimeter * i) / count))
      const points = basePoints.map((base, i) => {
        const s = (perimeter * i) / count
        const amount = depth * Math.exp(-((Math.abs(arcDelta(position, s)) / radius) ** power))
        return { x: base.x + direction.nx * amount, y: base.y + direction.ny * amount }
      })
      function closedCurve(vertices: { x: number; y: number }[]) {
        const first = vertices[0]
        const last = vertices[vertices.length - 1]
        let d = `M${(last.x + first.x) / 2},${(last.y + first.y) / 2}`
        for (let i = 0; i < vertices.length; i++) {
          const a = vertices[i]
          const b = vertices[(i + 1) % vertices.length]
          d += ` Q${a.x},${a.y} ${(a.x + b.x) / 2},${(a.y + b.y) / 2}`
        }
        return d + ' Z'
      }
      const outside = `M${-frameInset},${-frameInset} H${width + frameInset} V${height + frameInset} H${-frameInset} Z `
      // Keep the outer surround solid black in every theme. A subpixel overlap
      // covers the antialiased join without restoring a separate outline stroke.
      surroundPath?.setAttribute(
        'd',
        outside +
          closedCurve(
            basePoints.map((base) => ({ x: base.x + base.nx * 0.75, y: base.y + base.ny * 0.75 })),
          ),
      )
      return outside + closedCurve(points)
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
      path!.setAttribute('d', contour())
      svg!.dataset.edge = pointAt(position).edge
      svg!.dataset.pullDepth = depth.toFixed(2)
      svg!.dataset.pullPosition = position.toFixed(2)
      const settled =
        Math.abs(arcDelta(position, targetPosition)) +
          Math.abs(depth - targetDepth) +
          Math.abs(radius - targetRadius) +
          Math.abs(power - targetPower) <
        0.01
      frame = settled && !idle ? 0 : requestAnimationFrame(paint)
      if (settled && !idle) previous = 0
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(paint)
    }
    function measure() {
      const bounds = (surround.current ?? svg!).getBoundingClientRect()
      frameInset =
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-inset')) ||
        12
      width = Math.max(1, bounds.width - 2 * frameInset)
      height = Math.max(1, bounds.height - 2 * frameInset)
      path!.setAttribute('transform', `translate(${frameInset} ${frameInset})`)
      surroundPath?.setAttribute('transform', `translate(${frameInset} ${frameInset})`)
      corner = Math.min(25, width / 2, height / 2)
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
      position = wrap(position)
      targetPosition = wrap(targetPosition)
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
  }, [])

  return (
    <>
      <svg ref={root} className="liquid-boundary" aria-hidden="true" focusable="false">
        <path fillRule="evenodd" />
      </svg>
      <svg ref={surround} className="liquid-surround" aria-hidden="true" focusable="false">
        <path fillRule="evenodd" />
      </svg>
    </>
  )
}
