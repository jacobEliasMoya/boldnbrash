'use client'

import { Fragment } from 'react'
import { motion, spring, useTransform, type MotionValue } from 'motion/react'

export const introDropSpring = { type: 'spring', duration: 0.45, bounce: 0.1 } as const
const dropDuration = introDropSpring.duration * 1000
const scrollDropSpring = spring({ ...introDropSpring, duration: dropDuration, keyframes: [1, 0] })

function ScrollDropUnit({
  text,
  progress,
  start,
  end,
  distance,
}: {
  text: string
  progress: MotionValue<number>
  start: number
  end: number
  distance: number
}) {
  const phase = useTransform(progress, [start, end], [0, 1])
  const visibility = useTransform(phase, (value) => (value > 0 ? 'visible' : 'hidden'))
  const y = useTransform(
    phase,
    (value) => -distance * scrollDropSpring.next(value * dropDuration).value,
  )

  return (
    <motion.span data-scroll-drop="" style={{ y, visibility }}>
      {text}
    </motion.span>
  )
}

export function ScrollDropText({
  text,
  progress,
  by,
}: {
  text: string
  progress: MotionValue<number>
  by: 'letter' | 'word'
}) {
  const tokens = text.split(/(\s+)/)
  const words = tokens.filter((token) => /\S/.test(token))
  const count = by === 'word' ? words.length : Array.from(words.join('')).length
  const travel = 0.5
  const stagger = (1 - travel) / Math.max(1, count - 1)
  let index = 0

  const drop = (unit: string) => {
    const start = index * stagger

    return (
      <ScrollDropUnit
        key={index++}
        text={unit}
        progress={progress}
        start={start}
        end={start + travel}
        distance={by === 'letter' ? 22 : 12}
      />
    )
  }

  return tokens.map((token, tokenIndex) => {
    if (!/\S/.test(token)) return <Fragment key={tokenIndex}>{token}</Fragment>
    if (by === 'word') return <Fragment key={tokenIndex}>{drop(token)}</Fragment>

    // Keep the same word boundaries while the individual glyphs fall.
    return (
      <span key={tokenIndex} className="intro-drop-word">
        {Array.from(token).map(drop)}
      </span>
    )
  })
}

export function IntroDropText({ text }: { text: string }) {
  const letters = (moving: boolean) =>
    Array.from(text).map((letter, index) =>
      /\S/.test(letter) ? (
        <span
          className="intro-title-glyph"
          key={index}
          data-intro-drop={moving ? 'letter' : undefined}
        >
          {letter}
        </span>
      ) : (
        <Fragment key={index}>{letter}</Fragment>
      ),
    )

  return (
    <>
      {letters(true)}
      {/* Use the same glyph boxes for the fill so the handoff cannot change spacing. */}
      <span className="intro-title-paint" aria-hidden="true">
        {letters(false)}
      </span>
    </>
  )
}
