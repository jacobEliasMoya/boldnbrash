'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { motion, useMotionValue, useMotionValueEvent, useSpring } from 'motion/react'

type NumberBox = { left: number; top: number; width: number; height: number; element: HTMLElement; overlay: HTMLElement }

export function MobileMenuLiquid({ panel, index, reduced, onCovered }: {
  panel: RefObject<HTMLDivElement | null>
  index: number
  reduced: boolean
  onCovered: (index: number | null) => void
}) {
  const geometry = useRef({ height: 0, depth: 64, radius: 36, numbers: [] as NumberBox[] })
  const target = useMotionValue(0)
  const position = useSpring(target, { stiffness: 190, damping: 24, mass: 0.9 })
  const trailing = useSpring(target, { stiffness: 115, damping: 22, mass: 1.1 })
  const path = useMotionValue('')
  const initialized = useRef(false)
  const covered = useRef<number | null>(null)

  const draw = useCallback((center: number) => {
    const { height, depth, radius, numbers } = geometry.current
    const tail = trailing.get()
    const stretch = Math.min(Math.abs(center - tail) * 0.35, 18)
    const edgeAt = (y: number) => depth * (
      0.78 * Math.exp(-((Math.abs(y - center) / (radius + stretch)) ** 2)) +
      0.22 * Math.exp(-((Math.abs(y - tail) / (radius * 1.15)) ** 2))
    )
    const points = Array.from({ length: Math.ceil(height / 2) + 1 }, (_, i) => {
      const y = Math.min(i * 2, height)
      return `${edgeAt(y)},${y}`
    })
    path.set(`M0,0 L${points.join(' L')} L0,${height} Z`)
    const motionAmount = reduced ? 0 : Math.min(Math.abs(center - tail) / 18, 1)
    const displaced = numbers.map((number) => {
      const distance = center - (number.top + number.height / 2)
      const influence = Math.exp(-((distance / (radius * 1.8)) ** 2))
      const x = -6 * influence * motionAmount
      const y = Math.max(-10, Math.min(10, distance * 0.25)) * influence * motionAmount
      number.element.style.transform = `translate3d(${x}px, ${y}px, 0)`
      const left = number.left + x
      const top = number.top + y
      const contour = Array.from({ length: 25 }, (_, i) => {
        const y = number.height * i / 24
        return `${edgeAt(top + y) - left}px ${y}px`
      })
      number.overlay.style.clipPath = `polygon(0 0, ${contour.join(', ')}, 0 100%)`
      return { ...number, left, top }
    })
    const selected = displaced[index]
    if (selected && covered.current !== index &&
      edgeAt(selected.top) >= selected.left + selected.width &&
      edgeAt(selected.top + selected.height) >= selected.left + selected.width) {
      covered.current = index
      onCovered(index)
    }
  }, [path, trailing, index, onCovered, reduced])

  useMotionValueEvent(position, 'change', draw)
  useMotionValueEvent(trailing, 'change', () => draw(position.get()))
  useEffect(() => {
    const element = panel.current
    if (!element) return
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      if (!bounds.height) return
      const numbers = Array.from(element.querySelectorAll<HTMLElement>('.mobile-menu-number')).map((number) => {
        // Measure the stable layout position, never a previous liquid displacement.
        number.style.transform = ''
        const rect = number.getBoundingClientRect()
        return {
          left: rect.left - bounds.left, top: rect.top - bounds.top,
          width: rect.width, height: rect.height,
          element: number,
          overlay: number.querySelector<HTMLElement>('.mobile-menu-number-contrast')!,
        }
      })
      const selected = numbers[index]
      if (!selected) return
      geometry.current = {
        height: bounds.height,
        depth: selected.left + selected.width + 8,
        radius: selected.height * 1.5,
        numbers,
      }
      const center = selected.top + selected.height / 2
      covered.current = null
      onCovered(null)
      target.set(center)
      if (!initialized.current || reduced) {
        position.jump(center)
        trailing.jump(center)
      }
      initialized.current = true
      draw(position.get())
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const links = element.querySelector('.mobile-menu-links')
    if (links) observer.observe(links)
    return () => observer.disconnect()
  }, [panel, index, reduced, target, position, trailing, draw, onCovered])

  return (
    <svg className="mobile-menu-liquid" aria-hidden="true" focusable="false">
      <motion.path d={path} />
    </svg>
  )
}
