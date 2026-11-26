'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { animate, easeInOut, motion, useTransform, type MotionValue } from 'motion/react'
import { clamp, projectStops, sectionScrollRanges, skillStart } from './skillsTimeline'

const presets = [
  { id: 'current', name: 'Current slide' },
  { id: 'title-first', name: 'Title first' },
  { id: 'side-wipe', name: 'Side wipe' },
  { id: 'rise', name: 'Rise with pill' },
] as const

export type WorkCopyPreset = (typeof presets)[number]['id']

export function WorkCopyPreviewText({
  as,
  children,
  active,
  label,
  index,
  position,
  preset,
}: {
  as: 'h3' | 'p'
  children: ReactNode
  active: boolean
  label?: string
  index: number
  position: MotionValue<number>
  preset: Exclude<WorkCopyPreset, 'current'>
}) {
  const pose = useTransform(() => {
    const offset = position.get() - index
    const entering = offset < 0
    let progress = clamp(1 - Math.abs(offset) * 2)

    if (preset === 'title-first') {
      // The title takes the lead on entry and exit, with both on the same clock.
      const delay = 0.18
      const first = entering ? as === 'h3' : as === 'p'
      progress = clamp((progress - (first ? 0 : delay)) / (1 - delay))
    }

    if (progress === 1) return { clipPath: 'none', transform: 'none' }

    const hidden = 1 - easeInOut(progress)

    if (preset === 'side-wipe') {
      return {
        clipPath: entering ? `inset(0 ${hidden * 100}% 0 0)` : `inset(0 0 0 ${hidden * 100}%)`,
        transform: `translateX(${hidden * (entering ? -18 : 18)}px)`,
      }
    }

    const rising = preset === 'rise' && entering

    return {
      clipPath: rising ? `inset(0 0 ${hidden * 100}% 0)` : `inset(${hidden * 100}% 0 0)`,
      transform: `translateY(${hidden * (rising ? 20 : -12)}px)`,
    }
  })
  const clipPath = useTransform(pose, (value) => value.clipPath)
  const transform = useTransform(pose, (value) => value.transform)
  const Text = motion[as]

  return (
    <Text
      className={as === 'h3' ? 'skills-wheel-title' : 'skills-wheel-description'}
      aria-hidden={!active}
      aria-label={label}
      style={{ clipPath, transform }}
    >
      {children}
    </Text>
  )
}

export function WorkCopyMotionPreview({
  preset,
  onChange,
}: {
  preset: WorkCopyPreset
  onChange: (preset: WorkCopyPreset) => void
}) {
  const playback = useRef<{ stop: () => void } | null>(null)
  const selected = presets.findIndex(({ id }) => id === preset)

  useEffect(() => {
    const stop = () => {
      playback.current?.stop()
      playback.current = null
    }

    window.addEventListener('touchstart', stop, { capture: true, passive: true })

    return () => {
      window.removeEventListener('touchstart', stop, true)
      stop()
    }
  }, [])

  function replay(reverse = false) {
    playback.current?.stop()

    const range = sectionScrollRanges.find(({ label }) => label === 'Work projects')!
    const start = skillStart + projectStops[reverse ? 1 : 0].position
    const end = skillStart + projectStops[reverse ? 0 : 1].position
    const seek = (position: number) =>
      window.dispatchEvent(
        new CustomEvent('portfolio:seek-scroll', {
          detail: {
            section: range.label,
            progress: (position - range.start) / (range.end - range.start),
          },
        }),
      )

    seek(start)
    playback.current = animate(start, end, { duration: 1.15, ease: 'linear', onUpdate: seek })
  }

  return createPortal(
    <aside className="work-copy-motion-preview" aria-label="Work copy motion preview">
      <output aria-live="polite">{presets[selected].name}</output>
      <button
        type="button"
        aria-label="Next style"
        onClick={() => {
          onChange(presets[(selected + 1) % presets.length].id)
          replay()
        }}
      >
        Next
      </button>
      <button type="button" onClick={() => replay()}>
        Replay
      </button>
      <button type="button" onClick={() => replay(true)}>
        Reverse
      </button>
    </aside>,
    document.body,
  )
}
