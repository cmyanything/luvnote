# Beyond the Screen — opening experiment report

## Status / quality gate: NOT PASSED
This branch is a playable technical opening experiment based on `884f010`. The World Escapes is not yet at the owner's visual quality gate, so the Living World and Impossible Transformation have not been developed as final experiences. There is no full-story video. The visual result still reads mainly as entering an illustrated relief rather than entering a fully modeled fantasy world. Paper edges do not yet fold with convincing physical continuity. The water and small object are 3D geometry, but the lighthouse is a single displacement-mapped image surface, not a complete 360-degree lighthouse or independently modeled island. The beacon is not yet user-steerable and there is no memory-search or ocean-to-cosmos finale. Do not claim otherwise.

## What is real and what changed
- Three.js renders a perspective camera, a subdivided textured surface with two geometry morphs, separate mesh paper edges, a shader-driven water plane and a small 3D object. Directly pulling the tab changes the camera, surface relief and fold in real time. A single source texture is used for the lighthouse; the two duplicate artwork wings from the prior version are gone.
- Dragging in the world changes actual camera position and stimulates the water shader. It is a limited exploration, not a navigable 3D island.
- A sender can edit names and up to 800 characters; a readable-by-assistive-technology copy and a paged text texture in 3D are provided. Content stays in this tab and no share link is created.
- Reduced Motion, tap/keyboard opening, replay, sound opt-in and WebGL failure fallback to the prior postcard are implemented. The fallback keeps edited text. There is no production API integration.
- A separate technical feasibility prototype before this implementation tested a single projected texture on a perspective relief. It drew 30,000 triangles in one draw call on headless Chromium WebGL2 on both test viewports. This supports feasibility only; it does not prove visual acceptance or real-device performance.

## Measured locally in Chromium, 6 November 2026
Chromium headless / SwiftShader; viewport emulation, not a physical phone. rAF callback intervals were collected over the scripted opening, editing, viewing, and three replays. Samples include idle periods and do **not** measure renderer-presented frames or GPU time. The final renderer detects software rendering and caps its own render loop at approximately 30 FPS with a 0.75 pixel ratio; it can step pixel ratio down further under sustained slow frames. Therefore the following 16.7 ms callback intervals are not evidence of 60 FPS rendering.

| Run | rAF p50 | rAF p95 | intervals >33.34 ms | Long tasks |
| --- | ---: | ---: | ---: | ---: |
| Mobile 390×844 | 16.7 ms | 16.8 ms | 6 / 852 | 1, max 120 ms |
| Desktop 1280×900 | 16.7 ms | 16.8 ms | 41 / 1056 | 3, max 131 ms |
| Mobile CPU ×4 | 16.7 ms | 16.8 ms | 7 / 873 | 7, max 345 ms |
| Reduced Motion 320×640 | 16.7 ms | 16.7 ms | 3 / 523 | 1, max 133 ms |

An earlier version without this fallback had mobile p95 50.1 ms and desktop p95 100 ms on the same headless setup, but timings vary and the change also reduces the renderer's output rate and resolution, so this is not a like-for-like improvement in fidelity or proof of performance on a phone. Automated tests covered forward/reverse drag, early-release rollback, editable Thai text, three replays, axe automated checks and page errors in these four configurations. No page errors or axe violations were reported. A separate WebGL context-loss test switched to the prior postcard and retained the edited recipient name. Axe is not a complete accessibility audit.

Physical iOS: **Not Tested**. Physical Android: **Not Tested**. GPU time, actual display frame presentation, memory trend and battery/thermal behaviour: **Not Tested**. Independent users' emotional response: **Not Tested**. Avoid claiming the WOW acceptance gate is met.

## Next work before continuing the story
Commission or reconstruct a coherent lighthouse and island as actual spatial geometry with matching textures and a curved paper mesh, then tune the camera path and screen-space continuity using full-motion mobile footage. Validate fidelity and stability on real devices, including context loss and reduced motion. Only after The World Escapes is visibly convincing and performant should the beam search and universe finale be designed and built. A 2.5D relief alone does not satisfy that gate.
