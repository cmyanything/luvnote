# LuvNote experience acceptance gates

Read before reporting that any LuvNote template or theme is complete. Report PASS / FAIL / NOT TESTED rather than assuming anything.

## 1. Narrative and creative differentiation

- Recipient understands the first action quickly, with a clear hint.
- Story has beginning, meaningful reveal and intentional ending rather than an endless decorative page.
- Compared to the closest existing theme, at least three major creative axes genuinely differ.
- Photo-free and realistic user-photo versions are both emotionally convincing.
- Screens differ because of the chosen concept, not arbitrary animated decoration.

## 2. Functional coverage

- Interaction works with pointer, touch and keyboard, or provides an equivalent fallback.
- Replay, fast repeated taps, interrupted animation and navigation back do not duplicate effects or lose the state.
- Long Thai/English content, emoji, empty fields and missing/delayed/failed media have sensible layouts and fallback states.
- The editor's preview content matches the recipient's published experience when tested with representative data.
- Any media/audio UI reflects actual play/stop/mute states, with explicit user-initiated playback.

## 3. Accessibility / responsive

- At minimum inspect 360x800, 390x844, 768x1024 and 1280x900, adjusting to the actual test configuration.
- Contrast, readable Thai text, focus order, buttons and screen-reader labels have been checked.
- `prefers-reduced-motion` retains all information and the ability to finish the experience.
- No critical action depends only on hover, scratch, gyroscope, audio or timed animation.
- No unintended horizontal scrolling, clipped names or unclickable floating controls.

## 4. Technical quality

- No uncontrolled CPU-heavy loops, leaks, console errors or broken asset requests.
- Runs under the project's expected React/Vite/TypeScript versions and tests as appropriate.
- No unreviewed paid dependencies or assets without proven usage rights.
- Lab-only changes have not altered the catalog, production themes, Worker or production deployment path.
- Production integrations preserve old shared links, preview boundaries, data validation and edit/reopen behavior.

## 5. Evidence standard

For each claim, provide how it was checked: command output, screenshot path, trace, browser/manual test and tested viewport/browser. Clearly distinguish simulated mobile from actual Android/iPhone testing. Capture both entry and completion states, not just the hero screen. Mark unexecuted checks **NOT TESTED**.

Completion status:

- **CONCEPT:** no runnable prototype required; direction and state map complete.
- **LAB VALIDATED:** isolated playable demo with relevant lab build, interaction checks and screenshots.
- **INTEGRATION VERIFIED:** validated complete production-like journey and regressions in an isolated/staging environment.
- **DEPLOYED:** only after an authorized deployment with verifiable receipt; never inferred from passing tests.
