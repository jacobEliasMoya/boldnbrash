'use client'

import { useSyncExternalStore } from 'react'
import { dotReboundScale, dotReboundTransition } from '@/components/atoms/dot-icons/dotMotion'
import {
  heroHeadlineStart,
  heroLetterStep,
  heroTextEntranceDelay,
  heroTextEntranceDuration,
} from '@/components/atoms/heroFrames'

const mobileQuery = '(max-width: 760px)'
const entranceDuration = 0.42
export const mobileHeaderPop = { ...dotReboundTransition, duration: entranceDuration }
export const mobileHeaderRest = { opacity: 0, scale: 0.84 }
export const mobileHeaderEntered = {
  opacity: 1,
  scale: [mobileHeaderRest.scale, ...dotReboundScale.slice(1)],
}

export function getMobileHeaderPop(delay: number, reduced: boolean | null) {
  const startDelay = reduced ? 0 : delay

  // Reveal at full opacity when the bounce starts; never fade through translucent frames.
  return {
    ...mobileHeaderPop,
    ...(reduced ? { duration: 0 } : {}),
    delay: startDelay,
    opacity: { duration: 0, delay: startDelay },
  }
}

const logoDelay = 0.08
const overlapStep = entranceDuration / 3
// The first two homepage letters finish before the desktop labels start dropping.
const firstLinkDelay =
  heroTextEntranceDelay(heroHeadlineStart + heroLetterStep) + heroTextEntranceDuration
const linkStagger = 0.07
const desktopControlStep = 0.7 / 3

function subscribe(onChange: () => void) {
  const media = window.matchMedia(mobileQuery)

  media.addEventListener('change', onChange)

  return () => media.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(mobileQuery).matches
const getServerSnapshot = () => false

export function useHeaderEntrance(linkCount = 4) {
  const mobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const lastLinkDelay = firstLinkDelay + (linkCount - 1) * linkStagger

  // Reuse the dot-click rebound, starting the next control one third of the way in.
  return {
    mobile,
    duration: mobile ? entranceDuration : 0.7,
    logoDelay,
    linkDelay: (index: number) => firstLinkDelay + index * linkStagger,
    playDelay: mobile ? logoDelay + overlapStep : lastLinkDelay + desktopControlStep,
    themeDelay: mobile ? logoDelay + overlapStep * 2 : lastLinkDelay + desktopControlStep * 2,
    menuDelay: mobile ? logoDelay + overlapStep * 3 : 0.22,
  }
}
