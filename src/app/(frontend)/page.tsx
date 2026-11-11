import { SceneSequence } from '@/components/organisms/SceneSequence'
import { PortfolioHero } from '@/components/organisms/PortfolioHero'
import { SkillsScene } from '@/components/organisms/SkillsScene'
import { WorkSections } from '@/components/organisms/WorkSections'
import { ProfileSections } from '@/components/organisms/ProfileSections'
import { Correspondence } from '@/components/organisms/Correspondence'

export default function HomePage() {
  return (
    <SceneSequence>
      <PortfolioHero />
      <SkillsScene />
      <WorkSections />
      <ProfileSections />
      <Correspondence />
    </SceneSequence>
  )
}
