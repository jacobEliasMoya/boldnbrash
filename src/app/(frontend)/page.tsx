import { Correspondence } from '@/components/organisms/Correspondence'
import { PortfolioHero } from '@/components/organisms/PortfolioHero'
import { ProfileSections } from '@/components/organisms/ProfileSections'
import { WorkSections } from '@/components/organisms/WorkSections'

export default function HomePage() {
  return (
    <>
      <main>
        <PortfolioHero />
        <WorkSections />
        <ProfileSections />
      </main>
      <Correspondence />
    </>
  )
}
