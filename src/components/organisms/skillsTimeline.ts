import { experienceTravel } from './experienceTimeline'

const skillCatalog = [
  {
    name: 'Frontend Development',
    copy: {
      title: 'One Build, Many Sites.',
      description:
        'I helped consolidate roughly 16 builds into one Astro build for 50+ state sites.',
    },
    technologies: ['React', 'Next.js', 'TypeScript', 'Astro'],
    note: '',
    projects: [
      {
        title: 'Astro Platform',
        category: 'Astro',
        description: 'One build. 50+ sites.',
        details: [
          'Helped consolidate roughly 16 builds into one shared Astro build for a platform designed to support more than 50 state sites.',
          'Resolved cross-state content leakage and added validation for routes, content, SEO, and assets.',
        ],
        artwork: 'platform',
      },
      {
        title: 'This Portfolio',
        category: 'Next.js / TypeScript',
        description: 'Scroll and motion.',
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
    copy: {
      title: 'Pages Editors Shape.',
      description: 'I modeled content in Strapi so editors can build pages from reusable sections.',
    },
    technologies: ['Strapi', 'GraphQL'],
    note: '',
    projects: [
      {
        title: 'RegisteredAgents',
        category: 'Strapi / GraphQL',
        description: 'Content models and pages.',
        details: ['Built content models and reusable page sections for RegisteredAgents.com.'],
        artwork: 'platform',
      },
    ],
  },
  {
    name: 'Backend & Dev Tools',
    copy: {
      title: 'Tools for the Terminal.',
      description:
        'I built a Go tool for working with Git and a Rust tool for gathering codebase context.',
    },
    technologies: ['Go (Golang)', 'Rust'],
    note: '',
    projects: [
      {
        title: 'GitGo',
        sourceUrl: 'https://github.com/jacobEliasMoya/Git-Go',
        category: 'Go',
        description: 'Git from the terminal.',
        details: ['A personal Go project for working with Git from the command line.'],
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
    copy: {
      title: 'A Ship From Scratch.',
      description:
        'I modeled a low-poly spaceship in Blender, shaping its silhouette with a few simple forms.',
    },
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
    copy: {
      title: 'AI Without a Signal.',
      description:
        'I’m prototyping an offline assistant with Ollama and exploring how it can call local tools.',
    },
    technologies: ['Ollama', 'Local models', 'Tool calling'],
    note: '',
    projects: [
      {
        title: 'Survival Agent',
        status: 'In development',
        category: 'Ollama',
        description: 'Offline AI in progress.',
        details: ['In development. The planned stack is Ollama, local models, and tool calling.'],
        artwork: 'agent',
      },
    ],
  },
  {
    name: 'Design Systems & Accessibility',
    copy: {
      title: 'Parts That Fit.',
      description:
        'I built shared React components with themes, responsive layouts, and stronger contrast.',
    },
    technologies: ['React', 'SCSS', 'Tailwind CSS', 'WCAG'],
    note: '',
    projects: [
      {
        title: 'Design System',
        category: 'React / UI components',
        description: 'Shared React components.',
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
    copy: {
      title: 'Built Into WordPress.',
      description:
        'I wrote a reusable PHP reviews template and helped move a nonprofit site to WordPress.',
    },
    technologies: ['WordPress', 'PHP', 'Gutenberg', 'Gravity Forms'],
    note: '',
    projects: [
      {
        title: 'Reviews Template',
        category: 'BIZIQ / WordPress',
        description: 'Custom WordPress reviews.',
        details: [
          'Created a custom PHP reviews template within the proprietary WordPress theme at BIZIQ.',
          'At BIZIQ, I worked on more than 200 WordPress sites.',
        ],
        artwork: 'platform',
      },
      {
        title: 'VAREP Migration',
        category: 'VAREP / WordPress',
        description: 'Joomla to WordPress.',
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
    copy: {
      title: 'A Folder at a Time.',
      description:
        'I wrote Python tools to compress batches of images and add GPS metadata from folder names.',
    },
    technologies: ['Python', 'Pillow', 'piexif', 'WebP'],
    note: '',
    projects: [
      {
        title: 'ProductivePython',
        sourceUrl: 'https://github.com/jacobEliasMoya/ProductivePython',
        category: 'Python / Pillow',
        description: 'Batch image tools.',
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

// Keep the full catalog available here; feature one project per category in the Work sequence.
export const skills = skillCatalog.map((skill) => ({
  ...skill,
  projects: [skill.projects[0]],
}))

export const workCategoryTravel = 0.95
const workCategorySettle = workCategoryTravel + 0.8

// Only the opening card needs extra travel. The later project intervals retain their spacing.
export const workProjectTravel = 1.2

// Reserve a reading beat between the heading and sentence on the opening scroll clock.
export const workIntroCopyTiming = { headingEnd: 1.12, paragraphStart: 1.42, end: 2.65 }
export const workIntroPillStart = workProjectTravel + workIntroCopyTiming.end
export const workIntroSettle = workIntroPillStart + 0.7

// Reserve time for the opening copy while keeping later project intervals intact.
const workOpeningExtraTravel = workIntroSettle - workCategorySettle
export const skillSegments = skills.map((skill, index) => ({
  start:
    skills.slice(0, index).reduce((sum, item) => sum + item.projects.length + 1.6, 0) +
    (index === 0 ? 0 : workOpeningExtraTravel),
  duration: skill.projects.length + 1.6 + (index === 0 ? workOpeningExtraTravel : 0),
}))
export const skillTravel = skillSegments.reduce((sum, segment) => sum + segment.duration, 0)

export function getWorkOpeningTiming(compact: boolean) {
  // In the compact layout, the heading leads into the project beneath it.
  const copyStart = compact ? 0 : workProjectTravel

  return {
    copyStart,
    copyEnd: copyStart + workIntroCopyTiming.end,
    projectStart: compact ? workIntroCopyTiming.end : 0,
  }
}

export const heroFillEnd = 1
export const heroParagraphEnd = heroFillEnd + 1.08
export const heroWalkOutStart = heroParagraphEnd - 0.18
export const heroWalkOutEnd = heroParagraphEnd + 0.14
const skillIntroStart = heroWalkOutEnd + 0.4
const introTitleTravel = 0.9
const aboutParagraphTravel = 1.44
const introPeriodTravel = 0.9
export const skillTitleEnd = skillIntroStart + introTitleTravel
export const skillStart = skillTitleEnd + introPeriodTravel
const aboutStart = skillStart + skillTravel + 1
export const aboutTitleEnd = aboutStart + introTitleTravel
export const aboutIntroEnd = aboutTitleEnd + aboutParagraphTravel
export const experienceStart = aboutIntroEnd + introPeriodTravel
export const experienceEnd = experienceStart + experienceTravel
export const sceneStops = [0, skillIntroStart, aboutStart, experienceEnd + 1.65]
export const sceneDuration = sceneStops[sceneStops.length - 1] + 0.65
export const sectionScrollRanges = [
  { start: sceneStops[0], end: heroWalkOutEnd, sceneIndex: 0 },
  { start: sceneStops[1], end: skillTitleEnd, sceneIndex: 1 },
  { start: skillStart, end: sceneStops[2] - 1, sceneIndex: 1, label: 'Work projects' },
  { start: aboutStart, end: aboutIntroEnd, sceneIndex: 2 },
  { start: experienceStart, end: sceneStops[3] - 1, sceneIndex: 2, label: 'Experience' },
  { start: sceneStops[3], end: sceneDuration, sceneIndex: 3 },
]

export function getScrollSection(position: number) {
  for (let index = sectionScrollRanges.length - 1; index > 0; index--) {
    if (position >= sectionScrollRanges[index].start) return index
  }

  return 0
}

const skillIntroTravel = skillStart - skillIntroStart
export const skillPeriodStartPortion = introTitleTravel / skillIntroTravel
export const aboutTitleFillPortion = introTitleTravel / (aboutIntroEnd - aboutStart)

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))

export function getAboutParagraphProgress(intro: number) {
  return clamp((intro - aboutTitleFillPortion) / (1 - aboutTitleFillPortion))
}

export function getSkillPosition(progress: number) {
  const position = clamp(progress) * skillTravel
  let index = skillSegments.findIndex((segment) => position < segment.start + segment.duration)

  if (index < 0) index = skills.length - 1

  return { index, phase: position - skillSegments[index].start }
}

// Each project stop anchors scroll snapping and keyboard navigation.
export const workProjectId = (title: string) =>
  `work-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

export const projectStops = skills.flatMap((skill, skillIndex) =>
  skill.projects.map((project, projectIndex) => ({
    id: workProjectId(project.title),
    skillIndex,
    projectIndex,
    position:
      skillSegments[skillIndex].start +
      projectIndex +
      (skillIndex === 0 ? workIntroSettle : workCategorySettle),
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

  // Normalizing the scene clock can leave an exact stop a fraction short of its endpoint.
  const reachedStop = to.position - position <= Number.EPSILON * skillTravel

  // The first category waits for the intro. Later turns use the category's lift window.
  const entrance =
    next === 0
      ? {
          index: 0,
          phase: reachedStop
            ? 1
            : clamp((position - workIntroPillStart) / (to.position - workIntroPillStart)),
        }
      : from.skillIndex !== to.skillIndex
        ? {
            index: to.skillIndex,
            phase: clamp((fraction * workCategorySettle) / workCategoryTravel),
          }
        : null

  return {
    index: active.skillIndex,
    projectIndex: active.projectIndex,
    projectPosition,
    ringPosition: from.skillIndex + (to.skillIndex - from.skillIndex) * fraction,
    entrance,
  }
}
