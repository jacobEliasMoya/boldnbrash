import { ProjectCard } from '@/components/molecules/ProjectCard'

const sideProjects = [
  {
    title: 'Rusted-Cargo',
    description: 'Exercises in ownership, borrowing, traits, error handling, and testing.',
    language: 'Rust',
  },
  {
    title: 'Git-Go',
    description: 'Early exploration of a command-line tool for Git workflows.',
    language: 'Go',
  },
]

export function WorkSections() {
  return (
    <>
      <section
        id="work"
        aria-labelledby="selected-work-heading"
        className="scroll-mt-6 pt-12 pb-16 sm:pt-16 sm:pb-24"
      >
        <h2
          id="selected-work-heading"
          className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-none font-black tracking-tight"
        >
          Selected work
        </h2>
        <p className="mt-3 mb-8 max-w-[44ch] text-base leading-relaxed text-muted sm:text-lg">
          Frontend architecture at scale and accessible UI patterns that work across themes and
          screen sizes.
        </p>
        <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          <ProjectCard
            title="Platform Modernization"
            category="Inenvi / Astro"
            metric="16 → 1"
            outcome="Roughly 16 builds consolidated into one"
            artwork={
              <svg
                aria-hidden="true"
                viewBox="0 0 270 225"
                preserveAspectRatio="none"
                fill="none"
                className="pointer-events-none absolute right-0 bottom-0 -z-10 h-36 w-[82%] sm:h-40 text-on-orchid-paper/65"
              >
                <g stroke="currentColor" strokeWidth="3.5">
                  <path d="M6 11h43c87 0 53 99 153 99h68" />
                  <path d="M6 33h47c81 0 52 77 149 77h68" />
                  <path d="M6 55h51c78 0 47 55 145 55h68" />
                  <path d="M6 77h55c75 0 43 33 141 33h68" />
                  <path d="M6 99h59c68 0 37 11 137 11h68" />
                  <path d="M6 121h59c68 0 37-11 137-11h68" />
                  <path d="M6 143h55c75 0 43-33 141-33h68" />
                  <path d="M6 165h51c78 0 47-55 145-55h68" />
                  <path d="M6 187h47c81 0 52-77 149-77h68" />
                  <path d="M6 209h43c87 0 53-99 153-99h68" />
                </g>
                <path d="M204 110h66" className="stroke-on-orchid-paper" strokeWidth="5" />
              </svg>
            }
          >
            <p>
              I helped consolidate roughly 16 builds into one shared Astro build for a platform
              designed to support more than 50 state sites. I resolved cross-state content leakage
              and added validation for routes, content, SEO, and assets.
            </p>
          </ProjectCard>

          <ProjectCard
            title="Design System"
            category="Inenvi / React"
            metric="≈21"
            outcome="A shared overlay across roughly 21 components"
            accent
            artwork={
              <svg
                aria-hidden="true"
                viewBox="0 0 270 225"
                preserveAspectRatio="none"
                fill="none"
                className="pointer-events-none absolute right-0 bottom-0 -z-10 h-36 w-[82%] sm:h-40 text-on-lime/65"
              >
                <g stroke="currentColor" strokeWidth="2.5">
                  <path d="M26 53h244v172H26zM148 53v172M26 139h244" />
                  <circle cx="87" cy="96" r="24" />
                  <path d="M181 117v-42h55v42zM200 75v42M181 96h55" />
                  <path d="M64 159h46v46H64zM64 159l46 46m0-46-46 46" />
                  <path d="M174 190l32-30 32 30-32 21zM174 178l32-25 32 25-32 21z" />
                </g>
              </svg>
            }
          >
            <p>
              I built reusable React components with variants and themes, then extended a shared
              section overlay across roughly 21 components. The work also improved responsive
              layouts, dark mode, contrast, and interaction states.
            </p>
          </ProjectCard>

          <ProjectCard
            title="Image Batch Tools"
            category="ProductivePython / Python"
            metric="4 tasks"
            outcome="Geotag, resize, compress, and convert images"
            artwork={
              <svg
                aria-hidden="true"
                viewBox="0 0 300 170"
                fill="none"
                className="pointer-events-none absolute right-3 bottom-1 -z-10 h-36 w-[82%] text-on-orchid-paper sm:h-40"
              >
                <g stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
                  <rect x="35" y="14" width="155" height="108" rx="8" opacity=".35" />
                  <rect x="55" y="32" width="155" height="108" rx="8" opacity=".6" />
                  <rect x="75" y="50" width="155" height="108" rx="8" className="fill-orchid-paper" />
                  <path d="m75 135 49-46 31 30 23-21 52 40" />
                  <circle cx="177" cy="79" r="10" className="fill-lime" />
                  <path d="M244 108h34m-11-11 11 11-11 11" />
                </g>
              </svg>
            }
          >
            <p>
              I built Python command-line utilities to geotag, resize, and compress batches of
              images and convert them to WebP. I also released the geotagging utility as a Windows
              executable.
            </p>
          </ProjectCard>
        </div>
      </section>

      <section
        id="side-projects"
        aria-labelledby="side-projects-heading"
        className="pb-16 sm:pb-24"
      >
        <h2
          id="side-projects-heading"
          className="mb-6 font-display text-[clamp(2.25rem,5vw,4rem)] leading-none font-black tracking-tight"
        >
          Side projects
        </h2>
        <ul className="grid gap-2">
          {sideProjects.map(({ title, description, language }) => (
            <li
              key={title}
              className="grid items-center gap-2 rounded-panel bg-surface px-5 py-5 sm:grid-cols-[minmax(11rem,1fr)_2fr_auto] sm:gap-5 sm:px-6"
            >
              <h3 className="text-xl leading-tight font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted sm:text-base">{description}</p>
              <span className="text-xs font-bold tracking-[0.12em] text-accent uppercase">
                {language}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
