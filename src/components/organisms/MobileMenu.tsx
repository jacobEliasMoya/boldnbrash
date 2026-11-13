'use client'

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { createPortal } from 'react-dom'
import { BlendedLogo } from '@/components/atoms/BlendedLogo'

type Scene = { id: string; label: string }
type Phase = 'menu' | 'closing' | 'expanding' | 'revealing'
const colors: Record<string, string> = {
  top: '#080809',
  skills: '#3814ff',
  work: '#3814ff',
  about: '#efebe1',
  contact: '#3814ff',
}

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
  const toggle = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('menu')
  const [selection, setSelection] = useState<{
    index: number
    x: number
    y: number
    radius: number
    startingRadius: number
  } | null>(null)
  const reduceMotion = useReducedMotion()

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
      startingRadius: (bounds.width * panel.clientWidth) / panelBounds.width / 2,
      radius:
        Math.hypot(Math.max(x, panel.clientWidth - x), Math.max(y, panel.clientHeight - y)) + 4,
    })
    setPhase('expanding')
  }

  return (
    <>
      <BlendedLogo
        enabled={introReady && reduceMotion === false}
        ready={introReady}
        tone={active === 0 || active === 3 ? 'paper' : 'dark'}
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
            aria-label="Mobile navigation"
            onCancel={(event) => {
              event.preventDefault()
              setPhase('closing')
            }}
          >
            {open && (
              <motion.div
                className="mobile-menu-panel"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={
                  phase === 'closing'
                    ? { opacity: 0 }
                    : phase === 'revealing'
                      ? { opacity: 0 }
                      : { opacity: 1 }
                }
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : phase === 'revealing'
                      ? { duration: 0.24, ease: 'easeOut' }
                      : phase === 'closing'
                        ? { duration: 0.3, ease: 'easeOut' }
                        : {
                            duration: 0.24,
                            ease: 'easeOut',
                          }
                }
                onAnimationComplete={() => {
                  if (phase === 'closing') finishClose()
                  if (phase === 'revealing')
                    finishClose(selection ? scenes[selection.index].id : undefined)
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
                        color:
                          selection?.index === index
                            ? scene.id === 'about'
                              ? '#080809'
                              : '#efebe1'
                            : 'var(--ink)',
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
                          style={{ backgroundColor: colors[scene.id] }}
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
                  <motion.div
                    className="mobile-menu-reveal"
                    aria-hidden="true"
                    data-destination={scenes[selection.index].id}
                    style={{ background: colors[scenes[selection.index].id] }}
                    initial={{
                      clipPath: `circle(${selection.startingRadius}px at ${selection.x}px ${selection.y}px)`,
                    }}
                    animate={{
                      clipPath: `circle(${selection.radius}px at ${selection.x}px ${selection.y}px)`,
                    }}
                    transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.76, 0, 0.24, 1] }}
                    onAnimationComplete={() => {
                      if (phase === 'expanding') {
                        onNavigate(selection.index)
                        setPhase('revealing')
                      }
                    }}
                  />
                )}
              </motion.div>
            )}
          </dialog>,
          document.body,
        )}
    </>
  )
}
