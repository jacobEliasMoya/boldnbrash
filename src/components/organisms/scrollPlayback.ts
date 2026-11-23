import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'
import {
  aboutIntroEnd,
  experienceEnd,
  experienceStart,
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

// Add reading time without stretching the reveals on either side.
const showcaseReading = [
  { start: sceneStops[1], end: skillParagraphEnd, stretch: 2 },
  { start: sceneStops[2], end: aboutIntroEnd, stretch: 2.5 },
  { start: experienceStart, end: experienceEnd, stretch: 2.2 },
  { start: experienceEnd, end: sceneStops[3] - 1, stretch: 6 },
].map(({ start, end, stretch }) => ({
  start: toPlaybackTime(start),
  end: toPlaybackTime(end),
  stretch,
}))

export function toShowcaseTime(progress: number) {
  const time = toPlaybackTime(progress)

  return showcaseReading.reduce(
    (showcaseTime, { start, end, stretch }) =>
      showcaseTime + Math.max(0, Math.min(end - start, time - start)) * (stretch - 1),
    time,
  )
}

export function fromShowcaseTime(time: number) {
  let playbackTime = time

  for (const { start, end, stretch } of showcaseReading) {
    if (playbackTime <= start) break

    const addedTime = (end - start) * (stretch - 1)

    if (playbackTime < end + addedTime) {
      playbackTime = start + (playbackTime - start) / stretch

      break
    }

    playbackTime -= addedTime
  }

  return fromPlaybackTime(playbackTime)
}
