import { createContext } from 'react'
import type { MotionValue } from 'motion/react'
import type { ExperienceDock } from './experienceTimeline'

export type WorkDock = {
  pill: ExperienceDock | null
  project: ExperienceDock | null
}

type PillEntranceMotion<Shape> = {
  enhanced: boolean
  progress: MotionValue<number>
  dock: MotionValue<Shape | null>
}

export const ExperienceMotion = createContext<PillEntranceMotion<ExperienceDock> | null>(null)
export const WorkPillMotion = createContext<PillEntranceMotion<WorkDock> | null>(null)
