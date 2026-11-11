'use client'

import { ParticleMonogram } from '@/components/atoms/ParticleMonogram'
import { motion, useReducedMotion } from 'motion/react'

const entrance = { opacity: 0, y: -20 }
const entered = { opacity: 1, y: 0 }
const letterStep = 0.055

function AnimatedWord({
  word,
  wordIndex,
  start,
  reduceMotion,
}: {
  word: string
  wordIndex: number
  start: number
  reduceMotion: boolean | null
}) {
  return (
    <span className="hero-line" aria-hidden="true">
      {[...word].map((letter, index) => (
        <motion.span
          className="hero-letter"
          data-fill-index={wordIndex * 6 + index}
          key={`${letter}-${index}`}
          initial={reduceMotion ? false : entrance}
          animate={entered}
          transition={{
            duration: reduceMotion ? 0 : 0.52,
            delay: reduceMotion ? 0 : start + index * letterStep,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  )
}

export function PortfolioHero() {
  const reduceMotion = useReducedMotion()
  const transition = (delay: number) => ({
    duration: reduceMotion ? 0 : 0.62,
    delay: reduceMotion ? 0 : delay,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  })

  return (
    <div className="hero-scene scene-content">
      <div className="hero-copy">
        <motion.p
          className="eyebrow hero-greeting"
          initial={reduceMotion ? false : entrance}
          animate={entered}
          transition={transition(0.82)}
        >
          Hi, I’m <span className="name-pill">Jake</span>
        </motion.p>
        <h1 aria-label="Build. Break. Repeat.">
          <AnimatedWord word="Build." wordIndex={0} start={0.98} reduceMotion={reduceMotion} />
          <AnimatedWord word="Break." wordIndex={1} start={1.31} reduceMotion={reduceMotion} />
          <span className="hero-line">
            <span aria-hidden="true">
              {[...'Repeat'].map((letter, index) => (
                <motion.span
                  className="hero-letter"
                  data-fill-index={12 + index}
                  key={`${letter}-${index}`}
                  initial={reduceMotion ? false : entrance}
                  animate={entered}
                  transition={{
                    duration: reduceMotion ? 0 : 0.52,
                    delay: reduceMotion ? 0 : 1.64 + index * letterStep,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </span>
            <motion.a
              className="hero-period"
              href="#skills"
              aria-label="Explore my skills"
              initial={reduceMotion ? false : entrance}
              animate={entered}
              transition={{
                duration: reduceMotion ? 0 : 0.52,
                delay: reduceMotion ? 0 : 1.64 + 6 * letterStep,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <span data-portal="skills" aria-hidden="true" />
            </motion.a>
          </span>
        </h1>
        <motion.p
          className="hero-description w-full"
          initial={reduceMotion ? false : entrance}
          animate={entered}
          transition={transition(2.18)}
        >
          I build for the web. Half the fun is finding out why it broke.
        </motion.p>
        <span className="sr-only">Jacob Moya’s creative development portfolio</span>
      </div>
      <div className="hero-mark">
        <ParticleMonogram />
      </div>
      <div className="scene-footnote">
        <span>Southern California</span>
      </div>
    </div>
  )
}
