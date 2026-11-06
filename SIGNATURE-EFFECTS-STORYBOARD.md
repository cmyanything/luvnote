# Signature Effects Lab — interaction storyboard

## Direction contract
**Thesis:** Three impossible interactions share the sender's personal material, not the same animation. The Lab is a workbench for playing, not a template for sale.
**Own-world:** LuvNote's intimate warm blush, wine ink, paper and tiny metallic accents; photographic content remains recognizable. Controls are quiet and clear; the interaction occupies the largest region.
**Story:** Choose an experiment, optionally personalize locally, act directly, discover the consequence, then reset and compare.
**First viewport:** On mobile the selected experiment title, a brief verb, an immediately operable visual stage and reset sit above secondary personal settings; desktop gives the stage generous width. No external accounts or production data.
**Form:** Existing Lab extension; seed: none (unavailable). **FINISH:** the run's exit condition, verbatim “unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance”.

## A — Living Typography / the sentence is a single elastic surface
1. **Rest:** The sender's text is shaped as a complete Thai/Unicode line by the browser and printed on an invisible flexible surface. Names influence the ink and message beneath.
2. **Action:** The user drags the surface. Continuous displacement travels through the full pre-shaped raster, not independently split UTF-16 characters. A thread records the deformation.
3. **Surprise / settle:** After a sufficient pull, the name settles into a seal made from six intact copies of the personalized name, while the sender's message is revealed. Each copy is shaped as a whole; a new pull unfolds the seal. A slider is the keyboard alternative.
4. **Risks:** Shaping depends on the browser's fonts and text renderer; continuous raster distortion can deform glyphs visually but must not detach Thai marks into independent objects. Long text is wrapped by grapheme, not by code unit. Test with Thai combining marks and emoji.

## B — Impossible Physics / two windows into one folded photograph
1. **Rest:** Two framed windows show the same photo as pieces of one continuous field, joined by a drawn spatial seam.
2. **Action:** Drag in either window. The image is sampled from the same periodic texture; the opposite window samples in the opposite direction. A crop that exits one window returns via the other side of the same wrapped field. It is an interactive coordinate mapping, not two fixed spring animations.
3. **Surprise:** The second image follows in the opposite direction as if the photograph were folded through the connection; the image field bends in horizontal bands and retains momentum after a swipe; the user's uploaded image changes the result. Keyboard arrows and a range control offer alternatives.
4. **Risks:** It is an intentionally stylized two-dimensional portal illusion, not actual cloth physics. Clearly distinguish what is simulated.

## C — Memory Echo / your path becomes the sender's name
1. **Rest:** A quiet stage with a personal photograph awaits one or more strokes.
2. **Action:** Every pointer path is stored as normalized ordered points in the browser tab. No server is involved; limits bound memory. Keyboard users can add deliberate pre-described strokes.
3. **Surprise:** The actual recorded points travel from their recorded positions to sampled positions in a browser-shaped raster of the personalized name, then the intact shaped name appears. A different path produces a different journey into the name. No random confetti or generic particle burst.
4. **Risks:** This is an image-space interpolation of personal gestures, not intelligence or a psychological inference. Exact target point placement depends on the browser font. Reduced Motion shows the result without the travel.

## Budget and validation
Canvas 2D only, no WebGL and no new runtime dependencies. One bounded RAF per mounted stage, no background loop when idle or document hidden; cap device pixel ratio. Use one browser worker and sequential captures on the shared Mini PC; do not stop other services. Functional checks, accessibility checks, visual judgment and real-device performance are separate outcomes. No physical phone or independent audience result may be invented. Image selection, text and gesture history remain local to the tab and are discarded on reset/close as described by the UI.

