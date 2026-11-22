export const circleRevealTransition = {
  duration: 0.94,
  ease: [0.22, 1, 0.36, 1] as const,
}

export const introPeriodRevealDuration = 0.72

export function getIntroPeriodGeometry(bounds: DOMRect, period: DOMRect) {
  const x = period.left + period.width / 2 - bounds.left
  const y = period.top + period.height / 2 - bounds.top

  return {
    x,
    y,
    dot: period.width / 2,
    radius: Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y)) + 2,
  }
}

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
