# R2 Production Readiness Report

Date: **2026-11-01**. Evidence collected on this UTC date, on Windows with Node 22.23.1 / npm 10.9.8, Wrangler 4.156.0, Playwright 1.64.1 and pinned Miniflare 5.20261023.3-beta. This is a continuation of [draft PR #2](https://github.com/cmyanything/luvnote/pull/2), not a replacement implementation.

## Final decision

```text
R2_CODE_READY = PASS
R2_STAGING_VERIFIED = NOT_VERIFIED
R2_SECURITY_REVIEW = PASS
R2_PRODUCTION_READY = NO
```

**PASS is limited to the reviewed source and locally verified guest/link-accessible design.** It is not a claim of authenticated photo privacy, successful remote R2 integration, production configuration verification or operational acceptance. No unresolved critical/high code defect identified in this review remains without a fix; deployment gates and material risks below remain open. Do not enable production V3 uploads on this evidence alone.

The blocking infrastructure result is Cloudflare **10042: “Please enable R2 through the Cloudflare Dashboard.”** Existing Wrangler OAuth authentication worked. R2 billing was not activated, no R2 bucket was created, and no staging Worker was deployed by this task. Independent code/tests/documentation and isolated D1 setup continued.

## Audit and scope confirmation

- Initial working tree was clean on `codex/anniversary-journey`, commit `43fe70e93ae0afbb0d2173ec2528d08a54fe0a3e`. That committed work remains on its branch; no anniversary code was copied into this change.
- Fetched origin before editing and again before committing. Checked out/tracked the existing `feat/r2-private-media-v3` branch. Its remote head matched the supplied `408b7fd0d44f332cf1e2ca5d87e6319dc9a83522`; PR #2 remained open/draft and based on main `64beb26145911b790f8846f17903d1cf16911dad`.
- Reviewed the complete 17-file PR change set (957 additions, 4 deletions), required R2/staging documents, Worker/index/schema, React media/API/editor, both Wrangler configurations, frontend/Worker tests and deployment workflows. No applicable AGENTS.md was found in the repository/ancestor paths inspected.
- Existing nine Worker tests passed before changes; new failure reproductions still failed. Prior CI was not accepted as proof of correctness.
- Chose to retain Workers/D1/R2 and the compatibility materializer. Small upload/publication journals and shared guards address consistency/abuse without introducing creator accounts, replacing renderers, or adding another hosted service.

## Architecture

React 19/TypeScript/Vite keeps all five theme editors. The Worker verifies Turnstile, creates a 30-minute bearer upload session, validates bounded JPEG binaries, writes private R2 objects and records D1 ownership. D1 persists only the capability hash, upload intent/state, object metadata, publication receipts, quotas and cleanup cursor. An atomic batch publishes one card and its references. Identical upload/publication retries are idempotent; changed requests cannot reuse a consumed publication.

`GET /v2/cards/:id` returns legacy Base64 JSON unchanged and materializes V3 references into Worker image URLs. The image route requires a matching, unexpired published card/asset. V1 reads remain available without R2. No legacy images or customer data were migrated, rewritten or deleted. Frontend V3 remains opt-in; production backend writes and cleanup both default false. Turning off V3 writes preserves V3 image reads.

**Access policy:** a private bucket is only a storage boundary. A published card is link accessible, with seven random base-32 characters (35 bits); this is insufficient as a confidential-content capability. Anyone with the link can fetch JSON/images and copy them. The client-side PIN/scratch interaction does not authorize the API and does not hide a PIN/secret from an API reader. Rate limits mitigate enumeration but are not authentication. The Owner must accept this product policy and avoid confidential-content claims, or commission a separate authenticated access design before launch.

## Security findings and remediation

| Severity at audit | Finding / evidence | Resolution and verification |
|---|---|---|
| High | JPEG-looking garbage returned 201 and created an object; only magic/end bytes and a partial EXIF scan were checked. | `worker/jpeg.js:5` parses all markers/scans, rejects EXIF/XMP/IPTC segments regardless of position, strips other metadata, and decodes with bounded pixels/memory. Forged/truncated files and metadata past 128 KiB/after scan are rejected; decoded synthetic pixels are retained. |
| High | After R2 put, injected D1 failure plus failed compensating delete left an object with zero metadata rows. | `worker/media-v3.js:77` atomically reserves a slot and journals intent before put. Completion must change one row. Failure keeps a durable key; cleanup retries and bounded R2 reconciliation covers late crash writes. Real SQLite/R2-double fault tests and local runtime cleanup pass. Remote fault injection remains unverified. |
| High | Public guest/legacy writes had no server-enforced aggregate abuse budget. | `worker/guards.js:45` and `worker/index.js` add mandatory native write protection plus exact D1 quotas for V3 sessions and V1/V2 creation; configured read throttling limits enumeration. Missing write protection fails closed. Binding/negative/quota tests pass; remote WAF and billing alerts remain gates. |
| Medium | An expired/no-op publication could consume a session; transaction success did not imply each intended row changed. | `worker/media-v3.js:125` rechecks ownership/readiness and gates dependent writes on the newly inserted card. Persisted publication receipts make concurrent retries return one card. SQLite and actual local D1 batch rollback/concurrent publication tests pass. |
| Medium | Lost upload/publication receipts could force duplicate work or a new card. | UUID idempotency keys plus content/kind checks and in-memory React retry state (`src/lib/media-v3.ts`) preserve identical attempts. Native HTTP tests lose each receipt after commit and recover with one object per slot and one card. Explicit server upload failures restart a session on the next click. |
| Medium | JSON was buffered before limits, and character counts differed from bytes. A newly added timeout initially accepted a prefix when cancellation resolved the reader first. | `worker/guards.js:2` caps actual streamed bytes and rejects timeout before canceling the reader. UTF-8, null/malformed input, interrupted streams and deterministic stalled-body regression pass. |
| Medium | Localhost CORS was global; test-mode configuration could be copied to production. | Only staging permits localhost. Foreign-origin writes are denied, preflight includes idempotency headers, and production test keys/test mode fail closed. Staging dummy mode checks environment, Worker hostname, exact public dummy secret/token and known test response shape. Negative tests pass. |
| Medium | Cleanup could stop at the first failure, miss orphan writes, or race a D1 restore. | `worker/media-v3.js:241` retries individual deletes, keeps metadata on failure, uses FK-safe cleanup, scans a bounded cursor and requires explicit cleanup enablement. Recovery procedure freezes cleanup/lifecycle until D1/R2 reconciliation. Local scheduled-handler and retry tests pass. |
| Medium | Main pushes automatically migrated and deployed production before readiness/Owner gates. | `.github/workflows/deploy-api.yml` is manual/main/Owner/exact-SHA gated, requires backup reference, verified resource variables and a protected production environment. Migration requires a separate boolean. Actual GitHub environment review rules are unverified, not silently configured. |
| Low | WebKit did not focus the clicked preview trigger, so modal close restored a different field. | `src/Editor.tsx` explicitly focuses the trigger before opening. Existing preview/Escape acceptance now passes on all three browser projects. No design changes. |

Additional reviewed controls: bearer entropy/hash-only storage and expiry; media/session ownership; concurrent slot reservation; duplicate IDs/kind mismatch; private R2 access through the Worker; missing/live/expired assets; no-store/nosniff/CSP response policy; bounded cleanup, quotas and resource consumption. No third-party hosted service was added. `jpeg-js` is a pinned decoding library; Wrangler, Miniflare and esbuild are pinned development tooling. `npm audit --audit-level=high` reported zero vulnerabilities.

## Executed tests and exact results

PowerShell sets each build flag in the command's process. No test wrote production data. The local HTTP acceptance server receives actual browser Blob bytes and forwards them to local workerd bindings; its Turnstile service response is doubled. That is local integration, not deployed Cloudflare R2 evidence.

| Command / environment | Actual result |
|---|---|
| `node --test tests/media-v3.test.mjs` before fixes | 9 passed; baseline only. |
| `node --test tests/media-v3.integration.test.mjs` initial reproductions | 4 failed as expected; forged JPEG accepted, orphan metadata absent, null JSON wrong rejection, expired publication consumed session. Fixed and superseded by full runs. |
| `npm ci` | Final run passed, 96 packages added, zero audit vulnerabilities. Initial EPERM was a Windows lock held by this task's preview process; stopped that process and reran successfully. |
| `npm run typecheck` | Passed. |
| `$env:VITE_R2_MEDIA_ENABLED='false'; npm run build` | Passed. Final local artifact rebuilt with V3 false and empty site key. |
| `$env:VITE_R2_MEDIA_ENABLED='false'; npm test` | **33 passed, 18 skipped**, across desktop Chromium, Pixel 7 Chromium emulation and iPhone 13 WebKit emulation. The 18 V3 cases were intentionally disabled in this build and executed separately below. |
| `$env:VITE_R2_MEDIA_ENABLED='true'; $env:VITE_TURNSTILE_SITE_KEY='1x00000000000000000000AA'; npm run build` | Passed; test build only, never deployed. |
| `$env:VITE_R2_MEDIA_ENABLED='true'; npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts` | **18 passed**, zero skips in this run. Three mock-API cases and fifteen local HTTP/workerd cases cover all five themes on all three browser projects. |
| `npm run test:api` | **47 passed**, zero failures/skips: 9 original unit cases, 32 SQLite/security/failure cases, 4 local workerd cases and 2 staging-guard cases. |
| `node --check worker/index.js`, `worker/media-v3.js`, `worker/guards.js`, `worker/jpeg.js`, `scripts/smoke-r2-staging.mjs`, `scripts/staging-safety.mjs` | All passed (each path supplied as a separate `node --check` invocation). |
| `actionlint.exe -shellcheck= -pyflakes= .github/workflows/frontend.yml .github/workflows/deploy-api.yml` (v1.7.12) | Both workflows passed YAML/expression checks. ShellCheck/Pyflakes integrations were not available/enabled. No production workflow was run. |
| `npx wrangler deploy --dry-run --outdir .wrangler/dry-run --config wrangler.staging.toml` | Bundled successfully (~100.73 KiB, gzip ~22.46 KiB) and listed isolated staging bindings. Dry-run does not prove those remote resources work. |
| `node scripts/verify-turnstile-test.mjs` | Passed: local workerd created a local session using **real Cloudflare Siteverify with public dummy keys**. R2/D1 remained local. Live dummy response differed from docs (example.com, no action); staging handling was corrected and retested. This does not verify production widget credentials or real-token replay. |
| `npm audit --audit-level=high` | Passed, zero vulnerabilities. |
| `git diff --check` / staged equivalent | Passed. |

**Final distinct automated cases: 98 passed (47 API + 33 legacy/frontend + 18 V3).** The initial expected failures and intermediate tooling/browser failures are not counted as passes. Repeated successful runs are not added to the total. GitHub CI status is independently visible on PR #2; these counts refer to actual local command output, not an inferred CI result.

The maximum-resolution local workerd test accepted a 1024×1024 noisy synthetic JPEG of **1,028,836 bytes**, with **262 ms local wall time** in the recorded run. Wall time is neither Cloudflare CPU usage nor proof that the production account/plan can run the decoder. Staging/template tests use production's existing compatibility date `2025-01-01`; an unsupported future staging date was removed without changing the production date.

## Integration / frontend coverage and limits

| Requested scenario | Verified evidence | Real staging |
|---|---|---|
| Session and Turnstile | Local policy/negative tests; real dummy Siteverify network call | Worker/widget end-to-end unverified |
| JPEG upload, object existence, D1 metadata | Local workerd D1/R2 head/list; separate SQLite fault tests | R2 blocked; remote D1 schema only |
| Publish and compatibility reads / image URLs | All five themes, actual local HTTP and decoded images | Unverified |
| Missing/expired/unrelated assets and sessions | SQLite expiry/ownership negatives, Worker response tests | Unverified |
| Session reuse, duplicates, concurrent requests | Exact slot limits, idempotency conflicts, one publication receipt, transaction rollback | Unverified remotely |
| Interrupted upload / failed D1 after R2 / compensation failure | Interrupted stream + lost HTTP receipts; injected D1/R2 doubles; local D1 trigger rollback | Real fault injection unverified |
| Cleanup and retry | Failed-delete retry, live/legacy preservation, late-orphan scan and scheduled local workerd handler | Remote cron/lifecycle unverified |
| Five themes and legacy Base64 cards | 33 legacy and 18 V3 browser cases; V1/V2 Worker reads; unchanged viewer artifacts | Production customer links not accessed |
| Multiple images/removal/cover replacement/preview | React browser tests on all three projects | Real devices unverified |
| Publish/open/share URL/reload | Existing hash formats and LINE href verified; no LINE message sent | Installed LINE handoff unverified |
| Upload errors/retry/latency/orientation/quality | 503 retry plus lost upload/publication receipts; 150 ms artificial upload latency; EXIF orientation 6 normalized to 24×32; decoded storage pixels compared | Real cellular/slow bandwidth, HEIC and perceptual quality unverified |

The five original card HTML files, landing/router pages, theme data, CSS, sounds and effects were not edited. Build compatibility tests compare preserved artifacts and open each old theme URL. Actual-device audio/microphone/effect/perceptual acceptance was not claimed from headless tests.

## Cloudflare resources and actions

| Item | Evidence / actual action |
|---|---|
| Existing account authentication | `npx wrangler whoami` succeeded with the existing local OAuth session in account `cee7f572be6cf7e3de1e4526f6d250d2`. Tokens were not printed/read into this report. |
| Production D1 isolation | Metadata listing identified `luvnote` UUID `b48f8655-c980-47f3-bd72-a9549d813b09`. No production queries, migrations, card reads/writes or exports were performed. |
| Staging D1 | Created `luvnote-staging` UUID **3967493c-55db-4ab8-bb2c-9ed3c157a543**, APAC. Applied schema, then reapplied after the cleanup-state addition: final import **13 queries**, success, **8 application tables**, 110,592-byte DB. A separate read-only sqlite_master query confirmed every table. No customer records were added. |
| Staging config | Ignored `wrangler.staging.toml` points to that independent UUID and `luvnote-media-staging`; no routes. `verifyStagingResources()` matched its UUID to the remote staging name. It is not committed because local bindings/secrets should not leak into source. |
| R2 | `npx wrangler r2 bucket list` exited 1 with **10042**. Bucket existence, public-access settings, remote objects and permissions could not be verified. Billing activation was not attempted. |
| Staging Worker | Name prepared as `luvnote-api-staging`; no remote deploy performed. Existing remote Worker state is not certified by a bundle dry-run. |
| Turnstile | Real Siteverify dummy-key call succeeded; no staging/production secret was installed and no real widget was provisioned. |
| Production | No deployment, migration, resource provisioning, deletion, DNS/repository-variable change or PR merge. The checked-in production configuration changes are preparation only. |

## Remaining risks and unverified gates

1. **Blocking:** Owner activation of R2, isolated bucket/Worker provisioning, private access verification and real staging integration, including all adverse/cleanup scenarios. `scripts/smoke-r2-staging.mjs` is prepared to verify direct remote object bytes and metadata for all five themes; it was not executed against a deployed Worker.
2. Remote decoder CPU/memory and Worker plan compatibility, actual native rate limits, WAF coverage of custom-domain and workers.dev ingress, alert delivery and cost thresholds are unverified. Native limits are approximate per location, not global cost ceilings.
3. Guest session caps bound new V3 payload reservations to 900 MB/day, but reads and rejected requests still cost resources. Public legacy writes are capped at 100/day, potentially approximately 190 MB/day of D1 JSON; legacy data is intentionally not auto-deleted. An anonymous attacker can exhaust a public quota. Review capacity, budget and a bounded pilot before launch; this is not unlimited safe public ingestion.
4. Link disclosure/forwarding, 35-bit ID enumeration risk and client-side PIN limitations remain part of the guest sharing model. No authenticated privacy claim is justified. Owner policy acceptance or a separate authenticated access change is required.
5. Cross-service crash recovery is eventual: cleanup/reconciliation/lifecycle must run and be monitored. Failed intents retain slots; clients recover through a fresh session. Cursor scan/backlog and lifecycle behavior need remote drills. Do not run orphan deletion against a partially restored D1.
6. Physical iPhone/Android, installed LINE, actual cellular loss/bandwidth, HEIC and subjective image/audio/interaction quality are unverified. WebKit emulation is not a physical iPhone.
7. Production widget secrets, protected GitHub environment/reviewers, least-privilege deployment token, explicit resource IDs, encrypted backups, restore drill, read-capable rollback artifact and disaster recovery objectives are unverified. No secrets need to be pasted into a report to resolve these.
8. The pinned beta Miniflare is development tooling used by the current Wrangler dependency set; production runs the bundled Worker, not Miniflare. Keep tooling updates deliberate and rerun integration checks when changing it.

## Deployment / rollback readiness

The detailed **unexecuted** plan is [R2-OPERATIONS.md](R2-OPERATIONS.md), covering production private R2 provisioning, Turnstile configuration, D1 backup/restore and additive migration, explicit deployment sequence, monitoring/cost alerts, rollback, disaster recovery and operational acceptance. [R2-STAGING-SETUP.md](R2-STAGING-SETUP.md) contains safe resumption commands.

Production remains **NO** until the checklist and explicit Owner approvals are satisfied. Frontend V3 is not enabled. The prepared backend initially disables V3 writes and cleanup; rollout requires another reviewed/approved configuration change after verification. Existing V2 reads and V3 media reads must survive rollback. A pre-R2 Worker rollback is not safe once V3 cards exist. Local kill-switch/legacy-read tests passed; an actual Cloudflare rollback/restore drill did not run.

Next Owner action: activate R2 in the existing account's Dashboard, then resume isolated staging verification. This is **not** a request to approve production deployment now.

## Files modified in this continuation

```text
.github/workflows/deploy-api.yml
.github/workflows/frontend.yml
docs/R2-MEDIA-V3.md
docs/R2-OPERATIONS.md
docs/R2-STAGING-SETUP.md
docs/R2-PRODUCTION-READINESS-REPORT.md
package.json
package-lock.json
playwright.config.ts
scripts/smoke-r2-staging.mjs
scripts/staging-safety.mjs
scripts/verify-turnstile-test.mjs
src/Editor.tsx
src/lib/media-v3.ts
tests/helpers/media-env.mjs
tests/helpers/workerd-env.d.mts
tests/helpers/workerd-env.mjs
tests/media-v3.integration.test.mjs
tests/media-v3.spec.ts
tests/media-v3.test.mjs
tests/media-v3.workerd.test.mjs
tests/r2-acceptance.spec.ts
tests/staging-safety.test.mjs
worker/guards.js
worker/index.js
worker/jpeg.js
worker/media-v3.js
worker/schema.sql
wrangler.staging.example.toml
wrangler.toml
```

`src/lib/api.ts`, `src/components/UploadVerification.tsx` and the original viewers were reviewed but did not require source changes in this continuation. Final changed-file set is 30 files including this report; the large lockfile delta pins the existing Cloudflare local development/runtime tooling plus the JPEG library, rather than a new hosted service.

## Commits created

- `37bf838283b6aa28332268a239dea865e2f01fe8` — `fix: harden R2 media lifecycle and gate production rollout` (implementation, tests and runbooks).
- `71117fc6f8a6598ecefbaa827391acae8dfb8767` — `fix: restart failed R2 upload sessions on retry` (explicit server-failure recovery and regression assertions).
- This report is committed separately as `docs: record R2 readiness evidence and staging blocker`; its self-referential commit hash is available in `git log --oneline -- docs/R2-PRODUCTION-READINESS-REPORT.md`.

All work stays on `feat/r2-private-media-v3`. PR #2 remains draft and is not merged.

## Reproduction / falsification ledger

- Baseline nine tests passed; four added repros failed. A JPEG header/MIME-only hypothesis was falsified by a 40-byte forged file returning 201. Node Inspector was attempted without a resolved pause; the source path plus SQL/object state established the failing branch.
- Best-effort compensation was disproved by injecting both D1 insertion and R2 deletion failure: object retained, metadata absent. Intent-before-put and retryable cleanup now retain a durable key; negative tests pass.
- “Batch transaction implies the intended update occurred” was disproved by a successful zero-row SQLite UPDATE and expired-session repro. Explicit SQL dependencies/receipts and actual local D1 rollback now pass.
- WebKit initially showed empty intercepted Blob postData. A native local HTTP receiver proved real JPEG bytes were present, matching Playwright's documented upstream interception limitation. The harness now verifies bytes on the wire; it does not substitute fixture bytes or weaken the app upload format.
- Live Cloudflare dummy Siteverify returned example.com without action, unlike the example documentation. Explicit staging-only compatibility now passes a real Siteverify/local-Worker test while production test configuration is denied.
- A virtual-timer test disproved cancellation-before-timeout rejection: it accepted an otherwise valid prefix. Rejection is now ordered before cancellation; the stalled body returns 408.
- Added WebKit coverage exposed modal focus restoration to the previous input; explicitly focusing the opener fixed it and all 33 legacy cases passed.
- Final maximum JPEG, real local scheduled cleanup, fresh-server-failure retry, lost upload/publication receipts and full suites passed. No mocked/local result was promoted to remote R2 evidence.

Verdict: **code ready for real staging; production rollout blocked by R2 activation and unverified operational acceptance.**
