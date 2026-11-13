'use client'

import { useEffect, useState } from 'react'

export const introCompleteEvent = 'portfolio:intro-complete'

export function useIntroReady() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    function complete() {
      setReady(true)
    }

    if (document.documentElement.dataset.introComplete === 'true') complete()
    window.addEventListener(introCompleteEvent, complete)
    return () => window.removeEventListener(introCompleteEvent, complete)
  }, [])

  return ready
}
