<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Animation consistency

- Use Motion (`motion/react`) as the project standard for UI animations and transitions, including entrances, hover and focus feedback, pop-ins, reveals, and scroll smoothing.
- Reuse the existing Motion easing and spring settings for consistent movement. Avoid competing CSS transitions or hand-written animation timers for the same properties.
- Respect reduced-motion preferences and wait for the site loader to finish before starting header and hero entrance animations.
- Keep circle expansions smooth with a single edge and no expanding outline.
- Custom canvas and sprite rendering loops may remain where needed to draw visuals; use Motion to control UI animation timing and interpolation.
