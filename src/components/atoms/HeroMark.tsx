'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { ParticleMonogram } from './ParticleMonogram'
import { drawHeroFrame, getHeroScrollPose, heroFrameCount, heroStandingCenter } from './heroFrames'

export function HeroMark() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLDivElement>(null)
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
    let walkingDistance = 0
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
        if (Math.abs(movement) > 0.01) facingRight = movement > 0
        walkingDistance += Math.abs(movement)
      }
      lastCenter = center
      // Advance the gait forward by distance, even when the scroll timeline reverses.
      const walkingStep = Math.floor(walkingDistance / 50)
      const sourceFrame = walking ? [4, 5, 6, 5][walkingStep % 4] : undefined
      const mirrored = walking ? facingRight : pose.mirrored
      const key = `${pose.frame}:${sourceFrame}:${mirrored}:${pose.mode}:${center}`
      if (key === paintedPose) return
      drawHeroFrame(context!, frames[sourceFrame ?? pose.frame], sourceFrame, center, mirrored)
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
      surface!.width = Math.ceil(edgeCenter + 160)
      surface!.style.left = `${left}px`
      surface!.style.width = `${surface!.width * scale}px`
      surface!.style.height = `${640 * scale}px`
      paintedPose = ''
      paint()
    }
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
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('portfolio:hero-progress', updateScroll)
      context.clearRect(0, 0, surface.width, surface.height)
      surface.style.opacity = '0'
      element.dataset.mode = 'logo'
    }
  }, [reduceMotion])

  return (
    <div ref={root} className="hero-mark-animation" data-mode="logo">
      <ParticleMonogram />
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
