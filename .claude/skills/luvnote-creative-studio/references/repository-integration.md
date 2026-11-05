# LuvNote repository integration notes

Snapshot from a read-only review of `cmyanything/luvnote` default branch, 2026-11-05. **Always confirm against the checked-out branch** before acting. This reference is a map, not authority to change the application.

## Current architectural facts to verify

- `package.json`: React 19, TypeScript, Vite; Motion for React and GSAP already present. Node.js >=22.12.0.
- `README.md`: React-based editors, shared components, theme configuration in `src/themes.ts`, and retained HTML card viewers for several earlier themes.
- Existing themes in README: `pink-coquette`, `coquette-dream`, `little-memories`, `birthday-chat`, `velvet-gift`, `anniversary-journey`.
- LuvNote shared links use legacy hash routes. Preserve current route prefixes and old cards; new prefix/schema behavior must be coordinated with Worker and tests.
- Editors preview same-origin card pages via iframe handoff. Do not weaken origin checks or leak sensitive content through preview messages.
- Production backend includes Cloudflare Worker/D1; media may use private R2 references (depending on flags). The API handles validation, card editing, expiry and renewal. Do not bypass existing limits or permissions.
- Theme additions affect more than `src/themes.ts`: inspect catalog, editor, viewer, Worker theme allowlist/health, validation, tests, routing and deployment gates.
- Template Lab is isolated: `vite.lab.config.ts`, `template-lab/`, `tests/lab/`, `playwright.lab.config.ts`, `scripts/capture-template-lab.mjs`. The current capture script lists 12 specific template IDs; do not overwrite or silently rename them.
- Lab output is built separately as `dist-lab`; production output is `dist`. Do not publish `dist-lab` as production unless explicitly part of a reviewed lab deployment.
- `README.md` describes `anniversary-journey` short-film mode and a GSAP implementation. Do not assume all film techniques apply to every theme.

## Development / QA commands

Run only when working in the checked-out repo and dependencies are available. Inspect scripts first.

```sh
npm ci                      # if dependencies need installing
npm run typecheck
npm run build
npm test                    # main Playwright suite; check setup/environment
npm run lab:build
npm run test:lab            # separate lab Playwright suite
```

For local lab capture, run `npm run lab:dev` in another terminal (currently port 4317) before `npm run lab:capture`. Confirm screenshot destinations and avoid overwriting unrelated evidence. The lab Playwright config currently previews a built lab on port 4318; build it before testing.

If a task changes only a design, don't claim tests ran. For a lab-only change, prioritize lab build, lab tests and captures; run broader tests if shared code is touched. For production theme work, run broader regression and API tests, including old links, edit/reopen, upload/media, missing cards, PINs, preview behavior and existing viewer routes.

## Safety and change-management

- Perform read-only repo inspection first. Report dirty-tree changes rather than deleting or overwriting them.
- Do not commit, push, open a PR, merge, deploy or change Workers/D1/R2 without explicit authorization for the relevant action.
- Never alter prices, card duration, limits, payment/renewal policy, secrets, domain, CORS, role permissions or production feature flags as a cosmetic part of a template update.
- Tests should use fixtures, intercepts or isolated local Worker/D1; do not write test cards to the production service.
- Do not claim a feature is production-ready before proving the full sender/editor-to-receiver journey and compatibility gates.

## Implementation report

Include affected files; route/data-contract impact; reused vs newly introduced libraries; visual and interaction screenshots; test commands and counts; reduced-motion results; known gaps; and a status that distinguishes prototype, staged integration and deployment.
