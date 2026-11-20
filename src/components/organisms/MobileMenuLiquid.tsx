'use client'

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { motion, useMotionValue, useMotionValueEvent, useSpring, type MotionValue } from 'motion/react'

type NumberBox = { left: number; top: number; width: number; height: number; element: HTMLElement; overlay: HTMLElement }

const liquidFalloff = (distance: number, radius: number, power = 2) =>
  Math.exp(-((Math.abs(distance) / radius) ** power))

export function MobileMenuLiquid({ panel, index, reduced, onCovered, socialOffset, selectionReady }: {
  panel: RefObject<HTMLDivElement | null>
  index: number
  reduced: boolean
  onCovered: (index: number | null) => void
  socialOffset: MotionValue<number>
  selectionReady: boolean
}) {
  const geometry = useRef({ height: 0, depth: 64, radius: 36, numbers: [] as NumberBox[] })
  const target = useMotionValue(0)
  const position = useSpring(target, { stiffness: 190, damping: 24, mass: 0.9 })
  const trailing = useSpring(target, { stiffness: 115, damping: 22, mass: 1.1 })
  const selectionDepth = useSpring(0, { stiffness: 230, damping: 30, mass: 0.9 })
  const path = useMotionValue('')
  const socialPath = useMotionValue('')
  const footer = useRef({ width: 0, bottom: 0, center: 0, radius: 1, depth: 0 })
  const initialized = useRef(false)
  const covered = useRef<number | null>(null)

  const draw = useCallback((center: number) => {
    const { height, depth, radius, numbers } = geometry.current
    const tail = trailing.get()
    const stretch = Math.min(Math.abs(center - tail) * 0.25, 12)
    const reach = reduced ? 1 : Math.min(1, Math.max(0, selectionDepth.get()))
    const edgeAt = (y: number) => depth * reach * (
      0.78 * liquidFalloff(y - center, radius + stretch) +
      0.22 * liquidFalloff(y - tail, radius * 1.15)
    )
    const points = Array.from({ length: Math.ceil(height / 2) + 1 }, (_, i) => {
      const y = Math.min(i * 2, height)
      return `${edgeAt(y)},${y}`
    })
    path.set(`M0,0 L${points.join(' L')} L0,${height} Z`)
    const motionAmount = reduced ? 0 : reach * Math.min(Math.abs(center - tail) / 18, 1)
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
  }, [path, trailing, selectionDepth, index, onCovered, reduced])

  useMotionValueEvent(position, 'change', draw)
  useMotionValueEvent(trailing, 'change', () => draw(position.get()))
  useMotionValueEvent(selectionDepth, 'change', () => draw(position.get()))
  useEffect(() => {
    if (selectionReady) selectionDepth.set(1)
  }, [selectionReady, selectionDepth])
  const drawFooter = useCallback((offset: number) => {
    const { width, bottom, center, radius, depth } = footer.current
    const points = Array.from({ length: Math.ceil(width / 2) + 1 }, (_, index) => {
      const x = Math.min(index * 2, width)
      const rise = Math.max(0, depth * liquidFalloff(x - center, radius, 4) - offset)
      return `${x},${bottom - rise}`
    })
    socialPath.set(`M${points.join(' L')} L${width},${bottom} L0,${bottom} Z`)
  }, [socialPath])
  useMotionValueEvent(socialOffset, 'change', drawFooter)
  useEffect(() => {
    const element = panel.current
    if (!element) return
    const measure = () => {
      const bounds = element.getBoundingClientRect()
      if (!bounds.height) return
      const socials = element.querySelector<HTMLElement>('.profile-links-menu')
      if (socials) {
        footer.current = {
          width: bounds.width,
          bottom: bounds.height,
          center: socials.offsetLeft + socials.offsetWidth / 2,
          radius: socials.offsetWidth / 2 + 12,
          depth: bounds.height - socials.offsetTop + 5,
        }
        drawFooter(reduced ? 0 : socialOffset.get())
      }
      const numbers = Array.from(element.querySelectorAll<HTMLElement>('.mobile-menu-links .mobile-menu-number')).map((number) => {
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
        // A wider curve covers the full numeral with less reach toward the label.
        depth: selected.left + selected.width + 4,
        radius: selected.height * 2.5,
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
  }, [panel, index, reduced, target, position, trailing, draw, drawFooter, socialOffset, onCovered])

  return (
    <svg className="mobile-menu-liquid" aria-hidden="true" focusable="false">
      <motion.path d={path} />
      <motion.path className="mobile-menu-liquid-footer" d={socialPath} />
    </svg>
  )
}
