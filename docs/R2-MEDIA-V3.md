# LuvNote R2 media V3 — staged rollout guide

Status: **experimental, opt-in**, deployed nowhere by this branch alone. Do **not** merge until the checklist is satisfied. The legacy /cards and /v2/cards APIs remain in place.

## Why

- Current React editor serializes Base64 JPEGs into the D1 \`theme_cards.data\` JSON.
- V3 stores JPEG binaries in a **private** R2 bucket and only opaque UUID references in D1.
- Existing cards, old card links, and all five standalone card viewers continue using \`GET /v2/cards/:id\`. The Worker transforms V3 photo UUIDs into protected media URLs at read time; it leaves pre-existing V2 JSON untouched.
- V3 is **guest upload** for the current self-service editor, not an Admin authentication system. Customers who know a published card link can view its media. Do not represent the card link as a secret vault.

## Infrastructure prerequisites (operator action)

1. Back up production D1, verify you can restore it, and record the current Worker deployment/version and bucket configuration.
2. Choose the exact Cloudflare account used by the existing GitHub Actions deployment. Ensure Cloudflare R2 billing is activated if prompted.
3. In that account, create **R2 Standard** bucket \`luvnote-media\` and keep **Public Bucket access disabled**. CLI example: \`npx wrangler r2 bucket create luvnote-media\`. Use a separate \`luvnote-media-staging\` bucket for staging; do not connect staging to production objects.
4. Create a **Managed Cloudflare Turnstile** widget for \`luvnote.fun\`, \`www.luvnote.fun\`, and the *actual deployed preview domain* if needed. Record its public site key. Its widget action must be \`luvnote_media_upload\`. Turnstile hostname validation is enforced server-side; list only hostnames that genuinely host the editor.
5. Add Worker secret \`TURNSTILE_SECRET_KEY\` using \`npx wrangler secret put TURNSTILE_SECRET_KEY\` with the actual Cloudflare account/Worker. Never commit this secret or put it in a \`VITE_*\` variable.
6. Review \`TURNSTILE_HOSTNAMES\` (optional Worker environment setting: comma-delimited allowed hosts). The default includes \`luvnote.fun,www.luvnote.fun,cmyanything.github.io\`; replace it for your own setup if appropriate.
7. Apply the **additive** \`worker/schema.sql\` D1 tables to staging first, then test. The repo's existing deploy workflow runs this schema against production before the Worker deploy, so the production bucket and secret must exist before merging.
8. Test R2 bindings, uploads, card reads, expiry, and cleanup on staging. Confirm D1 batch transaction semantics and R2 persistence with real test media.
9. In GitHub repository **Actions variables** set \`VITE_R2_MEDIA_ENABLED=true\` and \`VITE_TURNSTILE_SITE_KEY=<public site key>\` only once backend rollout is ready. The frontend workflow must forward these variables at **build** time. Until then keep the flag unset or false. Old V2 creation is the default and must remain functional while V3 is being prepared.
10. Keep a rollback playbook: set \`VITE_R2_MEDIA_ENABLED=false\` and redeploy frontend to resume V2 creates, **but never remove the V3 Worker routes or R2 bucket while V3 cards remain active**.

## Request flow

\`\`\`
React Editor -> Turnstile widget -> POST /v3/upload-sessions
  -> session ID + 64-character bearer capability (30-minute lifetime)
  -> POST /v3/upload-sessions/:id/media?kind=photo|cover (binary JPEG, ≤1.5 MB)
  -> POST /v3/cards (theme, sessionId, photos IDs, cover_id, card data)
  -> D1 atomically creates card + attaches media, consumes session
  -> POST /v3/cards returns same { id, expires } as V2
  -> viewer GET /v2/cards/:id (old route, returns compatible photo src URLs)
  -> GET /v3/cards/:cardId/media/:assetId (validates published card, asset membership, expiration)
\`\`\`

- All media URLs require the **unguessable published card link** as context. They are not admin-private. The R2 bucket is not public.
- Worker accepts only JPEG binary for new media and rejects EXIF-bearing files; the web UI re-encodes through Canvas. For stronger production assurances, consider validated server-side image decoding/re-encoding, content moderation, and data-handling review.
- Session creation is protected by server-side Turnstile verification; token is short-lived and single-use. A session allows up to 5 photos and 1 cover.
- Orphans and expired V3 assets are removed via hourly scheduled Worker cleanup. Legacy D1 Base64 cards are **not automatically migrated or deleted**.
- No new media access will work if R2 is removed or unavailable; do not tear down the binding on rollback.

## API and database

\`POST /v3/upload-sessions\`: JSON \`{turnstileToken}\`. Validates Siteverify action and hostname. Returns \`{sessionId, uploadToken, expires}\`.

\`POST /v3/upload-sessions/:id/media?kind=photo|cover\`: header \`Authorization: Bearer <uploadToken>\`, \`Content-Type: image/jpeg\`; body binary JPEG. Returns \`{id}\`.

\`POST /v3/cards\`: header \`Authorization: Bearer <uploadToken>\`; JSON \`{theme, sessionId, data:{...,photos:[{id,cap}],cover_id}}\`. Same output shape as V2.

\`GET /v2/cards/:id\`: for media V3 rows, returns \`data.photos:[{src,cap}]\` and optional \`data.cover\` as authenticated-by-link media URLs. Legacy row behavior is unchanged.

\`GET /v3/cards/:cardId/media/:assetId\`: image bytes with \`no-store\`; denies expired or unrelated assets.

Schema additions: \`media_upload_sessions\`, \`media_assets\`; legacy \`cards\` and \`theme_cards\` remain intact.

## Risks and pre-production verification

- Verify all 5 card themes with **real** photographs and cover images: pink-coquette, coquette-dream, little-memories, birthday-chat, velvet-gift.
- Exercise Turnstile failure/timeout, expired or reused session, wrong bearer, invalid JPEG, EXIF, oversized upload, duplicate photos, object missing from R2, and concurrent upload attempts.
- Confirm D1/R2 resources are never overwritten with another customer's files.
- Confirm a public URL cannot retrieve media from a different card and that expired cards return 410 from the existing V2 route.
- Confirm hourly cleanup doesn't delete live assets, and test a failed delete followed by a retry.
- Run \`npm run build\`, \`npm test\` (Playwright), and \`node --test tests/media-v3.test.mjs\` on CI.
- Add per-IP abuse and volume protections before general availability; **the legacy V2 POST endpoint remains public**, so D1 abuse is still possible until it is separately guarded.
- Monitor R2 object count/usage, D1 rows, image requests, Cloudflare cost alarms, and Worker errors.
- Never use real customer photos in staging tests. For a privacy/security review, ensure consent, removal workflow, and restore-time deletion expectations.
- Full Admin/LINE order authentication is out of scope for this migration. It should be built as its own user/role policy layer rather than using guest upload capabilities as admin credentials.

## Future phases

- Add authenticated creator accounts, Admin/LINE order workflow, R2 private preview media, revocation, and per-customer retention plans.
- Migrate legacy D1 Base64 records only after backups, expiry rules, idempotent retries, and parity checks are designed. This branch deliberately does not rewrite them.
