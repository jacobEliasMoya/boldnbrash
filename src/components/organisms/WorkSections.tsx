import {
  PlatformArtwork,
  SystemArtwork,
} from '@/components/atoms/ProjectArtwork'
import { SceneProject } from '@/components/molecules/SceneProject'

export function WorkSections() {
  return (
    <div className="work-scene scene-content">
      <div className="work-heading">
        <p className="eyebrow">03 — Projects</p>
        <h2>
          Selected
          <br />
          work.
        </h2>
        <p>
          Ideas put
          <br />
          into practice.
        </p>
      </div>
      <div className="scene-projects">
        <SceneProject
          number="01"
          title="Platform modernization"
          category="Web / CMS / integrations"
          artwork={<PlatformArtwork />}
        >
          <h3>16 builds. One shared platform.</h3>
          <p>
            I helped consolidate roughly 16 builds into one shared Astro build
            for a platform designed to support more than 50 state sites. I
            resolved cross-state content leakage and added validation for
            routes, content, SEO, and assets.
          </p>
          <p className="project-credit">Inenvi / Astro</p>
        </SceneProject>
        <SceneProject
          number="02"
          title="Design system"
          category="UI / components / documentation"
          artwork={<SystemArtwork />}
        >
          <h3>A shared language for interfaces.</h3>
          <p>
            I built reusable React components with variants and themes, then
            extended a shared section overlay across roughly 21 components. The
            work also improved responsive layouts, dark mode, contrast, and
            interaction states.
          </p>
          <p className="project-credit">Inenvi / React</p>
        </SceneProject>
      </div>
      <div className="arch-portal" data-portal="about" aria-hidden="true" />
      <div className="scene-footnote">
        <span>From the interface to the infrastructure.</span>
        <span>03 / 05</span>
      </div>
    </div>
  )
}
