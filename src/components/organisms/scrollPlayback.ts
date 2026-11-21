import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'
import {
  heroWalkOutEnd,
  sceneStops,
  skillParagraphEnd,
  skillStart,
  skillTravel,
} from './skillsTimeline'

// One shared clock drives every reveal; Skills advances faster without changing other scenes.
const heroUnitsPerSecond = heroEntranceTravel / (heroEntranceDuration / 1000)
const heroFillUnitsPerSecond = 0.3
const sceneUnitsPerSecond = 0.7
const skillUnitsPerSecond = 1
const heroSeconds = heroAnimationTravel / heroUnitsPerSecond
const heroWalkOutEndSeconds =
  heroSeconds + (heroWalkOutEnd - heroAnimationTravel) / heroFillUnitsPerSecond
const skillStartSeconds =
  heroWalkOutEndSeconds + (skillStart - heroWalkOutEnd) / sceneUnitsPerSecond
const skillEnd = skillStart + skillTravel
const skillEndSeconds = skillStartSeconds + skillTravel / skillUnitsPerSecond

export function toPlaybackTime(progress: number) {
  if (progress <= heroAnimationTravel) return progress / heroUnitsPerSecond

  if (progress <= heroWalkOutEnd)
    return heroSeconds + (progress - heroAnimationTravel) / heroFillUnitsPerSecond

  if (progress <= skillStart)
    return heroWalkOutEndSeconds + (progress - heroWalkOutEnd) / sceneUnitsPerSecond

  if (progress <= skillEnd) return skillStartSeconds + (progress - skillStart) / skillUnitsPerSecond

  return skillEndSeconds + (progress - skillEnd) / sceneUnitsPerSecond
}

// Invert the segment speeds so playback time maps back to scroll progress.
export function fromPlaybackTime(seconds: number) {
  if (seconds <= heroSeconds) return seconds * heroUnitsPerSecond

  if (seconds <= heroWalkOutEndSeconds)
    return heroAnimationTravel + (seconds - heroSeconds) * heroFillUnitsPerSecond

  if (seconds <= skillStartSeconds)
    return heroWalkOutEnd + (seconds - heroWalkOutEndSeconds) * sceneUnitsPerSecond

  if (seconds <= skillEndSeconds)
    return skillStart + (seconds - skillStartSeconds) * skillUnitsPerSecond

  return skillEnd + (seconds - skillEndSeconds) * sceneUnitsPerSecond
}

// Give the work introduction twice its normal reading time during showcase playback.
const workIntroStartTime = toPlaybackTime(sceneStops[1])
const workIntroEndTime = toPlaybackTime(skillParagraphEnd)
const workIntroExtraTime = workIntroEndTime - workIntroStartTime

export function toShowcaseTime(progress: number) {
  const time = toPlaybackTime(progress)

  return time + Math.max(0, Math.min(workIntroExtraTime, time - workIntroStartTime))
}

export function fromShowcaseTime(time: number) {
  if (time <= workIntroStartTime) return fromPlaybackTime(time)

  if (time < workIntroEndTime + workIntroExtraTime) {
    return fromPlaybackTime(workIntroStartTime + (time - workIntroStartTime) / 2)
  }

  return fromPlaybackTime(time - workIntroExtraTime)
}
