// Match the loader's solid period opening into a ring with a growing aperture.
export function getPeriodOpening(progress: number, dotRadius: number, reach: number, borderWidth = 12) {
  const eased = progress * progress * (3 - 2 * progress)
  const outerRadius = dotRadius + (reach + 36 - dotRadius) * eased
  const openingProgress = Math.min(1, Math.max(0, (progress - 0.1) / 0.12))
  const opening = openingProgress * openingProgress * (3 - 2 * openingProgress)
  const thickness = outerRadius * (1 - opening) + borderWidth * opening
  const innerRadius = Math.max(0, outerRadius - thickness)
  return {
    outerRadius,
    innerRadius,
    ringRadius: (outerRadius + innerRadius) / 2,
    ringWidth: outerRadius - innerRadius,
  }
}
