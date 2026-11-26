'use client'

import { useContext, useLayoutEffect, type RefObject } from 'react'
import { cancelFrame, cubicBezier, frame as motionFrame, type MotionValue } from 'motion/react'
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
  getWorkOpeningTiming,
  skillTravel,
  workProjectTravel,
} from '@/components/organisms/skillsTimeline'

const cardEase = cubicBezier(0.36, 0.1, 0.64, 0.9)
const cardHandoffStart = 0.08
const cardHandoffEnd = 0.95

export function useWorkPillEntrance(
  wheel: RefObject<HTMLUListElement | null>,
  animated: boolean,
  ringPosition: MotionValue<number>,
  radius: MotionValue<number>,
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

    const { projectStart } = getWorkOpeningTiming(compact)
    const pills = Array.from(browser.querySelectorAll<HTMLElement>('.skills-category-pill'))
    const intro = browser.querySelector<HTMLElement>('[data-wheel-static]')
    const viewport = window.visualViewport
    let active: HTMLElement | undefined
    let inset = 0
    let stageBounds: DOMRect | undefined
    let slotBounds: DOMRect | undefined
    let headingBounds: DOMRect | undefined
    let boxes: {
      width: number
      height: number
      radius: number
      centerX: number
      centerY: number
    }[] = []

    const projects = Array.from(
      projectSlot.querySelectorAll<HTMLElement>('.skills-project-deck'),
      (deck) => ({
        deck,
        card: deck.querySelector<HTMLElement>('.skill-project-card')!,
        radius: 0,
      }),
    )
    let activeProject: (typeof projects)[number] | undefined
    let outgoingProject: (typeof projects)[number] | undefined
    let projectPhase: number | undefined

    const clearProject = (project: (typeof projects)[number] | undefined) => {
      if (!project) return

      const { deck, card } = project
      deck.removeAttribute('data-project-visible')
      card.removeAttribute('data-project-entering')
      card.removeAttribute('data-project-exiting')
      card.removeAttribute('inert')
      card.style.removeProperty('transform')
      card.style.removeProperty('opacity')
    }

    const paintProject = (position: number, projectPosition: number) => {
      if (!stageBounds || !slotBounds) return null

      // The wheel may accelerate for pill clearance. The card and its liquid stay on the scene clock.
      const next = Math.ceil(projectPosition)
      const travel =
        next === 0
          ? clamp((position * skillTravel - projectStart) / workProjectTravel)
          : clamp(
              (projectPosition - (next - 1) - cardHandoffStart) /
                (cardHandoffEnd - cardHandoffStart),
            )
      const holdingPrevious = next > 0 && travel === 0
      const index = holdingPrevious ? next - 1 : next
      const phase = holdingPrevious ? 1 : cardEase(travel)
      const project = phase > 0 ? projects[index] : undefined

      const outgoing = phase > 0 && phase < 1 ? projects[index - 1] : undefined

      // Only the two cards taking part in the handoff need updates.
      if (project !== activeProject || outgoing !== outgoingProject) {
        clearProject(activeProject)
        clearProject(outgoingProject)
        activeProject = project
        outgoingProject = outgoing
        projectPhase = undefined
        project?.deck.setAttribute('data-project-visible', '')
        outgoing?.deck.setAttribute('data-project-visible', '')
        outgoing?.card.setAttribute('data-project-exiting', '')
        outgoing?.card.setAttribute('inert', '')
      }

      if (!project) return null

      if (outgoing) {
        outgoing.card.style.opacity = `${1 - phase}`
        outgoing.card.style.transform = `translateZ(${-80 * phase}px) scale(${1 - 0.04 * phase})`
      }

      const moving = phase < 1
      if (!moving && phase === projectPhase) return null

      projectPhase = phase
      const { card } = project
      card.toggleAttribute('data-project-entering', moving)
      card.toggleAttribute('inert', moving)

      card.style.opacity = '1'

      if (!moving) {
        card.style.removeProperty('transform')
        return null
      }

      const slot = slotBounds
      const heading = headingBounds
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
          radius: project.radius,
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
      projectPosition: number,
      wheelPosition: number,
      pill: ExperienceDock | null = null,
    ) => {
      ringPosition.set(wheelPosition)

      const project = paintProject(position, projectPosition)

      dock.set(pill || project ? { pill, project } : null)
    }

    const paint = () => {
      const bounds = stageBounds

      if (!bounds) return

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
        paintTurn(position, frame.projectPosition, entry?.index ?? frame.ringPosition)
        browser.toggleAttribute('data-work-ready', position >= 0 && (!entry || entry.phase === 1))
        return
      }

      const box = boxes[entry.index]
      const { centerX, centerY } = box
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
      const previousBox = boxes[entry.index - 1]
      let turn = pillWheelTurn(release)

      // Advance along the same arc only when the projected edges need more space.
      if (compact && previousBox) {
        const previousHeight = previousBox.height
        const limit = y - previousBox.centerY - workPillClearance
        const wheelRadius = radius.get()

        if (compactPillBottom(turn, previousHeight, wheelRadius) > limit) {
          let end = 1

          for (let iteration = 0; iteration < 12; iteration += 1) {
            const middle = (turn + end) / 2

            if (compactPillBottom(middle, previousHeight, wheelRadius) > limit) turn = middle
            else end = middle
          }

          turn = end
        }
      }

      const pillDock = shape ? { ...shape, x: bounds.left, y: bounds.top } : null

      paintTurn(position, frame.projectPosition, Math.max(0, entry.index - 1 + turn), pillDock)
      // Reveal the wheel only after the incoming pill has been placed at the floor.
      browser.toggleAttribute('data-work-ready', true)
    }

    const measure = () => {
      // The stage is pinned during Work. Refresh its geometry when layout changes.
      const bounds = stage.getBoundingClientRect()
      const wheelBounds = browser.getBoundingClientRect()
      stageBounds = bounds
      slotBounds = projectSlot.getBoundingClientRect()
      headingBounds = compact ? intro?.getBoundingClientRect() : undefined
      inset = parseFloat(getComputedStyle(stage).getPropertyValue('--frame-inset')) || 12

      boxes = pills.map((pill) => {
        const styles = getComputedStyle(pill)
        const width = parseFloat(styles.width)

        return {
          width: width * workPillScale,
          height: parseFloat(styles.height) * workPillScale,
          radius: parseFloat(styles.borderTopLeftRadius) * workPillScale,
          centerX: wheelBounds.left + pill.offsetLeft + width / 2 - bounds.left,
          centerY: wheelBounds.top + pill.offsetTop - bounds.top,
        }
      })
      projects.forEach((project) => {
        project.radius = parseFloat(getComputedStyle(project.card).borderTopLeftRadius) || 0
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
    const schedulePaint = () => motionFrame.read(paint)
    const stop = progress.on('change', schedulePaint)
    // Resizing the orbit can repaint the current turn without clearing the ready state.
    const stopRadius = radius.on('change', schedulePaint)

    viewport?.addEventListener('resize', measure)
    viewport?.addEventListener('scroll', schedulePaint)
    measure()

    return () => {
      observer.disconnect()
      stop()
      stopRadius()
      cancelFrame(paint)
      viewport?.removeEventListener('resize', measure)
      viewport?.removeEventListener('scroll', schedulePaint)
      browser.removeAttribute('data-liquid-entry')
      browser.removeAttribute('data-work-ready')
      active?.removeAttribute('data-work-entering')
      active?.removeAttribute('data-work-docked')
      active?.style.removeProperty('--work-entry-y')
      clearProject(activeProject)
      clearProject(outgoingProject)
      dock.set(null)
    }
  }, [animated, compact, dock, progress, radius, ringPosition, wheel])
}
