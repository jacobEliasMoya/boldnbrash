import { spring } from 'motion'
import {
  bottomLiquidContour,
  liquidFrameOverlap,
  wordmarkPullPower,
  wordmarkPullRadius,
} from '../atoms/liquidContour'

export const experienceRoles = [
  {
    id: 'inenvi-engineer',
    employer: 'Inenvi',
    role: 'Software Engineer',
    dates: '2025–Present',
    tone: 'plum',
  },
  {
    id: 'biziq-developer-ii',
    employer: 'BIZIQ',
    role: 'Web Developer II',
    dates: '2022–2025',
    tone: 'lavender',
  },
  {
    id: 'biziq-developer-i',
    employer: 'BIZIQ',
    role: 'Web Developer I',
    dates: '2021–2022',
    tone: 'mauve',
  },
  {
    id: 'varep-developer',
    employer: 'VAREP National',
    role: 'Junior Web Developer',
    dates: '2019–2021',
    tone: 'lavender',
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
) {
  if (pill.top >= floor) return null

  // Scrub one spring from the start of the lift so it crosses the frame without a stop.
  const bottom = pill.top + pill.height
  const frameEdge = floor - inset
  const touching = bottom > frameEdge
  const exposed = Math.max(0, Math.min(floor - pill.top, pill.height) - inset)
  const sideRoom = (width - pill.width) / 2 - inset / 2
  const corner = Math.min(pill.radius, pill.width / 2, pill.height / 2)
  const narrow = sideRoom < corner * 1.25

  // A consistent clearance above and around the mobile pill keeps the crest parallel to its edge.
  const visible = Math.max(0, exposed - liquidFrameOverlap)
  const rim = Math.max(0, Math.min(inset * 0.64, sideRoom / 4)) * ease(clamp(visible / 24))
  const lift = narrow ? visible + rim : exposed * 1.18
  const pull = lift * releaseSpring.next(release * 850).value
  const insetLimit = inset * 0.62
  const depth = pull < 0 ? insetLimit * Math.tanh(pull / insetLimit) : pull

  // The spring can overlap the pill after it clears the flat frame.
  // Keep the opening until the crest passes below it.
  const crest = frameEdge - liquidFrameOverlap - Math.max(0, depth)
  const cut = bottom > crest ? roundedPillPath(pill) : ''

  if (depth === 0 && !cut) return null

  if (depth === 0) return { cut, touching, shoulders: '', recoil: '' }

  const footprint = Math.max(1, Math.min(pill.width, sideRoom))

  const radius = narrow ? corner * 1.5 : wordmarkPullRadius(footprint, Math.min(1, footprint / 180))
  const contour = bottomLiquidContour({
    width,
    floor,
    inset,
    center: pill.x,
    depth,
    radius,
    power: narrow ? 2 : wordmarkPullPower,
    stretch: narrow ? pill.width / 2 - corner : (pill.width - footprint) / 2,
    roundedPill: narrow ? { width: pill.width, corner, rim } : undefined,
  })

  return { cut, touching, shoulders: depth > 0 ? contour : '', recoil: depth < 0 ? contour : '' }
}

export function getExperiencePositions(
  progress: number,
  heights: number[],
  top: number,
  floor: number,
  gap: number,
  inset: number,
) {
  const clock = clamp(progress) * heights.length
  const current = Math.min(heights.length - 1, Math.floor(clock))
  const travel = (clock - current) * experienceEntryTravel
  const phase = clamp(travel / experiencePillTravel)
  const release = clamp((travel - releaseStart) / (experienceEntryTravel - releaseStart))
  const starts = [0]

  for (const height of heights) starts.push(starts[starts.length - 1] + height + gap)

  // Keep complete rows in the reading area. Older rows move up when another row needs room.
  function shiftFor(count: number) {
    let first = 0

    while (first < count - 1 && starts[count] - starts[first] - gap > floor - inset - gap - top)
      first++

    return starts[first]
  }

  const moving = ease(phase)
  const shift = mix(shiftFor(current), shiftFor(current + 1), moving)
  const emerge = ease(clamp(phase / dockPortion))
  const lift = ease(clamp((phase - dockPortion) / (1 - dockPortion)))

  return heights.map((height, index) => {
    const rest = top + starts[index] - shift
    // Use a whole pill height for docking on every viewport, then lift into the stack.
    const y =
      index < current ? rest : index > current ? floor : mix(floor - height * emerge, rest, lift)

    return {
      y,
      release,
      visible: y < floor && y + height > top,
      entering: index === current && travel < experienceEntryTravel,
    }
  })
}
