# The River Remembers — test report (2026-11-06)

Route: `/template-lab/?experiment=river` (query `to=` and `msg=` personalise). Branch `experiment/river-remembers`, isolated; no API/payment/card calls, nothing uploaded.

## Artwork (Codex CLI 0.166 built-in image_gen, ChatGPT login, no OpenAI API)
river-night, sky-world, water-tile (opaque); krathong-hero, petal-sheet, lantern (real RGBA via imagegen remove_chroma_key.py, key #00ffff); glow-sheet, flame-sheet (black bg, screen-blended). Files in template-lab/public/river/, originals in raw/. Codex hit its image usage limit (until ~19:00) right after the last asset; all 8 existed and were verified on disk (PNG colour type checked).

## Automated play-through (Playwright Chromium, 390x780 @2x touch, real touch events)
All 7 acts completed, 0 console/page errors, normal and prefers-reduced-motion runs. Scripted run 1:41 (video evidence/river/river-full-experience.webm, reduced-motion video in evidence/river-rm/). A human exploring is estimated at 3-4 min (estimate, not measured). Screenshots per act in evidence/river/.
Bugs found by playing and fixed: Act 3 never advanced (progress threshold unreachable), krathong banding stripes, flame anchor, Act 5 drag sensitivity, krathong sailing off-screen too fast, finale text overlapped by lanterns.

## Known limits (honest)
- No audio. No real-device test (iOS/Android Safari/Chrome) and no frame-rate profile: only headless Chromium on the i7-7700; mobile perf unmeasured.
- Impossible River is a 2D band-displacement cross-fade between two painted worlds with a flipping krathong, not real physics.
- Name/message particle text is Thai-shaped via canvas sampling; very long names shrink; combining marks can look dotted at small sizes.
- Playthrough script uses a skip-free path; the small "ข้าม" button exists for accessibility/testing.
- Act 6 requires a wish choice then a swipe; with reduced motion particle counts are scaled to 35%.
- Audio is procedural Web Audio (no files); level probe measured stable RMS 0.05-0.26 after fixing a reverb feedback runaway. Not heard by a person yet.
- Not yet reviewed by a person for "wow"; subjective.
