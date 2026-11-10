import type { ReactNode } from 'react'

export function ProjectCard({
  title,
  category,
  outcome,
  metric,
  children,
  artwork,
  accent = false,
}: {
  title: string
  category: string
  outcome: string
  metric: string
  children: ReactNode
  artwork: ReactNode
  accent?: boolean
}) {
  return (
    <details className="group min-w-0 overflow-hidden rounded-panel border border-rule/50 bg-surface">
      <summary
        className={`relative isolate flex min-h-[23rem] cursor-pointer list-none flex-col gap-5 overflow-hidden p-6 pb-40 focus-visible:outline-offset-[-4px] sm:min-h-[26rem] sm:p-8 sm:pb-44 [&::-webkit-details-marker]:hidden ${accent ? 'bg-lime text-on-lime' : 'bg-orchid-paper text-on-orchid-paper'}`}
      >
        {artwork}
        <div className="flex items-start justify-between gap-4">
          <span className="text-xs font-bold tracking-[0.14em] uppercase">{category}</span>
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-current text-2xl leading-none"
          >
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </div>
        <div className="grid gap-3">
          <span className="max-w-[14ch] font-display text-[clamp(1.5rem,3.6vw,3.5rem)] leading-[0.96] font-black tracking-tight [overflow-wrap:anywhere]">
            {title}
          </span>
          <span className="max-w-[26ch] text-sm leading-snug font-bold sm:text-base">
            {outcome}
          </span>
        </div>
      </summary>
      <div className="border-t border-rule/50 p-6 sm:p-8">
        <p aria-hidden="true" className="mb-4 font-display text-5xl leading-none font-black text-accent sm:text-6xl">{metric}</p>
        <div className="max-w-prose text-base leading-relaxed text-muted">{children}</div>
      </div>
    </details>
  )
}
