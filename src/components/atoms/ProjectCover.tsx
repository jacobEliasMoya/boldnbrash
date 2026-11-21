import { PlatformArtwork, SystemArtwork } from './ProjectArtwork'

export function ProjectCover({ artwork, title }: { artwork: string; title: string }) {
  if (artwork === 'model') {
    return (
      <svg className="project-cover-image" viewBox="0 0 600 540" fill="none" aria-hidden="true">
        <path
          d="M12 375 195 270 289 105 351 120 345 232 570 174 540 314 349 362 188 452Z"
          fill="#3236eb"
        />
        <path d="m195 270 94-165 62 15-76 174Z" fill="#151884" />
        <path d="m345 232 225-58-30 140-191 48Z" fill="#151884" />
        <path d="m45 354 156-109 142-30 104 58-105 109-192 49Z" fill="#454cff" />
        <path d="m45 354 105 77 192-49 105-109-99 45-171 62Z" fill="#1726af" />
        <path d="m45 354 132 26 171-62-30-64-117-9Z" fill="#6575ff" />
        <path d="m177 380 45-108 96-18 30 64Z" fill="#27223e" />
        <path d="m222 272 96-18 30 64" stroke="#6cf7ff" strokeWidth="5" />
        <path d="m58 366 94 21-4 25-83-23Z" fill="#a6fbff" />
        <path d="m362 296 43-15-25 36-33 14Z" fill="#6cf7ff" />
        <path d="m45 354 132 26 171-62" stroke="#8a9bff" strokeWidth="2" />
      </svg>
    )
  }

  if (artwork === 'automation') {
    return (
      <svg className="project-cover-image" viewBox="0 0 600 540" fill="none" aria-hidden="true">
        <path d="M0 270H600V540H0Z" fill="#7041ac" />
        <circle cx="365" cy="238" r="62" fill="#ffdf81" />
        <path
          d="M0 315Q140 290 300 315T600 315M0 355Q180 330 340 355T600 355M0 405Q150 380 300 405T600 405"
          stroke="#ffab88"
          strokeWidth="6"
          opacity=".7"
        />
        <path
          d="M135 540Q156 330 130 165M440 540Q405 325 431 132"
          stroke="#211533"
          strokeWidth="17"
        />
        <path
          d="M130 165Q50 65 8 175Q70 135 130 165Q55 170 31 251Q88 196 130 165Q168 86 237 136Q174 137 130 165Q202 174 224 243Q166 197 130 165ZM431 132Q350 25 292 118Q376 100 431 132Q347 140 328 224Q394 165 431 132Q462 36 552 80Q478 91 431 132Q523 126 582 207Q492 166 431 132Z"
          fill="#211533"
        />
        <path d="M300 0V540" stroke="#fff3df" strokeWidth="3" />
        <path d="M0 0H300V540H0Z" fill="#231d49" opacity=".26" />
      </svg>
    )
  }

  if (artwork === 'terminal' || artwork === 'agent') {
    return (
      <div className="project-cover-terminal" aria-hidden="true">
        <strong>
          <span>&gt;</span> {title === 'GitGo' ? 'gitgo' : title === 'Nexus' ? 'nexus' : 'ollama'}
          <i>_</i>
        </strong>
        <span>
          {title === 'GitGo'
            ? 'Git workflows.'
            : title === 'Nexus'
              ? 'Context, on command.'
              : 'Local. Offline.'}
        </span>
      </div>
    )
  }

  return (
    <div className="project-cover-interface">
      {artwork === 'system' ? <SystemArtwork /> : <PlatformArtwork />}
    </div>
  )
}
