'use client'

import { useContext, useLayoutEffect, type RefObject } from 'react'
import { cancelFrame, frame as motionFrame, type MotionValue } from 'motion/react'
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
import {
  clamp,
  getSkillFrame,
  skillSegments,
  skillTravel,
  workCategoryTravel,
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

    if (!animated || !browser || !stage || !progress || !dock) return

    const pills = Array.from(browser.querySelectorAll<HTMLElement>('.skills-category-pill'))
    const intro = browser.querySelector<HTMLElement>('[data-wheel-static]')
    const viewport = window.visualViewport
    let active: HTMLElement | undefined
    let inset = 0
    let boxes: { width: number; height: number; radius: number }[] = []

    const projects = Array.from(stage.querySelectorAll<HTMLElement>('.skill-project-card'))
    const captions = Array.from(stage.querySelectorAll<HTMLElement>('.skills-project-caption'))

    const projectOffsets = new Map<HTMLElement, number>()

    // Give the card and category separate turns with the shared liquid renderer.
    const paintProjects = (position: number) => {
      const travel = position * skillTravel
      let projectDock = null

      const stageBounds = stage.getBoundingClientRect()

      projects.forEach((project, index) => {
        const start = index === 0 ? 0 : skillSegments[index].start + workCategoryTravel
        const phase = clamp((travel - start) / workProjectTravel)
        const entering = phase > 0 && phase < 1
        project.toggleAttribute('data-project-entering', entering)
        project.style.clipPath = 'none'
        project.style.opacity = phase > 0 ? '1' : '0'
        project.style.pointerEvents = phase === 1 ? '' : 'none'
        if (captions[index]) {
          // Let the deck's accessibility state hide captions after a category change.
          if (phase < 1) captions[index].style.opacity = String(clamp((phase - 0.8) / 0.2))
          else captions[index].style.removeProperty('opacity')
        }

        if (!entering) {
          project.style.transform = 'translateX(0px)'
          projectOffsets.set(project, 0)
          return
        }

        // Read the current pose without clearing transforms and forcing another layout.
        // Only the entering card needs a measurement; hidden and settled cards do not.
        const bounds = project.getBoundingClientRect()
        const previousOffset = projectOffsets.get(project) ?? 0
        const rest = stageBounds.width - (bounds.right - previousOffset - stageBounds.left)
        const entryFloor = stageBounds.width + stageBounds.left
        const { y, release } = getPillLift(
          phase * experienceEntryTravel,
          bounds.width,
          rest,
          entryFloor,
        )

        const offset = rest - y
        projectOffsets.set(project, offset)
        project.style.transform = `translateX(${offset}px)`

        if (phase > 0 && phase < 1) {
          const shape = getExperienceDock(
            {
              width: bounds.height,
              height: bounds.width,
              radius: parseFloat(getComputedStyle(project).borderTopLeftRadius) || 0,
              x: bounds.top + bounds.height / 2 - stageBounds.top,
              top: y,
            },
            entryFloor,
            inset,
            stageBounds.height,
            release,
            'project',
          )

          if (shape) {
            projectDock = {
              ...shape,
              x: stageBounds.left,
              y: stageBounds.top,
              transform: `matrix(0 1 -1 0 ${stageBounds.width} 0)`,
            }
          }
        }
      })

      return projectDock
    }

    const paint = () => {
      const position = progress.get()
      const projectDock = paintProjects(position)
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
        // The category settles before its project enters. Hold the completed turn
        // instead of dropping back onto the slower project interpolation mid-gesture.
        ringPosition.set(entry?.index ?? frame.ringPosition)
        dock.set(projectDock)
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

      ringPosition.set(Math.max(0, entry.index - 1 + turn))
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

      motionFrame.read(paint)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    observer.observe(browser)
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
      projects.forEach((project) => {
        project.removeAttribute('data-project-entering')
        for (const property of ['transform', 'clip-path', 'opacity', 'pointer-events']) {
          project.style.removeProperty(property)
        }
      })
      captions.forEach((caption) => caption.style.removeProperty('opacity'))
      dock.set(null)
    }
  }, [animated, compact, dock, progress, radius, ringPosition, wheel])
}
