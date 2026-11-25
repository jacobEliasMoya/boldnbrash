<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Animation consistency

- Use Motion (`motion/react`) as the project standard for UI animations and transitions, including entrances, hover and focus feedback, pop-ins, reveals, and scroll smoothing.
- Before adding or changing an animation, review the existing implementation and relevant Motion APIs, transition types, and installed TypeScript definitions. Check official Motion documentation when needed, and choose the supported approach that best fits the interaction.
- Consider Motion's tween, spring, and inertia transition types where applicable, along with keyframes, variants, staggering, layout animation, and presence animation. Use a spring for responsive settling, a tween for explicitly timed movement, and inertia for momentum or dragging when appropriate. Do not assume every interaction needs the same transition type.
- Prefer Motion values and transforms for linked visual properties. Drive elements that must move together from a shared animation clock; avoid stacking smoothing layers that make one element lag behind another.
- Use Motion sequencing and stagger controls for overlapping entrances. Preserve the requested order and overlap, and allow animations to reverse or respond promptly when input changes direction.
- Use the existing liquid renderer and shared visual primitives where applicable. Check viewport bounds, pull limits, and stacking when changing frame or liquid animations; changes to a loader must not alter the site's existing frame behavior.
- Use the [liquid-pill-entrance skill](.agents/skills/liquid-pill-entrance/SKILL.md) when maintaining the Experience pill animation or adding another pill that emerges through the viewport frame.
- Use the [liquid-motion-review skill](.agents/skills/liquid-motion-review/SKILL.md) when tuning or reviewing the motion of a liquid entrance, release, or rebound.
- Reuse the existing Motion easing and spring settings for consistent movement. Avoid competing CSS transitions or hand-written animation timers for the same properties.
- Use CSS for static styling and prepared states. Introduce a different animation system or custom timing loop only when Motion cannot reasonably provide the required behavior, and explain that choice in a nearby comment.
- Respect reduced-motion preferences and wait for the site loader to finish before starting header and hero entrance animations.
- Keep circle expansions smooth with a single edge and no expanding outline.
- Custom canvas and sprite rendering loops may remain where needed to draw visuals; use Motion to control UI animation timing and interpolation.

## Formatting and readability

- Use the project's Prettier configuration consistently. Before every commit, run `pnpm exec prettier --write` on all changed files supported by Prettier, then run `pnpm exec prettier --check` on those files. Fix any formatting failures before committing.
- Write code for readability and ease of maintenance. The goal is clear code, not making code appear human-written.
- Separate statements or groups of code that are not directly related with a blank line. Keep directly related lines together, including multiline expressions, argument lists, and property declarations. Use empty blank lines without trailing spaces.
- In particular, put a blank line between a guard clause and the next statement, and separate setup, calculations, side effects, and cleanup when they represent distinct steps.
- Use classic `//` comments to explain the purpose of logical sections, non-obvious behavior, and the reasoning behind implementation choices. Use `{/* ... */}` where JSX requires it. Keep comments accurate and useful; avoid narrating obvious syntax.
- When editing existing code, improve spacing and add explanatory comments where needed so the touched logic is easy to follow.

For example:

```tsx
panels.current.forEach((panel, index) => {
  if (!panel) return

  // Calculate how far this panel has progressed through its reveal.
  const reveal = getPanelReveal(index)

  // Apply the reveal to the panel's visual state.
  updatePanel(panel, reveal)
})
```
