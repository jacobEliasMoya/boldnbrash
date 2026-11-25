'use client'

import { MenuCloseDots, MenuTriangleDots } from '@/components/atoms/dot-icons/MobileMenuDots'
import { mergeDots } from '@/components/atoms/dot-icons/dotMotion'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { createPortal } from 'react-dom'
import { BlendedLogo } from '@/components/atoms/BlendedLogo'
import { circleRevealTransition, getPeriodOpening } from '@/components/atoms/periodOpening'
import { MobileMenuLiquid } from './MobileMenuLiquid'
import { ThemeToggle } from '@/components/atoms/ThemeToggle'
import {
  useHeaderEntrance,
  getMobileHeaderPop,
  mobileHeaderRest,
  mobileHeaderEntered,
} from '@/hooks/useHeaderEntrance'
import { menuSocialStartOffset, ProfileLinks } from '@/components/molecules/ProfileLinks'

type Scene = { id: string; label: string }

type Phase = 'opening' | 'menu' | 'expanding'

const mergedDotRadius = 3.5 * Math.sqrt(3)
const mergeDuration = 0.26
const menuPopStart = { opacity: 0, scale: 0.84 }
const menuPopEnd = { opacity: 1, scale: 1 }
const menuPop = { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const }
const numberStagger = 0.07
const linkPopStart = { opacity: 0, scale: 0.78, y: 8 }
const linkPopEnd = { opacity: 1, scale: 1, y: 0 }
const labelFill = { '--letter-fill': '100%' }
const labelFillRest = { '--letter-fill': '0%' }

export function MobileMenu({
  scenes,
  active,
  tone,
  introReady,
  onNavigate,
  onOpenChange,
}: {
  scenes: readonly Scene[]
  active: number
  tone: 'paper' | 'dark'
  introReady: boolean
  onNavigate: (index: number) => void
  onOpenChange: (open: boolean) => void
}) {
  const headerEntrance = useHeaderEntrance()
  const dialog = useRef<HTMLDialogElement>(null)
  const menuPanel = useRef<HTMLDivElement>(null)
  const openingRing = useRef<SVGCircleElement>(null)
  const entryRing = useRef<SVGCircleElement>(null)
  const entryOrigin = useRef({ x: 0, y: 0, radius: 0 })
  const entryGeometry = useRef({ reach: 0, firstNumberReach: Infinity })
  const numbersStarted = useRef(false)
  const stopEntering = useRef<(() => void) | null>(null)
  const stopGathering = useRef<(() => void) | null>(null)
  const stopOpening = useRef<(() => void) | null>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const closeToggle = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(active)
  const [covered, setCovered] = useState<number | null>(null)
  const filled = useRef<number | null>(null)
  const pendingLink = useRef<{ index: number; link: HTMLAnchorElement } | null>(null)
  const handleCovered = useCallback((index: number | null) => setCovered(index), [])

  useEffect(() => {
    if (filled.current !== highlighted) filled.current = null

    if (pendingLink.current?.index !== highlighted) pendingLink.current = null
  }, [highlighted])

  const drag = useRef<{ id: number; y: number; index: number; moved: boolean } | null>(null)
  const wheelInput = useRef({ delta: 0, time: 0 })
  const [gathering, setGathering] = useState(false)
  const [phase, setPhase] = useState<Phase>('menu')
  const [entrance, setEntrance] = useState<'waiting' | 'links' | 'liquid' | 'socials'>('waiting')
  const showSocials = useCallback(() => {
    setEntrance((stage) => (stage === 'liquid' ? 'socials' : stage))
  }, [])
  const [selection, setSelection] = useState<{
    index: number
    x: number
    y: number
  } | null>(null)
  const reduceMotion = useReducedMotion()
  const gather = useMotionValue(0)
  const closeGather = useMotionValue(0)
  const menuRebound = useMotionValue(1)
  const closeRebound = useMotionValue(1)
  const entryProgress = useMotionValue(0)
  const panelClip = useMotionValue('none')
  const socialOffset = useMotionValue(menuSocialStartOffset)

  useEffect(
    () => () => {
      stopOpening.current?.()
      stopEntering.current?.()
      stopGathering.current?.()
    },
    [],
  )

  const finishClose = useCallback(
    (destination?: string, spreadDots = false) => {
      stopOpening.current?.()
      stopEntering.current?.()
      stopGathering.current?.()
      closeGather.set(0)
      menuRebound.jump(1)
      closeRebound.jump(1)

      if (spreadDots) {
        const control = animate(gather, 0, { duration: mergeDuration, ease: [0.4, 0, 0.2, 1] })

        stopGathering.current = () => control.stop()
      } else {
        gather.set(0)
      }

      setGathering(false)

      if (dialog.current?.open) dialog.current.close()

      setOpen(false)
      setPhase('menu')
      setSelection(null)
      pendingLink.current = null
      filled.current = null
      setCovered(null)
      onOpenChange(false)
      requestAnimationFrame(() => {
        const target = destination ? document.getElementById(destination) : toggle.current

        target?.focus({ preventScroll: true })
      })
    },
    [onOpenChange, gather, closeGather, menuRebound, closeRebound],
  )

  const measureEntry = useCallback(() => {
    const panel = menuPanel.current

    if (!panel) return

    const { x, y } = entryOrigin.current
    const firstNumber = panel.querySelector('.mobile-menu-links .mobile-menu-number')
    const numberBounds = firstNumber?.getBoundingClientRect()
    const panelBounds = panel.getBoundingClientRect()

    entryGeometry.current = {
      reach: Math.hypot(Math.max(x, panel.clientWidth - x), Math.max(y, panel.clientHeight - y)),
      firstNumberReach: numberBounds
        ? Math.hypot(
            x - (numberBounds.right - panelBounds.left),
            y - (numberBounds.top - panelBounds.top),
          )
        : Infinity,
    }
  }, [])

  const renderEntry = useCallback(
    (progress: number) => {
      const { x, y, radius } = entryOrigin.current
      const { reach, firstNumberReach } = entryGeometry.current
      const aperture = getPeriodOpening(progress, radius, reach)

      panelClip.set(`circle(${aperture.innerRadius}px at ${x}px ${y}px)`)

      if (!numbersStarted.current && aperture.innerRadius >= firstNumberReach) {
        numbersStarted.current = true
        setEntrance('links')
      }

      if (entryRing.current) {
        entryRing.current.style.visibility = 'visible'
        entryRing.current.setAttribute('cx', String(x))
        entryRing.current.setAttribute('cy', String(y))
        entryRing.current.setAttribute('r', String(aperture.ringRadius))
        entryRing.current.setAttribute('stroke-width', String(aperture.ringWidth))
      }
    },
    [panelClip],
  )

  useLayoutEffect(() => {
    if (!open) return

    const previousOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    dialog.current?.showModal()
    measureEntry()

    const observer = new ResizeObserver(measureEntry)

    if (menuPanel.current) observer.observe(menuPanel.current)

    if (!reduceMotion && menuPanel.current) {
      entryProgress.set(0)
      renderEntry(0)

      const control = animate(entryProgress, 1, {
        ...circleRevealTransition,
        onUpdate: renderEntry,
        onComplete: () => {
          panelClip.set('none')

          if (entryRing.current) entryRing.current.style.visibility = 'hidden'

          setEntrance((stage) => (stage === 'waiting' ? 'links' : stage))
          setPhase('menu')
        },
      })

      stopEntering.current = () => control.stop()
    }

    return () => {
      stopEntering.current?.()
      observer.disconnect()
      document.documentElement.style.overflow = previousOverflow
    }
  }, [open, reduceMotion, entryProgress, panelClip, renderEntry, measureEntry])

  function closeMenu() {
    if (phase === 'expanding') return

    pendingLink.current = null
    stopEntering.current?.()
    stopOpening.current?.()
    stopGathering.current?.()

    const link =
      menuPanel.current?.querySelectorAll<HTMLAnchorElement>('.mobile-menu-links > a')[highlighted]

    if (!link) {
      finishClose()

      return
    }

    const centerDot = closeToggle.current?.querySelector<HTMLElement>(
      '.mobile-menu-close-dots i:nth-child(3)',
    )

    if (reduceMotion) {
      beginNavigation(highlighted, link, centerDot ?? undefined)

      return
    }

    setPhase('expanding')
    stopGathering.current = mergeDots(closeGather, closeRebound, () =>
      beginNavigation(highlighted, link, centerDot ?? undefined),
    )
  }

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 760px)')

    function resize() {
      if (!compact.matches && (open || gathering)) finishClose()
    }

    compact.addEventListener('change', resize)

    return () => compact.removeEventListener('change', resize)
  }, [open, gathering, finishClose])

  function choose(event: MouseEvent<HTMLAnchorElement>, index: number) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    event.preventDefault()
    event.stopPropagation()

    if (phase !== 'menu') return

    if (drag.current?.moved) {
      drag.current = null

      return
    }

    setHighlighted(index)
    pendingLink.current = { index, link: event.currentTarget }

    if (filled.current === index && covered === index) {
      pendingLink.current = null
      beginNavigation(index, event.currentTarget)
    }
  }

  function beginNavigation(index: number, link: HTMLAnchorElement, origin?: HTMLElement) {
    const period = origin ?? link.querySelector<HTMLElement>('.mobile-menu-number')!
    const panel = link.closest<HTMLElement>('.mobile-menu-panel')!
    const bounds = period.getBoundingClientRect()
    const panelBounds = panel.getBoundingClientRect()
    const x =
      ((bounds.left + bounds.width / 2 - panelBounds.left) * panel.clientWidth) / panelBounds.width
    const y =
      ((bounds.top + bounds.height / 2 - panelBounds.top) * panel.clientHeight) / panelBounds.height

    setSelection({
      index,
      x,
      y,
    })
    setPhase('expanding')
    onNavigate(index)

    if (reduceMotion) {
      finishClose(scenes[index].id)

      return
    }

    const reach = Math.hypot(
      Math.max(x, panel.clientWidth - x),
      Math.max(y, panel.clientHeight - y),
    )
    const dotRadius = (bounds.width * panel.clientWidth) / panelBounds.width / 2
    const control = animate(0, 1, {
      ...circleRevealTransition,
      onUpdate: (progress) => {
        const aperture = getPeriodOpening(progress, dotRadius, reach)

        if (menuPanel.current) {
          const r = aperture.innerRadius
          const hole = `M${x - r},${y} A${r},${r} 0 1 0 ${x + r},${y} A${r},${r} 0 1 0 ${x - r},${y} Z`

          panelClip.set(
            r > 0
              ? `path(evenodd, "M0,0 H${panel.clientWidth} V${panel.clientHeight} H0 Z ${hole}")`
              : 'none',
          )
        }

        if (openingRing.current) {
          openingRing.current.setAttribute('r', String(aperture.ringRadius))
          openingRing.current.setAttribute('stroke-width', String(aperture.ringWidth))
        }
      },
      onComplete: () => finishClose(scenes[index].id),
    })

    stopOpening.current = () => control.stop()
  }

  return (
    <>
      <BlendedLogo
        enabled={introReady && reduceMotion === false}
        ready={introReady}
        tone={tone}
        control
        menu
      >
        <motion.button
          ref={toggle}
          type="button"
          className="mobile-menu-toggle"
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-controls="mobile-menu"
          aria-expanded={open}
          initial={mobileHeaderRest}
          animate={introReady ? mobileHeaderEntered : mobileHeaderRest}
          transition={getMobileHeaderPop(headerEntrance.menuDelay, reduceMotion)}
          onAnimationComplete={() => {
            if (!introReady || !window.matchMedia('(max-width: 760px)').matches) return

            document.documentElement.dataset.mobileNavReady = 'true'
            window.dispatchEvent(new Event('portfolio:mobile-nav-ready'))
          }}
          onClick={(event) => {
            if (gathering || open) return

            const bounds = event.currentTarget.getBoundingClientRect()
            const origin = {
              x: bounds.left + bounds.width / 2,
              y: bounds.top + bounds.height / 2,
              radius: mergedDotRadius,
            }

            entryOrigin.current = origin

            const openMenu = () => {
              const { x, y } = entryOrigin.current

              socialOffset.jump(reduceMotion ? 0 : menuSocialStartOffset)
              panelClip.set(reduceMotion ? 'none' : `circle(0px at ${x}px ${y}px)`)
              setGathering(false)
              setHighlighted(active)
              drag.current = null
              setPhase(reduceMotion ? 'menu' : 'opening')
              numbersStarted.current = false
              setEntrance(reduceMotion ? 'socials' : 'waiting')
              setSelection(null)
              setOpen(true)
              onOpenChange(true)
            }

            if (reduceMotion) {
              openMenu()

              return
            }

            setGathering(true)
            stopGathering.current = mergeDots(gather, menuRebound, openMenu)
          }}
        >
          <motion.span
            className="mobile-menu-dots"
            aria-hidden="true"
            style={{ scale: menuRebound }}
          >
            <MenuTriangleDots gather={gather} />
          </motion.span>
        </motion.button>
      </BlendedLogo>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            id="mobile-menu"
            className="mobile-menu-dialog"
            data-transitioning={phase !== 'menu' ? '' : undefined}
            aria-label="Mobile navigation"
            onCancel={(event) => {
              event.preventDefault()
              closeMenu()
            }}
          >
            <svg className="mobile-menu-entry-ring" aria-hidden="true" focusable="false">
              <circle ref={entryRing} />
            </svg>
            {open && (
              <motion.div
                ref={menuPanel}
                className="mobile-menu-panel"
                initial={false}
                style={{ clipPath: panelClip }}
              >
                <MobileMenuLiquid
                  panel={menuPanel}
                  index={highlighted}
                  reduced={!!reduceMotion}
                  onCovered={handleCovered}
                  socialOffset={socialOffset}
                  selectionReady={entrance === 'liquid' || entrance === 'socials'}
                  onSelectionRaised={showSocials}
                />
                <div className="mobile-menu-heading">
                  <a
                    className="wordmark"
                    href="#top"
                    aria-label="Jacob Moya home"
                    onClick={(event) => {
                      event.preventDefault()
                      beginNavigation(0, event.currentTarget)
                    }}
                  >
                    <span className="wordmark-symbol mobile-menu-number" aria-hidden="true" />
                  </a>
                  <ThemeToggle inline />
                  <button
                    ref={closeToggle}
                    type="button"
                    className="mobile-menu-close"
                    aria-label="Close menu"
                    autoFocus
                    onClick={closeMenu}
                  >
                    <motion.span
                      className="mobile-menu-close-dots"
                      aria-hidden="true"
                      style={{ scale: closeRebound }}
                    >
                      <MenuCloseDots gather={closeGather} />
                    </motion.span>
                  </button>
                </div>
                <nav
                  className="mobile-menu-links"
                  aria-label="Mobile portfolio"
                  inert={phase !== 'menu'}
                  onWheel={(event) => {
                    if (phase !== 'menu' || event.ctrlKey || !Number.isFinite(event.deltaY)) return

                    event.stopPropagation()

                    const delta =
                      event.deltaY *
                      (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1)
                    const now = performance.now()

                    if (
                      now - wheelInput.current.time > 180 ||
                      Math.sign(delta) !== Math.sign(wheelInput.current.delta)
                    ) {
                      wheelInput.current.delta = 0
                    }

                    wheelInput.current.time = now
                    wheelInput.current.delta += delta

                    if (Math.abs(wheelInput.current.delta) >= 32) {
                      // One discrete selection per wheel event, even for page-mode bursts.
                      const step = Math.sign(delta)

                      setHighlighted((current) =>
                        Math.max(0, Math.min(scenes.length - 1, current + step)),
                      )
                      wheelInput.current.delta = 0
                    }
                  }}
                  onPointerDown={(event) => {
                    drag.current = null

                    if (event.pointerType !== 'mouse' && event.isPrimary) {
                      drag.current = {
                        id: event.pointerId,
                        y: event.clientY,
                        index: highlighted,
                        moved: false,
                      }
                    }
                  }}
                  onPointerMove={(event) => {
                    if (
                      !drag.current ||
                      drag.current.id !== event.pointerId ||
                      event.pointerType === 'mouse' ||
                      phase !== 'menu'
                    )
                      return

                    // The menu selector follows the finger rather than document scrolling.
                    const distance = event.clientY - drag.current.y

                    if (Math.abs(distance) > 10) drag.current.moved = true

                    setHighlighted(
                      Math.max(
                        0,
                        Math.min(scenes.length - 1, drag.current.index + Math.round(distance / 48)),
                      ),
                    )
                  }}
                  onPointerUp={(event) => {
                    if (drag.current?.id !== event.pointerId) return

                    // End movement, retaining the moved flag to suppress the following click.
                    drag.current.id = -1
                  }}
                  onPointerCancel={() => {
                    drag.current = null
                  }}
                >
                  {scenes.map((scene, index) => (
                    <a
                      key={scene.id}
                      href={`#${scene.id}`}
                      aria-label={`${scene.label}.`}
                      aria-current={active === index ? 'location' : undefined}
                      data-highlighted={highlighted === index ? '' : undefined}
                      onPointerEnter={(event) => {
                        if (event.pointerType === 'mouse' && phase === 'menu') setHighlighted(index)
                      }}
                      onFocus={() => setHighlighted(index)}
                      onClick={(event) => choose(event, index)}
                    >
                      <span className="mobile-menu-number" aria-hidden="true">
                        {[false, true].map((contrast) => (
                          <motion.span
                            key={String(contrast)}
                            className={contrast ? 'mobile-menu-number-contrast' : undefined}
                            initial={reduceMotion ? false : menuPopStart}
                            animate={entrance === 'waiting' ? menuPopStart : menuPopEnd}
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : { ...menuPop, delay: index * numberStagger }
                            }
                          >
                            0{index + 1}
                          </motion.span>
                        ))}
                      </span>
                      <motion.span
                        className="mobile-menu-label"
                        initial={reduceMotion ? false : linkPopStart}
                        animate={
                          !reduceMotion && entrance === 'waiting' ? linkPopStart : linkPopEnd
                        }
                        transition={{
                          type: 'spring',
                          duration: reduceMotion ? 0 : 0.23,
                          bounce: 0.35,
                          delay: reduceMotion ? 0 : (index + 2) * numberStagger,
                          opacity: {
                            duration: reduceMotion ? 0 : 0.12,
                            delay: reduceMotion ? 0 : (index + 2) * numberStagger,
                          },
                        }}
                        onAnimationComplete={(target) => {
                          if (
                            index === scenes.length - 1 &&
                            typeof target === 'object' &&
                            'scale' in target &&
                            target.scale === 1
                          ) {
                            setEntrance((stage) => (stage === 'links' ? 'liquid' : stage))
                          }
                        }}
                      >
                        <motion.span
                          className="mobile-menu-label-fill"
                          initial={false}
                          animate={
                            highlighted === index && covered === index ? labelFill : labelFillRest
                          }
                          transition={{
                            duration: reduceMotion ? 0 : 0.33,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          onAnimationStart={() => {
                            if (filled.current === index) filled.current = null
                          }}
                          onAnimationComplete={(definition) => {
                            if (
                              typeof definition !== 'object' ||
                              !('--letter-fill' in definition) ||
                              definition['--letter-fill'] !== '100%' ||
                              highlighted !== index
                            )
                              return

                            filled.current = index

                            const pending = pendingLink.current

                            if (pending?.index === index && phase === 'menu') {
                              pendingLink.current = null
                              beginNavigation(index, pending.link)
                            }
                          }}
                        >
                          {scene.label}
                        </motion.span>
                        <span
                          className="mobile-menu-period"
                          aria-hidden="true"
                          style={{ backgroundColor: 'var(--ink)' }}
                        />
                      </motion.span>
                    </a>
                  ))}
                </nav>
                <ProfileLinks
                  placement="menu"
                  inactive={phase !== 'menu' || entrance !== 'socials'}
                  raised={entrance === 'socials'}
                  onSlide={(offset) => socialOffset.set(offset)}
                />
                {selection && (
                  <svg
                    className="mobile-menu-reveal"
                    data-destination={scenes[selection.index].id}
                    aria-hidden="true"
                    focusable="false"
                  >
                    <circle ref={openingRing} cx={selection.x} cy={selection.y} />
                  </svg>
                )}
              </motion.div>
            )}
          </dialog>,
          document.body,
        )}
    </>
  )
}
