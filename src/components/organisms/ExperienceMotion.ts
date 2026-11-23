import { createContext } from 'react'
import type { MotionValue } from 'motion/react'
import type { ExperienceDock } from './experienceTimeline'

export const ExperienceMotion = createContext<{
  enhanced: boolean
  progress: MotionValue<number>
  dock: MotionValue<ExperienceDock | null>
} | null>(null)
