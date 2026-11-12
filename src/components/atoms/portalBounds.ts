let measurement: CanvasRenderingContext2D | null = null
const metrics = new Map<string, TextMetrics>()

/** Text boxes include leading and side bearings; portals need the visible ink. */
export function getPortalBounds(portal: Element): DOMRect {
  const period = portal.closest('.hero-period')
  const glyph = period?.querySelector('.hero-period-glyph')
  if (!glyph) return portal.getBoundingClientRect()
  const style = getComputedStyle(glyph)
  const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  measurement ??= document.createElement('canvas').getContext('2d')
  if (!measurement) return portal.getBoundingClientRect()
  let ink = metrics.get(font)
  if (!ink) {
    measurement.font = font
    ink = measurement.measureText('.')
    metrics.set(font, ink)
  }
  const box = glyph.getBoundingClientRect()
  const baseline = portal.getBoundingClientRect().top
  return new DOMRect(box.left - ink.actualBoundingBoxLeft,
    baseline - ink.actualBoundingBoxAscent,
    ink.actualBoundingBoxLeft + ink.actualBoundingBoxRight,
    ink.actualBoundingBoxAscent + ink.actualBoundingBoxDescent)
}
