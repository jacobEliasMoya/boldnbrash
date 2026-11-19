// One continuous edge, shared by the loader, menu, and section reveals.
export function getPeriodOpening(progress: number, dotRadius: number, reach: number) {
  const clamped = Math.min(1, Math.max(0, progress))
  const eased = clamped * clamped * (3 - 2 * clamped)
  const radius = dotRadius + (reach + 2 - dotRadius) * eased
  return {
    outerRadius: radius,
    innerRadius: radius,
    ringRadius: radius,
    ringWidth: 0,
  }
}
