'use client'

import { motion, useAnimationFrame, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useRef, type RefObject } from 'react'
import { getPortalBounds } from './portalBounds'

export type WalkRipple = { x: number; y: number; time: number }

type Particle = {
  x: number
  y: number
  homeX: number
  homeY: number
  z: number
  homeZ: number
  vz: number
  screenX: number
  screenY: number
  depth: number
  perspective: number
  vx: number
  vy: number
  phase: number
  size: number
  color: string
  alpha: number
}
const palette = ['#cbbcff', '#a58cff', '#8467ff', '#6546ff', '#4c2cff', '#3814ff', '#2710a8']

function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

function drawParticles(
  context: CanvasRenderingContext2D,
  points: Particle[],
  time: number,
  step: number,
  yaw: number,
  pitch: number,
  reduceMotion: boolean | null,
  ripples: WalkRipple[],
  formation: number,
  origin: { x: number; y: number; radius: number },
  offset: { x: number; y: number },
) {
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)
  const cosX = Math.cos(pitch)
  const sinX = Math.sin(pitch)
  for (const point of points) {
    const drift = reduceMotion ? 0 : Math.sin(time * 0.0006 + point.phase) * 1.2
    const targetX = point.homeX + drift
    const targetY = point.homeY + (reduceMotion ? 0 : Math.cos(time * 0.0005 + point.phase) * 1.2)
    if (reduceMotion) {
      point.x = point.homeX
      point.y = point.homeY
      point.z = point.homeZ
    } else {
      point.vx = (point.vx + (targetX - point.x) * 0.035 * step) * Math.pow(0.79, step)
      point.vy = (point.vy + (targetY - point.y) * 0.035 * step) * Math.pow(0.79, step)
      point.vz =
        (point.vz + (point.homeZ + drift * 0.5 - point.z) * 0.035 * step) * Math.pow(0.79, step)
      point.z += point.vz * step
      point.x += point.vx * step
      point.y += point.vy * step
    }
    // Rotate the actual XYZ volume, then project it through a perspective camera.
    const x = point.x - 250
    const y = point.y - 250
    const rotatedX = x * cosY + point.z * sinY
    const rotatedZ = -x * sinY + point.z * cosY
    const rotatedY = y * cosX - rotatedZ * sinX
    point.depth = y * sinX + rotatedZ * cosX
    point.perspective = 760 / (760 - point.depth)
    point.screenX = 250 + rotatedX * point.perspective * 0.9
    point.screenY = 250 + rotatedY * point.perspective * 0.9
    for (const ripple of ripples) {
      const age = time - ripple.time
      const dx = point.screenX - ripple.x
      const dy = point.screenY - ripple.y
      const distance = Math.hypot(dx, dy)
      const wave = distance - age * 0.22
      const envelope = Math.exp(-((wave / 32) ** 2)) * (1 - age / 1300)
      const displacement = Math.sin(wave / 12) * envelope * 3.5
      if (distance > 0) {
        point.screenX += (dx / distance) * displacement
        point.screenY += (dy / distance) * displacement
      }
    }
    // Each particle has a stable place inside the period and a staggered flight path.
    const delay = noise(point.homeX * 37 + point.homeY * 13) * 0.18
    const travel = Math.max(0, Math.min(1, (formation - delay) / (1 - delay)))
    const blend = travel * travel * (3 - 2 * travel)
    const radius = Math.sqrt(noise(point.homeY * 17 + point.homeX)) * origin.radius * 0.7
    const angle = point.phase
    const startX = origin.x + Math.cos(angle) * radius
    const startY = origin.y + Math.sin(angle) * radius
    point.screenX = startX + (point.screenX + offset.x - startX) * blend
    point.screenY = startY + (point.screenY + offset.y - startY) * blend
      - Math.sin(Math.PI * blend) * Math.sin(angle) * 24
    point.perspective *= 0.25 + 0.75 * blend
  }
  // Far particles draw first, so the near surface reads as a volume.
  points.sort((a, b) => a.depth - b.depth)
  for (const point of points) {
    context.fillStyle = point.color
    context.globalAlpha = point.alpha * Math.max(0.48, Math.min(1, 0.82 + point.depth / 250))
    context.beginPath()
    context.arc(point.screenX, point.screenY, point.size * point.perspective, 0, Math.PI * 2)
    context.fill()
  }
}

export function ParticleMonogram({ ripples }: { ripples?: RefObject<WalkRipple[]> }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const scene = useRef<HTMLElement | null>(null)
  const pointer = useRef(false)
  const scale = useRef(1)
  const painted = useRef(false)
  const ready = useRef(false)
  const formationTime = useRef(0)
  const reducedPreference = useRef(false)
  const geometry = useRef({ x: 0, y: 0, width: 500, height: 500, size: 500 })
  const reduceMotion = useReducedMotion()
  const rotationX = useSpring(0, { stiffness: 75, damping: 22 })
  const rotationY = useSpring(0, { stiffness: 75, damping: 22 })

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    scene.current = element.closest('.scene')
    const hero = element.closest('.hero-scene')
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedPreference.current = media.matches
    function resetPointer() {
      if (!pointer.current) return
      pointer.current = false
      rotationX.set(0)
      rotationY.set(0)
    }
    function move(event: PointerEvent) {
      if (!hero || reduceMotion || event.pointerType === 'touch') return
      const bounds = hero.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width
      const y = (event.clientY - bounds.top) / bounds.height
      if (scene.current?.inert || x < 0 || x > 1 || y < 0 || y > 1) {
        resetPointer()
        return
      }
      pointer.current = true
      rotationY.set((x - 0.5) * 0.9)
      rotationX.set(-(y - 0.5) * 0.6)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', resetPointer)
    window.addEventListener('blur', resetPointer)
    let disposed = false
    const resize = () => {
      const mark = element.parentElement!.getBoundingClientRect()
      const bounds = hero!.getBoundingClientRect()
      const size = mark.width
      if (!size) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      geometry.current = { x: mark.left - bounds.left, y: mark.top - bounds.top,
        width: bounds.width, height: bounds.height, size }
      element.width = Math.round(bounds.width * ratio)
      element.height = Math.round(bounds.height * ratio)
      element.style.width = `${bounds.width}px`
      element.style.height = `${bounds.height}px`
      element.style.left = `${bounds.left - mark.left}px`
      element.style.top = `${bounds.top - mark.top}px`
      scale.current = ratio * size / 500
      painted.current = false
      reducedPreference.current = media.matches
      if (media.matches && particles.current.length) {
        const context = element.getContext('2d')
        if (context) {
          context.setTransform(scale.current, 0, 0, scale.current, 0, 0)
          drawParticles(context, particles.current, 0, 1, -0.18, 0.08, true, [], 1,
            { x: 0, y: 0, radius: 0 },
            { x: geometry.current.x / (size / 500), y: geometry.current.y / (size / 500) })
          context.globalAlpha = 1
          element.dataset.formation = '1.000'
          painted.current = true
        }
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element.parentElement!)
    media.addEventListener('change', resize)
    if (hero) observer.observe(hero)
    resize()
    const image = new Image()
    image.onload = () => {
      if (disposed) return
      const sampling = document.createElement('canvas')
      sampling.width = sampling.height = 500
      const context = sampling.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(image, 0, 0, 500, 500)
      const pixels = context.getImageData(0, 0, 500, 500).data
      const points: Particle[] = []
      for (let y = 5; y < 495; y += 4) {
        for (let x = 5; x < 495; x += 4) {
          const seed = x * 37 + y * 13
          const homeX = x + noise(seed) * 3 - 1.5
          const homeY = y + noise(seed + 1) * 3 - 1.5
          const pixel = (Math.floor(homeY) * 500 + Math.floor(homeX)) * 4
          if (pixels[pixel + 3] < 180) continue
          const shade = Math.min(
            6,
            Math.max(
              0,
              Math.floor(((homeX / 500) * 0.3 + (homeY / 500) * 0.55 + noise(seed + 2) * 0.25) * 7),
            ),
          )
          const homeZ = (noise(seed + 8) - 0.5) * 145
          points.push({
            homeZ,
            z: homeZ,
            vz: 0,
            screenX: 0,
            screenY: 0,
            depth: 0,
            perspective: 1,
            homeX,
            homeY,
            x: homeX,
            y: homeY,
            vx: 0,
            vy: 0,
            phase: noise(seed + 5) * Math.PI * 2,
            size: 0.65 + noise(seed + 6) * 0.85,
            color: palette[shade],
            alpha: 0.55 + noise(seed + 7) * 0.45,
          })
        }
      }
      particles.current = points
      ready.current = true
      painted.current = false
      resize()
    }
    image.src = '/jm-symbol.svg'
    return () => {
      disposed = true
      observer.disconnect()
      media.removeEventListener('change', resize)
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', resetPointer)
      window.removeEventListener('blur', resetPointer)
      resetPointer()
      ready.current = false
    }
  }, [reduceMotion, rotationX, rotationY])

  useAnimationFrame((_time, delta) => {
    const time = performance.now()
    const element = canvas.current
    if (!element || !ready.current || document.hidden || scene.current?.inert) return

    if ((reduceMotion || reducedPreference.current) && painted.current) return
    const context = element.getContext('2d')
    if (!context) return
    const step = Math.min(delta / 16.667, 2)
    const period = scene.current?.querySelector<HTMLElement>('.hero-period > [data-portal]')
    const bounds = element.getBoundingClientRect()
    const dot = period ? getPortalBounds(period) : undefined
    const unit = geometry.current.size / 500
    const origin = dot ? { x: (dot.left + dot.width / 2 - bounds.left) / unit,
      y: (dot.top + dot.height / 2 - bounds.top) / unit, radius: dot.width / 2 / unit }
      : { x: 250, y: 250, radius: 4 }
    if (scene.current?.dataset.periodReady === 'true' && !document.documentElement.dataset.introLoading)
      formationTime.current = Math.min(1600, formationTime.current + Math.min(delta, 50))
    const entrance = formationTime.current / 1600
    const gather = Number(scene.current?.dataset.particleGather ?? 0)
    const formation = reduceMotion ? 1 : entrance * (1 - gather)
    element.dataset.formation = formation.toFixed(3)
    const activeRipples = reduceMotion
      ? []
      : (ripples?.current ?? []).filter((ripple) => time - ripple.time < 1300)
    if (element.dataset.ripples !== String(activeRipples.length))
      element.dataset.ripples = String(activeRipples.length)
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, element.width, element.height)
    // Keep the packed origin invisible until the period has finished entering.
    if (!reduceMotion && !reducedPreference.current &&
      (scene.current?.dataset.periodReady !== 'true' || document.documentElement.dataset.introLoading))
      return
    context.setTransform(scale.current, 0, 0, scale.current, 0, 0)
    drawParticles(
      context,
      particles.current,
      time,
      step,
      -0.18 + (reduceMotion ? 0 : rotationY.get() + Math.sin(time * 0.00032) * 0.12),
      0.08 + (reduceMotion ? 0 : rotationX.get() + Math.cos(time * 0.00027) * 0.045),
      reduceMotion,
      activeRipples,
      formation,
      origin,
      { x: geometry.current.x / unit + rotationY.get() * 48,
        y: geometry.current.y / unit - rotationX.get() * 42 },
    )
    context.globalAlpha = 1
    painted.current = true
  })

  return (
    <motion.div
      className="particle-logo"
      role="img"
      aria-label="Three-dimensional Jacob Moya monogram formed from purple particles"
      initial={false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 1.1,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <canvas ref={canvas} aria-hidden="true" width="500" height="500" />
    </motion.div>
  )
}
