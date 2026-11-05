---
name: luvnote-creative-studio
description: Design, prototype, implement, or review distinctive LuvNote surprise-page templates, interactive stories, UX/UI, animations, Template Lab concepts, and production theme integrations.
---

# LuvNote Creative Studio

Create memorable **interactive emotional experiences**, not reskinned greeting cards. Make every template feel like an intentional mini-world with its own visual language, narrative rhythm, and satisfying interactions. Treat LuvNote's editor, preview, delivery, and sharing journey as part of the experience.

## Scope and operating modes

Classify the request before acting:

- **CONCEPT / DESIGN:** Research the existing product, propose concepts and screen/state flows. Do not edit code unless explicitly requested.
- **LAB PROTOTYPE:** Build isolated, playable experiments in the existing Template Lab. Do not register or release production themes.
- **PRODUCTION IMPLEMENTATION:** Only when explicitly requested, integrate a selected and approved concept into the existing editor/viewer/catalog/API contracts.
- **REVIEW / POLISH:** Inspect a specified design or implementation; identify evidence-based problems; change only the authorized scope.

Never treat approval of a design as approval to publish, deploy, migrate a database, change a price, or modify live cards.

## First: inspect the current repository

Before suggesting file paths or making edits, inspect the actual working tree and read applicable instructions and implementation. At minimum, check `package.json`, `README.md`, `src/themes.ts`, and the affected editor, runtime, or lab. Consult `references/repository-integration.md` for known architecture and safety boundaries; **the live code is authoritative if it has changed**. Check for current in-flight changes before editing.

Known product shape (verify): React + TypeScript + Vite editors, theme-specific experiences, shared-card routes, preview messaging, Cloudflare Worker/D1/R2 integration, and a separate 12-concept Template Lab. Existing experiences include `pink-coquette`, `coquette-dream`, `little-memories`, `birthday-chat`, `velvet-gift`, and `anniversary-journey`. Some experiences use retained HTML runtimes: do not assume every viewer is already React.

## Design process

1. **Choose the emotion before the aesthetic.** State occasion, relationship, intended feeling, sender/receiver, audience and device. If unspecified, make a reasonable assumption and label it.
2. **Map the story.** Specify entry hook, anticipation, one meaningful interaction, emotional reveal, resolution, and closing/share moment. The receiver must always know what to do next.
3. **Check diversity against existing themes and the 12 Template Lab IDs.** Compare structure, dominant metaphor, first interaction, reveal mechanism, visual system, and motion rhythm. Reject concepts that are merely new colors, fonts, icons, or backgrounds over an existing template. See `references/creative-direction.md`.
4. **Describe real UI states.** Include idle/hover or focus/pressed/in-progress/success/skipped/error as applicable, plus touchscreen, keyboard, slow network, missing photos, no audio, and reduced motion.
5. **Assign one signature moment** that supports the story. Secondary effects must be quieter and should not compete. Prefer a distinctive physical or narrative interaction over unrelated particles or generic card flips.
6. **Art-direct the details.** Define typography hierarchy (including Thai), whitespace, color and contrast, textures/assets, composition, transitions, and mobile framing. Avoid default pink gradients, repeated centered cards, generic sparkles, excessive emojis, and identical scroll-to-reveal patterns unless the concept specifically justifies them.
7. **Prototype at mobile size first.** Validate the first meaningful action, replay, empty content, long Thai names/messages, and the finishing frame. The design must remain attractive with user-provided photos of mixed quality.
8. **Evaluate before integration.** Show concepts/previews and record distinctiveness, emotion, clarity, accessibility, performance, and complexity. Explain tradeoffs, not just attractiveness.

Read `references/creative-direction.md` for diversity heuristics and concept examples. Read `references/motion-and-interaction.md` when writing animation or interactive UI. Read `references/quality-gates.md` before claiming a prototype is complete.

## Implementation principles

- Reuse established components, design tokens, assets, and motion utilities when suitable, but **do not force all themes into one identical visual shell**. Theme identity belongs in theme-specific composition and timing; stable editing, preview, upload and share contracts belong in shared components.
- Prefer the project's installed React, Motion for React, and GSAP utilities; do not add packages, paid assets, web services, or animation engines without a reason and license review. Inspect current use and choose the smallest appropriate solution. Delay heavy effects until needed.
- Scope animations; clean up timelines, listeners, audio, observers and animation frames on unmount. Avoid layout thrashing and memory leaks. Animate transform/opacity where possible; cap or replace expensive effects for mobile.
- Build real, responsive, testable interactions rather than nonfunctional visual mockups. Avoid fake controls and brittle time-only sequences. Important reveals must have a usable fallback.
- Support touch, keyboard and screen readers; visible focus and readable contrast; honor `prefers-reduced-motion`; avoid autoplay sound and offer mute/replay/skip where appropriate. Never make content inaccessible behind motion or a gesture alone.
- Respect the existing preview iframe/origin boundaries, route prefixes, schema, card lifetime, permissions, privacy, upload limits and API validation. Do not invent theme identifiers or edit/renewal policies without verifying contracts and acceptance tests.
- Do not expose secrets, copy competitors' proprietary assets, or use copyrighted music without suitable permission.
- Avoid touching production databases, publishing, or deployment unless separately and explicitly authorized.

## Work by mode

**CONCEPT:** Produce a concise creative brief, 2–4 contrasting concepts where useful, a chosen recommendation with rationale, and 5–8 key screens/states. Mark all concepts as proposals.

**LAB PROTOTYPE:** Inspect `template-lab/` and current harness; implement a distinct isolated experience, sample data, clear play/restart paths, mobile and desktop previews, and representative interaction tests. Do not silently change the existing 12 IDs, comparison pages, routes or capture scripts; extend them deliberately if requested.

**PRODUCTION IMPLEMENTATION:** Trace the current data contract end-to-end (catalog → editor → validation → preview → save API → shared link → viewer → edit). Establish necessary server support first; stage any gated capabilities. Preserve old links and existing themes. Add tests for the new theme and regressions. Release is a separate decision.

**REVIEW / POLISH:** Inspect working UI in a browser when possible, document observed issues (not imagined ones), prioritize by severity, preserve the existing direction, and implement only agreed changes.

## Validation and delivery

For implementation, run the relevant checks available in the repository. Known commands (verify before use):

```sh
npm run typecheck
npm run build
npm run lab:build
npm run test:lab
npm test
```

For lab screenshots, use the existing local capture harness after starting the required local server; never point capture or test writes at production. See `references/repository-integration.md` and `references/quality-gates.md` for the correct scope/order. **Report exactly which commands ran, what passed/failed, and which devices were simulated versus tested physically.**

Deliver a short report with: mode; creative direction; what makes it different from closest existing theme; signature interaction; responsive/reduced-motion behavior; affected files; tests and preview evidence; unresolved risks; and whether it is **concept / lab-only / production-ready / deployed**. Never imply deployment or production readiness merely because it looks finished.