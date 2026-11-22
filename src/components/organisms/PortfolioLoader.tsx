'use client'

import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { LoaderProgress, loaderProgressDuration } from '@/components/atoms/LoaderProgress'
import { heroFrameCount } from '@/components/atoms/heroFrames'
import { introCompleteEvent } from '@/hooks/useIntroReady'
import { getPeriodOpening } from '@/components/atoms/periodOpening'
import { mobileLoaderAtlas, mobileSpriteMedia } from '@/components/atoms/spriteAssets'
import { useClientReady } from '@/hooks/useClientReady'

const seenKey = 'portfolio:intro-seen'
// Frame timings preserve the landing and catch pauses in the sprite sequence.
const frameDurations = [
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 50,
  80, 60, 110, 80, 70, 60, 50, 80, 80, 1180,
]
const frameStarts = frameDurations.map((_, index) =>
  frameDurations.slice(0, index).reduce((total, duration) => total + duration, 0),
)
const landingAt = frameStarts[23]
const catchSettledAt = frameStarts[33]
const sequenceDuration = frameDurations.reduce((total, duration) => total + duration, 0)
const readingHoldDuration = 400
const readyDelayReduction = 333
const openerDuration = 1150
const introLines = ['I’m Jake']
const copyStartsAt = frameStarts[13] + 300
const letterFallDuration = 0.45
const letterFallStagger = 0.09
const fallingGlyphCount = introLines.join('').replace(/\s/g, '').length + 1
const copyLandedAt =
  copyStartsAt + ((fallingGlyphCount - 1) * letterFallStagger + letterFallDuration) * 1000
const copyFillStartsAt = copyLandedAt
const copyFillDuration = 650

function circlePath(x: number, y: number, radius: number) {
  return `M${x - radius},${y} A${radius},${radius} 0 1 0 ${x + radius},${y} A${radius},${radius} 0 1 0 ${x - radius},${y} Z`
}

export function PortfolioLoader({ playOnce = false }: { playOnce?: boolean }) {
  const [visible, setVisible] = useState(true)
  const [copyReady, setCopyReady] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const layer = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const period = useRef<HTMLSpanElement>(null)
  const opener = useRef<HTMLDivElement>(null)
  const openingProgress = useMotionValue(0)
  const titleFill = useMotionValue(0)
  const liquidPresence = useMotionValue(0)
  const reduceMotion = useReducedMotion()
  const clientReady = useClientReady()

  useEffect(() => {
    if (reduceMotion === null) return

    const documentRoot = document.documentElement

    delete documentRoot.dataset.introReveal

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
      // The intro also works when storage is unavailable.
    }

    let disposed = false
    let request = 0
    let timeout = 0
    let previousTime = 0
    let elapsed = 0
    let paintedFrame = -1
    let copyStarted = false
    let previousCopyFill = -1
    let assetsReady = false
    let assetsReadyAt = Number.POSITIVE_INFINITY
    let completedAssets = 0
    let openerStarted = false
    let openerOrigin = { x: 0, y: 0, radius: 0 }
    let stopOpener: (() => void) | undefined
    let stopTitleFill: (() => void) | undefined
    let titleFillStarted = false

    openingProgress.jump(0)
    titleFill.jump(0)
    liquidPresence.jump(0)

    const entrance = animate(liquidPresence, 1, {
      type: 'spring',
      duration: reduceMotion ? 0 : 0.42,
      bounce: 0.12,
    })
    const mobile = window.matchMedia(mobileSpriteMedia).matches

    delete documentRoot.dataset.introComplete

    const portfolio = document.querySelector<HTMLElement>('.portfolio')
    const previousOverflow = documentRoot.style.overflow
    const previousInert = portfolio?.inert ?? false

    documentRoot.style.overflow = 'hidden'
    documentRoot.dataset.introLoading = 'true'

    if (portfolio) portfolio.inert = true

    // Restore scrolling and interaction when the loader finishes or unmounts.
    function release() {
      if (disposed) return

      disposed = true
      cancelAnimationFrame(request)
      stopOpener?.()
      stopTitleFill?.()
      entrance.stop()
      clearTimeout(timeout)
      documentRoot.style.overflow = previousOverflow
      delete documentRoot.dataset.introLoading
      signalIntroComplete()

      if (portfolio) portfolio.inert = previousInert

      const restoreFocus = layer.current?.contains(document.activeElement)

      try {
        if (playOnce) sessionStorage.setItem(seenKey, '1')
      } catch {
        // Optional session persistence.
      }

      setVisible(false)

      if (restoreFocus)
        portfolio
          ?.querySelector<HTMLElement>('.scene[aria-hidden="false"]')
          ?.focus({ preventScroll: true })
    }

    timeout = window.setTimeout(release, 8000)

    const atlasImage = !reduceMotion && mobile ? new Image() : null

    if (atlasImage) atlasImage.src = mobileLoaderAtlas.src

    const frames =
      reduceMotion || atlasImage
        ? []
        : Array.from({ length: frameDurations.length }, (_, index) => {
            const image = new Image()

            image.src = `/images/mini-jacob-loader/frame-${String(index).padStart(3, '0')}.webp?v=4`

            return image
          })
    const context = canvas.current?.getContext('2d')

    if (atlasImage && context) {
      const { canvas: surface } = context

      surface.width = 960
      surface.height = 540
      context.scale(0.75, 0.75)
    }

    const heroAssets =
      reduceMotion || mobile
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
    let pageLoadHandler: (() => void) | undefined
    const pageReady =
      mobile || document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            pageLoadHandler = () => resolve()
            window.addEventListener('load', pageLoadHandler, { once: true })
          })
    const totalAssets = (atlasImage ? 1 : frames.length) + heroAssets.length + 2

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

    const loaderTasks = atlasImage
      ? [track(atlasImage.decode())]
      : frames.map((image) => track(image.decode()))
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

      if (!reduceMotion && !titleFillStarted && elapsed >= copyFillStartsAt) {
        titleFillStarted = true

        const control = animate(titleFill, 1, { duration: copyFillDuration / 1000, ease: 'linear' })

        stopTitleFill = () => control.stop()
      }

      const copyFill = reduceMotion ? 1 : titleFill.get()

      if (copyFill !== previousCopyFill) {
        layer.current?.style.setProperty('--title-fill', `${copyFill * 100}%`)
        const letters = layer.current?.querySelectorAll<HTMLElement>('.portfolio-loader-letter')

        letters?.forEach((letter, index) => {
          // Continue one reading sweep across the word instead of restarting on every glyph.
          const fill = Math.max(0, Math.min(1, copyFill * letters.length - index))

          letter.style.setProperty('--title-fill', `${fill * 100}%`)
        })
        previousCopyFill = copyFill
      }

      if (reduceMotion) {
        if (!copyStarted) {
          copyStarted = true
          setCopyReady(true)
        }

        if (elapsed >= 300 && assetsReady) release()
      } else {
        let frame = 0

        for (let index = frameStarts.length - 1; index >= 0; index -= 1) {
          if (elapsed < frameStarts[index]) continue

          frame = index

          break
        }

        if (context && frame !== paintedFrame) {
          context.clearRect(0, 0, 1280, 720)

          // Ground the fall in the sprite's coordinates so the shadow stays at the feet
          // across both the desktop and mobile canvas sizes.
          const approach = Math.min(1, Math.max(0, elapsed / landingAt))
          const growth = approach * approach
          const impact = frame === 23 || frame === 24 ? 1.08 : 1

          context.save()
          context.globalAlpha = 0.06 + growth * 0.24
          context.fillStyle = documentRoot.dataset.theme === 'dark' ? '#9072ce' : '#21123d'
          context.filter = `blur(${10 - growth * 6}px)`
          context.beginPath()
          context.ellipse(640, 620, (12 + growth * 62) * impact, 4 + growth * 7, 0, 0, Math.PI * 2)
          context.fill()
          context.restore()

          if (atlasImage) {
            const { columns, left, top, width, height, scale } = mobileLoaderAtlas

            context.drawImage(
              atlasImage,
              (frame % columns) * width,
              Math.floor(frame / columns) * height,
              width,
              height,
              left * scale,
              top * scale,
              width * scale,
              height * scale,
            )
          } else {
            context.drawImage(frames[frame], 0, 0)
          }

          canvas.current!.dataset.frame = String(frame)
          paintedFrame = frame
        }

        if (!copyStarted && elapsed >= copyStartsAt) {
          copyStarted = true
          setCopyReady(true)
        }

        if (layer.current && !openerStarted) {
          const phase =
            elapsed < copyStartsAt ? 'avatar' : elapsed < catchSettledAt ? 'copy' : 'catch'

          if (layer.current.dataset.phase !== phase) layer.current.dataset.phase = phase
        }

        const openerStartsAt = Math.max(
          sequenceDuration + readingHoldDuration - readyDelayReduction,
          copyFillStartsAt + copyFillDuration + readingHoldDuration,
        )
        const readinessOpeningStartsAt = Math.max(
          openerStartsAt,
          assetsReadyAt + loaderProgressDuration * 1000,
        )

        if (
          assetsReady &&
          elapsed >= readinessOpeningStartsAt &&
          period.current &&
          opener.current
        ) {
          // Keep the completed pill in the frame while the period reveals the site.
          if (!openerStarted) {
            const bounds = period.current.getBoundingClientRect()
            const x = bounds.left + bounds.width / 2
            const y = bounds.top + bounds.height / 2

            openerOrigin = { x, y, radius: bounds.width / 2 }
            openerStarted = true
            opener.current.style.visibility = 'visible'
            documentRoot.dataset.introReveal = 'ring'

            // Share the site's period reveal while Motion controls the opening clock.
            const control = animate(openingProgress, 1, {
              duration: openerDuration / 1000,
              ease: 'linear',
            })

            stopOpener = () => control.stop()
          }

          const progress = openingProgress.get()
          const { x, y } = openerOrigin
          const reach = Math.max(
            Math.hypot(x, y),
            Math.hypot(innerWidth - x, y),
            Math.hypot(x, innerHeight - y),
            Math.hypot(innerWidth - x, innerHeight - y),
          )
          const { outerRadius: radius, innerRadius: holeRadius } = getPeriodOpening(
            progress,
            openerOrigin.radius,
            reach,
          )

          opener.current.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`

          if (layer.current) {
            layer.current.dataset.phase = 'opening'
            layer.current.dataset.openerOrigin = `${x},${y}`
            layer.current.dataset.aperture = holeRadius > 0 ? 'open' : 'closed'

            if (holeRadius > 0) {
              const holePath = circlePath(x, y, holeRadius)

              layer.current.style.clipPath = `path(evenodd, "M0,0 H${innerWidth} V${innerHeight} H0 Z ${holePath}")`
            }
          }

          if (progress === 1) release()
        }
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
      stopOpener?.()
      stopTitleFill?.()
      entrance.stop()
      clearTimeout(timeout)

      if (pageLoadHandler) window.removeEventListener('load', pageLoadHandler)

      documentRoot.style.overflow = previousOverflow
      delete documentRoot.dataset.introLoading

      if (portfolio) portfolio.inert = previousInert
    }
  }, [playOnce, reduceMotion, openingProgress, liquidPresence, titleFill])

  if (!visible) return null

  return (
    <motion.div
      ref={layer}
      className="portfolio-loader"
      data-active={clientReady ? '' : undefined}
      data-phase="avatar"
      data-play-once={playOnce}
      data-load-progress={loadProgress}
      data-assets-ready={isReady}
    >
      <div ref={opener} className="portfolio-loader-opener" aria-hidden="true" />
      <span role="status" className="sr-only">
        Loading Jacob Moya’s portfolio
      </span>
      <LoaderProgress progress={loadProgress} presence={liquidPresence} />
      <div className="portfolio-loader-silhouette" aria-hidden="true">
        {introLines.map((line, lineIndex) => (
          <motion.span
            className="portfolio-loader-copy-echo"
            key={line}
            initial={{ opacity: 0, y: '-6svh' }}
            animate={
              copyReady
                ? {
                    opacity: reduceMotion ? 0.14 : [0, 0.2, 0.14],
                    y: reduceMotion ? '0svh' : ['-6svh', '1svh', '0svh'],
                  }
                : { opacity: 0 }
            }
            transition={{
              duration: reduceMotion ? 0 : 0.72,
              times: [0, 0.6, 1],
              delay: reduceMotion ? 0 : (introLines.length - 1 - lineIndex) * 0.24 + 0.08,
              ease: 'easeOut',
            }}
          >
            {line}
          </motion.span>
        ))}
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
            <span className="portfolio-loader-copy-row" key={line}>
              <motion.span
                className="portfolio-loader-copy-line"
                initial={{ opacity: 0 }}
                animate={{ opacity: copyReady ? 1 : 0 }}
                transition={{ duration: 0 }}
              >
                {[...line].map((letter, index) => {
                  if (/\s/.test(letter))
                    return (
                      <span key={index} className="portfolio-loader-letter-space">
                        {letter}
                      </span>
                    )

                  const ordinal = [
                    ...introLines.slice(0, lineIndex).join(''),
                    ...line.slice(0, index),
                  ].filter((letter) => !/\s/.test(letter)).length
                  const delay = reduceMotion || !copyReady ? 0 : ordinal * letterFallStagger

                  return (
                    <motion.span
                      key={index}
                      className="portfolio-loader-letter portfolio-loader-text-fill"
                      initial={{ opacity: 0, y: -165 }}
                      animate={copyReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -165 }}
                      transition={{
                        type: 'spring',
                        duration: reduceMotion ? 0 : letterFallDuration,
                        bounce: 0.1,
                        delay,
                        opacity: { duration: 0, delay },
                      }}
                    >
                      {letter}
                    </motion.span>
                  )
                })}
                {lineIndex === introLines.length - 1 && (
                  <motion.span
                    ref={period}
                    className="portfolio-loader-period"
                    initial={{ opacity: 0, y: -165 }}
                    animate={copyReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -165 }}
                    transition={{
                      type: 'spring',
                      duration: reduceMotion ? 0 : letterFallDuration,
                      bounce: 0.1,
                      delay:
                        reduceMotion || !copyReady
                          ? 0
                          : (fallingGlyphCount - 1) * letterFallStagger,
                      opacity: {
                        duration: 0,
                        delay:
                          reduceMotion || !copyReady
                            ? 0
                            : (fallingGlyphCount - 1) * letterFallStagger,
                      },
                    }}
                  />
                )}
              </motion.span>
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
