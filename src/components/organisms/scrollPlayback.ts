import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'
import {
  aboutIntroEnd,
  experienceEnd,
  experienceStart,
  heroWalkOutEnd,
  projectStops,
  sceneStops,
  skillTitleEnd,
  skillStart,
  skillTravel,
} from './skillsTimeline'

export const workHandoffDurationScale = 1.18

// Base timing for the scene before input and reading pacing are applied.
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

function toBaseTime(progress: number) {
  if (progress <= heroAnimationTravel) return progress / heroUnitsPerSecond

  if (progress <= heroWalkOutEnd)
    return heroSeconds + (progress - heroAnimationTravel) / heroFillUnitsPerSecond

  if (progress <= skillStart)
    return heroWalkOutEndSeconds + (progress - heroWalkOutEnd) / sceneUnitsPerSecond

  if (progress <= skillEnd) return skillStartSeconds + (progress - skillStart) / skillUnitsPerSecond

  return skillEndSeconds + (progress - skillEnd) / sceneUnitsPerSecond
}

// Invert the segment speeds so playback time maps back to scroll progress.
function fromBaseTime(seconds: number) {
  if (seconds <= heroSeconds) return seconds * heroUnitsPerSecond

  if (seconds <= heroWalkOutEndSeconds)
    return heroAnimationTravel + (seconds - heroSeconds) * heroFillUnitsPerSecond

  if (seconds <= skillStartSeconds)
    return heroWalkOutEnd + (seconds - heroWalkOutEndSeconds) * sceneUnitsPerSecond

  if (seconds <= skillEndSeconds)
    return skillStart + (seconds - skillStartSeconds) * skillUnitsPerSecond

  return skillEnd + (seconds - skillEndSeconds) * sceneUnitsPerSecond
}

function paceRange(from: number, to: number, stretch: number, rampTime = 0) {
  const start = toBaseTime(from)
  const duration = toBaseTime(to) - start
  const ramp = Math.min(rampTime, duration / 2)
  const length = duration * stretch - ramp * (stretch - 1)

  return { start, duration, stretch, ramp, length }
}

type PaceRange = ReturnType<typeof paceRange>

// Ramp from normal speed into the slower segment and back out, with a continuous speed at the joins.
function stretchTravel(travel: number, { duration, stretch, ramp, length }: PaceRange) {
  if (!ramp) return travel * stretch

  const paceIn = (distance: number) => distance + ((stretch - 1) * distance ** 2) / (2 * ramp)

  if (travel <= ramp) return paceIn(travel)
  if (travel >= duration - ramp) return length - paceIn(duration - travel)

  return travel * stretch - (ramp * (stretch - 1)) / 2
}

function restoreTravel(time: number, { duration, stretch, ramp, length }: PaceRange) {
  if (!ramp) return time / stretch

  const rampLength = (ramp * (1 + stretch)) / 2
  const paceIn = (elapsed: number) =>
    (2 * elapsed) / (1 + Math.sqrt(1 + (2 * (stretch - 1) * elapsed) / ramp))

  if (time <= rampLength) return paceIn(time)
  if (time >= length - rampLength) return duration - paceIn(length - time)

  return (time + (ramp * (stretch - 1)) / 2) / stretch
}

function toPacedTime(time: number, ranges: PaceRange[]) {
  return ranges.reduce((pacedTime, range) => {
    const travel = Math.max(0, Math.min(range.duration, time - range.start))

    return pacedTime + stretchTravel(travel, range) - travel
  }, time)
}

function fromPacedTime(time: number, ranges: PaceRange[]) {
  let baseTime = time

  for (const range of ranges) {
    const elapsed = baseTime - range.start

    if (elapsed <= 0) break
    if (elapsed < range.length) return range.start + restoreTravel(elapsed, range)

    baseTime -= range.length - range.duration
  }

  return baseTime
}

const inputPacing = [paceRange(experienceStart, experienceEnd, 1.45, 0.7)]
const showcaseReading = [
  paceRange(sceneStops[1], skillTitleEnd, 2),
  paceRange(
    skillStart + projectStops[0].position,
    skillStart + projectStops[projectStops.length - 1].position,
    workHandoffDurationScale,
    0.35,
  ),
  paceRange(sceneStops[2], aboutIntroEnd, 2.5),
  paceRange(experienceStart, experienceEnd, 2, 0.7),
  paceRange(experienceEnd, sceneStops[3] - 1, 5, 0.22),
]

export function toPlaybackTime(progress: number) {
  return toPacedTime(toBaseTime(progress), inputPacing)
}

export function fromPlaybackTime(time: number) {
  return fromBaseTime(fromPacedTime(time, inputPacing))
}

export function toShowcaseTime(progress: number) {
  return toPacedTime(toBaseTime(progress), showcaseReading)
}

export function fromShowcaseTime(time: number) {
  return fromBaseTime(fromPacedTime(time, showcaseReading))
}
