# LuvNote R2 — isolated staging setup (no production impact)

This checklist requires access to the **Cloudflare account** that owns the existing Worker and D1 database. The GitHub connector cannot create a Cloudflare bucket or install a Worker secret. Do not paste a Cloudflare API token into GitHub code or a public chat.

## 1. Provision isolated staging resources

On a trusted machine with Node.js and Wrangler:

\`\`\`sh
npx wrangler login
npx wrangler r2 bucket create luvnote-media-staging
npx wrangler d1 create luvnote-staging
cp wrangler.staging.example.toml wrangler.staging.toml
\`\`\`

Record the database UUID returned by \`wrangler d1 create\` and replace \`REPLACE_WITH_STAGING_D1_UUID\` in the ignored local file \`wrangler.staging.toml\`. Confirm that the UUID is **not** the production D1 UUID.

The staging configuration has a separate Worker name \`luvnote-api-staging\`, an independent R2 bucket, an independent D1 database, **no custom domain route**, and no production bindings.

## 2. Configure staging schema and Turnstile test secret

\`\`\`sh
npx wrangler d1 execute luvnote-staging --remote --file worker/schema.sql --config wrangler.staging.toml
npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.staging.toml
\`\`\`

For this isolated staging Worker **only**, enter Cloudflare's documented *test* secret key (do not use a production secret). \`TURNSTILE_TEST_MODE\` is set only in \`wrangler.staging.example.toml\` and requires this exact test secret and \`ENVIRONMENT=staging\`. Never enable test mode on \`api.luvnote.fun\`.

## 3. Deploy staging only

\`\`\`sh
npx wrangler deploy --config wrangler.staging.toml
\`\`\`

This should produce a \`https://luvnote-api-staging.<account>.workers.dev\` URL. Confirm it is NOT \`api.luvnote.fun\`.

## 4. Real integration smoke test (synthetic image, no customer data)

\`\`\`sh
STAGING_API_URL="https://luvnote-api-staging.<account>.workers.dev" ALLOW_STAGING_WRITE=1 node scripts/smoke-r2-staging.mjs
\`\`\`

The script is guarded to reject non-staging Workers. It creates one synthetic test card, checks direct R2 upload, D1 card metadata, legacy viewer response, real image download, denial of cross-card media requests, and consumed-session rejection. It does not write to production resources.

## 5. Test the new React Editor against staging

Use the public Cloudflare **test site key** only in the local staging browser. From a shell:

\`\`\`sh
VITE_API_URL="https://luvnote-api-staging.<account>.workers.dev" \
VITE_R2_MEDIA_ENABLED=true \
VITE_TURNSTILE_SITE_KEY="1x00000000000000000000AA" npm run dev
\`\`\`

Open each editor from \`http://127.0.0.1:5173/themes/<theme>/\` and validate all 5 themes. Staging CORS accepts explicit localhost origins. Do not use real customer images or payments.

## 6. Production preflight — DO NOT SKIP

1. Back up D1 and test the restore procedure. Record the last-working Worker deployment and GitHub Pages release.
2. Separately create private \`luvnote-media\` bucket and real Turnstile widget for \`luvnote.fun\`. Set \`TURNSTILE_SECRET_KEY\` on **luvnote-api** Worker, not the staging Worker.
3. Confirm production R2 bucket exists before merging PR #2: the existing \`.github/workflows/deploy-api.yml\` automatically deploys on main changes.
4. Review V3 abuse protections and the still-public legacy V2 POST creation endpoint. Add Cloudflare rate-limiting and appropriate controls before public launch.
5. When staging + production preflight pass, merge, test the Worker production health, then enable frontend feature flag and real Turnstile site key in **GitHub Actions repository variables**. Observe actual failed/successful upload and errors.
6. Keep V2 readable indefinitely until old cards naturally expire; never delete production D1 Base64 rows during this rollout.
7. Roll back by disabling frontend V3 uploads, but retain deployed V3 media read route and R2 bucket for previously published V3 cards. Reverting the Worker alone would break their images.

## Operational limits

- Default V3 uploads: maximum 5 photos + 1 cover, each JPEG up to 1.5 MB, valid session 30 minutes; published cards expire after 15 days.
- Worker hourly cleanup deletes expired R2 objects and their D1 media metadata; it must be monitored for failures.
- Published card media is **link accessible**, not password-protected. Images are stored in a private bucket but available to the holder of the published card URL.
- Uploading client-side compressed photos does **not** give fully trusted server-side image decoding. More content validation, rate limiting, privacy notice, and abuse monitoring are still required for open public use.
