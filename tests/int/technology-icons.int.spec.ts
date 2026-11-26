import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { technologyIconGlyphs } from '../../src/components/atoms/technologyIconGlyphs'
import { experienceRoles } from '../../src/components/organisms/experienceTimeline'
import { resolveTechnologyIcon, resolveTechnologyIcons } from '../../src/utilities/technologyIcons'
import { skills } from '../../src/components/organisms/skillsTimeline'

describe('technology icon matching', () => {
  it.each([
    [' nextJS ', 'Next.js'],
    ['REACT.JS', 'React'],
    ['Golang', 'Go'],
    ['R3F', 'React Three Fiber'],
    ['scss', 'Sass / SCSS'],
    ['tailwind', 'Tailwind CSS'],
  ])('resolves %s to %s', (input, label) => {
    expect(resolveTechnologyIcon(input)).toMatchObject({ label, isFallback: false })
  })

  it('keeps an unknown technology accessible with a valid neutral icon', () => {
    expect(resolveTechnologyIcon('  New Tool  ')).toEqual({
      label: 'New Tool',
      src: '/icons/technologies/code.svg',
      isFallback: true,
    })
  })

  it('matches every displayed technology to local artwork and an inline glyph', () => {
    const icons = resolveTechnologyIcons(
      [...skills, ...experienceRoles].flatMap(({ technologies }) => technologies),
    )

    for (const icon of icons) {
      expect(icon.isFallback, icon.label).toBe(false)
      expect(existsSync(path.join(process.cwd(), 'public', icon.src)), icon.src).toBe(true)
      expect(technologyIconGlyphs[icon.src], icon.label).toBeDefined()
    }
  })
})
