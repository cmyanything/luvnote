# Isolated R2 staging

The authorized local Wrangler OAuth session works. On 2026-11-01 R2 initially returned **10042**, then became available externally at approximately 04:30 UTC. This task did not activate billing. Isolated D1 `luvnote-staging`, private bucket `luvnote-media-staging` and Worker `luvnote-api-staging` are now deployed and tested. Production resources were not modified. Current endpoint: `https://luvnote-api-staging.c-myanything.workers.dev`.

**Current parked state:** V3 uploads are disabled after acceptance, cleanup remains enabled and existing cards/images remain readable. Final version: `96e4c13f-6363-4942-9002-ad80e0e74c70`. To rerun write acceptance, review and enable only the ignored staging config's `MEDIA_V3_UPLOADS_ENABLED`, deploy only with that config, then disable it again after the run. Never enable production flags as a substitute.

## Verify and reuse the existing isolated resources

Use the existing authorized Cloudflare account. Never paste API tokens or real Turnstile secrets into code, a report or chat. Confirm the account and read the readiness report before continuing.

```sh
npx wrangler whoami
npx wrangler r2 bucket list
npx wrangler d1 list --json
```

Reuse D1 `luvnote-staging`, UUID `3967493c-55db-4ab8-bb2c-9ed3c157a543`. It differs from production D1 `luvnote`. Do not create a duplicate database. Create or verify only bucket `luvnote-media-staging` with public access disabled. The Worker name must be `luvnote-api-staging`, with no custom routes and no production bindings.

The staging bucket already exists; do not recreate it. Confirm privacy with `npx wrangler r2 bucket dev-url get luvnote-media-staging --config wrangler.staging.toml` and `npx wrangler r2 bucket domain list luvnote-media-staging --config wrangler.staging.toml`. Recorded results were public access disabled and no custom domains.

Reuse the existing ignored `wrangler.staging.toml`. Only if absent, copy `wrangler.staging.example.toml`, replace its UUID placeholder with the staging UUID and inspect the entire file. Check identity before any remote command:

```sh
node --input-type=module -e "import {verifyStagingResources} from './scripts/staging-safety.mjs'; console.log(verifyStagingResources())"
npx wrangler d1 execute luvnote-staging --remote --file worker/schema.sql --config wrangler.staging.toml
npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.staging.toml
```

For this staging Worker only, use Cloudflare's public dummy test secret from its [testing documentation](https://developers.cloudflare.com/turnstile/troubleshooting/testing/). Never substitute a production secret. Keep test mode and host restrictions in the staging file. Real production token replay, hostname and widget behavior still require later controlled acceptance with a separate real staging widget.

```sh
npx wrangler deploy --config wrangler.staging.toml
```

Verify the resulting hostname is exactly `luvnote-api-staging.<account-subdomain>.workers.dev`, inspect deployment bindings, and confirm the R2 bucket has neither r2.dev public access nor a public custom domain. Do not add production routes or DNS.

## Real synthetic integration

In PowerShell, after deployment:

```powershell
$env:STAGING_API_URL='https://luvnote-api-staging.<account-subdomain>.workers.dev'
$env:ALLOW_STAGING_WRITE='1'
node scripts/smoke-r2-staging.mjs
```

The script rejects production/deceptive URLs, routes and mismatched staging D1 identity before writing. For all five themes it creates only synthetic JPEGs, verifies D1 metadata with Wrangler and downloads the actual R2 object, then publishes, replays the receipt, reads through V2, decodes image pixels, denies a cross-card read and denies upload after consumption. It prints synthetic card IDs and outcomes, never bearer tokens or secrets. It **passed all five themes against deployed staging**. It consumes the allowed five guest sessions/IP/hour; allow the UTC quota window to advance before further guest browser publication. Do not disable quotas for testing.

For real fault tests, start the remote scheduled preview in another terminal:

```sh
npx wrangler dev --remote --test-scheduled --port 8788 --config wrangler.staging.toml
```

With the same staging environment variables, run `node scripts/test-r2-staging.mjs`. It verifies the preview sees the same actual staging card before invoking `/__scheduled`. It seeds only synthetic operator-owned sessions, preserving guest security and quota settings; failures are injected by narrowly scoped temporary D1 triggers removed in finally blocks. Its recorded result was **36 passed, zero failed, one unverified** out of 37 checks. A maximum noisy 1024-square JPEG uploaded successfully. Missing/expired assets, concurrent slots/publication, actual D1 rollback and R2-delete/D1-failure cleanup retry passed; an incomplete aborted request was buffered before reaching the Worker, so that case remains unverified. Provider outages are not certified by this test. Separately, `wrangler tail --config wrangler.staging.toml --format pretty` observed the natural deployed cron at 05:00:32 UTC, candidates 0/failures 0. Lifecycle remains unconfigured.

Smoke and browser cards expire normally after 15 days. Failed/orphan test intents follow the existing grace/cleanup rules. Do not delete customer or legacy data. No production fault triggers or fixtures are permitted.

## Frontend and device acceptance

Use a local build pointed to the staging Worker with `VITE_API_URL`, `VITE_R2_MEDIA_ENABLED=true` and the public dummy site key. Explicit localhost origins are allowed only by staging. Do not publish a dummy key or enable production frontend variables.

Run `node scripts/accept-r2-staging.mjs` against the local staging build. It reads the five smoke fixtures through real staging in desktop Chromium, Pixel 7 Chromium and iPhone 13 WebKit emulation, edits synthetic images and waits for the actual public test widget. Set `STAGING_BROWSER_PUBLISH=1` to additionally publish three synthetic cards, verify LINE hrefs and normalize EXIF orientation through actual R2. It rewrites only preserved viewers' hardcoded production API origin to staging; responses and images are real network fetches, not mocks. No LINE messages are sent. Keep the browser on loopback port 4173.

Recorded run at 05:00 UTC: **22 passed** (21 browser checks plus a remote preview kill-switch check). For the latter, start the remote preview command above with `--var MEDIA_V3_UPLOADS_ENABLED:false --var MEDIA_CLEANUP_ENABLED:false` and set `STAGING_READ_ONLY_PREVIEW=1`. Real browser publications normalized EXIF orientation to 24×32 and reloaded successfully on all three profiles.

Check multiple uploads, removal, replacement cover, preview, publication, published link/reload, LINE share destination, lost upload/publication receipts, slow connections, quality and EXIF orientation in every theme. Physical iPhone/Android, installed LINE handoff, real cellular conditions, HEIC and subjective quality remain manual acceptance items. A real non-dummy staging widget/action/hostname/replay test remains required even when the public dummy widget passes.

Before production, complete [operations](R2-OPERATIONS.md) and obtain explicit Owner approval. PR #2 remains draft; merging does not authorize production migration/deployment.
