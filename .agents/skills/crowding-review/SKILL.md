---
name: crowding-review
description: Stress-test responsive layouts with their densest real content. Use when long labels, controls, icons, metrics, or competing visual emphasis make a component feel busy. Report the competing elements and a specific fix for each issue.
---

# Crowding Review

Choose real records by what puts pressure on the layout. The longest title may belong to a different record than the fullest icon row or the most detailed body. Exercise each relevant state, including expansion when available.

Render the records at the requested widths. Otherwise choose a narrow phone, an intermediate width near a layout change, and a wide desktop. Check the actual component width when it sits inside a column. Look for collisions with controls, stray captions, awkward wraps, and content that becomes hard to reach.

Also read each state at a glance. What should draw the eye first? A row of bold metrics can compete with a role title even if both fit. Try grouping a value with its caption, wrapping related items as a unit, changing column order, or easing secondary emphasis before shrinking type. Preserve the real content and access to it.

For each finding, give the viewport, record and state, the two elements competing for space or attention, and the concrete fix. For example, if “1 yr” separates from “To Promotion” at 390px, let the value and caption wrap together as one metric. When implementing a fix, retest the triggering case and the other sampled widths and report what you observed. In a review, distinguish proposed fixes from verified ones. If no issue reproduces, name the cases that held up.
