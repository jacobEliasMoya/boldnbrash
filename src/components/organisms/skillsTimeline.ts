export const skills = [
  {
    name: 'Frontend Development',
    technologies: ['React', 'Next.js', 'TypeScript', 'Astro'],
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
    note: 'Go work shown below. Rust projects will be added when ready.',
    projects: [
      {
        title: 'GitGo',
        category: 'Go / command-line tools',
        description: 'A standalone command-line project written in Go.',
        details: [
          'GitGo is a standalone command-line project written in Go.',
          'Rust is part of this skill area; a Rust project will get its own entry when there is work to show.',
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
