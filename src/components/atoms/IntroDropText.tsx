import { Fragment } from 'react'

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
