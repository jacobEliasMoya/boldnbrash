'use client'

import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { ParticleMonogram } from './ParticleMonogram'
import { drawHeroFrame, getHeroScrollPose } from './heroFrames'

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
    let progress = Number(element.closest('.scene')?.getAttribute('data-jake-progress') ?? 0)
    const frames = Array.from({ length: 18 }, (_, index) => {
      const image = new Image()
      image.src = `/images/mini-jacob/frame-${String(index).padStart(3, '0')}.webp?v=2`
      return image
    })

    function paint() {
      if (!ready || disposed) return
      const pose = getHeroScrollPose(progress)
      const key = `${pose.frame}:${pose.mirrored}:${pose.mode}:${pose.center}`
      if (key === paintedPose) return
      drawHeroFrame(
        context!,
        frames[pose.frame],
        pose.mirrored ? pose.frame : undefined,
        pose.center,
      )
      surface!.style.opacity = pose.mode === 'gone' ? '0' : '1'
      surface!.dataset.frame = String(pose.frame)
      surface!.dataset.direction = pose.mirrored ? 'out' : 'in'
      surface!.dataset.center = String(pose.center ?? 318.5)
      element!.dataset.mode = pose.mode
      paintedPose = key
    }
    function updateScroll(event: Event) {
      const detail = (event as CustomEvent<{ progress: number }>).detail
      if (!Number.isFinite(detail.progress)) return
      progress = detail.progress
      paint()
    }
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
      window.removeEventListener('portfolio:hero-progress', updateScroll)
      context.clearRect(0, 0, 580, 640)
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
