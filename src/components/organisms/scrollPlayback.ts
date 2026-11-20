import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'
import { skillStart, skillTravel } from './skillsTimeline'

export const heroFillEnd = 1

// One shared clock drives every reveal; Skills advances faster without changing other scenes.
const heroUnitsPerSecond = heroEntranceTravel / (heroEntranceDuration / 1000)
const heroFillUnitsPerSecond = 0.3
const sceneUnitsPerSecond = 0.7
const skillUnitsPerSecond = 1
const heroSeconds = heroAnimationTravel / heroUnitsPerSecond
const heroFillEndSeconds = heroSeconds + (heroFillEnd - heroAnimationTravel) / heroFillUnitsPerSecond
const skillStartSeconds = heroFillEndSeconds + (skillStart - heroFillEnd) / sceneUnitsPerSecond
const skillEnd = skillStart + skillTravel
const skillEndSeconds = skillStartSeconds + skillTravel / skillUnitsPerSecond

export function toPlaybackTime(progress: number) {
  if (progress <= heroAnimationTravel) return progress / heroUnitsPerSecond
  if (progress <= heroFillEnd)
    return heroSeconds + (progress - heroAnimationTravel) / heroFillUnitsPerSecond
  if (progress <= skillStart)
    return heroFillEndSeconds + (progress - heroFillEnd) / sceneUnitsPerSecond
  if (progress <= skillEnd)
    return skillStartSeconds + (progress - skillStart) / skillUnitsPerSecond
  return skillEndSeconds + (progress - skillEnd) / sceneUnitsPerSecond
}

export function fromPlaybackTime(seconds: number) {
  if (seconds <= heroSeconds) return seconds * heroUnitsPerSecond
  if (seconds <= heroFillEndSeconds)
    return heroAnimationTravel + (seconds - heroSeconds) * heroFillUnitsPerSecond
  if (seconds <= skillStartSeconds)
    return heroFillEnd + (seconds - heroFillEndSeconds) * sceneUnitsPerSecond
  if (seconds <= skillEndSeconds)
    return skillStart + (seconds - skillStartSeconds) * skillUnitsPerSecond
  return skillEnd + (seconds - skillEndSeconds) * sceneUnitsPerSecond
}
