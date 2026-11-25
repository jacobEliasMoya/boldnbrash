import type { CSSProperties } from 'react'
import { resolveTechnologyIcons, type TechnologyIconMatch } from '@/utilities/technologyIcons'

function TechnologyIcon({ icon }: { icon: TechnologyIconMatch }) {
  return (
    <span className="skills-technology" role="img" aria-label={icon.label} title={icon.label}>
      <span
        aria-hidden="true"
        className="technology-brand-mark"
        data-format={icon.format}
        style={
          {
            '--technology-icon': `url("${icon.src}")`,
            '--technology-icon-size': icon.maskSize,
          } as CSSProperties
        }
      />
    </span>
  )
}

export function TechnologyIcons({
  technologies,
  className,
}: {
  technologies: readonly string[]
  className?: string
}) {
  const icons = resolveTechnologyIcons(technologies)

  return (
    <p className={className}>
      {icons.map((icon, index) => (
        <TechnologyIcon key={`${icon.label}-${index}`} icon={icon} />
      ))}
    </p>
  )
}
