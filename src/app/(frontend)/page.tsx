import { SceneSequence } from '@/components/organisms/SceneSequence'
import { PortfolioHero } from '@/components/organisms/PortfolioHero'
import { SkillsScene } from '@/components/organisms/SkillsScene'
import { WorkSections } from '@/components/organisms/WorkSections'
import { ProfileSections } from '@/components/organisms/ProfileSections'
import { Correspondence } from '@/components/organisms/Correspondence'
import { PortfolioLoader } from '@/components/organisms/PortfolioLoader'

export default function HomePage() {
  const playLoaderOnce = process.env.PORTFOLIO_LOADER_PLAY_ONCE === 'true'

  return (
    <>
      <noscript>
        <style>{'.portfolio-loader{display:none}'}</style>
      </noscript>
      <PortfolioLoader playOnce={playLoaderOnce} />
      <SceneSequence>
        <PortfolioHero />
        <SkillsScene />
        <WorkSections />
        <ProfileSections />
        <Correspondence />
      </SceneSequence>
    </>
  )
}
