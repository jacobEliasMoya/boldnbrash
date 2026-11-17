'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { createPortal } from 'react-dom'
import { BlendedLogo } from '@/components/atoms/BlendedLogo'
import { getPeriodOpening } from '@/components/atoms/periodOpening'

type Scene = { id: string; label: string }
type Phase = 'menu' | 'closing' | 'expanding'

export function MobileMenu({
  scenes,
  active,
  introReady,
  onNavigate,
  onOpenChange,
}: {
  scenes: readonly Scene[]
  active: number
  introReady: boolean
  onNavigate: (index: number) => void
  onOpenChange: (open: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const menuPanel = useRef<HTMLDivElement>(null)
  const openingRing = useRef<SVGCircleElement>(null)
  const stopOpening = useRef<(() => void) | null>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('menu')
  const [selection, setSelection] = useState<{
    index: number
    x: number
    y: number
  } | null>(null)
  const reduceMotion = useReducedMotion()
  useEffect(() => () => stopOpening.current?.(), [])

  const finishClose = useCallback(
    (destination?: string) => {
      if (dialog.current?.open) dialog.current.close()
      setOpen(false)
      setPhase('menu')
      setSelection(null)
      onOpenChange(false)
      requestAnimationFrame(() => {
        const target = destination ? document.getElementById(destination) : toggle.current
        target?.focus({ preventScroll: true })
      })
    },
    [onOpenChange],
  )

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => {
      document.documentElement.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 760px)')
    function resize() {
      if (!compact.matches && open) finishClose()
    }
    compact.addEventListener('change', resize)
    return () => compact.removeEventListener('change', resize)
  }, [open, finishClose])

  function choose(event: MouseEvent<HTMLAnchorElement>, index: number) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    if (phase !== 'menu') return
    const period = event.currentTarget.querySelector<HTMLElement>('.mobile-menu-period')!
    const panel = event.currentTarget.closest<HTMLElement>('.mobile-menu-panel')!
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
    const borderWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-inset')) || 12
    const reach = Math.hypot(Math.max(x, panel.clientWidth - x), Math.max(y, panel.clientHeight - y))
    const dotRadius = (bounds.width * panel.clientWidth) / panelBounds.width / 2
    const control = animate(0, 1, {
      duration: 0.65,
      ease: 'linear',
      onUpdate: (progress) => {
        const aperture = getPeriodOpening(progress, dotRadius, reach, borderWidth)
        if (menuPanel.current) {
          const r = aperture.innerRadius
          const hole = `M${x - r},${y} A${r},${r} 0 1 0 ${x + r},${y} A${r},${r} 0 1 0 ${x - r},${y} Z`
          menuPanel.current.style.clipPath = r > 0
            ? `path(evenodd, "M0,0 H${panel.clientWidth} V${panel.clientHeight} H0 Z ${hole}")`
            : 'none'
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
        tone={active === 0 || active === 1 || active === 3 ? 'paper' : 'dark'}
        control
        menu
      >
        <motion.button
          ref={toggle}
          type="button"
          className="mobile-menu-toggle"
          data-liquid-header
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-controls="mobile-menu"
          aria-expanded={open}
          initial={reduceMotion ? false : { opacity: 0, y: -14 }}
          animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
          transition={{
            duration: reduceMotion ? 0 : 0.5,
            delay: reduceMotion ? 0 : 0.22,
            ease: [0.22, 1, 0.36, 1],
          }}
          onClick={() => {
            setPhase('menu')
            setSelection(null)
            setOpen(true)
            onOpenChange(true)
          }}
        >
          <span aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </motion.button>
      </BlendedLogo>
      {open &&
        createPortal(
          <dialog
            ref={dialog}
            id="mobile-menu"
            className="mobile-menu-dialog"
            data-transitioning={phase === 'expanding' ? '' : undefined}
            aria-label="Mobile navigation"
            onCancel={(event) => {
              event.preventDefault()
              setPhase('closing')
            }}
          >
            {open && (
              <motion.div
                ref={menuPanel}
                className="mobile-menu-panel"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={
                  phase === 'closing'
                    ? { opacity: 0 }
                    : { opacity: 1 }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : phase === 'closing'
                        ? { duration: 0.3, ease: 'easeOut' }
                        : {
                            duration: 0.24,
                            ease: 'easeOut',
                          }
                }
                onAnimationComplete={() => {
                  if (phase === 'closing') finishClose()
                }}
              >
                <div className="mobile-menu-heading">
                  <span>Jacob Moya / Menu</span>
                  <button
                    type="button"
                    className="mobile-menu-close"
                    aria-label="Close menu"
                    autoFocus
                    onClick={() => setPhase('closing')}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <nav
                  className="mobile-menu-links"
                  aria-label="Mobile portfolio"
                  inert={phase !== 'menu'}
                >
                  {scenes.map((scene, index) => (
                    <motion.a
                      key={scene.id}
                      href={`#${scene.id}`}
                      aria-label={`${scene.label}.`}
                      aria-current={active === index ? 'location' : undefined}
                      onClick={(event) => choose(event, index)}
                      initial={reduceMotion ? false : { opacity: 0, y: -24 }}
                      animate={{
                        opacity: !selection || selection.index === index ? 1 : 0,
                        y: 0,
                        color: 'var(--ink)',
                      }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.35,
                        delay: selection || reduceMotion ? 0 : 0.12 + index * 0.06,
                      }}
                    >
                      <span className="mobile-menu-number" aria-hidden="true">
                        0{index + 1}
                      </span>
                      <span className="mobile-menu-label">
                        {scene.label}
                        <span
                          className="mobile-menu-period"
                          aria-hidden="true"
                          style={{ backgroundColor: 'var(--ink)' }}
                        />
                      </span>
                      <span className="mobile-menu-current" aria-hidden="true">
                        {active === index ? '↗' : ''}
                      </span>
                    </motion.a>
                  ))}
                </nav>
                <p className="mobile-menu-footnote">Interfaces. Systems. Experiments.</p>
                {selection && (
                  <svg className="mobile-menu-reveal" data-destination={scenes[selection.index].id} aria-hidden="true" focusable="false">
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
