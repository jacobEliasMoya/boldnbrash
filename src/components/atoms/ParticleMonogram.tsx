'use client'

import { motion, useAnimationFrame, useReducedMotion, useSpring } from 'motion/react'
import { useEffect, useRef } from 'react'

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

export function ParticleMonogram() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const scene = useRef<HTMLElement | null>(null)
  const pointer = useRef(false)
  const scale = useRef(1)
  const painted = useRef(false)
  const ready = useRef(false)
  const reduceMotion = useReducedMotion()
  const rotationX = useSpring(0, { stiffness: 75, damping: 22 })
  const rotationY = useSpring(0, { stiffness: 75, damping: 22 })

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    scene.current = element.closest('.scene')
    const hero = element.closest('.hero-scene')
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
      const size = element.getBoundingClientRect().width
      if (!size) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(size * ratio)
      element.height = Math.round(size * ratio)
      scale.current = element.width / 500
      painted.current = false
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
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
    }
    image.src = '/jm-symbol.svg'
    return () => {
      disposed = true
      observer.disconnect()
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

    if (reduceMotion && painted.current) return
    const context = element.getContext('2d')
    if (!context) return
    const step = Math.min(delta / 16.667, 2)
    context.setTransform(scale.current, 0, 0, scale.current, 0, 0)
    context.clearRect(0, 0, 500, 500)
    context.translate(rotationY.get() * 48, -rotationX.get() * 42)
    drawParticles(
      context,
      particles.current,
      time,
      step,
      -0.18 + (reduceMotion ? 0 : rotationY.get() + Math.sin(time * 0.00032) * 0.12),
      0.08 + (reduceMotion ? 0 : rotationX.get() + Math.cos(time * 0.00027) * 0.045),
      reduceMotion,
    )
    context.globalAlpha = 1
    painted.current = true
  })

  return (
    <motion.div
      className="particle-logo"
      role="img"
      aria-label="Three-dimensional Jacob Moya monogram formed from purple particles"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, y: 16 }}
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
