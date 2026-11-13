'use client'

import { motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { heroFrameCount } from '@/components/atoms/heroFrames'
import { introCompleteEvent } from '@/hooks/useIntroReady'

const seenKey = 'portfolio:intro-seen'
const frameDurations = [
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20,
  20, 20, 50, 80, 60, 110, 80, 70, 60, 50, 80, 80, 1180,
]
const frameStarts = frameDurations.map((_, index) =>
  frameDurations.slice(0, index).reduce((total, duration) => total + duration, 0),
)
const catchSettledAt = frameStarts[33]
const sequenceDuration = frameDurations.reduce((total, duration) => total + duration, 0)
const readingHoldDuration = 400
const readyDelayReduction = 333
const fadeDuration = 300
const introLines = ['hey', 'I am', 'Jacob']
const copyStartsAt = frameStarts[13] + 300

export function PortfolioLoader({ playOnce = false }: { playOnce?: boolean }) {
  const [visible, setVisible] = useState(true)
  const [copyReady, setCopyReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const layer = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const overlayOpacity = useMotionValue(1)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion === null) return
    const documentRoot = document.documentElement
    function signalIntroComplete() {
      documentRoot.dataset.introComplete = 'true'
      window.dispatchEvent(new Event(introCompleteEvent))
    }
    try {
      if (playOnce && sessionStorage.getItem(seenKey)) {
        const skip = requestAnimationFrame(() => {
          signalIntroComplete()
          setVisible(false)
        })
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
    let copyStarted = false
    let assetsReady = false
    let assetsReadyAt = Number.POSITIVE_INFINITY
    let completedAssets = 0
    delete documentRoot.dataset.introComplete
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
      signalIntroComplete()
      if (portfolio) portfolio.inert = previousInert
      const restoreFocus = layer.current?.contains(document.activeElement)
      try {
        if (playOnce) sessionStorage.setItem(seenKey, '1')
      } catch {
        /* Optional session persistence. */
      }
      setVisible(false)
      if (restoreFocus)
        portfolio
          ?.querySelector<HTMLElement>('.scene[aria-hidden="false"]')
          ?.focus({ preventScroll: true })
    }
    timeout = window.setTimeout(release, 8000)

    const frames = reduceMotion
      ? []
      : Array.from({ length: frameDurations.length }, (_, index) => {
          const image = new Image()
          image.src = `/images/mini-jacob-loader/frame-${String(index).padStart(3, '0')}.webp?v=4`
          return image
        })
    const context = canvas.current?.getContext('2d')
    const heroAssets = reduceMotion
      ? []
      : [
          '/jm-symbol.svg',
          ...Array.from(
            { length: heroFrameCount },
            (_, index) => `/images/mini-jacob/frame-${String(index).padStart(3, '0')}.webp?v=3`,
          ),
        ].map((source) => {
          const image = new Image()
          image.src = source
          return image
        })
    let resolvePageReady = () => {}
    const pageReady =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            resolvePageReady = resolve
            window.addEventListener('load', resolve, { once: true })
          })
    const totalAssets = frames.length + heroAssets.length + 2
    function track(task: Promise<unknown>) {
      return task.then((result) => {
        completedAssets += 1
        const progress = Math.round((completedAssets / totalAssets) * 100)
        if (!disposed) {
          setLoadProgress(progress)
          if (layer.current) layer.current.dataset.loadProgress = String(progress)
        }
        return result
      })
    }
    const loaderTasks = frames.map((image) => track(image.decode()))
    const readinessTasks = [
      track(document.fonts.ready),
      track(pageReady),
      ...heroAssets.map((image) => track(image.decode())),
    ]

    function tick(time: number) {
      if (disposed) return
      const delta = previousTime ? Math.min(50, time - previousTime) : 0
      previousTime = time
      if (!document.hidden) elapsed += delta
      if (reduceMotion) {
        if (!copyStarted) {
          copyStarted = true
          setCopyReady(true)
        }
        if (elapsed >= 300 && assetsReady) release()
      } else {
        const frame = Math.max(
          0,
          frameStarts.findLastIndex((start) => elapsed >= start),
        )
        if (context && frame !== paintedFrame) {
          context.clearRect(0, 0, 1280, 720)
          context.drawImage(frames[frame], 0, 0)
          canvas.current!.dataset.frame = String(frame)
          paintedFrame = frame
        }
        if (!copyStarted && elapsed >= copyStartsAt) {
          copyStarted = true
          setCopyReady(true)
        }
        if (layer.current)
          layer.current.dataset.phase =
            elapsed < copyStartsAt ? 'avatar' : elapsed < catchSettledAt ? 'copy' : 'catch'
        const fadeStartsAt = sequenceDuration + readingHoldDuration - readyDelayReduction
        const readinessFadeStartsAt = Math.max(fadeStartsAt, assetsReadyAt)
        if (elapsed > readinessFadeStartsAt) {
          overlayOpacity.set(Math.max(0, 1 - (elapsed - readinessFadeStartsAt) / fadeDuration))
        }
        if (assetsReady && elapsed >= readinessFadeStartsAt + fadeDuration) release()
      }
      if (!disposed) request = requestAnimationFrame(tick)
    }

    Promise.all(loaderTasks)
      .then(() => {
        if (!disposed) request = requestAnimationFrame(tick)
      })
      .catch(release)
    Promise.all([...loaderTasks, ...readinessTasks])
      .then(() => {
        if (disposed) return
        assetsReady = true
        assetsReadyAt = elapsed
        setIsReady(true)
      })
      .catch(release)

    return () => {
      disposed = true
      cancelAnimationFrame(request)
      clearTimeout(timeout)
      window.removeEventListener('load', resolvePageReady)
      documentRoot.style.overflow = previousOverflow
      delete documentRoot.dataset.introLoading
      if (portfolio) portfolio.inert = previousInert
    }
  }, [playOnce, reduceMotion, overlayOpacity])

  if (!visible) return null
  return (
    <motion.div
      ref={layer}
      className="portfolio-loader"
      data-phase="avatar"
      data-play-once={playOnce}
      data-load-progress={loadProgress}
      data-assets-ready={isReady}
      style={{ opacity: overlayOpacity }}
    >
      <span role="status" className="sr-only">
        Loading Jacob Moya’s portfolio
      </span>
      <div
        className="portfolio-loader-progress"
        role="progressbar"
        aria-label="Loading portfolio assets"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={loadProgress}
      >
        <span style={{ width: `${loadProgress}%` }} />
      </div>
      <canvas
        ref={canvas}
        className="portfolio-loader-avatar"
        width={1280}
        height={720}
        aria-hidden="true"
      />
      <div className="portfolio-loader-copy-anchor" aria-hidden="true">
        <div className="portfolio-loader-copy">
          {introLines.map((line, lineIndex) => (
            <motion.span
              className="portfolio-loader-copy-line"
              key={line}
              initial={{ opacity: 0, y: -165 - lineIndex * 24, rotate: lineIndex % 2 ? 4 : -4 }}
              animate={
                copyReady
                  ? {
                      opacity: [0, 1, 1, 1],
                      y: [-165 - lineIndex * 24, 0, 9, 0],
                      rotate: [lineIndex % 2 ? 4 : -4, 0, lineIndex % 2 ? -1 : 1, 0],
                    }
                  : { opacity: 0, y: -165 - lineIndex * 24 }
              }
              transition={{
                duration: 0.56,
                times: [0, 0.44, 0.62, 1],
                ease: [0.45, 0, 0.55, 1],
                delay: (introLines.length - 1 - lineIndex) * 0.24,
              }}
            >
              {line}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
