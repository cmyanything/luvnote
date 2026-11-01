# Isolated R2 staging

The authorized local Wrangler OAuth session works. On 2026-11-01 R2 initially returned **10042**, then became available externally at approximately 04:30 UTC. This task did not activate billing. Isolated D1 `luvnote-staging`, private bucket `luvnote-media-staging` and Worker `luvnote-api-staging` are now deployed and tested. Production resources were not modified. Current endpoint: `https://luvnote-api-staging.c-myanything.workers.dev`.

**Current parked state (2026-11-01, source e7028dd):** active version **b0f3a112-e7a9-4250-b7bb-027e83dca378**, strict legacy validator, V3 uploads disabled, cleanup enabled, test mode false, hostname localhost, real staging secret retained. No Images binding. Existing cards/images remain readable. Native Images.info() acceptance is **NO-GO**: 42/42 benchmark uploads avoided 1102, but 3 malformed entropy fixtures were actually stored in R2. Keep the current plan and the CPU blocker. Do not enable the native validator for customer uploads.

Latest local counts: **79 backend + 36 legacy frontend + 18 V3 frontend**, plus **4 workerd + 18 V3 frontend** compatibility repetitions with local low-fidelity Images. Real native security matrix: **22/25 PASS, 3 FAIL**. Paired benchmark: native **42/42**, legacy **13/42** (29 CPU terminations). Latest real browser read-only run: **15 PASS**. See the [readiness report](R2-PRODUCTION-READINESS-REPORT.md) and [sanitized evidence](evidence/r2-native-acceptance-2026-11-01.json); automated/local Images results are not native security certification.

The template now defaults to writes off and strict legacy validation. Images.info() is a metadata API, not an accepted replacement for strict decoding. For operator-only diagnostic reproduction, explicitly set MEDIA_JPEG_VALIDATOR=images and configure `[images] binding="IMAGES"` on the verified isolated Worker, record the exact source/version, and close the write window afterward. `node scripts/accept-native-jpeg-staging.mjs benchmark` and `matrix` require ALLOW_STAGING_WRITE=1, STAGING_API_URL, STAGING_VALIDATOR, STAGING_SOURCE_COMMIT and STAGING_VERSION. The matrix exits nonzero on the known security failures. No paid transformations are invoked.

After a version rollback, inspect the active deployment's version resources/bindings, not only the latest-upload `/settings` response; the latter retained the newer configuration in this drill. Rollback to **2182edbd-aff4-4bfa-b90f-204cace586a6** preserved reads and denied writes; the guarded source was then parked in the final version above. Do not use the rejected write-enabled native version as a rollback target.

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

The existing **LuvNote staging acceptance** Managed widget is separate from production, public site key `0x4AAAAAAFu3P7KP1Kckzd3a`, limited to localhost/127.0.0.1. Its secret is already installed securely; do not print it or overwrite it with a dummy secret for real acceptance. Keep `TURNSTILE_TEST_MODE=false` and server allowlist localhost. Automated real-widget attempts did not issue tokens; action/hostname/replay/expiry acceptance needs an interactive browser. Dummy keys remain useful only for explicitly isolated automation, as described in [Cloudflare testing documentation](https://developers.cloudflare.com/turnstile/troubleshooting/testing/); such results are not real-widget proof.

```sh
npx wrangler deploy --config wrangler.staging.toml
```

Verify the resulting hostname is exactly `luvnote-api-staging.<account-subdomain>.workers.dev`, inspect deployment bindings, and confirm the R2 bucket has neither r2.dev public access nor a public custom domain. Do not add production routes or DNS.

## Real synthetic integration

The smoke command below is the historical public-dummy-key flow. Its hardcoded test token will be rejected by the current non-dummy configuration. Do not replace the real secret or relax validation merely to rerun it; keep any future dummy automation window explicitly isolated and do real-widget acceptance separately. Read-only browser acceptance works with the parked configuration.

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

During an approved staging write window, run `node scripts/test-r2-staging.mjs` with the same variables. It verifies the preview sees actual staging D1 before `/__scheduled`, and seeds only synthetic operator-owned sessions without changing guest protections. Scoped temporary D1 triggers are removed in finally blocks. The earlier result was 36 passed/zero failed/one unverified; the **latest source result is 35 passed/one maximum-JPEG CPU failure/one interrupted-request unverified**, out of 37. Missing/expired assets, concurrency, actual D1 rollback and R2-delete/D1-failure cleanup retry passed. Provider outages are not certified. Natural cron was separately observed at 05:00:32 UTC; lifecycle remains unconfigured.

Smoke and browser cards expire normally after 15 days. Failed/orphan test intents follow the existing grace/cleanup rules. Do not delete customer or legacy data. No production fault triggers or fixtures are permitted.

## Frontend and device acceptance

Use a local build pointed to the staging Worker with `VITE_API_URL`, `VITE_R2_MEDIA_ENABLED=true` and the public dummy site key. Explicit localhost origins are allowed only by staging. Do not publish a dummy key or enable production frontend variables.

Run `node scripts/accept-r2-staging.mjs` against the local staging build. It reads the five smoke fixtures through real staging in desktop Chromium, Pixel 7 Chromium and iPhone 13 WebKit emulation, edits synthetic images and waits for the actual public test widget. Set `STAGING_BROWSER_PUBLISH=1` to additionally publish three synthetic cards, verify LINE hrefs and normalize EXIF orientation through actual R2. It rewrites only preserved viewers' hardcoded production API origin to staging; responses and images are real network fetches, not mocks. No LINE messages are sent. Keep the browser on loopback port 4173.

Historical run at 05:00 UTC: **22 passed**, before PR #4, using the public dummy widget. Latest-source read-only run: set `STAGING_BROWSER_READ_ONLY=1`, `STAGING_BROWSER_PUBLISH=0`, then run `node scripts/accept-r2-staging.mjs`: **15 passed**, all five themes/three profiles using actual staging R2. Do not count this as interactive widget or physical-device acceptance.

`node scripts/measure-r2-staging.mjs` creates a bounded synthetic workload; capture CPU/wall/memory separately from actual Cloudflare Analytics. Latest workload was 9/13 successful uploads, with four runtime CPU failures. Client wall times are not CPU measurements. No plan/CPU limit was changed.

`node scripts/test-r2-interruption-staging.mjs` uses an incomplete HTTPS body. Latest result remains NOT_VERIFIED because the request did not reach the Worker before cancellation. `node scripts/test-r2-orphan-staging.mjs` proved fresh-orphan grace with a real object; its existing fixture can be checked for aged deletion after **2026-11-02 06:18:29.566 UTC**. Do not create another fixture unnecessarily or shorten grace. Lifecycle remains unconfigured.

An actual staging rollback to the V3-read-capable 96e4c13f version preserved all five themes' legacy and V3 reads and denied new sessions. Rollback restored that version's older secret; latest-source deployment and the genuine staging secret were then restored securely. Always verify secrets/config as well as code after rollback. Do not use a pre-V3 reader.

Check multiple uploads, removal, replacement cover, preview, publication, published link/reload, LINE share destination, lost upload/publication receipts, slow connections, quality and EXIF orientation in every theme. Physical iPhone/Android, installed LINE handoff, real cellular conditions, HEIC and subjective quality remain manual acceptance items. A real non-dummy staging widget/action/hostname/replay test remains required even when the public dummy widget passes.

Before production, complete [operations](R2-OPERATIONS.md) and obtain explicit Owner approval. PR #2 remains draft; merging does not authorize production migration/deployment.
