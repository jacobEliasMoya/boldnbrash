'use client'

import { HeroMark } from '@/components/atoms/HeroMark'
import {
  heroHeadlineStart,
  heroLetterStep,
  heroTextEntranceDelay,
  heroTextEntranceDuration,
} from '@/components/atoms/heroFrames'
import { WordEmphasis } from '@/components/atoms/WordEmphasis'
import { motion, useReducedMotion } from 'motion/react'
import { useIntroReady } from '@/hooks/useIntroReady'
import { useClientReady } from '@/hooks/useClientReady'
import { Fragment, useCallback, useEffect, useState, useSyncExternalStore } from 'react'

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia('(max-width: 760px)')

  media.addEventListener('change', onChange)

  return () => media.removeEventListener('change', onChange)
}

const entrance = { opacity: 0, y: 10 }
const entered = { opacity: 1, y: 0 }
const heroParticlesEnabled = false
const headline = ['Plan It.', 'Build It.', 'Launch It'] as const

function entranceTransition(delay: number, reduceMotion: boolean | null) {
  return {
    type: 'spring' as const,
    duration: reduceMotion ? 0 : heroTextEntranceDuration,
    bounce: reduceMotion ? 0 : 0.12,
    delay: reduceMotion ? 0 : heroTextEntranceDelay(delay),
  }
}

function AnimatedLetters({
  text,
  start,
  reduceMotion,
  introReady,
}: {
  text: string
  start: number
  reduceMotion: boolean | null
  introReady: boolean
}) {
  const clientReady = useClientReady()

  return (
    <span aria-hidden="true">
      {[...text].map((letter, index) =>
        letter === ' ' ? (
          <Fragment key={index}> </Fragment>
        ) : (
          <motion.span
            className="hero-letter"
            key={`${letter}-${index}`}
            initial={false}
            animate={clientReady ? (introReady ? entered : entrance) : undefined}
            transition={entranceTransition(start + index * heroLetterStep, reduceMotion)}
          >
            {letter}
          </motion.span>
        ),
      )}
    </span>
  )
}

export function PortfolioHero() {
  const reduceMotion = useReducedMotion()
  const loaderReady = useIntroReady()
  const clientReady = useClientReady()
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia('(max-width: 760px)').matches,
    () => false,
  )
  const [navReady, setNavReady] = useState(false)
  const [particlesReady, setParticlesReady] = useState(false)
  const [paragraphProgress, setParagraphProgress] = useState(0)
  const finishFormation = useCallback(() => setParticlesReady(true), [])

  useEffect(() => {
    const complete = () => setNavReady(true)

    window.addEventListener('portfolio:mobile-nav-ready', complete)

    if (document.documentElement.dataset.mobileNavReady === 'true') complete()

    return () => window.removeEventListener('portfolio:mobile-nav-ready', complete)
  }, [])
  useEffect(() => {
    const update = (event: Event) => {
      setParagraphProgress((event as CustomEvent<{ paragraph: number }>).detail.paragraph)
    }

    window.addEventListener('portfolio:hero-progress', update)

    return () => window.removeEventListener('portfolio:hero-progress', update)
  }, [])

  const introReady =
    loaderReady && (!mobile || reduceMotion || (heroParticlesEnabled ? particlesReady : navReady))

  return (
    <div className="hero-scene scene-content">
      <div className="hero-copy">
        <motion.p
          className="eyebrow hero-greeting"
          initial={false}
          animate={clientReady ? (introReady ? entered : entrance) : undefined}
          transition={entranceTransition(0.82, reduceMotion)}
        >
          Hi, I’m <span className="name-pill">Jake</span>
        </motion.p>
        <h1 aria-label={`${headline.join(' ')}.`}>
          {headline.slice(0, -1).map((text, index) => (
            <span key={text} className="hero-line">
              <AnimatedLetters
                text={text}
                start={heroHeadlineStart + index * 0.33}
                reduceMotion={reduceMotion}
                introReady={introReady}
              />{' '}
            </span>
          ))}
          <span className="hero-line">
            <AnimatedLetters
              text={headline[2]}
              start={1.64}
              reduceMotion={reduceMotion}
              introReady={introReady}
            />
            <motion.a
              className="hero-period"
              href="#skills"
              aria-label="Explore selected projects and skills"
              initial={false}
              animate={clientReady ? (introReady ? entered : entrance) : undefined}
              transition={entranceTransition(
                1.64 + headline[2].length * heroLetterStep,
                reduceMotion,
              )}
              onAnimationComplete={() => {
                if (!introReady) return

                const hero = document.querySelector<HTMLElement>('.scene-top')

                if (hero) hero.dataset.periodReady = 'true'
              }}
            >
              <span className="hero-period-glyph hero-letter" aria-hidden="true">
                .
              </span>
              <span data-portal="skills" aria-hidden="true" />
            </motion.a>
          </span>
        </h1>
        <motion.p
          className="hero-description w-full"
          initial={false}
          animate={clientReady ? (introReady ? entered : entrance) : undefined}
          transition={entranceTransition(2.18, reduceMotion)}
        >
          <WordEmphasis text="Take a scroll. See what pops." progress={paragraphProgress} />
        </motion.p>
      </div>
      <div className="hero-mark">
        <HeroMark
          particlesEnabled={heroParticlesEnabled}
          entranceReady={mobile ? loaderReady && (navReady || !!reduceMotion) : undefined}
          walkReady={!!introReady}
          onFormationComplete={mobile ? finishFormation : undefined}
        />
      </div>
    </div>
  )
}
