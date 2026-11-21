import { SceneSequence } from '@/components/organisms/SceneSequence'
import { PortfolioHero } from '@/components/organisms/PortfolioHero'
import { SkillsScene } from '@/components/organisms/SkillsScene'
import { ProfileSections } from '@/components/organisms/ProfileSections'
import { Correspondence } from '@/components/organisms/Correspondence'
import { PortfolioLoader } from '@/components/organisms/PortfolioLoader'

export default function HomePage() {
  const playLoaderOnce = process.env.PORTFOLIO_LOADER_PLAY_ONCE === 'true'

  return (
    <>
      <noscript>
        <style>{`
          .portfolio-loader { display: none; }
          .site-header, .wordmark, .hero-greeting, .hero-description, .hero-letter, .hero-period {
            opacity: 1 !important;
            transform: none !important;
          }
        `}</style>
      </noscript>
      <PortfolioLoader playOnce={playLoaderOnce} />
      <SceneSequence>
        <PortfolioHero />
        <SkillsScene />
        <ProfileSections />
        <Correspondence />
      </SceneSequence>
    </>
  )
}
