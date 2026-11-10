import { HeroEcho } from '@/components/atoms/HeroEcho'

export function PortfolioHero() {
  return (
    <section
      className="grid min-h-[calc(100svh-4.5rem)] place-items-center py-8"
      aria-labelledby="portfolio-name"
    >
      <div className="min-w-0 text-center">
        <div className="hero-name grid gap-[0.065em] font-display text-[clamp(1.875rem,min(11.5vw,10svh),8rem)] leading-[0.92] font-black tracking-tight uppercase">
          <HeroEcho className="mb-[0.2em] text-[0.88em] text-muted/75" offset={10}>
            Designer
          </HeroEcho>
          <h1 id="portfolio-name" className="text-[1.12em] leading-none">
            Jacob Moya<span className="ms-[0.1em] text-accent" aria-hidden="true">.</span>
          </h1>
          <HeroEcho className="text-[0.88em] text-accent/70" offset={-10}>
            Developer
          </HeroEcho>
        </div>
        <a className="mt-[clamp(0.75rem,3svh,1.75rem)] inline-flex items-center gap-3 font-display text-xl font-black hover:text-accent" href="#work">
          Explore selected work <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  )
}
