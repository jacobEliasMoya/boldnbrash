'use client'

import { useContext, useLayoutEffect, type RefObject } from 'react'
import { cancelFrame, frame as motionFrame, type MotionValue } from 'motion/react'
import { WorkPillMotion } from '@/components/organisms/ExperienceMotion'
import {
  experienceEntryTravel,
  getExperienceDock,
  getPillLift,
  type ExperienceDock,
} from '@/components/organisms/experienceTimeline'
import {
  compactPillBottom,
  pillWheelTurn,
  workPillClearance,
  workPillScale,
} from '@/components/organisms/pillWheel'
import {
  clamp,
  getSkillFrame,
  skillTravel,
  workProjectTravel,
} from '@/components/organisms/skillsTimeline'

export function useWorkPillEntrance(
  wheel: RefObject<HTMLUListElement | null>,
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
    const projectSlot = stage?.querySelector<HTMLElement>('.skills-projects')

    if (!animated || !browser || !stage || !projectSlot || !progress || !dock) return

    const pills = Array.from(browser.querySelectorAll<HTMLElement>('.skills-category-pill'))
    const intro = browser.querySelector<HTMLElement>('[data-wheel-static]')
    const viewport = window.visualViewport
    let active: HTMLElement | undefined
    let inset = 0
    let boxes: { width: number; height: number; radius: number }[] = []

    const projects = Array.from(
      projectSlot.querySelectorAll<HTMLElement>('.skills-project-deck'),
      (deck) => ({
        deck,
        card: deck.querySelector<HTMLElement>('.skill-project-card')!,
      }),
    )
    let activeProject: (typeof projects)[number] | undefined
    let projectPhase: number | undefined

    const clearProject = () => {
      if (!activeProject) return

      const { deck, card } = activeProject
      deck.removeAttribute('data-project-visible')
      card.removeAttribute('data-project-entering')
      card.removeAttribute('data-project-exiting')
      card.removeAttribute('inert')
      card.style.removeProperty('transform')
      card.style.removeProperty('opacity')
    }

    const paintProject = (position: number, wheelPosition: number, measuredStage?: DOMRect) => {
      const index = Math.ceil(wheelPosition)
      const distance = wheelPosition - index
      // Overlap the receding card and the left entrance throughout the turn.
      const phase =
        wheelPosition === 0
          ? clamp((position * skillTravel) / workProjectTravel)
          : clamp(1 + distance)
      const project = phase > 0 ? projects[index] : undefined

      if (project !== activeProject) {
        clearProject()
        activeProject = project
        projectPhase = undefined
        project?.deck.setAttribute('data-project-visible', '')
      }

      projects.forEach(({ deck, card }, projectIndex) => {
        if (projectIndex === index) return

        const outgoing = projectIndex === index - 1 && phase > 0 && phase < 1
        deck.toggleAttribute('data-project-visible', outgoing)
        card.toggleAttribute('data-project-exiting', outgoing)
        card.toggleAttribute('inert', outgoing)
        card.style.opacity = outgoing ? `${1 - phase}` : ''
        card.style.transform = outgoing
          ? `translateZ(${-80 * phase}px) scale(${1 - 0.04 * phase})`
          : ''
      })

      if (!project) return null

      const moving = phase < 1
      if (!moving && phase === projectPhase) return null

      projectPhase = phase
      const { card } = project
      card.toggleAttribute('data-project-entering', moving && distance <= 0)
      card.toggleAttribute('data-project-exiting', moving && distance > 0)
      card.toggleAttribute('inert', moving)

      card.style.opacity = '1'

      if (!moving) {
        card.style.removeProperty('transform')
        return null
      }

      // Measure the stationary slot instead of the card's translated box.
      const stageBounds = measuredStage ?? stage.getBoundingClientRect()
      const slot = projectSlot.getBoundingClientRect()
      const heading = compact ? intro?.getBoundingClientRect() : undefined
      const rest = stageBounds.right - slot.right
      const entryFloor = stageBounds.width + stageBounds.left
      const { y, release } = getPillLift(
        phase * experienceEntryTravel,
        slot.width,
        rest,
        entryFloor,
      )

      card.style.transform = `translateX(${rest - y}px)`

      // Keep the side pull inside the project gutters when the heading sits above it.
      const stacked =
        heading &&
        heading.bottom <= slot.top &&
        heading.left < slot.right &&
        heading.right > slot.left
      const shoulderBounds = stacked
        ? {
            start: Math.max(heading.bottom + 4, slot.top - 12) - stageBounds.top,
            end: slot.bottom + 12 - stageBounds.top,
          }
        : undefined

      const shape = getExperienceDock(
        {
          width: slot.height,
          height: slot.width,
          radius: parseFloat(getComputedStyle(card).borderTopLeftRadius) || 0,
          x: slot.top + slot.height / 2 - stageBounds.top,
          top: y,
        },
        entryFloor,
        inset,
        stageBounds.height,
        release,
        'project',
        shoulderBounds,
      )

      return shape
        ? {
            ...shape,
            x: stageBounds.left,
            y: stageBounds.top,
            transform: `matrix(0 1 -1 0 ${stageBounds.width} 0)`,
          }
        : null
    }

    const paintTurn = (
      position: number,
      wheelPosition: number,
      pill: ExperienceDock | null = null,
      stageBounds?: DOMRect,
    ) => {
      ringPosition.set(wheelPosition)

      const project = paintProject(position, wheelPosition, stageBounds)

      dock.set(pill || project ? { pill, project } : null)
    }

    const paint = () => {
      const position = progress.get()
      const frame = getSkillFrame(position)
      const entry = position < 0 ? null : frame.entrance
      const pill =
        entry &&
        entry.phase < 1 &&
        (entry.index !== 0 || entry.phase > 0) &&
        boxes[entry.index]?.width
          ? pills[entry.index]
          : undefined

      if (active !== pill) {
        active?.removeAttribute('data-work-entering')
        active?.removeAttribute('data-work-docked')
        active?.style.removeProperty('--work-entry-y')
        active = pill
        active?.setAttribute('data-work-entering', '')
        browser.toggleAttribute('data-liquid-entry', Boolean(active))
      }

      if (!pill || !entry) {
        // Hold the completed turn through the reading interval.
        paintTurn(position, entry?.index ?? frame.ringPosition)
        browser.toggleAttribute('data-work-ready', position >= 0 && (!entry || entry.phase === 1))
        return
      }

      // The split layout can move the wheel without changing its dimensions.
      const bounds = stage.getBoundingClientRect()
      const wheelBounds = browser.getBoundingClientRect()
      const box = boxes[entry.index]
      // The landscape list spans both columns, while the pills dock in the second column.
      const centerX =
        wheelBounds.left + pill.offsetLeft + box.width / (2 * workPillScale) - bounds.left
      const centerY = wheelBounds.top + pill.offsetTop - bounds.top
      const floor =
        (viewport && viewport.scale === 1 ? viewport.offsetTop + viewport.height : innerHeight) -
        bounds.top

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
      const previousHeight = boxes[entry.index - 1]?.height
      let turn = pillWheelTurn(release)

      // Advance along the same arc only when the projected edges need more space.
      if (compact && previousHeight) {
        const limit = y - centerY - workPillClearance

        if (compactPillBottom(turn, previousHeight, radius) > limit) {
          let end = 1

          for (let iteration = 0; iteration < 12; iteration += 1) {
            const middle = (turn + end) / 2

            if (compactPillBottom(middle, previousHeight, radius) > limit) turn = middle
            else end = middle
          }

          turn = end
        }
      }

      const pillDock = shape ? { ...shape, x: bounds.left, y: bounds.top } : null

      paintTurn(position, Math.max(0, entry.index - 1 + turn), pillDock, bounds)
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

      motionFrame.read(paint)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    observer.observe(browser)
    observer.observe(projectSlot)
    if (intro) observer.observe(intro)
    pills.forEach((pill) => observer.observe(pill))
    // Measure and update the shared clock before Motion renders its transforms.
    // Post-render handoffs exposed stale transforms for a frame when reversing.
    const stop = progress.on('change', () => motionFrame.read(paint))

    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', measure)
    measure()

    return () => {
      observer.disconnect()
      stop()
      cancelFrame(paint)
      viewport?.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', measure)
      browser.removeAttribute('data-liquid-entry')
      browser.removeAttribute('data-work-ready')
      active?.removeAttribute('data-work-entering')
      active?.removeAttribute('data-work-docked')
      active?.style.removeProperty('--work-entry-y')
      clearProject()
      projects.forEach(({ deck, card }) => {
        deck.removeAttribute('data-project-visible')
        card.removeAttribute('data-project-exiting')
        card.removeAttribute('inert')
        card.style.removeProperty('transform')
        card.style.removeProperty('opacity')
      })
      dock.set(null)
    }
  }, [animated, compact, dock, progress, radius, ringPosition, wheel])
}
