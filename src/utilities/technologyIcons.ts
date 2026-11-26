type TechnologyDefinition = {
  name: string
  asset: string
  aliases?: readonly string[]
}

export type TechnologyIconMatch = {
  label: string
  src: string
  isFallback: boolean
}

// Keep brand matching separate from rendering so every technology list uses
// the same names, accessible labels, and locally hosted assets.
const technologies: readonly TechnologyDefinition[] = [
  { name: 'React', asset: 'react.svg', aliases: ['React.js', 'ReactJS'] },
  { name: 'Next.js', asset: 'nextdotjs.svg', aliases: ['Next', 'NextJS'] },
  { name: 'TypeScript', asset: 'typescript.svg', aliases: ['TS'] },
  { name: 'JavaScript', asset: 'javascript.svg', aliases: ['JS'] },
  { name: 'jQuery', asset: 'jquery.svg' },
  { name: 'Astro', asset: 'astro.svg' },
  { name: 'Strapi', asset: 'strapi.svg' },
  { name: 'GraphQL', asset: 'graphql.svg' },
  { name: 'REST APIs', asset: 'network.svg', aliases: ['REST API', 'REST'] },
  { name: 'Go', asset: 'go.svg', aliases: ['Golang', 'Go (Golang)'] },
  { name: 'Rust', asset: 'rust.svg' },
  { name: 'Blender', asset: 'blender.svg' },
  {
    name: 'React Three Fiber',
    asset: 'react-three-fiber.webp',
    aliases: ['R3F', '@react-three/fiber'],
  },
  { name: 'Ollama', asset: 'ollama.svg' },
  { name: 'Local models', asset: 'cpu.svg' },
  { name: 'Tool calling', asset: 'wrench.svg' },
  { name: 'Sass / SCSS', asset: 'sass.svg', aliases: ['Sass', 'SCSS'] },
  { name: 'Tailwind CSS', asset: 'tailwindcss.svg', aliases: ['Tailwind', 'TailwindCSS'] },
  { name: 'WCAG', asset: 'accessibility.svg', aliases: ['Web Content Accessibility Guidelines'] },
  { name: 'WordPress', asset: 'wordpress.svg', aliases: ['WP'] },
  { name: 'Joomla', asset: 'joomla.svg' },
  { name: 'Shopify', asset: 'shopify.svg' },
  { name: 'PHP', asset: 'php.svg' },
  { name: 'Elementor', asset: 'elementor.svg' },
  { name: 'Gutenberg', asset: 'gutenberg.svg' },
  { name: 'Gravity Forms', asset: 'gravityforms.webp', aliases: ['GravityForms'] },
  { name: 'Python', asset: 'python.svg' },
  { name: 'Pillow', asset: 'pillow.svg' },
  { name: 'piexif', asset: 'file-image.svg' },
  { name: 'WebP', asset: 'webp-site-mark.png' },
]

function normalizeTechnology(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s._()-]+/g, '')
}

const technologyLookup = new Map(
  technologies.flatMap((technology) =>
    [technology.name, ...(technology.aliases ?? [])].map(
      (name) => [normalizeTechnology(name), technology] as const,
    ),
  ),
)

export function resolveTechnologyIcon(name: string): TechnologyIconMatch {
  const match = technologyLookup.get(normalizeTechnology(name))
  const asset = match?.asset ?? 'code.svg'

  // Unknown technologies keep their real name and get a neutral symbol rather
  // than a broken URL or a misleading brand logo.
  return {
    label: match?.name ?? (name.trim() || 'Technology'),
    src: `/icons/technologies/${asset}`,
    isFallback: !match,
  }
}

export function resolveTechnologyIcons(names: readonly string[]): TechnologyIconMatch[] {
  return names.map(resolveTechnologyIcon)
}
