'use client'

import { HeroMark } from '@/components/atoms/HeroMark'
import { WordEmphasis } from '@/components/atoms/WordEmphasis'
import { motion, useReducedMotion } from 'motion/react'
import { useIntroReady } from '@/hooks/useIntroReady'
import { Fragment, useCallback, useEffect, useState, useSyncExternalStore } from 'react'

function subscribeMobile(onChange: () => void) {
  const media = window.matchMedia('(max-width: 760px)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

const entrance = { opacity: 0, y: 10 }
const entered = { opacity: 1, y: 0 }
const letterStep = 0.055
const entranceTempo = 0.65
const heroParticlesEnabled = false
const headline = ['Plan It.', 'Build It.', 'Launch It'] as const

function entranceTransition(delay: number, reduceMotion: boolean | null) {
  return {
    type: 'spring' as const,
    duration: reduceMotion ? 0 : 0.65 * entranceTempo,
    bounce: reduceMotion ? 0 : 0.12,
    delay: reduceMotion ? 0 : Math.max(0, delay - 0.72) * entranceTempo * 0.9,
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
  return (
    <span aria-hidden="true">
      {[...text].map((letter, index) => letter === ' ' ? <Fragment key={index}> </Fragment> : (
        <motion.span
          className="hero-letter"
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
  const introReady = loaderReady && (!mobile || reduceMotion ||
    (heroParticlesEnabled ? particlesReady : navReady))

  return (
    <div className="hero-scene scene-content">
      <div className="hero-copy">
        <motion.p
          className="eyebrow hero-greeting"
          initial={reduceMotion ? false : entrance}
          animate={introReady ? entered : entrance}
          transition={entranceTransition(0.82, reduceMotion)}
        >
          Hi, I’m <span className="name-pill">Jake</span>
        </motion.p>
        <h1 aria-label={`${headline.join(' ')}.`}>
          {headline.slice(0, -1).map((text, index) => (
            <span key={text} className="hero-line">
              <AnimatedLetters text={text} start={0.98 + index * 0.33} reduceMotion={reduceMotion} introReady={introReady} />
              {' '}
            </span>
          ))}
          <span className="hero-line">
            <AnimatedLetters text={headline[2]} start={1.64} reduceMotion={reduceMotion} introReady={introReady} />
            <motion.a
              className="hero-period"
              href="#skills"
              aria-label="Explore selected projects and skills"
              initial={reduceMotion ? false : entrance}
              animate={introReady ? entered : entrance}
              transition={entranceTransition(1.64 + headline[2].length * letterStep, reduceMotion)}
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
          initial={reduceMotion ? false : entrance}
          animate={introReady ? entered : entrance}
          transition={entranceTransition(2.18, reduceMotion)}
        >
          <WordEmphasis
            text="I turn thoughtful design into accessible interfaces and reusable systems."
            progress={paragraphProgress}
          />
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
