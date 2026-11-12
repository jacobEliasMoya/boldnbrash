// Walk in and wave, pause at JM, then mirror the walk back out before letters fill.
export const heroEntranceTravel = 0.35
export const heroEntranceDuration = 1700
export const heroExitStart = 0.42
export const heroAnimationTravel = 0.65

export function getHeroScrollPose(progress: number) {
  const position = Math.max(0, Math.min(1, progress)) * heroAnimationTravel
  if (position <= heroEntranceTravel) {
    const frame = Math.round((position / heroEntranceTravel) * 17)
    return {
      frame,
      mirrored: false,
      center: undefined,
      mode: frame < 11 ? 'walk' : frame < 17 ? 'wave' : 'idle',
    }
  }
  if (position <= heroExitStart)
    return { frame: 17, mirrored: false, center: undefined, mode: 'idle' }
  const exit = (position - heroExitStart) / (heroAnimationTravel - heroExitStart)
  return {
    frame: 5 + (Math.min(9, Math.floor(exit * 10)) % 5),
    mirrored: true,
    center: 318.5 + exit * 440,
    mode: exit >= 1 ? 'gone' : 'exit',
  }
}

// Centers measured from the opaque character in the supplied walk-in frames.
const walkingCenters = [0, 0, 529, 525.5, 526.5, 462, 448.5, 434, 324.5, 310.5, 318.5]

export function drawHeroFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  mirroredFrame?: number,
  center?: number,
) {
  context.clearRect(0, 0, 580, 640)
  context.save()
  if (mirroredFrame !== undefined) {
    // Flip the character around its own center, preserving its movement toward the right.
    context.translate(walkingCenters[mirroredFrame] + (center ?? walkingCenters[mirroredFrame]), 0)
    context.scale(-1, 1)
  }
  // This common crop retains the movement already present in all 18 original frames.
  context.drawImage(image, 700, 80, 580, 640, 0, 0, 580, 640)
  context.restore()
}
