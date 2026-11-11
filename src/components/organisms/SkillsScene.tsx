'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const skills = [
  ['React', 'Interfaces & components'],
  ['Next.js', 'Web applications'],
  ['TypeScript', 'Systems that scale'],
  ['Strapi', 'Content & integrations'],
  ['Go', 'Servers & tools'],
]

export function SkillsScene() {
  const [selection, setSelection] = useState({ index: 0, direction: 1 })
  const selected = selection.index
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    function update(event: Event) {
      const progress = (event as CustomEvent<number>).detail
      const index = Math.round(progress * (skills.length - 1))
      setSelection((previous) =>
        previous.index === index
          ? previous
          : { index, direction: index > previous.index ? 1 : -1 },
      )
    }
    window.addEventListener('portfolio:skills-progress', update)
    return () => window.removeEventListener('portfolio:skills-progress', update)
  }, [])

  function select(index: number) {
    const handled = !window.dispatchEvent(
      new CustomEvent('portfolio:select-skill', {
        detail: index,
        cancelable: true,
      }),
    )
    if (!handled)
      setSelection((previous) => ({
        index,
        direction: index > previous.index ? 1 : -1,
      }))
  }

  return (
    <div className="skills-scene scene-content">
      <div className="skills-heading">
        <p className="eyebrow">
          <span>02 —</span> Skills
        </p>
        <h2>
          The tools.
          <br />
          The thinking.
        </h2>
        <p className="skills-intro">
          Turn through the tools.
          <br />
          Then into the work.
        </p>
        <div className="wheel-selection" aria-live="polite" aria-atomic="true">
          <AnimatePresence
            initial={false}
            mode="popLayout"
            custom={selection.direction}
          >
            <motion.div
              key={selected}
              custom={selection.direction}
              variants={{
                enter: (direction: number) => ({
                  opacity: 0,
                  y: reduceMotion ? 0 : direction * 14,
                }),
                visible: { opacity: 1, y: 0 },
                exit: (direction: number) => ({
                  opacity: 0,
                  y: reduceMotion ? 0 : -direction * 14,
                }),
              }}
              initial="enter"
              animate="visible"
              exit="exit"
              transition={{
                duration: reduceMotion ? 0 : 0.22,
                ease: 'easeOut',
              }}
            >
              <span>0{selected + 1} / 05</span>
              <strong>{skills[selected][0]}</strong>
              <p>{skills[selected][1]}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="wheel-controls" aria-label="Browse skills">
          <button
            type="button"
            onClick={() => select(selected - 1)}
            disabled={selected === 0}
            aria-label="Previous skill"
          >
            ←
          </button>

          <button
            type="button"
            onClick={() => select(selected + 1)}
            disabled={selected === skills.length - 1}
            aria-label="Next skill"
          >
            →
          </button>
        </div>
      </div>
      <div className="wheel-window">
        <div className="skills-wheel">
          <div className="wheel-rings" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <ul className="wheel-rotor" aria-label="Skills wheel">
            {skills.map(([name, description], index) => (
              <li
                key={name}
                style={{ '--skill-index': index } as CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => select(index)}
                  aria-pressed={selected === index}
                  tabIndex={selected === index ? 0 : -1}
                >
                  <span className="skill-number">0{index + 1}</span>
                  <h3>{name}</h3>
                  <p>{description}</p>
                  <i aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="circle-portal" data-portal="work" aria-hidden="true">
            <motion.span
              className="portal-core"
              animate={{ scale: selected === 4 && !reduceMotion ? 1.06 : 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </div>
      <div className="scene-footnote">
        <span>Learn. Build. Repeat.</span>
        <span>02 / 05</span>
      </div>
    </div>
  )
}
