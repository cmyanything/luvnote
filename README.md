# LuvNote

Digital greeting cards with React + TypeScript editors and a Cloudflare Worker / D1 API.

## Development

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open `/themes/pink-coquette/`, `/themes/coquette-dream/`, `/themes/little-memories/`,
`/themes/birthday-chat/`, `/themes/velvet-gift/`, or `/themes/anniversary-journey/` on the local server.

The editors share React components for photos, music, validation, previews, and sharing.
Theme text, prices, effects, and letter/chat templates live in `src/themes.ts`.
Editor form data lives in React state and is not persisted to local storage, matching
the previous editors' disabled draft behavior.

The homepage, `intro-preview.html`, `app/` legacy viewer, and the five birthday themes'
`card.html` animation runtimes remain plain HTML. Vite copies these
files into `dist` without changing their contents. Existing `/#p…`, `/#d…`, `/#m…`,
`/#c…`, `/#v…` and legacy hash links retain their original routes. The React editors preview card pages through an
iframe; the parent only sends preview data to that iframe on the same origin.

## Build and check

```sh
npm run build
npx playwright install chromium
npm test
npm run preview
```

The browser suite runs against the production build at port 4173 on desktop and mobile.
It covers all six editors, image upload/captions/limits, preview handoff, PIN locks,
chat editing/reordering, API failure/retry, QR/share URLs, and old card links. API requests
are intercepted in tests; tests do not write cards to the production database.

Only `dist/` should be published. The source theme HTML files reference TypeScript
modules and cannot be served directly as a production site without the build step.

## GitHub Pages deployment

Use **Settings → Pages → Build and deployment → Source → GitHub Actions**.
The `frontend.yml` workflow validates pull requests and, after checks pass on `main`,
publishes the built `dist/` artifact. Do not publish raw source files from `main`.
The `CNAME` file is included in the build to retain `luvnote.fun`.

The separate `deploy-api.yml` workflow continues to deploy the Worker only when its
source/configuration changes.

## API configuration

Defaults remain `https://api.luvnote.fun` for the API and `https://luvnote.fun` for shared
card links. To use another environment, copy `.env.example` to `.env.local` and change
`VITE_API_URL` and `VITE_SITE_URL` before building. Vite embeds these public values in
the browser bundle; never place credentials in a `VITE_` variable. The API must permit
the frontend origin through its CORS configuration for local writes.

## Our Story: anniversary journal

`/themes/anniversary-journey/card.html` is a React viewer for a cream-paper journal,
dated Polaroid timeline, days-together counter, folding letter, and secret envelope.
Open it without a hash for the interactive sample, or with `#demo` for the silent
autoplay preview used in the catalog. New shared links use the `/#a` prefix.

The editor requires `startDate` (`YYYY-MM-DD`). Up to five photos can have optional
dates and captions; the viewer preserves the order chosen in the editor. Calendar
dates are validated in the client and Worker, and day arithmetic uses UTC civil dates
so daylight saving does not add or remove a day. Images remain resized JPEG data URLs.
The existing D1 JSON storage needs no schema migration.

The Worker now advertises supported themes at `/health`. Frontend deployment waits
for the anniversary capability so the new editor cannot go live before the updated
Worker. Both existing deployment workflows are triggered when this feature merges.

Tests cover anniversary dates, leap days, photo ordering, preview handoff, saved-card
loading, letter/PIN interactions, error states, catalog links, and an in-memory D1
round-trip through the real Worker. No production cards are written during tests.
