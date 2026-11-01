# LuvNote R2 media V3

Status: opt-in, **not production deployed**. See [the readiness report](R2-PRODUCTION-READINESS-REPORT.md) for actual evidence and [operations](R2-OPERATIONS.md) for the unexecuted rollout plan.

## Architecture and compatibility

React retains the five existing editors and standalone viewers. JPEG bytes travel through the Worker to a private R2 bucket; D1 holds card JSON, upload sessions, media ownership, upload journals and publication receipts. Existing V1/V2 Base64 rows are neither migrated nor deleted. Existing seven-character IDs, theme hash prefixes, renderers, audio and effects remain intact. `GET /v2/cards/:id` materializes V3 IDs into card-scoped image URLs and leaves V2 JSON unchanged.

**Private R2 storage is not authenticated private content.** Anyone who obtains a published card link can read its JSON and images and can copy them. Existing card IDs have 35 bits of random entropy (32 symbols × seven characters), which is not a confidential-content capability. The decorative scratch/PIN interaction is client-side; the PIN does not authorize API reads. Rate limits reduce enumeration but do not turn this into authentication. Do not offer this flow as storage for confidential photos. Strong authenticated access requires a separate product/security change.

## API and safeguards

- `POST /v3/upload-sessions`: JSON `{turnstileToken}`. Real Siteverify must accept the action `luvnote_media_upload` and an allowed editor hostname. A production test key/test-mode configuration fails closed. Explicit staging-only dummy mode is restricted to the staging Worker hostname or loopback and the documented dummy token/secret. The live dummy response was observed to use `example.com` without an action; the staging allowlist handles this without relaxing production validation.
- The receipt contains a UUID, a random 256-bit bearer capability and a 30-minute expiry. D1 stores only its SHA-256 hash. React retains retries in memory; capabilities never enter URLs or persistent browser storage.
- `POST /v3/upload-sessions/:id/media?kind=photo|cover`: binary `image/jpeg`, bearer header and UUID `Idempotency-Key`. At most five photo slots and one cover slot are reserved atomically **before reading or decoding the body**. Invalid/interrupted uploads consume a slot; exhausted sessions and pending/failed duplicate keys are rejected before reading bytes. Ready replays compare a bounded SHA-256 of the original bytes without decoding again. Same key/content/kind returns the original ready receipt; conflicting content is denied. Pending requests return 409, and failed intents require a fresh session. Reservations for failed intents are deliberately not refunded, bounding physical objects even if compensation fails.
- Streams are capped at 1,500,000 bytes and 20 seconds of body reading. JSON is capped by actual UTF-8 bytes (4,096 for sessions; 50,000 for V3 publication; existing V1/V2 limits retained).
- The Worker validates JPEG markers and entropy through `jpeg-js`, permits at most 1024 × 1024 / 1,048,576 pixels and 20 scans, and caps decoder allocation at 32 MiB. APP1/APP13 are rejected at every marker offset; other application/comment metadata is removed without recompressing pixels. React Canvas normalizes orientation before upload. Decoder CPU still requires remote profiling before rollout. `jpeg-js` is a library, not a new service.
- D1 journals the object key before R2 put. A ready state is written only after put succeeds. Failure compensation retains a durable intent if R2 deletion fails. Publication requires ready owned assets and a successful R2 head.
- `POST /v3/cards`: bearer, theme, session ID, photo IDs and optional cover ID. Embedded Base64, duplicate/foreign assets, wrong kinds and missing objects are denied. A transactional D1 batch rechecks session/media readiness and creates a publication receipt only when the immediately preceding INSERT reports `changes()=1`. Dependent writes require that session/card/payload receipt, so a zero-row insert cannot inherit an existing colliding ID or consume a session. Identical retries return one persisted receipt; changed payloads after publication are rejected.
- `GET /v3/cards/:cardId/media/:assetId`: validates ownership plus both expiries before touching R2. Responds with JPEG, `nosniff`, CSP, no-referrer and private no-store. Missing/expired/unrelated media returns 404. The compatibility card API returns 410 for expired records until cleanup removes expired V3 records.

## Abuse and rollback controls

All writes, including legacy V1/V2 creation, require the native `WRITE_LIMITER` and Cloudflare client IP. Binding failure fails closed. Configured write bursts are approximately 60/minute per IP and aggregate per Cloudflare location; reads use `READ_LIMITER` at 300/minute/IP. These native limits are approximate and local to a location, not global spending caps.

D1 independently enforces exact fixed-window quotas: five V3 sessions/IP/hour and 100 sessions globally/day; legacy creates share ten requests/IP/hour and 100 globally/day. Invalid legacy bodies consume budget, limiting attack work. A V3 session reserves at most 9 MB, so new sessions reserve at most 900 MB per UTC day before metadata overhead; in-flight sessions from the previous day can add carryover uploads. This is not a same-day write/spending cap. Shared-IP fairness and deliberate quota exhaustion remain operational risks; review these conservative pilot limits before launch. They do not cap read traffic or the cost of receiving rejected requests. WAF and usage alerts are still required.

`MEDIA_V3_UPLOADS_ENABLED` defaults off; disabling it preserves V3 image reads. Frontend `VITE_R2_MEDIA_ENABLED` stays false until backend verification and Owner approval. The deployment workflow additionally requires a genuine public site key and `R2_PRODUCTION_CONFIG_VERIFIED=true`.

## Retention and recovery

`MEDIA_CLEANUP_ENABLED` must explicitly be true. Hourly cleanup processes up to 100 expired assets, with one-hour grace after orphan session expiry, and continues past individual delete failures while logging an aggregate failure. It deletes only expired V3 cards after their media is removed; V1/V2 rows are retained. Journals/publication references are removed in FK-safe order. A bounded cursor scans at most 1,000 `v3/` objects per run and removes at most 100 objects older than a day that have no D1 metadata, covering late puts after a process crash. Configure the operational lifecycle backstop described in the runbook.

**Keep cleanup disabled during D1 restore or metadata recovery.** An older D1 backup can temporarily lack valid R2 references; the orphan scanner must not run against it. Disabling writes and cleanup does not disable existing V3 reads. A frontend rollback never removes the R2 binding, media routes, schema or legacy data.

## Validation

`npm run test:api` includes unit tests, real SQLite with R2 doubles, local workerd D1/R2 tests and staging guards. Playwright tests exercise desktop Chromium, Pixel 7 emulation and iPhone-sized WebKit. Only the guarded staging smoke can prove deployed Cloudflare D1/R2 integration; local tests are not that evidence.
