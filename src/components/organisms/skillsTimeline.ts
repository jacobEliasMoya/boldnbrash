export const skills = [
  {
    name: 'Frontend Development',
    technologies: ['React', 'Next.js', 'TypeScript', 'Astro'],
    note: '',
    projects: [
      {
        title: 'Multi-state Astro platform',
        category: 'Astro / platform engineering',
        description:
          'Helped consolidate roughly 16 builds into one shared Astro platform for more than 50 state sites.',
        details: [
          'Helped consolidate roughly 16 builds into one shared Astro build for a platform designed to support more than 50 state sites.',
          'Resolved cross-state content leakage and added validation for routes, content, SEO, and assets.',
        ],
        artwork: 'platform',
      },
      {
        title: 'This portfolio',
        category: 'Next.js / TypeScript / motion',
        description:
          'Connected scenes, scroll-driven transitions, and project stories built with Next.js and TypeScript.',
        details: [
          'Built the portfolio with Next.js, React, and TypeScript.',
          'Connected section reveals and project cards to scroll progress, with keyboard navigation and a reduced-motion document layout.',
        ],
        artwork: 'system',
      },
    ],
  },
  {
    name: 'Headless CMS',
    technologies: ['Strapi', 'GraphQL'],
    note: '',
    projects: [
      {
        title: 'RegisteredAgents.com',
        category: 'Strapi / GraphQL / content architecture',
        description: 'Built content models and reusable page sections for RegisteredAgents.com.',
        details: [
          'Built content models and reusable page sections for RegisteredAgents.com.',
          'Stack: Strapi and GraphQL.',
        ],
        artwork: 'platform',
      },
    ],
  },
  {
    name: 'Backend & Developer Tools',
    technologies: ['Go (Golang)', 'Rust'],
    note: 'Independent Go and Rust tooling projects.',
    projects: [
      {
        title: 'GitGo',
        sourceUrl: 'https://github.com/jacobEliasMoya/Git-Go',
        category: 'Go / command-line tools',
        description: 'A standalone command-line project written in Go.',
        details: [
          'GitGo is a standalone command-line project written in Go.',
          'Explores Git workflows through a command-line interface.',
        ],
        artwork: 'terminal',
      },
      {
        title: 'Nexus',
        sourceUrl: 'https://github.com/jacobEliasMoya/nexus',
        category: 'Rust / developer tools',
        description: 'A Rust project focused on deterministic, AI-readable context for codebases.',
        details: [
          'Explores generating deterministic context that AI tools can read from a codebase.',
          'An independent Rust developer-tool project, documented in the public repository.',
        ],
        artwork: 'terminal',
      },
    ],
  },
  {
    name: '3D Development',
    technologies: ['Blender', 'React Three Fiber'],
    note: '',
    projects: [
      {
        title: 'Low-poly spaceship',
        category: 'Blender / 3D modeling',
        description: 'A low-poly spaceship modeled in Blender.',
        details: ['A low-poly spaceship modeled in Blender.'],
        artwork: 'model',
      },
    ],
  },
  {
    name: 'AI & Agent Development',
    technologies: ['Ollama', 'Local models', 'Tool calling'],
    note: '',
    projects: [
      {
        title: 'Offline Survival Agent',
        status: 'In development',
        category: 'Ollama / local models / tool calling',
        description:
          'Building an offline Survival Agent with Ollama, local models, and tool calling.',
        details: ['In development. The planned stack is Ollama, local models, and tool calling.'],
        artwork: 'agent',
      },
    ],
  },
  {
    name: 'Design Systems & Accessibility',
    technologies: ['React', 'SCSS', 'Tailwind CSS', 'WCAG'],
    note: '',
    projects: [
      {
        title: 'Design system',
        category: 'React / UI components',
        description:
          'Reusable React components with variants, themes, and consistent interaction states.',
        details: [
          'Built reusable React components with variants and themes.',
          'Extended a shared section overlay across roughly 21 components, improving responsive layouts, dark mode, contrast, and interaction states.',
        ],
        artwork: 'system',
      },
    ],
  },
  {
    name: 'WordPress & PHP',
    technologies: ['WordPress', 'PHP', 'Gutenberg', 'Gravity Forms'],
    note: '',
    projects: [
      {
        title: 'Custom reviews template',
        category: 'BIZIQ / PHP / WordPress',
        description:
          'Built a PHP reviews template for a proprietary WordPress theme, improving readability and usability.',
        details: [
          'Created a custom PHP reviews template within the proprietary WordPress theme at BIZIQ.',
          'Part of broader work building and optimizing more than 200 WordPress sites, with attention to speed, SEO, and accessibility.',
        ],
        artwork: 'platform',
      },
      {
        title: 'VAREP website migration',
        category: 'VAREP National / WordPress / migration',
        description:
          'Helped move VAREP from Joomla to WordPress, translating wireframes into responsive pages.',
        details: [
          'Led the transition from Joomla to WordPress while supporting a senior developer and collaborating with designers.',
          'Built responsive pages with Beaver Builder and supported content migration, plugin configuration, QA, and Gravity Forms.',
        ],
        artwork: 'platform',
      },
    ],
  },
  {
    name: 'Python Automation',
    technologies: ['Python', 'Pillow', 'piexif', 'WebP'],
    note: '',
    projects: [
      {
        title: 'ProductivePython',
        sourceUrl: 'https://github.com/jacobEliasMoya/ProductivePython',
        category: 'Python / image processing / CLI',
        description:
          'Batch tools for folder-based GPS tagging, image resizing, compression, and WebP conversion.',
        details: [
          'BulkGeoTagger writes GPS metadata using city names from image folders and a coordinate lookup.',
          'BulkCompressor resizes images, targets a chosen file size, optionally converts to WebP, and packages the output.',
          'Built with Python, Pillow, and piexif; the repository also documents Windows executable builds.',
        ],
        artwork: 'automation',
      },
    ],
  },
] as const

// Each project gets one reading interval; selection and the final pause get 0.8.
export const skillSegments = skills.map((skill, index) => ({
  start: skills.slice(0, index).reduce((sum, item) => sum + item.projects.length + 0.8, 0),
  duration: skill.projects.length + 0.8,
}))
export const skillTravel = skillSegments.reduce((sum, segment) => sum + segment.duration, 0)
export const skillStart = 1.4
export const sceneStops = [
  0,
  1.4,
  skillStart + skillTravel + 1,
  skillStart + skillTravel + 2,
  skillStart + skillTravel + 3,
]
export const sceneDuration = sceneStops[sceneStops.length - 1]

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export function getSkillPosition(progress: number) {
  const position = clamp(progress) * skillTravel
  let index = skillSegments.findIndex((segment) => position < segment.start + segment.duration)
  if (index < 0) index = skills.length - 1
  return { index, phase: position - skillSegments[index].start }
}
