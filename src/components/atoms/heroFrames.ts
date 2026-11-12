// Walk in and wave, pause at JM, then mirror the walk back out before letters fill.
export const heroFrameCount = 16
export const heroStandingCenter = 289

export const heroEntranceTravel = 0.35
export const heroEntranceDuration = 1700
export const heroExitStart = 0.42
export const heroAnimationTravel = 0.65

export function getHeroScrollPose(progress: number) {
  const position = Math.max(0, Math.min(1, progress)) * heroAnimationTravel
  if (position <= heroEntranceTravel) {
    const frame = Math.round((position / heroEntranceTravel) * (heroFrameCount - 1))
    return {
      frame,
      sourceFrame:
        frame < 8 ? [4, 5, 6, 5][Math.floor((position / heroEntranceTravel) * 15) % 4] : undefined,
      walkProgress:
        frame < 8 ? Math.min(1, ((position / heroEntranceTravel) * 15) / 7.5) : undefined,
      mirrored: false,
      center: undefined,
      mode: frame < 9 ? 'walk' : frame < 15 ? 'wave' : 'idle',
    }
  }
  if (position <= heroExitStart)
    return {
      frame: heroFrameCount - 1,
      sourceFrame: undefined,
      walkProgress: undefined,
      mirrored: false,
      center: undefined,
      mode: 'idle',
    }
  const exit = (position - heroExitStart) / (heroAnimationTravel - heroExitStart)
  const frame = [4, 5, 6, 5][Math.min(9, Math.floor(exit * 10)) % 4]
  return {
    frame,
    sourceFrame: frame,
    walkProgress: undefined,
    mirrored: true,
    center: heroStandingCenter + exit * 470,
    mode: exit >= 1 ? 'gone' : 'exit',
  }
}

// Centers measured from the opaque character in the supplied walk-in frames.
const walkingCenters = [0, 0, 538.5, 532.5, 465.5, 451, 333.5]

export function drawHeroFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  positionedFrame?: number,
  center = heroStandingCenter,
  mirrored = true,
) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  context.save()
  if (positionedFrame !== undefined) {
    const origin = walkingCenters[positionedFrame]
    if (mirrored) {
      context.translate(origin + center, 0)
      context.scale(-1, 1)
    } else {
      context.translate(center - origin, 0)
    }
  }
  // This common crop retains the movement already present in all 16 supplied frames.
  context.drawImage(image, 700, 80, 580, 640, 0, 0, 580, 640)
  context.restore()
}
