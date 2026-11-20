import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'
import { heroFillEnd, heroParagraphEnd, skillStart, skillTravel } from './skillsTimeline'

// One shared clock drives every reveal; Skills advances faster without changing other scenes.
const heroUnitsPerSecond = heroEntranceTravel / (heroEntranceDuration / 1000)
const heroFillUnitsPerSecond = 0.3
const sceneUnitsPerSecond = 0.7
const skillUnitsPerSecond = 1
const heroSeconds = heroAnimationTravel / heroUnitsPerSecond
const heroParagraphEndSeconds = heroSeconds + (heroParagraphEnd - heroAnimationTravel) / heroFillUnitsPerSecond
const skillStartSeconds = heroParagraphEndSeconds + (skillStart - heroParagraphEnd) / sceneUnitsPerSecond
const skillEnd = skillStart + skillTravel
const skillEndSeconds = skillStartSeconds + skillTravel / skillUnitsPerSecond

export function toPlaybackTime(progress: number) {
  if (progress <= heroAnimationTravel) return progress / heroUnitsPerSecond
  if (progress <= heroParagraphEnd)
    return heroSeconds + (progress - heroAnimationTravel) / heroFillUnitsPerSecond
  if (progress <= skillStart)
    return heroParagraphEndSeconds + (progress - heroParagraphEnd) / sceneUnitsPerSecond
  if (progress <= skillEnd)
    return skillStartSeconds + (progress - skillStart) / skillUnitsPerSecond
  return skillEndSeconds + (progress - skillEnd) / sceneUnitsPerSecond
}

export function fromPlaybackTime(seconds: number) {
  if (seconds <= heroSeconds) return seconds * heroUnitsPerSecond
  if (seconds <= heroParagraphEndSeconds)
    return heroAnimationTravel + (seconds - heroSeconds) * heroFillUnitsPerSecond
  if (seconds <= skillStartSeconds)
    return heroParagraphEnd + (seconds - heroParagraphEndSeconds) * sceneUnitsPerSecond
  if (seconds <= skillEndSeconds)
    return skillStart + (seconds - skillStartSeconds) * skillUnitsPerSecond
  return skillEnd + (seconds - skillEndSeconds) * sceneUnitsPerSecond
}
