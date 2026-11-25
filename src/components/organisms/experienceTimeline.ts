import { spring } from 'motion'
import {
  bottomLiquidContour,
  projectLiquidContour,
  liquidFrameOverlap,
  wordmarkPullPower,
  wordmarkPullRadius,
} from '../atoms/liquidContour'
import {
  pillWheelDepth,
  pillWheelOpacity,
  pillWheelRotation,
  pillWheelTurn,
  pillWheelVertical,
} from './pillWheel'

export const experienceRoles = [
  {
    id: 'varep-developer',
    employer: 'VAREP National',
    role: 'Junior Web Developer',
    dates: '2019–2021',
    detail: 'Helped rebuild a veterans nonprofit’s site from Joomla to WordPress.',
  },
  {
    id: 'biziq-developer-i',
    employer: 'BIZIQ',
    role: 'Web Developer I',
    dates: '2021–2022',
    detail: 'Built and launched responsive client sites in WordPress and Shopify.',
  },
  {
    id: 'biziq-developer-ii',
    employer: 'BIZIQ',
    role: 'Web Developer II',
    dates: '2022–2025',
    detail: 'Built reusable WordPress features, including a custom reviews template.',
  },
  {
    id: 'inenvi-engineer',
    employer: 'Inenvi',
    role: 'Software Engineer',
    dates: '2025–Present',
    detail: 'Helped modernize a legacy web platform with Next.js and Strapi.',
  },
] as const

export const experiencePillTravel = 1.04
export const experienceEntryTravel = experiencePillTravel + 0.24
export const experienceTravel = experienceRoles.length * experienceEntryTravel

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => value * value * (3 - 2 * value)
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress
const dockPortion = 0.68
const releaseStart = experiencePillTravel * dockPortion
const releaseSpring = spring({
  keyframes: [1, 0],
  stiffness: 210,
  damping: 19,
  restSpeed: 0.01,
  restDelta: 0.001,
})

type Pill = { x: number; top: number; width: number; height: number; radius: number }

export type ExperienceDock = {
  transform?: string
  cut: string
  touching: boolean
  shoulders: string
  recoil: string
  x: number
  y: number
}

// Match the CSS rounded rectangle so the mask moves with the pill's fixed outline.
function roundedPillPath({ x, top, width, height, radius }: Pill) {
  const left = x - width / 2
  const right = x + width / 2
  const bottom = top + height
  const r = Math.min(radius, width / 2, height / 2)
  const corner = `A${r} ${r} 0 0 1`

  return [
    `M${left + r} ${top} H${right - r}`,
    `${corner} ${right} ${top + r} V${bottom - r}`,
    `${corner} ${right - r} ${bottom} H${left + r}`,
    `${corner} ${left} ${bottom - r} V${top + r}`,
    `${corner} ${left + r} ${top} Z`,
  ].join(' ')
}

export function getExperienceDock(
  pill: Pill,
  floor: number,
  inset: number,
  width: number,
  release: number,
  profile: 'pill' | 'project' = 'pill',
) {
  if (pill.top >= floor) return null

  // Scrub one spring from the start of the lift so it crosses the frame without a stop.
  const bottom = pill.top + pill.height
  const frameEdge = floor - inset
  const touching = bottom > frameEdge
  const exposed = Math.max(0, Math.min(floor - pill.top, pill.height) - inset)
  const sideRoom = Math.min(pill.x, width - pill.x) - pill.width / 2 - inset / 2
  const corner = Math.min(pill.radius, pill.width / 2, pill.height / 2)
  const centered = Math.abs(pill.x - width / 2) < 1
  const narrow = centered && (width <= 760 || sideRoom < corner * 1.25)

  // A consistent clearance above and around the mobile pill keeps the crest parallel to its edge.
  const visible = Math.max(0, exposed - liquidFrameOverlap)
  const rim = Math.max(0, Math.min(inset * 0.64, sideRoom / 4)) * ease(clamp(visible / 24))
  const emergence = clamp(exposed / Math.max(1, pill.height - inset))
  const mobileRise = Math.min(8, pill.height * 0.09) * ease(clamp((emergence - 0.97) / 0.03))

  // Let the wide crest follow the pill with a shallower overhang.
  const projectRim = Math.min(inset * 0.64, 8) * ease(clamp(visible / 24))
  const lift =
    profile === 'project'
      ? visible + projectRim
      : narrow
        ? visible + rim + mobileRise
        : exposed * 1.14
  const pull = lift * releaseSpring.next(release * 850).value
  const insetLimit = inset * (profile === 'project' ? 0.45 : 0.62)
  const depth = pull < 0 ? insetLimit * Math.tanh(pull / insetLimit) : pull

  // The spring can overlap the pill after it clears the flat frame.
  // Keep the opening until the crest passes below it.
  const crest = frameEdge - liquidFrameOverlap - Math.max(0, depth)
  const cut = bottom > crest ? roundedPillPath(pill) : ''

  if (depth === 0 && !cut) return null

  if (depth === 0) return { cut, touching, shoulders: '', recoil: '' }

  // Keep the attached shoulders flush, then draw the returning crest inward as the pill lifts free.
  const separation = narrow ? ease(clamp((frameEdge - bottom) / (corner * 1.5))) : 0
  const swellWidth = mix(pill.width, pill.width * 0.58, separation)
  const footprint = Math.max(1, Math.min(pill.width, sideRoom))

  const radius = narrow ? corner * 1.5 : wordmarkPullRadius(footprint, Math.min(1, footprint / 180))
  const pullShape = {
    width,
    floor,
    inset,
    center: pill.x,
    depth,
    radius,
    power: narrow ? 2 : wordmarkPullPower,
    stretch: narrow ? swellWidth / 2 - corner : (pill.width - footprint) / 2,
    roundedPill: narrow ? { width: swellWidth, corner, rim: rim * (1 - separation) } : undefined,
  }
  const contour =
    profile === 'project'
      ? projectLiquidContour(pullShape, {
          width: pill.width,
          corner,
          rim: projectRim,
        })
      : bottomLiquidContour(pullShape)

  return { cut, touching, shoulders: depth > 0 ? contour : '', recoil: depth < 0 ? contour : '' }
}

export function getPillLift(travel: number, height: number, rest: number, floor: number) {
  const release = clamp((travel - releaseStart) / (experienceEntryTravel - releaseStart))

  // Spend some of the pause on the lift so the pill and the wheel turn have more room to settle.
  const liftTravel = experienceEntryTravel - releaseStart - 0.12
  const approachTravel = 0.1 * experiencePillTravel
  const emerging = clamp(travel / releaseStart)
  const approaching = clamp((travel - releaseStart + approachTravel) / approachTravel)
  const lifting = clamp((travel - releaseStart) / liftTravel)
  const liftDistance = floor - height - rest

  // Give both halves the same slope at lift-off so the pill keeps moving through the join.
  const joinSpeed = Math.max(0, Math.min(height / releaseStart, liftDistance / liftTravel)) * 0.5
  const exposed =
    height * ease(emerging) - joinSpeed * approachTravel * approaching ** 2 * (1 - approaching)
  const lifted =
    liftDistance * ease(lifting) + joinSpeed * liftTravel * lifting * (1 - lifting) ** 2

  return { y: floor - exposed - lifted, release }
}

export function getExperiencePositions(
  progress: number,
  heights: number[],
  top: number,
  floor: number,
  gap: number,
  inset: number,
  compact: boolean,
  perspective: number,
) {
  const clock = clamp(progress) * heights.length
  const current = Math.min(heights.length - 1, Math.floor(clock))
  const travel = (clock - current) * experienceEntryTravel
  const center = (height: number) => top + Math.max(0, (floor - inset - top - height) / 2)
  const incomingHeight = heights[current]
  const { y: incomingY, release } = getPillLift(
    travel,
    incomingHeight,
    center(incomingHeight),
    floor,
  )

  // Use Work's lift-off timing while keeping the entering pill flat.
  const turn = pillWheelTurn(release)
  const featured = current - (turn < 0.5 ? 1 : 0)

  const poses = heights.map((height, index) => {
    const rest = center(height)
    const recede = index < current ? current - index - 1 + turn : 0
    // Use the outgoing half of Work's wheel, sized to fit between the heading and the focused pill.
    const distance = -recede
    const radius = Math.SQRT2 * Math.min(height + gap, (rest - top) * 0.88)
    const y =
      index < current
        ? rest + pillWheelVertical(distance, radius)
        : index > current
          ? floor
          : incomingY

    return {
      y,
      release,
      tilt: pillWheelRotation(distance, compact),
      depth: pillWheelDepth(distance, radius, compact),
      opacity: pillWheelOpacity(distance) * (1 - clamp((recede - 1) / 0.6)),
      // Reveal the detail at the end of the lift and fade it as the pill turns away.
      detail:
        index === current ? ease(clamp((release - 0.85) / 0.12)) : 1 - ease(clamp(recede * 2)),
      featured: index === featured,
      visible: y < floor && recede < 1.6,
      entering: index === current && travel < experienceEntryTravel,
    }
  })

  const origin = (top + floor - inset) / 2
  let nextTop = incomingY

  // Reserve the layout gap between the projected edges, starting with the flat incoming pill.
  for (let index = current - 1; index >= 0 && poses[index].visible; index--) {
    const pose = poses[index]
    const halfHeight = heights[index] / 2
    const angle = (pose.tilt * Math.PI) / 180
    const edgeY = halfHeight * Math.cos(angle)
    const edgeZ = halfHeight * Math.sin(angle)
    const topScale = 1 / (1 - (pose.depth - edgeZ) / perspective)
    const bottomScale = 1 / (1 - (pose.depth + edgeZ) / perspective)
    const limit = nextTop - gap - origin

    // Invert the projection for each edge to find how far down this pill can sit.
    const maxY =
      origin - halfHeight + Math.min(limit / topScale + edgeY, limit / bottomScale - edgeY)
    const easeRoom = Math.max(0, gap / 2 - Math.abs(pose.y - maxY))

    // Ease into the constraint so the wheel keeps moving smoothly in either scroll direction.
    pose.y = Math.min(pose.y, maxY) - easeRoom ** 2 / (2 * gap)

    const centerY = pose.y + halfHeight - origin
    nextTop = origin + Math.min((centerY - edgeY) * topScale, (centerY + edgeY) * bottomScale)
  }

  return poses
}
