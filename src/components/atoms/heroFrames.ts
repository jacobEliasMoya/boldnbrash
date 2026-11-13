// Walk in and wave, pause at JM, then mirror the walk back out before letters fill.
export const heroFrameCount = 16
// Preserve both halves of the stride rather than ping-ponging one passing pose.
export const heroWalkFrames = [4, 5, 6, 7] as const
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
        frame < 8
          ? heroWalkFrames[Math.floor((position / heroEntranceTravel) * 15) % heroWalkFrames.length]
          : undefined,
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
  const frame = heroWalkFrames[Math.min(9, Math.floor(exit * 10)) % heroWalkFrames.length]
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
const walkingCenters = [0, 0, 538.5, 532.5, 465.5, 451, 333.5, 295]

export function drawHeroFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  positionedFrame?: number,
  center = heroStandingCenter,
  mirrored = true,
  dark = false,
) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height)
  // Paint in stage coordinates before flipping the sprite, so the ground
  // shadow follows the character without mirroring or shifting between frames.
  const passing = positionedFrame === 5 || positionedFrame === 7
  context.save()
  context.globalAlpha = passing ? 0.22 : 0.28
  context.fillStyle = dark ? '#9072ce' : '#21123d'
  context.filter = 'blur(5px)'
  context.beginPath()
  context.ellipse(center, 546, passing ? 54 : 62, passing ? 8 : 10, 0, 0, Math.PI * 2)
  context.fill()
  context.restore()
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
