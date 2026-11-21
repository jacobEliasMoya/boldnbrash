'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

// Keep server HTML and the first hydration render visible before enabling Motion.
export function useClientReady() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
