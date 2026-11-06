# Beyond the Screen — treatment, storyboard and technical plan

## The feeling
The receiver discovers that a postcard is a small, living cut through the same sea that will surround them. Their hand pulls a paper seam: the image itself bends, develops depth, and gives way to a camera journey into a lighthouse world. They steer its beam over the water to awaken a memory. In the finale the sea folds into a constellation, which resolves back into the original postcard. The sender's words belong to that world, not a detached web page. The existing deep teal, warm amber light and lighthouse illustration remain the visual authority.

## Storyboard / keyframes
1. **Found — 0 s:** one postcard in a dark quiet space, the lighthouse image on one physically continuous surface; a small tab invites a pull.
2. **World escapes — user's pull, 0–3 s:** paper flexes along a seam; one projected image deforms with the mesh so no second lighthouse is painted on folding wings. The lighthouse and island rise out of the surface, water extends forward, and light spills beyond the paper edge. Camera advances continuously into the same world.
3. **Living sea — user explores:** camera now has spatial perspective; gentle water responds to the receiver. A controllable lighthouse beam sweeps the sea; a memory reacts only when illuminated. Provide a button alternative to dragging.
4. **Transformation — user chooses to continue:** illuminated memory draws the horizon into a calm constellation; geometry and light, not a generic particle burst, carry the transition. Personal words sit in the spatial scene and remain accessible as text.
5. **Return — after the reveal:** camera pulls out to discover that world still inside the same postcard. Replay and edit remain possible.

## Pre-production order and feasibility gate
Make a silent short animatic with approximate timing and source artwork. Next make a standalone WebGL feasibility prototype and verify (a) textured vertex-displaced geometry can move with a perspective camera without duplicating the lighthouse, (b) 390px and desktop render, and (c) cleanup/context loss can be handled. Only after visually reviewing the first opening should the other beats be built. Quality of the illustration takes priority over geometric complexity.

## Technical direction and limits
Three.js is warranted for a perspective camera, deformed textured geometry, independent water and 3D objects. Use the original lighthouse artwork as a single projected texture. A depth-displaced relief is real geometry, but it is not a complete modeled lighthouse: a full 360-degree object requires separately authored or reconstructed geometry. Avoid claiming otherwise. Use a single animation loop, capped pixel ratio, responsive sizing and disposal; no extra post-processing. Reduce spatial travel for reduced motion and keep accessible button paths. Handle WebGL failure using the prior playable postcard. Personalization remains local to the tab; no production data or sales integrations.

## Acceptance caveat
This is a visual experiment, not a production release. Independent user response and real iOS/Android performance cannot be fabricated. Capture video and measured browser data; explicitly report any visual or performance gate that is not met.
