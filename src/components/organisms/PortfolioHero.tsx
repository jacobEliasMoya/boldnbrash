'use client'

import { HeroMark } from '@/components/atoms/HeroMark'
import { motion, useReducedMotion } from 'motion/react'
import { useIntroReady } from '@/hooks/useIntroReady'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia('(max-width: 760px)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const entrance = { opacity: 0, y: 10 }
const entered = { opacity: 1, y: 0 }
const letterStep = 0.055
const entranceTempo = 0.65

function entranceTransition(delay: number, reduceMotion: boolean | null) {
  return {
    type: 'spring' as const,
    duration: reduceMotion ? 0 : 0.65 * entranceTempo,
    bounce: reduceMotion ? 0 : 0.12,
    delay: reduceMotion ? 0 : Math.max(0, delay - 0.72) * entranceTempo * 0.9,
  }
}

function AnimatedWord({
  word,
  wordIndex,
  start,
  reduceMotion,
  introReady,
}: {
  word: string
  wordIndex: number
  start: number
  reduceMotion: boolean | null
  introReady: boolean
}) {
  return (
    <span className="hero-line" aria-hidden="true">
      {[...word].map((letter, index) => (
        <motion.span
          className="hero-letter"
          data-fill-index={wordIndex * 6 + index}
          key={`${letter}-${index}`}
          initial={reduceMotion ? false : entrance}
          animate={introReady ? entered : entrance}
          transition={entranceTransition(start + index * letterStep, reduceMotion)}
        >
          {letter}
        </motion.span>
      ))}
    </span>
  )
}

export function PortfolioHero() {
  const reduceMotion = useReducedMotion()
  const loaderReady = useIntroReady()
  const mobile = useSyncExternalStore(subscribeMobile,
    () => window.matchMedia('(max-width: 760px)').matches, () => false)
  const [navReady, setNavReady] = useState(false)
  const [particlesReady, setParticlesReady] = useState(false)
  const finishFormation = useCallback(() => setParticlesReady(true), [])
  useEffect(() => {
    const complete = () => setNavReady(true)
    window.addEventListener('portfolio:mobile-nav-ready', complete)
    if (document.documentElement.dataset.mobileNavReady === 'true') complete()
    return () => window.removeEventListener('portfolio:mobile-nav-ready', complete)
  }, [])
  const introReady = loaderReady && (!mobile || reduceMotion || particlesReady)

  return (
    <div className="hero-scene scene-content">
      <div className="hero-copy">
        <motion.p
          className="eyebrow hero-greeting"
          initial={reduceMotion ? false : entrance}
          animate={introReady ? entered : entrance}
          transition={entranceTransition(0.82, reduceMotion)}
        >
          <span className="hero-copy-fill">Hi, I’m</span>
          <span className="name-pill"><span className="hero-copy-fill">Jake</span></span>
        </motion.p>
        <h1 aria-label="Build. Break. Repeat.">
          <AnimatedWord
            word="Build."
            wordIndex={0}
            start={0.98}
            reduceMotion={reduceMotion}
            introReady={introReady}
          />
          <AnimatedWord
            word="Break."
            wordIndex={1}
            start={1.31}
            reduceMotion={reduceMotion}
            introReady={introReady}
          />
          <span className="hero-line">
            <span aria-hidden="true">
              {[...'Repeat'].map((letter, index) => (
                <motion.span
                  className="hero-letter"
                  data-fill-index={12 + index}
                  key={`${letter}-${index}`}
                  initial={reduceMotion ? false : entrance}
                  animate={introReady ? entered : entrance}
                  transition={entranceTransition(1.64 + index * letterStep, reduceMotion)}
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
              animate={introReady ? entered : entrance}
              transition={entranceTransition(1.64 + 6 * letterStep, reduceMotion)}
              onAnimationComplete={() => {
                if (!introReady) return
                const hero = document.querySelector<HTMLElement>('.scene-top')
                if (hero) hero.dataset.periodReady = 'true'
              }}
            >
              <span className="hero-period-glyph hero-letter" data-fill-index={18} aria-hidden="true">
                .
              </span>
              <span data-portal="skills" aria-hidden="true" />
            </motion.a>
          </span>
        </h1>
        <motion.p
          className="hero-description w-full"
          initial={reduceMotion ? false : entrance}
          animate={introReady ? entered : entrance}
          transition={entranceTransition(2.18, reduceMotion)}
        >
          <span className="hero-copy-fill">
            I build for the web. Half the fun is finding out why it broke.
          </span>
        </motion.p>
        <span className="sr-only">Jacob Moya’s creative development portfolio</span>
      </div>
      <div className="hero-mark">
        <HeroMark
          entranceReady={mobile ? loaderReady && (navReady || !!reduceMotion) : undefined}
          onFormationComplete={mobile ? finishFormation : undefined}
        />
      </div>
    </div>
  )
}
