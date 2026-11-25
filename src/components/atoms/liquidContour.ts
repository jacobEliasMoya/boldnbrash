type Point = { x: number; y: number }

export function closedLiquidCurve(vertices: Point[]) {
  const first = vertices[0]
  const last = vertices[vertices.length - 1]
  let path = `M${(last.x + first.x) / 2},${(last.y + first.y) / 2}`

  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index]
    const b = vertices[(index + 1) % vertices.length]

    path += ` Q${a.x},${a.y} ${(a.x + b.x) / 2},${(a.y + b.y) / 2}`
  }

  return path + ' Z'
}

// Trace measured item edges with cubic tangents instead of visible polyline joins.
// Keeping the original sample positions also keeps contrast masks on the same edge.
export function openLiquidCurve(points: Point[], command: 'M' | 'L' = 'M') {
  if (!points.length) return ''

  let path = `${command}${points[0].x} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index++) {
    const before = points[Math.max(0, index - 1)]
    const start = points[index]
    const end = points[index + 1]
    const after = points[Math.min(points.length - 1, index + 2)]

    path += ` C${start.x + (end.x - before.x) / 6} ${start.y + (end.y - before.y) / 6} ${end.x - (after.x - start.x) / 6} ${end.y - (after.y - start.y) / 6} ${end.x} ${end.y}`
  }

  return path
}

export function liquidPull(distance: number, depth: number, radius: number, power: number) {
  return depth * Math.exp(-((distance / radius) ** power))
}

export const wordmarkPullPower = 4
export const liquidFrameCorner = 25
export const liquidFrameOverlap = 0.75

export function wordmarkPullRadius(width: number, scale = 1) {
  return width * 0.7 + 20 * scale
}

// The site boundary and loader share the same sampled, rounded perimeter.
export function createLiquidFrame(width: number, height: number, inset: number) {
  const corner = Math.min(liquidFrameCorner, width / 2, height / 2)
  const quarter = (Math.PI * corner) / 2
  const segments = [
    width - 2 * corner,
    quarter,
    height - 2 * corner,
    quarter,
    width - 2 * corner,
    quarter,
    height - 2 * corner,
    quarter,
  ]
  const perimeter = segments.reduce((total, length) => total + length, 0)
  const wrap = (value: number) => ((value % perimeter) + perimeter) % perimeter

  function pointAt(distance: number) {
    let position = wrap(distance)
    let segment = 0

    while (segment < 7 && position > segments[segment]) {
      position -= segments[segment]
      segment++
    }

    if (segment === 0) return { x: corner + position, y: 0, nx: 0, ny: 1, edge: 'top' }
    if (segment === 2) return { x: width, y: corner + position, nx: -1, ny: 0, edge: 'right' }
    if (segment === 4)
      return { x: width - corner - position, y: height, nx: 0, ny: -1, edge: 'bottom' }
    if (segment === 6) return { x: 0, y: height - corner - position, nx: 1, ny: 0, edge: 'left' }

    const quadrant = (segment - 1) / 2
    const angle = -Math.PI / 2 + (quadrant * Math.PI) / 2 + position / corner
    const cx = quadrant < 2 ? width - corner : corner
    const cy = quadrant === 0 || quadrant === 3 ? corner : height - corner

    return {
      x: cx + Math.cos(angle) * corner,
      y: cy + Math.sin(angle) * corner,
      nx: -Math.cos(angle),
      ny: -Math.sin(angle),
      edge: ['top-right', 'bottom-right', 'bottom-left', 'top-left'][quadrant],
    }
  }

  const count = Math.ceil(perimeter / 5)
  const points = Array.from({ length: count }, (_, index) => pointAt((perimeter * index) / count))
  const outside = `M${-inset},${-inset} H${width + inset} V${height + inset} H${-inset} Z `

  return { width, height, corner, segments, perimeter, points, outside, pointAt }
}

export function liquidContour(
  frame: ReturnType<typeof createLiquidFrame>,
  position: number,
  depth: number,
  radius: number,
  power = 2.5,
  stretch = 0,
) {
  const { perimeter } = frame
  const direction = frame.pointAt(position)
  const wrap = (value: number) => ((value % perimeter) + perimeter) % perimeter
  const points = frame.points.map((base, index) => {
    const distance = Math.abs(
      wrap((perimeter * index) / frame.points.length - position + perimeter / 2) - perimeter / 2,
    )
    // A growing pill stretches the same liquid influence along the perimeter.
    const falloff = Math.max(0, distance - stretch)
    const amount = liquidPull(falloff, depth, radius, power)

    return { x: base.x + direction.nx * amount, y: base.y + direction.ny * amount }
  })

  return frame.outside + closedLiquidCurve(points)
}

type RoundedPill = { width: number; corner: number; rim: number }

type BottomLiquidPull = {
  width: number
  floor: number
  inset: number
  center: number
  depth: number
  radius: number
  power: number
  stretch: number
  roundedPill?: RoundedPill
}

function roundedLiquidSwell(pull: BottomLiquidPull, pill: RoundedPill) {
  const { width, floor, inset, center, depth, radius, power, stretch } = pull
  const side = inset + liquidFrameOverlap
  const frameEdge = floor - side
  const pillLeft = center - pill.width / 2
  const gutter = pillLeft - pill.rim - side
  const footRadius = Math.min(liquidFrameCorner, gutter * 0.42)
  const footX = side + footRadius
  const footPull = liquidPull(Math.max(0, center - footX - stretch), depth, radius, power)
  const footY = frameEdge - footPull * 0.38
  const sideY = footY - footRadius

  const top = frameEdge - depth
  const corner = pill.corner + pill.rim
  const capStart = pillLeft + pill.corner

  // Share the pill's corner center at full contact. Shorten the arc as it blends into the floor.
  const angle = Math.acos(1 - Math.min(1, ((footY - top) * 0.8) / corner))
  const tangentX = Math.cos(angle)
  const tangentY = Math.sin(angle)
  const shoulderX = capStart - corner * tangentY
  const shoulderY = top + corner * (1 - tangentX)
  const capHandle = (4 / 3) * Math.tan(angle / 4) * corner

  // Both curves use the same tangent where the rounded shoulder meets the frame.
  const run = shoulderX - footX
  const rise = footY - shoulderY
  const blendHandle = Math.min(run / (1 + tangentX), rise / (1 + tangentY)) * 0.72
  const entryX = shoulderX - blendHandle * tangentX
  const entryY = shoulderY + blendHandle * tangentY
  const exitX = shoulderX + capHandle * tangentX
  const exitY = shoulderY - capHandle * tangentY
  const footHandle = footRadius * 0.55228475
  const mirror = (x: number) => 2 * center - x

  return [
    `M0 ${sideY} H${side}`,
    `C${side} ${sideY + footHandle} ${footX - footHandle} ${footY} ${footX} ${footY}`,
    `C${footX + run / 2} ${footY} ${entryX} ${entryY} ${shoulderX} ${shoulderY}`,
    `C${exitX} ${exitY} ${capStart - capHandle} ${top} ${capStart} ${top}`,
    `H${mirror(capStart)}`,
    `C${mirror(capStart - capHandle)} ${top} ${mirror(exitX)} ${exitY} ${mirror(shoulderX)} ${shoulderY}`,
    `C${mirror(entryX)} ${entryY} ${mirror(footX + run / 2)} ${footY} ${mirror(footX)} ${footY}`,
    `C${mirror(footX - footHandle)} ${footY} ${mirror(side)} ${sideY + footHandle} ${mirror(side)} ${sideY}`,
    `H${width} V${floor + 2} H0 Z`,
  ].join(' ')
}

// Project cards need their own shoulders: a broad, flat crest follows the image
// frame, then tangent-matched cubics ease back into the viewport edge.
export type ProjectShoulderBounds = { start: number; end: number }

export function projectLiquidContour(
  pull: BottomLiquidPull,
  card: { width: number; corner: number; rim: number },
  bounds?: ProjectShoulderBounds,
) {
  const { width, floor, inset, center, depth } = pull
  const edge = floor - inset - liquidFrameOverlap
  const half = Math.min(card.width / 2 + card.rim, width / 2 - inset)
  const reach = Math.min(96, Math.max(24, card.corner * 2.4))
  const left = Math.max(bounds?.start ?? 0, inset + liquidFrameCorner, center - half - reach)
  const right = Math.min(
    bounds?.end ?? width,
    width - inset - liquidFrameCorner,
    center + half + reach,
  )

  if (depth < 0) {
    // Keep the returning dip local to the card rather than pulling the whole edge.
    const dip = edge - depth

    return `M${left} ${edge - 2} C${left + (center - left) * 0.55} ${edge - 2} ${center - half * 0.35} ${dip} ${center} ${dip} C${center + half * 0.35} ${dip} ${right - (right - center) * 0.55} ${edge - 2} ${right} ${edge - 2} Z`
  }

  const top = edge - depth
  const corner = Math.max(0, Math.min(card.corner + card.rim, depth * 0.7, half))
  const capLeft = Math.max(left, center - half)
  const capRight = Math.min(right, center + half)
  const shoulder = top + corner
  const handle = corner * 0.55228475
  const rise = Math.max(0, edge - shoulder)
  const leftRun = capLeft - left
  const rightRun = right - capRight

  return [
    `M0 ${edge} H${left}`,
    `C${left + leftRun * 0.55} ${edge} ${capLeft} ${shoulder + rise * 0.48} ${capLeft} ${shoulder}`,
    `C${capLeft} ${shoulder - handle} ${capLeft + corner - handle} ${top} ${capLeft + corner} ${top}`,
    `H${capRight - corner}`,
    `C${capRight - corner + handle} ${top} ${capRight} ${shoulder - handle} ${capRight} ${shoulder}`,
    `C${capRight} ${shoulder + rise * 0.48} ${right - rightRun * 0.55} ${edge} ${right} ${edge}`,
    `H${width} V${floor + 2} H0 Z`,
  ].join(' ')
}

export function bottomLiquidContour(pull: BottomLiquidPull) {
  const { width, floor, inset, center, depth, radius, power, stretch, roundedPill } = pull
  const inward = depth < 0

  if (roundedPill && !inward) return roundedLiquidSwell(pull, roundedPill)

  // Sample along the straight edge so a wide pull cannot fold the viewport corners.
  const left = inward ? Math.min(width / 2, inset + liquidFrameCorner) : 0
  const right = width - left
  const frameEdge = floor - inset - liquidFrameOverlap
  const count = Math.max(2, Math.ceil((right - left) / 4))
  const points = Array.from({ length: count + 1 }, (_, index) => {
    const x = left + ((right - left) * index) / count
    const side = Math.min(x - left, right - x)
    const distance = Math.max(0, Math.abs(x - center) - stretch)
    const edge = Math.min(1, side / (2 * inset))
    const displacement = liquidPull(distance, depth, radius, power) * edge * edge * (3 - 2 * edge)

    return { x, y: frameEdge - displacement }
  })

  // Extend the recoil mask past the old edge to remove its antialiased pixels, too.
  const closeAt = inward ? frameEdge - 2 : floor + 2

  return closedLiquidCurve([...points, { x: right, y: closeAt }, { x: left, y: closeAt }])
}
