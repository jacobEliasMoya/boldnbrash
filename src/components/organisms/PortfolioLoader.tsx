'use client'

import { motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const seenKey = 'portfolio:intro-seen'

export function PortfolioLoader() {
  const [visible, setVisible] = useState(true)
  const layer = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const finish = useRef<() => void>(() => {})
  const nameY = useMotionValue(-1500)
  const nameOpacity = useMotionValue(0)
  const overlayOpacity = useMotionValue(1)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion === null) return
    try {
      if (sessionStorage.getItem(seenKey)) {
        const skip = requestAnimationFrame(() => setVisible(false))
        return () => cancelAnimationFrame(skip)
      }
    } catch {
      /* The intro also works when storage is unavailable. */
    }
    let disposed = false
    let request = 0
    let timeout = 0
    let previousTime = 0
    let elapsed = 0
    let paintedFrame = -1
    const documentRoot = document.documentElement
    const portfolio = document.querySelector<HTMLElement>('.portfolio')
    const previousOverflow = documentRoot.style.overflow
    const previousInert = portfolio?.inert ?? false
    documentRoot.style.overflow = 'hidden'
    documentRoot.dataset.introLoading = 'true'
    if (portfolio) portfolio.inert = true

    function release() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(request)
      clearTimeout(timeout)
      documentRoot.style.overflow = previousOverflow
      delete documentRoot.dataset.introLoading
      if (portfolio) portfolio.inert = previousInert
      const restoreFocus = layer.current?.contains(document.activeElement)
      try {
        sessionStorage.setItem(seenKey, '1')
      } catch {
        /* Optional session persistence. */
      }
      setVisible(false)
      if (restoreFocus)
        portfolio
          ?.querySelector<HTMLElement>('.scene[aria-hidden="false"]')
          ?.focus({ preventScroll: true })
    }
    finish.current = release
    timeout = window.setTimeout(release, 8000)

    const frames = reduceMotion
      ? []
      : Array.from({ length: 28 }, (_, index) => {
          const image = new Image()
          image.src = `/images/mini-jacob-loader/frame-${String(index).padStart(3, '0')}.webp`
          return image
        })
    const context = canvas.current?.getContext('2d')

    function tick(time: number) {
      if (disposed) return
      const delta = previousTime ? Math.min(50, time - previousTime) : 0
      previousTime = time
      if (!document.hidden) elapsed += delta
      if (reduceMotion) {
        nameY.set(0)
        nameOpacity.set(1)
        if (elapsed >= 300) release()
      } else {
        const frame =
          elapsed < 1680
            ? Math.min(23, Math.floor(elapsed / 70))
            : elapsed < 1950
              ? 23
              : elapsed < 2030
                ? 24
                : elapsed < 2130
                  ? 25
                  : elapsed < 2250
                    ? 26
                    : 27
        if (context && frame !== paintedFrame) {
          context.clearRect(0, 0, 1280, 720)
          context.drawImage(frames[frame], 0, 0)
          canvas.current!.dataset.frame = String(frame)
          paintedFrame = frame
        }
        const drop = Math.max(0, Math.min(1, (elapsed - 1500) / 450))
        const scale = Math.max(640, Math.min(window.innerWidth, 1280)) / 1280
        let offset = -window.innerHeight * (1 - drop * drop)
        if (elapsed >= 1950) {
          const catchProgress = Math.min(1, (elapsed - 1950) / 350)
          offset =
            (70 * catchProgress + Math.sin(catchProgress * Math.PI * 2) * 8 * (1 - catchProgress)) *
            scale
        }
        nameY.set(offset)
        nameOpacity.set(elapsed >= 1500 ? 1 : 0)
        if (layer.current)
          layer.current.dataset.phase =
            elapsed < 1500 ? 'avatar' : elapsed < 1950 ? 'name' : 'catch'
        if (elapsed > 2650) overlayOpacity.set(Math.max(0, 1 - (elapsed - 2650) / 400))
        if (elapsed >= 3050) release()
      }
      if (!disposed) request = requestAnimationFrame(tick)
    }

    Promise.all([document.fonts.ready, ...frames.map((image) => image.decode())])
      .then(() => {
        if (!disposed) request = requestAnimationFrame(tick)
      })
      .catch(release)

    return () => {
      disposed = true
      cancelAnimationFrame(request)
      clearTimeout(timeout)
      documentRoot.style.overflow = previousOverflow
      delete documentRoot.dataset.introLoading
      if (portfolio) portfolio.inert = previousInert
    }
  }, [reduceMotion, nameY, nameOpacity, overlayOpacity])

  if (!visible) return null
  return (
    <motion.div
      ref={layer}
      className="portfolio-loader"
      data-phase="avatar"
      style={{ opacity: overlayOpacity }}
    >
      <span role="status" className="sr-only">
        Loading Jacob Moya’s portfolio
      </span>
      <canvas
        ref={canvas}
        className="portfolio-loader-avatar"
        width={1280}
        height={720}
        aria-hidden="true"
      />
      <div className="portfolio-loader-name-anchor" aria-hidden="true">
        <motion.div className="portfolio-loader-name" style={{ y: nameY, opacity: nameOpacity }}>
          <span>Jacob</span>
          <span>Moya</span>
        </motion.div>
      </div>
      <button type="button" className="portfolio-loader-skip" onClick={() => finish.current()}>
        Skip intro ↗
      </button>
    </motion.div>
  )
}
