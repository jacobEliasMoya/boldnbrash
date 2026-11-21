import { animate, type MotionValue, type useAnimationControls } from 'motion/react'

export const dotGatherDuration = 0.14
export const dotReboundScale = [0.86, 1.16, 0.98, 1]
export const dotReboundTransition = {
  duration: 0.24,
  times: [0, 0.5, 0.8, 1],
  ease: 'easeInOut' as const,
}

export async function playDotClick(controls: ReturnType<typeof useAnimationControls>) {
  await controls.start('gather')
  await controls.start('rebound')
}

export function mergeDots(
  gather: MotionValue<number>,
  scale: MotionValue<number>,
  complete: () => void,
) {
  let stopped = false
  const spreadDuration = 0.07
  const duration = spreadDuration + dotGatherDuration
  // Negative gather progress moves the outer dots away from the center.
  const merge = animate(gather, [gather.get(), -0.24, 1], {
    duration,
    times: [0, spreadDuration / duration, 1],
    ease: ['easeOut', [0.4, 0, 0.2, 1]],
  })
  const compress = animate(scale, 0.86, { duration: dotGatherDuration, delay: spreadDuration })
  const stop = [() => merge.stop(), () => compress.stop()]

  void (async () => {
    await Promise.all([merge, compress])

    if (stopped) return

    const rebound = animate(scale, dotReboundScale, dotReboundTransition)

    stop.push(() => rebound.stop())
    await rebound

    if (!stopped) complete()
  })()

  return () => {
    stopped = true
    stop.forEach((cancel) => cancel())
  }
}
