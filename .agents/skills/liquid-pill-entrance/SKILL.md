---
name: liquid-pill-entrance
description: Maintain or reuse BoldNBrash's scroll-driven liquid pill entrances from the viewport edge. Use when editing Experience pills or adding a pill that emerges through the site frame, releases, and rebounds.
---

# Liquid Pill Entrance

Use the approved Experience entrance on About as the reference. Each pill rises through the actual viewport floor, holds its shape while the frame wraps around it, then lifts free as the liquid settles back into the frame. The sequence can pause and reverse at any point.

## Follow the existing implementation

- Feed the section clock through the Experience Motion context. Derive the pill pose, frame cutout, and signed liquid displacement from the same scroll update. Scrub the existing Motion spring through the lift and settling interval so the release tracks forward and backward. [SceneSequence.tsx](../../../src/components/organisms/SceneSequence.tsx), [ExperienceMotion.ts](../../../src/components/organisms/ExperienceMotion.ts), [experienceTimeline.ts](../../../src/components/organisms/experienceTimeline.ts)
- Keep the pill as a stable HTML component and translate it vertically. Measure its rendered width, height, and CSS corner radius after layout. Use the visible viewport floor at normal zoom, convert it into scene coordinates, and update measurements on viewport changes. [ProfileSections.tsx](../../../src/components/organisms/ProfileSections.tsx), [styles.css](<../../../src/app/(frontend)/styles.css>)
- Cut the frame with the exact rounded rectangle of the moving pill. While attached, the pill's fill must reach the last visible pixel without a strip of frame color underneath. Keep the cutout in place for as long as the falling swell can overlap the pill, even after the pill clears the flat frame. [experienceTimeline.ts](../../../src/components/organisms/experienceTimeline.ts)
- Use the existing liquid renderer. Wide layouts use the wordmark's pull profile. On narrow layouts, derive the upper cubic Bézier arc from the pill's actual corner center and radius plus a small, even rim. The shoulder and side-frame connections share tangents. Keep the rim proportional to the available gutter. The visible rim in the approved mobile entry is about 7.7 px at the tested phone widths. [liquidContour.ts](../../../src/components/atoms/liquidContour.ts)
- Let the frame draw the outward swell and mask the inward dip. Extend the recoil mask above the old antialiased edge so it leaves no horizontal hairline. Give Experience control of the floor during that motion so the pointer or idle liquid cannot be cut into a floating bump. Hand the floor back through the existing pointer easing when the rebound finishes. [LiquidBoundary.tsx](../../../src/components/atoms/LiquidBoundary.tsx), [liquidContour.ts](../../../src/components/atoms/liquidContour.ts)
- Preserve the readable document-flow list for reduced motion and the About intro's period reveal into Experience. Keep the section colors tied to the theme. [ProfileSections.tsx](../../../src/components/organisms/ProfileSections.tsx), [styles.css](<../../../src/app/(frontend)/styles.css>)

## Verify changes to the entrance

Run the focused regressions when touching the contour, timing, or layout. The desktop test checks actual frame pixels and competing pointer pull. The mobile test measures the rim along normals to the rendered pill corners.

```sh
pnpm run test:e2e --project=chromium tests/e2e/scene-transitions.e2e.spec.ts --grep 'Experience docks'
pnpm run test:e2e --project=webkit-touch tests/e2e/touch.webkit.e2e.spec.ts --grep 'mobile liquid matches'
```

Preview the running site on desktop and at phone widths such as 320, 390, and 440 px. Use a light and a dark preview to catch seams against both frame colors. Pause during entry, lift-off, and rebound. Check the last row of pixels, the clearance at both pill corners, the bottom edge of the card during release, and the frame during the inward dip. Scroll backward through the same points and check that resizing on mobile does not move the pill away from the floor or reset the sequence.

For a repeatable screenshot, the current timeline's position for a role is `experienceStart + roleIndex * experienceEntryTravel + phase * experiencePillTravel`. The focused tests use phases such as `0.43` for partial entry, `0.76` for a pill clearing the flat frame, and `0.86` for the inward dip. Use the rendered geometry to confirm the stage when card dimensions differ.
