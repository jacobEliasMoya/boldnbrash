export const skills = [
  {
    name: 'Frontend Development',
    technologies: ['React', 'Next.js', 'TypeScript', 'Astro'],
    note: '',
    projects: [
      {
        title: 'Astro Platform',
        category: 'Astro',
        description:
          'One build. 50+ sites.',
        details: [
          'Helped consolidate roughly 16 builds into one shared Astro build for a platform designed to support more than 50 state sites.',
          'Resolved cross-state content leakage and added validation for routes, content, SEO, and assets.',
        ],
        artwork: 'platform',
      },
      {
        title: 'This Portfolio',
        category: 'Next.js / TypeScript',
        description:
          'Scroll and motion.',
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
        title: 'RegisteredAgents',
        category: 'Strapi / GraphQL',
        description: 'Content models and pages.',
        details: [
          'Built content models and reusable page sections for RegisteredAgents.com.',
        ],
        artwork: 'platform',
      },
    ],
  },
  {
    name: 'Backend & Dev Tools',
    technologies: ['Go (Golang)', 'Rust'],
    note: '',
    projects: [
      {
        title: 'GitGo',
        sourceUrl: 'https://github.com/jacobEliasMoya/Git-Go',
        category: 'Go',
        description: 'Git from the terminal.',
        details: [
          'A personal Go project for working with Git from the command line.',
        ],
        artwork: 'terminal',
      },
      {
        title: 'Nexus',
        sourceUrl: 'https://github.com/jacobEliasMoya/nexus',
        category: 'Rust',
        description: 'Code context for AI.',
        details: [
          'A personal Rust project that generates repeatable codebase context for AI tools.',
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
        title: 'Low-Poly Ship',
        category: 'Blender',
        description: 'Modeled in Blender.',
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
        title: 'Survival Agent',
        status: 'In development',
        category: 'Ollama',
        description:
          'Offline AI in progress.',
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
        title: 'Design System',
        category: 'React / UI components',
        description:
          'Shared React components.',
        details: [
          'Built reusable React components with variants and themes.',
          'Updated a shared section overlay across roughly 21 components, including mobile layouts, dark mode, and contrast fixes.',
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
        title: 'Reviews Template',
        category: 'BIZIQ / WordPress',
        description:
          'Custom WordPress reviews.',
        details: [
          'Created a custom PHP reviews template within the proprietary WordPress theme at BIZIQ.',
          'At BIZIQ, I worked on more than 200 WordPress sites.',
        ],
        artwork: 'platform',
      },
      {
        title: 'VAREP Migration',
        category: 'VAREP / WordPress',
        description:
          'Joomla to WordPress.',
        details: [
          'Worked with a senior developer and designers on the move from Joomla to WordPress.',
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
        category: 'Python / Pillow',
        description:
          'Batch image tools.',
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
// Leave a full scroll beat for the centered introduction before the paired wheels arrive.
export const skillStart = 3.2
export const sceneStops = [
  0,
  1.4,
  skillStart + skillTravel + 1,
  skillStart + skillTravel + 2,
]
export const sceneDuration = sceneStops[sceneStops.length - 1]
export const skillTitleFillPortion = 0.5
export const skillTitleFillEnd = sceneStops[1] + (skillStart - sceneStops[1]) * skillTitleFillPortion

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export function getSkillPosition(progress: number) {
  const position = clamp(progress) * skillTravel
  let index = skillSegments.findIndex((segment) => position < segment.start + segment.duration)
  if (index < 0) index = skills.length - 1
  return { index, phase: position - skillSegments[index].start }
}

// Each project is a resting point. Between them, both wheels use the same fractional position.
export const projectStops = skills.flatMap((skill, skillIndex) =>
  skill.projects.map((_, projectIndex) => ({
    skillIndex,
    projectIndex,
    position: skillSegments[skillIndex].start + projectIndex + 0.95,
  })),
)

export function getSkillFrame(progress: number) {
  const position = clamp(progress) * skillTravel
  let next = projectStops.findIndex((stop) => stop.position >= position)
  if (next < 0) next = projectStops.length - 1
  const previous = Math.max(0, next - 1)
  const from = projectStops[previous]
  const to = projectStops[next]
  const fraction =
    next === previous ? 0 : clamp((position - from.position) / (to.position - from.position))
  const projectPosition = previous + fraction
  const active = projectStops[Math.round(projectPosition)]
  return {
    index: active.skillIndex,
    projectIndex: active.projectIndex,
    projectPosition,
    ringPosition: from.skillIndex + (to.skillIndex - from.skillIndex) * fraction,
  }
}
