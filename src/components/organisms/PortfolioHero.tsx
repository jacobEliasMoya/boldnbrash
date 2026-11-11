import { ParticleMonogram } from '@/components/atoms/ParticleMonogram'

export function PortfolioHero() {
  return (
    <div className="hero-scene scene-content">
      <div className="hero-copy">
        <p className="eyebrow">
          <span>01 —</span> Creative developer
        </p>
        <h1>
          Build.
          <br />
          Break.
          <br />
          Repeat.
        </h1>
        <p className="hero-description">
          I build for the web. Half the fun is finding out why it broke.
        </p>
        <span className="sr-only">
          Jacob Moya’s creative development portfolio
        </span>
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
