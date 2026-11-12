# Frame-by-frame workflow

## 1. Lock the inputs

Get the exact approved character render and the exact animation revision. Use the render as an image reference when generating poses. Record which numbered files are approved. Treat their positions and timing as part of the approval. Use a fresh output directory to avoid mixing old and new frames. Record canvas size, baseline, entrance edge, pose order, and delays before rendering.

For Mini Jacob, keep the oversized head, black bead eyes, swept black hair, moustache, charcoal clay sweatshirt and joggers, cobalt sneakers with ivory soles, and electric-blue rim light. Generate native alpha with a fixed camera, equal-size cells and padding. Do a light-background check before investing in the animation.

## 2. Register a walk or drop

- Extract cells using measured crop rectangles. Measure anchors in pixels relative to the extracted tile. For walking, mark a point on the sole of the support shoe, the corresponding point on the rear shoe in the next contact pose, and a body landmark such as the center of the hips.
- Calculate tile origin as canvas anchor minus pose anchor. Keep the world-space support point fixed while that foot bears weight. At double contact, align the old support with the rear sole first, then transfer the anchor to the new front sole. Compute stride distance from the separation of the contact pose’s two soles.
- Check world-space hip position across each walking frame. If it reverses, inspect the contact anchor before changing stride distance. Check actual playback for skating and for limbs that swap sides. One Mini Jacob pass used world-space body positions 1429, 1394, 1314, 1291, 1256, 1169, 1153, 1118, 1038, 1015, followed by the stationary hold at 1015. Treat those as a regression example for that render.
- For the drop, translate one airborne pose down toward the floor with accelerating timing. Use a crouch for impact, a partial rise, then standing. Register the soles or foot midpoint to one baseline. Check the jump between the last airborne frame and first contact at playback speed.
- Use separate contact, passing, impact, recovery, and rest poses. If the walk needs smoother limbs, obtain consistent in-between poses or use a rig. Whole-frame blends of unrelated drawings produced double limbs and warping in the Mini Jacob experiment.

## 3. Stabilize a gesture

1. Copy approved walking or drop frames directly and verify the copies byte for byte.
2. Pick the first standing frame as the stable base. Use a region covering the fixed head and torso while excluding the moving arm. Search small integer offsets, scoring sum of absolute RGB differences. Sample uniformly within the region. Start with a bounded search and compare the minimum visually. The wave source shifted up to four pixels horizontally.
3. Translate the gesture art by the measured offset. Prepare a canvas-sized grayscale mask over the waving arm and sleeve only. Use white for replacement, black for the fixed body, and a narrow gray feather at the sleeve seam.
4. Composite onto the same standing base for each wave pose. Compare untouched head, torso, and foot regions against the base. Inspect the rest-to-wave transition for a second hand or cuff fragment.
5. For a shoulder brush, show contact, an outward and downward follow-through, then release. Emit a small dust puff from the hand’s path and fade it. Keep the jaw outside any local warp.
6. For a catch, draw distinct raised palms, weight-bearing impact, rebound, and hold poses. Dip the knees and elbows together on impact. Keep the soles planted and the black bead eyes consistent. Match height and floor with the preceding standing pose. Leave clear space above the palms for live loader text. Reject a cut between poses if the character appears to switch models.

## 4. Check the matte

- For native alpha, distinguish exterior specks from intentional cobalt rim light. Inspect alpha separately. Remove tiny disconnected fragments only when they are visibly stray. Check hair tips, soles, fingers, and narrow gaps.
- For legacy black backgrounds, start a low-threshold flood at the canvas borders. Keep RGB-based masking away from the body interior. For trapped black gaps between legs or under arms, identify near-black connected regions and expand a small distance only within confirmed background. Start conservatively and inspect each distinct pose.
- When cleanup ate into the hair above the ear, restore the original hair pixels through a tight polygon mask. Preserve nearby negative space. Check over light, dark, and saturated backgrounds so both residual black and missing dark material show up.
- Check stationary frames at the same zoom and frame cadence. Treat a dark halo and a transparent hole as separate defects.

## 5. Export and verify

Run the exporter from a project with a recent Sharp installation that supports animated image joins. Config paths are relative to the configuration file. The output directory must be new.

    node /path/to/sprite-animation-cleanup/scripts/assemble.mjs /path/to/sequence.json /path/to/new-output

The exporter produces a looping GIF, zero-padded lossless WebP frames, and a timing manifest. Package the WebPs and timing manifest together for download. The configuration example shows cropped cells, per-pose anchors, foot-plant groups, walking direction checks, and an approved WebP copied verbatim. For a local repair, add a patches entry containing file and mask paths. Both must match the output canvas. The exporter composites the patch with alpha. Measure positions, create masks, and align the patch art before running it.

Inspect the actual loop and representative frames on contrasting backgrounds. Confirm the GIF’s dimensions, alpha and duration, then compare WebP order and verify the archive opens. GIF encoders may merge identical consecutive frames. The numbered WebPs and timing manifest retain the complete sequence. For scroll scrubbing, map progress to frame indices and use the holding frame as the point to place the live label. Report any visible seams, changes of likeness, or motion that still reads as stepped.
