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

// The site boundary and loader share the same sampled, rounded perimeter.
export function createLiquidFrame(width: number, height: number, inset: number) {
  const corner = Math.min(25, width / 2, height / 2)
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
    const amount = depth * Math.exp(-((falloff / radius) ** power))

    return { x: base.x + direction.nx * amount, y: base.y + direction.ny * amount }
  })

  return frame.outside + closedLiquidCurve(points)
}
