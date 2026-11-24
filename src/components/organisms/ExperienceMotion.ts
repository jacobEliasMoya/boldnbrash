import { createContext } from 'react'
import type { MotionValue } from 'motion/react'
import type { ExperienceDock } from './experienceTimeline'

type PillEntranceMotion = {
  enhanced: boolean
  progress: MotionValue<number>
  dock: MotionValue<ExperienceDock | null>
}

export const ExperienceMotion = createContext<PillEntranceMotion | null>(null)
export const WorkPillMotion = createContext<PillEntranceMotion | null>(null)
