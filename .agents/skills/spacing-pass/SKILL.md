---
name: spacing-pass
description: Review visual alignment, edge insets, responsive text fit, and spacing within and between groups. Use when a layout looks uneven or related items are hard to read together. Deliver a matched screenshot pair at the viewport that best shows the issue.
---

# Spacing Pass

Open the actual interface with representative content. Find the viewport and state where the uneven spacing is easiest to see. Capture the **before** screenshot before editing. For an animated component, let it settle at a reproducible scroll position.

Identify which elements should share an edge or baseline, which gaps separate peers, and which gaps separate groups. Measure the visible edges as well as the layout boxes. Font metrics, wrapped lines, and curved corners can make equal CSS values look uneven.

For responsive sizing, work in CSS viewport dimensions. Sample a narrow phone, a short laptop window such as 1366x650 or 1536x800, and a desktop reference when those layouts apply. After fonts and entrances settle, measure the visible text and its box against both section insets. A page can have zero horizontal overflow while its copy still crosses a gutter.

In the Hero, the scene's inline padding owns the gutters. Keep the greeting, headline, and supporting copy inside those edges. Set the paragraph's width to its intended line length capped by the available column width. Check where the new lines wrap and that the paragraph still clears the bottom inset on the shortest phone sampled.

Adjust the shared inset or the gap on the container that owns the relationship. Keep a heading close to its contents. Give adjacent groups enough separation to read independently. For example, in a wrapped list, a continuation line should read as part of its item before the eye reaches the next item.

Capture the **after** screenshot with the same viewport dimensions, content, state, theme, scroll position, and framing. Return links to both images and a short caption naming the relationship that changed. For a review-only request, use a temporary preview for the second image and label it as proposed. If the spacing already works, return the baseline and explain which relationships you checked.
