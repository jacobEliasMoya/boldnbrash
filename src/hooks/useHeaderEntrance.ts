'use client'

import { useSyncExternalStore } from 'react'
import { dotReboundScale, dotReboundTransition } from '@/components/atoms/dot-icons/dotMotion'

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

function subscribe(onChange: () => void) {
  const media = window.matchMedia(mobileQuery)

  media.addEventListener('change', onChange)

  return () => media.removeEventListener('change', onChange)
}

const getSnapshot = () => window.matchMedia(mobileQuery).matches
const getServerSnapshot = () => false

export function useHeaderEntrance(linkCount = 4) {
  const mobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Reuse the dot-click rebound, starting the next control one third of the way in.
  return {
    mobile,
    duration: mobile ? entranceDuration : 0.7,
    logoDelay,
    linkDelay: (index: number) => logoDelay + (0.7 / 3) * (index + 1),
    playDelay: mobile ? logoDelay + overlapStep : logoDelay + (0.7 / 3) * (linkCount + 1),
    themeDelay: mobile ? logoDelay + overlapStep * 2 : logoDelay + (0.7 / 3) * (linkCount + 2),
    menuDelay: mobile ? logoDelay + overlapStep * 3 : 0.22,
  }
}
