'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { ProfileLinks } from '@/components/molecules/ProfileLinks'
import { IntroDropText } from '@/components/atoms/IntroDropText'
import { WordEmphasis } from '@/components/atoms/WordEmphasis'
import { clamp, skillParagraphEndPortion, skillTitleFillPortion } from './skillsTimeline'

function AboutIntroduction() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const update = (event: Event) => setProgress((event as CustomEvent<number>).detail)

    window.addEventListener('portfolio:about-intro', update)

    return () => window.removeEventListener('portfolio:about-intro', update)
  }, [])

  // Match Work: fill the two title lines first, then pass emphasis through the paragraph.
  const intro = progress * skillParagraphEndPortion
  const fill = (line: number) =>
    ({
      '--title-fill': `${clamp(intro / (skillTitleFillPortion / 2) - line) * 100}%`,
    }) as CSSProperties
  const paragraph = clamp(
    (intro - skillTitleFillPortion) / (skillParagraphEndPortion - skillTitleFillPortion),
  )

  return (
    <div className="about-introduction skills-heading">
      <h2 aria-label="Get To Know Me Some More">
        <span className="skills-title-line">
          <span className="skills-title-fill" data-intro-title="" style={fill(0)}>
            <IntroDropText text="Get To Know" />
          </span>
        </span>
        <span className="skills-title-line">
          <span className="skills-title-fill" data-intro-title="" style={fill(1)}>
            <IntroDropText text="Me Some More" />
          </span>
          <a href="#about-profile" className="about-next" aria-label="Read more about Jacob">
            <span className="skills-title-period" data-intro-drop="letter" aria-hidden="true" />
          </a>
        </span>
      </h2>
      <p className="skills-intro">
        <WordEmphasis
          text="Hey, I’m Jacob, a software engineer in Southern California. I’m curious about how things work, and I like making things fun to use."
          progress={paragraph}
          dropIn
        />
      </p>
    </div>
  )
}

export function ProfileSections() {
  return (
    <div className="about-pages">
      <AboutIntroduction />
      <div className="about-reveal intro-period-reveal">
        <div
          id="about-profile"
          className="about-scroll"
          tabIndex={0}
          role="region"
          aria-labelledby="about-title"
        >
          <div className="about-sheet">
            <p className="eyebrow">About</p>
            <h2 id="about-title">How I work.</h2>
            <p className="about-summary">
              My favorite part of a project is figuring out what would make someone’s day easier. I
              like talking it through, trying a small first version, and paying attention to where
              people get stuck. I want the next person who opens the code to feel at home, too.
            </p>
            <details className="about-details" open>
              <summary>
                Experience <span className="about-toggle" aria-hidden="true" />
              </summary>
              <ul>
                <li>
                  <strong>Inenvi</strong>
                  <span>Software Engineer · 2025–Present</span>
                </li>
                <li>
                  <strong>BIZIQ</strong>
                  <span>Web Developer II · 2022–2025</span>
                </li>
                <li>
                  <strong>BIZIQ</strong>
                  <span>Web Developer I · 2021–2022</span>
                </li>
                <li>
                  <strong>VAREP National</strong>
                  <span>Junior Web Developer · 2019–2021</span>
                </li>
              </ul>
            </details>
            <div className="about-actions">
              <ProfileLinks placement="about" />
              <a href="#contact" data-portal="contact">
                Get in touch <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
