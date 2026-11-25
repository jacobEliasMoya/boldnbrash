---
name: liquid-motion-review
description: Review and tune BoldNBrash liquid transitions when a card, pill, or frame pull feels abrupt, too fast, or out of sync. Use for scroll timing, cubic Bezier easing, and visual verification of movement.
---

# Review Liquid Motion

- Watch a real wheel or touch gesture at normal speed before tuning. Scrub the same transition frame by frame to find where it rushes or stalls. Check the first entrance, a handoff between items, and the reverse gesture. A snapshot of the settled card cannot verify pacing.
- Separate gesture commitment from rendering. When asked to slow the visual transition, preserve the input threshold, destination, and ability to reverse. Give the motion more room on the shared timeline and use a bounded, monotonic Motion cubic Bezier with a gentle start and finish. Keep the outgoing fade, incoming pose, frame cutout, and liquid contour on that same eased phase. Avoid driving the card from a wheel angle that can jump to clear another pill.
- Judge the easing curve and the drawn contour separately. Check how long the frame stays attached, whether the release is readable, and whether the rebound settles at the frame edge. If the contour needs work, keep the cubic shoulders tangent to the rounded cutout and the flat frame. Follow the [liquid pill entrance geometry](../liquid-pill-entrance/SKILL.md) for the existing renderer.
- Verify desktop wheel input and narrow mobile touch input on a running preview. Pause during attachment, release, and rebound in both directions. Look for a visible seam, a one-frame jump, an overlap, or a change in card size as the next item becomes active. Compare light and dark backgrounds when checking the frame edge, and check the reduced-motion layout.

For Work, start with the focused browser tests in [scene-transitions.e2e.spec.ts](../../../tests/e2e/scene-transitions.e2e.spec.ts), the short-gesture test in [skills-duet.e2e.spec.ts](../../../tests/e2e/skills-duet.e2e.spec.ts), and the swipe checks in [touch.webkit.e2e.spec.ts](../../../tests/e2e/touch.webkit.e2e.spec.ts). Use the [Work timeline](../../../src/components/organisms/skillsTimeline.ts) project stops for repeatable playback positions.
