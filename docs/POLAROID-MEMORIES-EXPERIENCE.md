# Polaroid Memories — an evening with our photographs

## Playful memory box — 2026-11-03

Runtime source: `0463191c4216edb19c097c5fcef8519bf197af37`. Following the owner's preference for a playful experience with a final surprise, each memory can contain a sender-authored keepsake. The recipient can pull or tap the little pocket, return the item to its pocket, and revisit it later; discoveries return in the finale after revealing the existing sender-authored secret. Feelings are now an optional collapsed section rather than a required questionnaire. The secret receives a small one-shot celebration, and stories with no keepsakes do not promise hidden items.

Polaroid Studio now exposes the already-supported `keepsake` and `keepsakeType` fields as well as the existing secret field; these remain local Studio drafts and do not imply customer publishing is enabled. Photos, notes, music, replay, favorites and the PNG keepsake use the existing flow. Images of the actual UI are in [`evidence/polaroid-playful/`](evidence/polaroid-playful/). Design review used the existing Frontend Design guidance on subject-specific materials and motion tied to a visitor action.

Local validation: `npm run lab:build` and `npm run build` passed; `node scripts/check-template-lab-isolation.mjs` passed for 25 production output files; `npx playwright test --config playwright.lab.config.ts tests/lab/polaroid.lab.ts` passed **50/50** checks over 360, 390, 768, desktop and WebKit emulation. This covers editing the keepsake and surprise in Studio, pocket tap/drag/revisit/reset, optional recollections, finale, accessibility checks and existing PNG export. An earlier test selector timed out; the selector was corrected to use the control's accessible role and the final suite reran cleanly. Full release checks are recorded in the associated pull request.

The intended 3–5 minute duration and emotional impact have not been measured with people. Browser emulation is not physical-device testing. No API, database, billing or production customer card integration was changed.

---

## Follow-up: nostalgia and personal surprise — 2026-11-02

Runtime source: `462ad67246794225eebc7b1065809284cedc90bd`, branch `feat/polaroid-nostalgia`. The previous release below remains a historical acceptance record.

Final mobile ordering: `206925d38b63778aed47a605f2a78984854c8ebf` places the photo/screening before the optional recollection postcard on small screens (one CSS declaration). Screenshots were refreshed. The first follow-up mobile/WebKit run passed 15 checks but timed out during the four-chapter WebKit Axe test at its unchanged 30-second budget; no assertion violation was reported. A serial rerun and final full CI results are recorded in PR #17. The 40-check JSON below is explicitly for the earlier source, not a claim that this follow-up run was clean.

The owner found the previous interaction sequence insufficiently moving. This iteration makes remembering the primary activity: an optional postcard asks what the recipient remembers, a private photo screening reveals the sender's complete original paragraphs at the reader's own pace, and the final surprise brings back the specific photos and feelings the recipient chose. Choices have no correct answer, can be changed, and are kept only in component memory. The interface explicitly says they are not sent to the sender. No fictional memories are generated for imported stories.

The primary path now goes from memories directly to the letter; arranging and downloading photographs is optional afterward. The large opening headline becomes quiet while reading. Screening has previous/next/close controls, native dialog focus management and Escape support; reading it to the end marks that photograph read. Immediate reveal, rub, flip, aside, zoom, favorites, export and full replay remain available. Skipping all prompts still reveals the original photographs and sender content. No timer, autoplay narration, account, remote storage, dependency or new asset is introduced.

Design guidance applied: Anthropic `frontend-design` (read from the research checkout): subject-specific paper/photo materials, interaction-driven motion, restrained typography and screenshots as critique. No new independent reviewer or other skill audit is claimed. Colors remain sage `#c1cfc0`, forest `#304c3e`, paper `#fffaf0`, postcard `#e5dfb9`, kraft `#b9a57d`; existing Mali handwriting carries memories. The dark screening/final reveal is the main visual contrast.

Validation and fixes:

- `npm run build`, `npm run lab:build`, `node scripts/check-template-lab-isolation.mjs`: passed; 25 customer output files isolated from the Lab.
- Targeted command: `npx playwright test --config playwright.lab.config.ts tests/lab/polaroid.lab.ts`. Final result is recorded in `docs/evidence/polaroid-nostalgia/tests.json`.
- Added real interaction checks for changing/revisiting answers, matching each answer to its photo in the reveal, reset/fallback, every screening paragraph and aside, Escape, keyboard/native controls, final-caption containment and Axe audits. Existing PNG/retry/touch tests still run.
- First run: 35 passed / 5 failed on the same semantic error: a generic span had an accessible name without a supported role. Added `role="img"` to the visual progress indicator; next run 40 passed.
- Screenshot review found inherited image height pushed final captions outside their paper. Set the image height to auto and added caption containment plus final-state Axe checks; reran the targeted suite.
- Actual desktop and mobile screenshots: [evidence folder](evidence/polaroid-nostalgia/). Capture reported no JS errors or page overflow at 390 and 1280 pixels. Reviewed desk, screening and final reveal; corrected final screenshot shows captions inside the paper.
- Lazy Polaroid module: 8.00 kB gzip JS and 4.61 kB gzip CSS. No new package. These are build sizes, not a device performance benchmark.

The 3–5 minute goal remains an intention, not a measured outcome. Emotional impact is not certified by automated tests. No physical-device session, human timing study or new customer publishing integration was performed. Current release/CI/live status is recorded in the follow-up PR; the historical release below does not certify this new source.

---

Source: `54403fe401a54a21bd963e18ef3530e404495062`, branch `feat/polaroid-memory-evening`. This follow-up develops one template, preserving the other eleven renderers and the existing customer website/API. No dependency or service was added.

## Recipient journey

| Chapter | Working interactions | Purpose |
|---|---|---|
| A parcel addressed to you | Drag the parcel or tap its knot; the wrapping lifts away and reveals the photographs | Receive a personal gift before reading |
| Days worth keeping | Rub the opaque mask with a finger/mouse; open immediately using a button; swipe photographs, flip them in3D, scroll handwriting, unfold the aside, enlarge the photograph and mark favorites | Revisit each memory at the visitor's pace |
| A little corner of us | Choose1–3favorites; drag or use buttons to change order; apply tape/heart/date treatments; write a future memory and download the actual composition as PNG | Make a personal keepsake rather than simply watching effects |
| A photograph not yet taken | Read the complete sender letter; pull/tap the final print; see the secret, closing, chosen photographs and recipient's own reply; return to either earlier chapter | End by imagining another memory together |

The input remains the existing `Story`: names, cover, headline/intro, full letter, secret, closing and1–8memories with date/place/note/aside. The richer four-photo demo is selected only for Polaroid; editing/importing supplies the actual user's own words. The existing opt-in music and full replay controls remain available. Replay clears this visitor's selections and reply.

The recipient reply remains in the current page and any downloaded PNG. It is **not sent back to the sender**, saved to a server or included in the Studio's sender draft; the UI states this beside the field. Closing/reloading the recipient view resets those interactions. The sender's existing local Studio draft behavior is unchanged.

## Pacing target

**3–5minutes is a design target for the authored four-photo demo, not a measured usability result or a time gate.**

| Activity | Intended time, including reading |
|---|---|
| Receive/open the parcel |10–20seconds|
| Discover four memories and their folded notes |100–140seconds|
| Choose, arrange, decorate and write a reply |45–70seconds|
| Read the letter and reveal the future print |30–45seconds|

Total intended path:185–275seconds. Direct chapter navigation and immediate image reveal preserve visitor choice; a fast visitor can finish sooner. A one-photo card will usually take less time, while eight long memories can take longer. No human timing study or physical-device session has been conducted. Automated execution time is not offered as evidence of recipient engagement.

## Implementation and boundaries

- Motion uses the existing Motion package, spring drag and3D/CSS transitions. There is no autoplay loop, new timeline engine, Lottie player or new asset service.
- The300×280scratch canvas erases only a translucent local mask. Original images remain ordinary images underneath; no repeated JPEG conversion or photo pixel sampling occurs during rubbing. Coverage is bounded to400cells.
- Each gesture has a native button alternative. Notes retain keyboard scrolling; hidden print faces are inert; chapter changes move focus to their heading. Reduced motion removes staged movement while retaining content and controls.
- PNG export loads only the chosen1–3images after a deliberate download action, draws a1200px-wide keepsake and preserves all wrapped recipient reply lines by growing its paper/height. The canvas uses existing self-hosted Mali fonts.
- Missing photos or remote images without CORS permission can prevent export. The error remains recoverable: the visitor can change the selection and retry. The actual negative test uses a missing synthetic local image; real external CORS providers and physical iPhone download behavior remain unverified.
- Demo photos and fonts retain their existing Unsplash/OFL provenance. This creates no new illustration/stock dependency and copies no React Bits code.
- Customer theme allowlists, authentication, R2/D1, payments, existing shared links and deployment configuration are untouched. Customer publishing integration of the twelve Lab renderers is still outside this release.

## Tests and evidence

`npm run typecheck`, `npm run build`, `npm run lab:build` and production isolation: PASS (25files). `npm run test:lab`: **350passed,0failed,0skipped,0flaky**,70checks ×5projects,569.1seconds. Browser emulation:360/390/768/1280px Chromium and WebKit/iPhone emulation. Source/test SHA-256:`fbe274b4a54b01923cc2745b780fe77329bd1eec8d689f4eef0ab0d8c35de9ce`. [Machine-readable verification](evidence/polaroid-experience-verification.json). The deployable `/mylab/` package passed **56/56 nested-route checks**, 0 failed/skipped/flaky, 39.5 seconds. The normal build/isolation and packaging checks each preserved all 25 existing customer output files. Refreshed catalogue captures: **48 actual images, 0 page/HTTP errors**, source `54403fe401a54a21bd963e18ef3530e404495062`. [Nested results](evidence/polaroid-experience-nested-tests.json).

The new tests exercise actual pointer/touch rubbing (including Chromium touch cancellation), immediate reveal, folded notes, favorite persistence, real drag/button reordering, selection quota, decoration state, local reply, real PNG download/decoding, the final reveal, all-chapter Axe/keyboard/reduced-motion/replay, missing-canvas recovery and failed-export retry. Existing personalized1/8memory cases and all eleven other template journeys remain in the full suite.

Actual captures: [manifest](evidence/polaroid-experience/screenshots.json), six states at390/1280px, each with a full-page PNG and an actual active-scroll viewport JPEG. Actual downloads: [three-photo keepsake](evidence/polaroid-experience/real-keepsake.png), [eight-line keepsake](evidence/polaroid-experience/multiline-keepsake.png). No generated mockups are used.

[Performance diagnostic](evidence/polaroid-experience-performance.json): Chromium at 390×844 with 4× CPU throttling, built local preview, one short approximately 900 ms window per template. Polaroid's unwrap/flip sample recorded CLS 0, frame interval p95 16.8 ms over 54 frames, zero frame intervals over 34 ms and no running infinite animation. It also recorded one 88 ms interaction long task and a 102 ms loading long task. This is a small diagnostic, not a sustained 60 fps claim, scratch/export benchmark, physical-phone result or engagement study. The Polaroid renderer remains lazy-loaded: JavaScript 6.88 kB gzip and scoped CSS 3.73 kB gzip; no new dependencies.

## Independent review and defect record

A fresh reviewer read the current request, source and24rendered captures plus the real download, without inheriting the implementation conversation. It found the four chapters coherent, physical interactions consistent with the incumbent sage/paper world, legible mobile/desktop layouts and usable button/keyboard alternatives. It considered3–5minutes plausible as intent, explicitly not measured evidence. The initial disposition was **fix**, with one material finding: F1, multiline reply truncation.

Design references actually read for this focused work: Anthropic's `frontend-design/SKILL.md` and Impeccable's `impeccable/reference/craft-floor.md`, alongside the previously loaded new-work workflow. The implementation applies a coherent paper/tabletop visual world, deliberate type hierarchy, tactile movement with clear feedback, complete content, and usable error/keyboard/reduced-motion states. Emil's `improve-animations` instructions were read as research; its audit workflow was not executed and no separate Emil review result is claimed. Motion is the existing runtime library, not a newly installed skill or dependency.

The defect was reproduced before changing the exporter: two replies with identical first seven lines and different eighth lines produced identical PNG SHA-256`65209e79e6d1d04734e7016aa96f5627a6b4680092f6df8a57dd11ae40982b57`. Source tracing found a seven-line early return. At`54403fe`, measured wrapping determines paper/canvas height and attribution placement; every accepted reply row is drawn. The same actual UI probe then produced distinct PNGs (`29dd2f9…` / `78b4108…`) with the eighth line visibly intact. A regression asserts changed actual PNG bytes and expanded dimensions. It does not merely inspect a React state value.

The same reviewer scored **F1 resolved** and returned **ship at the scope of F1** after seeing the new eight-line PNG and recaptured states. This is closure of the listed fix, not physical-device, customer publishing or human-timing certification. No detector ran: the research checkout has no launcher or degraded reviewer reference; the review used supplied evidence/source with that limitation disclosed.

One early test failure was an assertion expecting paragraph separators inside the combined DOM text. The existing letter component renders real paragraph elements; the test now checks every paragraph's exact text. It did not require changing recipient content. A345-test run started before the F1 fix was treated as diagnostic, because source/tests changed while it ran; it is not final acceptance.

## Preview and rollback

Local: `npm run lab:dev`, then`http://127.0.0.1:4317/template-lab/?template=polaroid`. Hosted destination: `https://luvnote.fun/mylab/?template=polaroid`, using the existing reviewed Pages workflow once checks pass. Direct recipient:`?play=polaroid`.

Rollback uses the previous Pages artifact/revert of this Lab-only change. The previous main commit is`b9e6e8ea79364cdc2c03f9255d0369f0ec7cc68c`; no card data or Worker rollback is needed for this template change.

## Release gate

GO for the scoped developer Lab update after the exact PR head passes both GitHub check workflows. This document records local acceptance at the source commit above; the release PR records exact CI, Pages deployment and live post-deployment evidence. This is not approval to sell/publish this renderer through the customer API.
