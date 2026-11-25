import { Fragment } from 'react'
import { motion, spring } from 'motion/react'

export const introDropSpring = { type: 'spring', duration: 0.45, bounce: 0.1 } as const

const letterDrop = spring({
  keyframes: [1, 0],
  duration: introDropSpring.duration * 1000,
  bounce: introDropSpring.bounce,
})

export function ScrollIntroDropText({ text, progress }: { text: string; progress: number }) {
  const staggerPortion = 0.42
  let offset = 0

  return text.split(' ').map((word, wordIndex) => {
    const start = offset
    offset += word.length + 1

    return (
      <Fragment key={wordIndex}>
        {wordIndex > 0 && ' '}
        <span style={{ whiteSpace: 'nowrap' }}>
          {Array.from(word).map((letter, index) => {
            const delay = ((start + index) / Math.max(1, text.length - 1)) * staggerPortion
            const phase = Math.max(0, Math.min(1, (progress - delay) / (1 - staggerPortion)))
            // Sample the same drop spring so a scroll reversal retraces each letter's path.
            const y =
              phase === 1 ? 0 : letterDrop.next(phase * introDropSpring.duration * 1000).value

            return (
              <motion.span
                key={index}
                className="intro-title-glyph"
                style={{ y: `${-0.85 * y}em`, opacity: phase > 0 ? 1 : 0 }}
              >
                {letter}
              </motion.span>
            )
          })}
        </span>
      </Fragment>
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
