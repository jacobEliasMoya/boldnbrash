import { heroAnimationTravel, heroEntranceDuration, heroEntranceTravel } from '../atoms/heroFrames'

// One shared clock drives every scroll reveal. Wheel/trackpad speed only changes its target.
const heroUnitsPerSecond = heroEntranceTravel / (heroEntranceDuration / 1000)
const sceneUnitsPerSecond = 0.7
const heroSeconds = heroAnimationTravel / heroUnitsPerSecond

export function toPlaybackTime(progress: number) {
  return progress <= heroAnimationTravel
    ? progress / heroUnitsPerSecond
    : heroSeconds + (progress - heroAnimationTravel) / sceneUnitsPerSecond
}

export function fromPlaybackTime(seconds: number) {
  return seconds <= heroSeconds
    ? seconds * heroUnitsPerSecond
    : heroAnimationTravel + (seconds - heroSeconds) * sceneUnitsPerSecond
}
