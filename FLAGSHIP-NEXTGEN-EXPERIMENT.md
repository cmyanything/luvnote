# Flagship Lab: cinematic experiment

This is an isolated Template Lab experiment, not a change to the Luvnote production site or its customer data. It continues the existing seven-scene lighthouse story and uses its existing artwork and editable story/photos.

## Baseline and direction

The prior public lab deployment was `86f7de34-5b2d-46d0-84ac-9703f7d77db6`. It was a direct upload with no recorded Git commit, so its provenance cannot honestly be reconstructed from Git. Its Flagship JavaScript SHA-256 was `eda4c7ce7550610f77c3930f29586cf4ce95e35c81e098285f37afb4f2e9e9aa`. The page revalidated its HTML, rendered the existing effects, had no observed page errors, and had neither reduced motion nor low-power mode enabled in the baseline Chromium run. The reported experience gap was reproducible and not explained by a stale build in that run.

Pink Coquette was played end to end as a benchmark: its strength is the way physical objects, feedback and narrative beats respond to the recipient. This experiment keeps a different lighthouse narrative and aims for larger transformations without claiming an objective emotional victory over that benchmark.

## Interaction and implementation

* **Portal:** drag the opening object or press the accessible start button. A temporary WebGL2 shader warps the original lighthouse image as a lens, adds refracted colour and light, and carries the viewer into the next scene.
* **Memory world:** select a photograph, drag it or use the rotate buttons. Freeze and reverse change the scene's actual animation clock, including the illuminated environment. The photograph is a perspective-projected 2.5D object, not a fully modelled 3D scene.
* **Finale:** press the final send button. Story photographs orbit and converge into a luminous heart before the personal message is revealed. The shader layer is short-lived and deliberately lower resolution on software renderers; the original background artwork and text stay full resolution.

The shaders distort image textures; they do not simulate physically accurate volumetric refraction, full 3D geometry or GPU particle physics. Native WebGL2 was chosen to avoid an additional heavy dependency for these bounded moments. WebGPU is not required. When WebGL2 or a texture is unavailable, or reduced motion/low-power mode is selected, the story remains usable with static or existing light-weight visuals. Controls also support buttons, skip, replay and opt-in sound.

## Verification and limits

The browser checks exercise all scenes on Chromium mobile/desktop and WebKit at a small mobile viewport, plus editor inputs, long Thai text, uploaded photo, reduced motion and accessibility checks. The separately recorded public-preview videos are silent browser captures: audio is opt-in and is not represented by those files.

The performance probe samples requestAnimationFrame intervals under Chromium's SwiftShader software WebGL renderer, a 390×844 viewport and 4× CPU throttling. It is a reproducible stress indicator, not measured display FPS or evidence of physical-phone GPU, battery or thermal performance. Physical iOS/Android testing remains necessary before product release. Automated accessibility checks do not replace assistive-technology testing. The visual and emotional outcome should be judged by playing the preview and comparing the recordings, not by the number of effects.
