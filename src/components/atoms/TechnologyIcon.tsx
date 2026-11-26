import { resolveTechnologyIcons, type TechnologyIconMatch } from '@/utilities/technologyIcons'
import { technologyIconGlyphs } from './technologyIconGlyphs'

function TechnologyIcon({ icon }: { icon: TechnologyIconMatch }) {
  const glyph =
    technologyIconGlyphs[icon.src] ?? technologyIconGlyphs['/icons/technologies/code.svg']

  return (
    <span className="skills-technology" role="img" aria-label={icon.label} title={icon.label}>
      <svg aria-hidden="true" className="technology-brand-glyph" viewBox="0 0 24 24">
        {glyph}
      </svg>
    </span>
  )
}

export function TechnologyIcons({
  technologies,
  className,
  label,
}: {
  technologies: readonly string[]
  className?: string
  label?: string
}) {
  const icons = resolveTechnologyIcons(technologies)

  return (
    <p className={className}>
      {label && <strong>{label}</strong>}
      {icons.map((icon, index) => {
        const key = `${icon.label}-${index}`

        return label ? (
          <span className="technology-labeled-badge" key={key}>
            <TechnologyIcon icon={icon} />
            <span aria-hidden="true">{icon.label}</span>
          </span>
        ) : (
          <TechnologyIcon key={key} icon={icon} />
        )
      })}
    </p>
  )
}
