export const workPillScale = 0.94

export function pillWheelRotation(distance: number, compact: boolean) {
  return Math.max(-81, Math.min(81, -distance * (compact ? 62 : 38)))
}

export function pillWheelVertical(distance: number, radius: number) {
  return Math.sin((distance * Math.PI) / 4) * radius
}

export function pillWheelDepth(distance: number, radius: number, compact: boolean) {
  return (Math.cos((distance * Math.PI) / 4) - 1) * radius * (compact ? 3.5 : 1)
}

export function pillWheelOpacity(distance: number) {
  return 1 - Math.min(Math.abs(distance), 1) * 0.65
}
