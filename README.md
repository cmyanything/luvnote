# LuvNote

Digital greeting cards with React + TypeScript editors and a Cloudflare Worker / D1 API.

## Development

Requires Node.js 22.12+.

```sh
npm ci
npm run dev
```

Open `/themes/pink-coquette/`, `/themes/coquette-dream/`, `/themes/little-memories/`,
`/themes/birthday-chat/`, or `/themes/velvet-gift/` on the local server.

The editors share React components for photos, music, validation, previews, and sharing.
Theme text, prices, effects, and letter/chat templates live in `src/themes.ts`.
Editor form data lives in React state and is not persisted to local storage, matching
the previous editors' disabled draft behavior.

The homepage, `intro-preview.html`, `app/` legacy viewer, and each theme's standalone
`card.html` animation runtime remain plain HTML in this migration. Vite copies these
files into `dist` without changing their contents. Existing `/#p…`, `/#d…`, `/#m…`,
`/#c…`, `/#v…` and legacy hash links retain their original routes. The API and D1 schema
are unchanged. The React editors still preview the original card pages through an
iframe; the parent only sends preview data to that iframe on the same origin.

## Build and check

```sh
npm run build
npx playwright install chromium
npm test
npm run preview
```

The browser suite runs against the production build at port 4173 on desktop and mobile.
It covers all five editors, image upload/captions/limits, preview handoff, PIN locks,
chat editing/reordering, API failure/retry, QR/share URLs, and old card links. API requests
are intercepted in tests; tests do not write cards to the production database.

Only `dist/` should be published. The source theme HTML files reference TypeScript
modules and cannot be served directly as a production site without the build step.

## GitHub Pages deployment

Before merging the React migration, change **Settings → Pages → Build and deployment →
Source** from **Deploy from a branch** to **GitHub Actions**. The `frontend.yml` workflow
validates pull requests and, after checks pass on `main`, publishes the built `dist/`
artifact. Do not merge the migration while Pages still publishes raw files from `main`.
The `CNAME` file is included in the build to retain `luvnote.fun`.

The separate `deploy-api.yml` workflow continues to deploy the Worker only when its
source/configuration changes.

## API configuration

Defaults remain `https://api.luvnote.fun` for the API and `https://luvnote.fun` for shared
card links. To use another environment, copy `.env.example` to `.env.local` and change
`VITE_API_URL` and `VITE_SITE_URL` before building. Vite embeds these public values in
the browser bundle; never place credentials in a `VITE_` variable. The API must permit
the frontend origin through its CORS configuration for local writes.

## Card lifetime, owner edits and paid renewal

- New cards open for **90 days** (`LIFE_DAYS` in `worker/index.js`, `CARD_LIFE_MS` in `worker/media-v3.js`).
- **Owner edits (R2 cards):** after creating a card, the share sheet shows a private edit link
  `/themes/<theme>/?edit=<card>#key=<secret>`. Opening it loads the card into the editor; saving
  replaces text and photos behind the same card link and keeps its expiry. The secret is the
  publishing upload token; D1 stores only its SHA-256 in `card_edit_keys`. Replaced photos are
  retired immediately and removed from R2 by the hourly cleanup.
- **Renewal (29 THB/year, paid via LINE):** GitHub → Actions → **Extend card (paid renewal)** →
  Run workflow, paste the card link or id and choose the years paid. Renew photo cards **before**
  they expire: cleanup deletes an expired card's photos within the hour, and the workflow refuses
  to revive them. Legacy Base64 cards keep their data and can be renewed after expiry.

- **Lost edit link:** open `https://luvnote.fun/admin/`, enter the admin key and the customer's card
  link, then send the new edit link to the customer (copy or LINE button). The old edit link stops
  working immediately; the card link is unchanged. Works for any unexpired card, including legacy
  Base64 cards (saving an edit moves their photos to R2). The page calls `POST /v3/admin/edit-key`
  with `X-Admin-Key`; set the Worker secret `ADMIN_KEY` (at least 32 random characters) in Cloudflare →
  Workers → `luvnote-api` → Settings → Variables and Secrets. Without it the route answers 503. Edit
  keys are never written to GitHub (public repo), only shown on this page.

## Operations

- **Quotas** live in `worker/quotas.js` (R2 upload sessions: 20 per IP per hour, 1000 per day site-wide;
  one session per card created or edited). `WRITE_LIMITER` in `wrangler.toml` allows 300 writes per
  minute per IP and per Cloudflare location. Raise both as traffic grows, then redeploy the API.
- **Health check:** `.github/workflows/health-check.yml` runs hourly (API health, 404s on unknown
  cards/photos, homepage and all five editors with their JS). GitHub emails the owner when a scheduled
  run fails. GitHub pauses schedules in public repos after 60 days without commits; re-enable under
  Actions if that happens.
- **Backups:** `.github/workflows/backup-d1.yml` exports production D1 every Monday 03:23 Bangkok time to
  the private R2 bucket `luvnote-backups` (`d1/luvnote-<timestamp>.sql.gz`) and verifies the upload.
  Never store exports in GitHub (public repo). To restore: download the file from the Cloudflare
  dashboard, `gunzip`, create a new D1 database and `npx wrangler d1 execute <new-db> --remote --file
  <file>.sql`, verify, then point `PRODUCTION_D1_ID` at it. D1 Time Travel also allows point-in-time
  restore for recent days. Photos in `luvnote-media` are not part of this export.
- **Staging CPU test:** push to `claude/r2-staging-acceptance` (workflow on that branch) to measure real
  Cloudflare CPU for upload changes before release.
- **Rollback:** set the repository variable `VITE_R2_MEDIA_ENABLED=false` and rerun "Frontend checks and
  deployment"; set `MEDIA_V3_UPLOADS_ENABLED = "false"` in `wrangler.toml` and redeploy the API to stop
  R2 writes. Existing cards stay readable.
