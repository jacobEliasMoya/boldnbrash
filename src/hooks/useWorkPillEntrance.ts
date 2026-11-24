'use client'

import { useContext, useLayoutEffect, type RefObject } from 'react'
import type { MotionValue } from 'motion/react'
import { WorkPillMotion } from '@/components/organisms/ExperienceMotion'
import {
  experienceEntryTravel,
  getExperienceDock,
  getPillLift,
} from '@/components/organisms/experienceTimeline'
import {
  compactPillBottom,
  pillWheelTurn,
  workPillClearance,
  workPillScale,
} from '@/components/organisms/pillWheel'
import { getSkillFrame } from '@/components/organisms/skillsTimeline'

export function useWorkPillEntrance(
  wheel: RefObject<HTMLDivElement | null>,
  animated: boolean,
  ringPosition: MotionValue<number>,
  radius: number,
  compact: boolean,
) {
  const motion = useContext(WorkPillMotion)
  const progress = motion?.progress
  const dock = motion?.dock

  useLayoutEffect(() => {
    const browser = wheel.current
    const stage = browser?.closest<HTMLElement>('.skills-reveal')

    if (!animated || !browser || !stage || !progress || !dock) return

    const pills = Array.from(browser.querySelectorAll<HTMLElement>('.skills-category-pill'))
    const viewport = window.visualViewport
    let active: HTMLElement | undefined
    let inset = 0
    let boxes: { width: number; height: number; radius: number }[] = []

    const paint = () => {
      const position = progress.get()
      const frame = getSkillFrame(position)
      const entry = position < 0 ? null : frame.entrance
      const pill =
        entry && entry.phase < 1 && boxes[entry.index]?.width ? pills[entry.index] : undefined

      if (active !== pill) {
        active?.removeAttribute('data-work-entering')
        active?.removeAttribute('data-work-docked')
        active?.style.removeProperty('--work-entry-y')
        active = pill
        active?.setAttribute('data-work-entering', '')
        browser.toggleAttribute('data-liquid-entry', Boolean(active))
      }

      if (!pill || !entry) {
        ringPosition.set(frame.ringPosition)
        dock.set(null)
        browser.toggleAttribute('data-work-ready', position >= 0 && (!entry || entry.phase === 1))
        return
      }

      // The split layout can move the wheel without changing its dimensions.
      const bounds = stage.getBoundingClientRect()
      const wheelBounds = browser.getBoundingClientRect()
      const centerX = wheelBounds.left + wheelBounds.width / 2 - bounds.left
      const centerY = wheelBounds.top + wheelBounds.height / 2 - bounds.top
      const floor =
        (viewport && viewport.scale === 1 ? viewport.offsetTop + viewport.height : innerHeight) -
        bounds.top

      const box = boxes[entry.index]
      const rest = centerY - box.height / 2
      const { y, release } = getPillLift(
        entry.phase * experienceEntryTravel,
        box.height,
        rest,
        floor,
      )
      const shape = getExperienceDock(
        { ...box, x: centerX, top: y },
        floor,
        inset,
        bounds.width,
        release,
      )

      // The pill and the frame share the measured, flat shape until the mask has cleared it.
      pill.style.setProperty('--work-entry-y', `${y - rest}px`)
      pill.toggleAttribute('data-work-docked', shape?.touching ?? false)

      // Start turning the wheel at lift-off, using the same clock as the liquid release.
      const previous = boxes[entry.index - 1]
      let turn = pillWheelTurn(release)

      // Advance along the same arc only when the projected edges need more space.
      if (compact && previous) {
        const limit = y - centerY - workPillClearance

        if (compactPillBottom(turn, previous.height, radius) > limit) {
          let end = 1

          for (let iteration = 0; iteration < 12; iteration += 1) {
            const middle = (turn + end) / 2

            if (compactPillBottom(middle, previous.height, radius) > limit) turn = middle
            else end = middle
          }

          turn = end
        }
      }

      ringPosition.set(entry.index === 0 ? 0 : entry.index - 1 + turn)
      dock.set(shape ? { ...shape, x: bounds.left, y: bounds.top } : null)
      // Reveal the wheel only after the incoming pill has been placed at the floor.
      browser.toggleAttribute('data-work-ready', true)
    }

    const measure = () => {
      inset = parseFloat(getComputedStyle(stage).getPropertyValue('--frame-inset')) || 12

      boxes = pills.map((pill) => {
        const styles = getComputedStyle(pill)

        return {
          width: parseFloat(styles.width) * workPillScale,
          height: parseFloat(styles.height) * workPillScale,
          radius: parseFloat(styles.borderTopLeftRadius) * workPillScale,
        }
      })

      paint()
    }

    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    observer.observe(browser)
    pills.forEach((pill) => observer.observe(pill))
    const stop = progress.on('change', paint)

    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
    measure()

    return () => {
      observer.disconnect()
      stop()
      viewport?.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', measure)
      browser.removeAttribute('data-liquid-entry')
      browser.removeAttribute('data-work-ready')
      active?.removeAttribute('data-work-entering')
      active?.removeAttribute('data-work-docked')
      active?.style.removeProperty('--work-entry-y')
      dock.set(null)
    }
  }, [animated, compact, dock, progress, radius, ringPosition, wheel])
}
