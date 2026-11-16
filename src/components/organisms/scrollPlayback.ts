import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'
import { skillStart, skillTravel } from './skillsTimeline'

// One shared clock drives every reveal; Skills advances faster without changing other scenes.
const heroUnitsPerSecond = heroEntranceTravel / (heroEntranceDuration / 1000)
const sceneUnitsPerSecond = 0.7
const skillUnitsPerSecond = 1
const heroSeconds = heroAnimationTravel / heroUnitsPerSecond
const skillStartSeconds = heroSeconds + (skillStart - heroAnimationTravel) / sceneUnitsPerSecond
const skillEnd = skillStart + skillTravel
const skillEndSeconds = skillStartSeconds + skillTravel / skillUnitsPerSecond

export function toPlaybackTime(progress: number) {
  if (progress <= heroAnimationTravel) return progress / heroUnitsPerSecond
  if (progress <= skillStart)
    return heroSeconds + (progress - heroAnimationTravel) / sceneUnitsPerSecond
  if (progress <= skillEnd)
    return skillStartSeconds + (progress - skillStart) / skillUnitsPerSecond
  return skillEndSeconds + (progress - skillEnd) / sceneUnitsPerSecond
}

export function fromPlaybackTime(seconds: number) {
  if (seconds <= heroSeconds) return seconds * heroUnitsPerSecond
  if (seconds <= skillStartSeconds)
    return heroAnimationTravel + (seconds - heroSeconds) * sceneUnitsPerSecond
  if (seconds <= skillEndSeconds)
    return skillStart + (seconds - skillStartSeconds) * skillUnitsPerSecond
  return skillEnd + (seconds - skillEndSeconds) * sceneUnitsPerSecond
}
