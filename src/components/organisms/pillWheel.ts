import { easeInOut } from 'motion'

export const workPillScale = 0.94
export const workPillClearance = 20
export const workWheelPerspective = 480

export function pillWheelTurn(release: number) {
  return easeInOut(release)
}

export function pillWheelRotation(distance: number, compact: boolean, compactPitch = 62) {
  return Math.max(-81, Math.min(81, -distance * (compact ? compactPitch : 38)))
}

export function pillWheelVertical(distance: number, radius: number) {
  return Math.sin((distance * Math.PI) / 4) * radius
}

export function pillWheelDepth(
  distance: number,
  radius: number,
  compact: boolean,
  compactDepth = 3.5,
) {
  return (Math.cos((distance * Math.PI) / 4) - 1) * radius * (compact ? compactDepth : 1)
}

export function pillWheelOpacity(distance: number) {
  return 1 - Math.min(Math.abs(distance), 1) * 0.65
}

// Project the lower edge through the compact wheel's perspective.
export const workCompactPitch = 76
export const workCompactDepth = 2.8

export function compactPillBottom(turn: number, height: number, radius: number) {
  const tilt = (pillWheelRotation(-turn, true, workCompactPitch) * Math.PI) / 180
  const lowerY = pillWheelVertical(-turn, radius) + (height / 2) * Math.cos(tilt)
  const lowerZ =
    pillWheelDepth(-turn, radius, true, workCompactDepth) + (height / 2) * Math.sin(tilt)

  return (lowerY * workWheelPerspective) / (workWheelPerspective - lowerZ)
}
