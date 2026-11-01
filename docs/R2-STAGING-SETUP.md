# Isolated R2 staging

The authorized local Wrangler OAuth session works. On 2026-11-01 the R2 bucket listing failed with Cloudflare code **10042: enable R2 through the Dashboard**. Billing was not activated. D1 `luvnote-staging` was created and its additive schema applied; no staging Worker was deployed and no R2 bucket was created. Production resources were not modified.

## Resume after the account Owner activates R2

Use the existing authorized Cloudflare account. Never paste API tokens or real Turnstile secrets into code, a report or chat. Confirm the account and read the readiness report before continuing.

```sh
npx wrangler whoami
npx wrangler r2 bucket list
npx wrangler d1 list --json
```

Reuse D1 `luvnote-staging`, UUID `3967493c-55db-4ab8-bb2c-9ed3c157a543`. It differs from production D1 `luvnote`. Do not create a duplicate database. Create or verify only bucket `luvnote-media-staging` with public access disabled. The Worker name must be `luvnote-api-staging`, with no custom routes and no production bindings.

```sh
npx wrangler r2 bucket create luvnote-media-staging
```

Copy `wrangler.staging.example.toml` to ignored `wrangler.staging.toml`, replace the UUID placeholder with the staging UUID and inspect the entire file. Check identity before any remote command:

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

The script rejects production/deceptive URLs, routes and mismatched staging D1 identity before writing. For all five themes it creates only synthetic JPEGs, verifies D1 metadata with Wrangler and downloads the actual R2 object, then publishes, replays the receipt, reads through V2, decodes image pixels, denies a cross-card read and denies upload after consumption. It prints synthetic card IDs and outcomes, never bearer tokens or secrets. It was **not run against a deployed staging Worker** while R2 was disabled.

Remote expiry, deletion/retry, concurrency and fault-injection testing remain required. Scope all injected faults to synthetic fixtures in the isolated staging resources; never install broad failure triggers on production. Inspect each D1 asset and object key, record UTC timestamps, and verify a scheduled cleanup run and recovery from a failed delete. Keep a non-expired synthetic card to verify cleanup preserves live assets. Do not use customer data.

## Frontend and device acceptance

Use a local build pointed to the staging Worker with `VITE_API_URL`, `VITE_R2_MEDIA_ENABLED=true` and the public dummy site key. Explicit localhost origins are allowed only by staging. Do not publish a dummy key or enable production frontend variables.

Check multiple uploads, removal, replacement cover, preview, publication, published link/reload, LINE share destination, lost upload/publication receipts, slow connections, quality and EXIF orientation in every theme. The automated local HTTP suite covers these core paths using synthetic images and emulated browsers. Physical iPhone/Android, installed LINE handoff, real cellular conditions and deployed R2 behavior remain manual acceptance items.

Before production, complete [operations](R2-OPERATIONS.md) and obtain explicit Owner approval. PR #2 remains draft; merging does not authorize production migration/deployment.
