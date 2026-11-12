---
name: sprite-animation-cleanup
description: "Create or refine consistent transparent character animations from approved renders, sprite sheets, or numbered frames. Use for mascot walk-ins, landings, waves, catches, GIFs, loaders, and scroll-scrubbable WebP exports."
---

# Sprite Animation Cleanup

## Establish the reference and sequence

- Use the user-approved character image as the direct reference. Record the silhouette, facial features, proportions, outfit, camera, and lighting that define it. For Mini Jacob, preserve the swept charcoal hair, black bead eyes, moustache, cobalt sneakers with ivory soles, and electric-blue rim light.
- Identify the exact approved sequence to extend. Preserve approved source frames byte-for-byte when the edit only changes another beat. Keep superseded assets distinct unless the user asks to replace them.
- Define contact, anticipation, impact, recovery, and hold poses as needed. For a catch, show palms rising under the invisible load, knees and elbows compressing on impact, then a settled hold. Leave space for live website copy and keep it out of the art unless requested.

## Generate and register poses

- Generate new poses from the approved visual reference with native alpha, a fixed camera, consistent scale, known grid order, and padding around each full-body pose. If the reference cannot be passed to the generator, request the image rather than reconstructing the likeness from description alone.
- Inspect each cell before assembling. Verify facing direction, limb count, silhouette, and identity. Correct a reflected walking pose only if it preserves the lighting and character details, or regenerate it.
- Extract poses into a common canvas. Mark the support sole or foot midpoint and use a consistent floor baseline. During a stride keep the support foot fixed until weight transfers, then verify that the body does not step backward. For a landing or catch, lower the body through knee bend while the shoes remain planted.
- During stationary gestures, register against a stable head or torso region. Composite the moving region over the approved standing frame when feasible. Preserve the head, torso, feet, and any text anchor outside that region. Inspect the sleeve seam and the return to rest.
- Use intentional pose holds and transitions. For more fluid movement, generate coherent intermediate poses or animate a rig. Whole-frame blending between separate drawings can create ghost limbs.

## Preserve transparency

- Prefer native alpha for new art. Check both transparent background and fully opaque character interiors. Remove isolated stray alpha only after inspecting the silhouette.
- On a legacy opaque background, use an edge-aware mask with explicit protection for hair, dark clothes, rim lighting, and soles. Inspect enclosed gaps between limbs and the area above the ears. Restore any lost foreground pixels from the original source with a local mask.
- Composite representative frames over light, dark, and saturated backgrounds. Check the entire frame sequence for halos, holes, and shape drift.

## Export and verify

- Match requested dimensions and framing. Export a transparent GIF for timed playback and sequential lossless WebPs for scroll control when requested. Use zero-padded frame names in playback order, then archive the sequence if the user wants a download.
- Verify frame dimensions, alpha, playback order, loop duration, and ZIP integrity. GIF encoders may merge identical frames, so retain the full indexed sequence for scroll.
- Check playback at actual speed and inspect contact, impact, and gesture frames side by side. Report visible seams, identity shifts, or stepped motion. For a loader, leave text live in HTML and indicate which frame begins the stable holding pose.

## Detailed workflow and exporter

Read [the frame-by-frame workflow](references/workflow.md) before building a sequence. Use [the example configuration](references/sequence.example.json) as a starting point for [the exporter](scripts/assemble.mjs).
