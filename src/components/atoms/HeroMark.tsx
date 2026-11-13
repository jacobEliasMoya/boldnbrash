'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { ParticleMonogram, type WalkRipple } from './ParticleMonogram'
import {
  drawHeroFrame,
  getHeroScrollPose,
  heroFrameCount,
  heroStandingCenter,
  heroWalkFrames,
} from './heroFrames'

export function HeroMark() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const ripples = useRef<WalkRipple[]>([])
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const element = root.current
    const surface = canvas.current
    const context = surface?.getContext('2d')
    if (!element || !surface || !context || reduceMotion !== false) return
    let disposed = false
    let ready = false
    let paintedPose = ''
    let edgeCenter = 760
    let lastCenter: number | null = null
    let facingRight = false
    let directionAnchor: number | null = null
    let reversalThreshold = 18
    let walkingDistance = 0
    let lastRippleStep = -1
    let progress = Number(element.closest('.scene')?.getAttribute('data-jake-progress') ?? 0)
    const frames = Array.from({ length: heroFrameCount }, (_, index) => {
      const image = new Image()
      image.src = `/images/mini-jacob/frame-${String(index).padStart(3, '0')}.webp?v=3`
      return image
    })

    function paint() {
      if (!ready || disposed) return
      const pose = getHeroScrollPose(progress)
      const center =
        pose.walkProgress !== undefined
          ? edgeCenter + (heroStandingCenter - edgeCenter) * pose.walkProgress
          : pose.mirrored && pose.center !== undefined
            ? heroStandingCenter +
              ((pose.center - heroStandingCenter) / 470) * (edgeCenter - heroStandingCenter)
            : heroStandingCenter
      const walking = pose.sourceFrame !== undefined
      if (walking && lastCenter !== null) {
        const movement = center - lastCenter
        if (directionAnchor === null) directionAnchor = lastCenter
        // Keep the furthest point in the current direction. Tiny backscrolls
        // cannot turn the character; a sustained reversal can accumulate naturally.
        const reverseDistance = facingRight ? directionAnchor - center : center - directionAnchor
        if (reverseDistance >= reversalThreshold) {
          facingRight = !facingRight
          directionAnchor = center
        } else {
          directionAnchor = facingRight
            ? Math.max(directionAnchor, center)
            : Math.min(directionAnchor, center)
        }
        walkingDistance += Math.abs(movement)
      } else {
        directionAnchor = null
        if (walking) facingRight = pose.mirrored
      }
      lastCenter = walking ? center : null
      // Advance the gait forward by distance, even when the scroll timeline reverses.
      // A full left/right cycle spans 340 sprite pixels (previously 200).
      // Hold the two extended-leg contacts longer than the passing poses.
      const cycle = walkingDistance / 340
      const phase = cycle % 1
      const poseIndex = phase < 0.3 ? 0 : phase < 0.5 ? 1 : phase < 0.8 ? 2 : 3
      const walkingStep = Math.floor(cycle) * heroWalkFrames.length + poseIndex
      if (
        walking &&
        walkingStep !== lastRippleStep &&
        walkingStep % 2 === 0 &&
        center > 0 &&
        center < 580
      ) {
        ripples.current = [
          ...ripples.current.slice(-2),
          {
            x: ((center + 30) / 640) * 500,
            y: (546 / 640) * 500,
            time: performance.now(),
          },
        ]
        lastRippleStep = walkingStep
      }
      const sourceFrame = walking ? heroWalkFrames[walkingStep % heroWalkFrames.length] : undefined
      const mirrored = walking ? facingRight : pose.mirrored
      const theme = document.documentElement.dataset.theme
      const key = `${theme}:${pose.frame}:${sourceFrame}:${mirrored}:${pose.mode}:${center}`
      if (key === paintedPose) return
      drawHeroFrame(
        context!,
        frames[sourceFrame ?? pose.frame],
        sourceFrame,
        center,
        mirrored,
        document.documentElement.dataset.theme === 'dark',
      )
      surface!.style.opacity = pose.mode === 'gone' ? '0' : '1'
      surface!.dataset.frame = String(pose.frame)
      surface!.dataset.direction = pose.mirrored ? 'out' : 'in'
      surface!.dataset.center = String(center)
      surface!.dataset.facing = facingRight ? 'right' : 'left'
      surface!.dataset.walkStep = String(walkingStep)
      surface!.dataset.sourceFrame = String(sourceFrame ?? pose.frame)
      element!.dataset.mode = pose.mode
      paintedPose = key
    }
    function updateScroll(event: Event) {
      const detail = (event as CustomEvent<{ progress: number }>).detail
      if (!Number.isFinite(detail.progress)) return
      progress = detail.progress
      paint()
    }
    function measure() {
      const bounds = element!.getBoundingClientRect()
      const scale = bounds.height / 640
      if (!scale) return
      const left = (bounds.width - 580 * scale) / 2
      const pageEdge = (window.innerWidth - bounds.left - left) / scale
      edgeCenter = pageEdge + 160
      // Require 12 visible pixels of reverse travel at every viewport size.
      reversalThreshold = 12 / scale
      lastCenter = null
      directionAnchor = null
      surface!.width = Math.ceil(edgeCenter + 160)
      surface!.style.left = `${left}px`
      surface!.style.width = `${surface!.width * scale}px`
      surface!.style.height = `${640 * scale}px`
      paintedPose = ''
      paint()
    }
    const themeObserver = new MutationObserver(paint)
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    window.addEventListener('resize', measure)
    measure()
    window.addEventListener('portfolio:hero-progress', updateScroll)
    Promise.all(frames.map((image) => image.decode()))
      .then(() => {
        ready = true
        paint()
      })
      .catch(() => {
        /* Keep the monogram if a frame cannot load. */
      })

    return () => {
      disposed = true
      ripples.current = []
      observer.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('portfolio:hero-progress', updateScroll)
      context.clearRect(0, 0, surface.width, surface.height)
      surface.style.opacity = '0'
      element.dataset.mode = 'logo'
    }
  }, [reduceMotion])

  return (
    <div ref={root} className="hero-mark-animation" data-mode="logo">
      <ParticleMonogram ripples={ripples} />
      <canvas
        ref={canvas}
        className="hero-mini-jacob"
        width={580}
        height={640}
        style={{ opacity: 0 }}
        aria-hidden="true"
      />
    </div>
  )
}
