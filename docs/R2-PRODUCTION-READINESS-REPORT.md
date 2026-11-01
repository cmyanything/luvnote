# R2 Production Readiness Report

Updated **2026-11-01 — final acceptance continuation**. This supersedes the earlier report's release decision. [PR #2](https://github.com/cmyanything/luvnote/pull/2) remains draft; [PR #4](https://github.com/cmyanything/luvnote/pull/4) is integrated into its feature branch. [Issue #5](https://github.com/cmyanything/luvnote/issues/5) tracks outstanding gates.

## Final decision

```text
R2_CODE_READY = PASS
R2_STAGING_VERIFIED = FAIL
R2_CPU_ACCEPTANCE = FAIL
R2_BACKUP_RESTORE = PASS
R2_PRODUCTION_DEPLOYED = NO
R2_PRODUCTION_READY = NO
```

**R2 is not ready for actual customers.** Code PASS means the reviewed implementation and its 103 automated cases pass; it does not override the reproducible deployed CPU failure. Permitted JPEG uploads returned HTTP 503 / Cloudflare 1102. After seeing the measurements, the Owner explicitly chose to **keep the current plan and record CPU as a blocker**. No billing or CPU-limit changes were made.

Production was read/exported only under explicit backup approval. No production merge, migration, deployment, frontend enablement, resource provisioning, DNS change or customer-row mutation occurred. No legacy card/Base64 data was deleted. The frontend's final local build has V3 false and no staging site key/API override.

## Source, CI and scope

- Started clean on `feat/r2-private-media-v3` at `47f8c074db0374a32e4057da33f2f73c6f94cd9b`; fetched and fast-forwarded to **5d77a9bbb74489028cb26d9f706903b9c26b1b5e**, the integrated PR #4 commit. PR #2 targets main and is unmerged. No unrelated changes were present or overwritten.
- Independently verified [CI 41277248896](https://github.com/cmyanything/luvnote/actions/runs/41277248896) succeeded on that exact SHA: **49 backend/security + 36 legacy frontend + 18 V3 frontend = 103 PASS**; deploy skipped.
- Reran all 103 locally on Windows, Node 22.23.1, Wrangler 4.156.0, Playwright 1.64.1, pinned Miniflare 5.20261023.3-beta. Repeated cases are not added to the count.
- Deployed application source under acceptance is **5d77a9b**. This continuation changes manual acceptance scripts/documentation only: `git diff 5d77a9b -- worker src` was empty. No decoder/security/architecture rewrite was made.
- The [earlier detailed audit and remediation record](https://github.com/cmyanything/luvnote/blob/47f8c074db0374a32e4057da33f2f73c6f94cd9b/docs/R2-PRODUCTION-READINESS-REPORT.md) preserves the initial reproductions, findings, 100-case revision and prior staging evidence. Its older counts/statuses do not override this report.

## Architecture and privacy

React 19/TypeScript/Vite retains five theme editors and standalone viewers. Workers verify Turnstile, create hash-only 30-minute bearer capabilities, reserve bounded upload slots, validate JPEGs, write private R2 objects and persist D1 ownership/journals. A D1 batch publishes a card and its receipt atomically, with ownership/readiness/expiry rechecks. Upload/publication retries are content-bound and idempotent. Cleanup is bounded and retryable across the D1/R2 consistency boundary.

`GET /v2/cards/:id` leaves old Base64 JSON intact and materializes V3 references into card-scoped Worker image URLs. The image route requires a matching unexpired card/asset. V1 reads survive. Disabling V3 writes preserves V3 reads and bindings. No existing HTML viewers, music/effects, theme formats, hash prefixes or LINE-share formats changed in this acceptance continuation.

**Private R2 is a storage boundary, not authenticated photo privacy.** Anyone with a card link can read/copy its JSON/images. Seven base-32 characters provide 35 bits; this is not a confidential-content capability. The client PIN/scratch interaction does not authorize API reads. Owner acceptance of this sharing policy remains open; no confidential-content claim is justified.

## MVP complexity and security review

| Surface traced | Decision and evidence |
|---|---|
| PhotoPicker → readPhoto → uploadJpeg | PR #4 prepares a 900 px JPEG once and reuses it on publish/retry; cover remains 700 px. Encode-count and oversized-source regressions pass. No extra conversion is needed. |
| JPEG parser → bounded full decode (`worker/jpeg.js:5`) | Retain actual validation: header-only acceptance previously admitted forged files. Full decode is the CPU hotspot; deleting validation or silently lowering image quality/limits is not an acceptable mitigation. |
| Native limits plus D1 quotas | Different boundaries: approximate per-location bursts versus exact session/day budgets. Removing either loses a protection. Actual bindings and negative/quota tests were verified. |
| Upload intent/journal and publication receipt | Real R2/D1 failure, concurrency and rollback tests demonstrate their recovery role. Receipts require the immediately preceding successful INSERT, preventing no-op/colliding-ID publication. PR #4 evaluates session expiry in SQL execution time. |
| Per-asset D1 ownership and R2 head | Bounded to six assets. No measurement identifies these I/O checks as the CPU problem. Changing them would add risk without solving it. |
| Cleanup, orphan grace and bounded cursor | Retain eventual crash recovery. Do not shorten the 24-hour grace to pass a test. Cleanup stays disabled during D1 restoration/reconciliation. |
| Manual production workflow | Keep Owner/main/exact-SHA/backup/environment gates and separate migration approval. Actual protected environment settings are not certified by workflow source alone. |

Earlier fixes remain: actual-byte/timeout JSON guards, complete JPEG marker/metadata validation, slot reservation before body reading/decoding, mandatory write protection, exact guest/legacy quotas, restrictive staging CORS, ownership and no-store media access, transactional receipts, failure retry and safe cleanup. No new critical/high source defect was confirmed in this continuation. Deployment CPU incompatibility is nevertheless a launch blocker.

The smallest operational change worth retesting would be an Owner-approved CPU allowance sufficient for the existing decoder. The Owner declined that change for now. No new codec, queue, service, database architecture or authentication platform was introduced. The only new database is the explicitly approved isolated backup recovery target.

## Automated commands and results

PowerShell environment assignments apply to each command's process. These local tests do not prove remote Cloudflare services.

| Executed command | Result |
|---|---|
| `npm run test:api` | **49 PASS**, zero failed/skipped |
| `npm run typecheck` | PASS |
| `$env:VITE_R2_MEDIA_ENABLED='false'; npm run build; npm test` | Build PASS; **36 PASS / 18 intentionally skipped** on Chromium, Pixel 7 Chromium and iPhone 13 WebKit emulation |
| `$env:VITE_R2_MEDIA_ENABLED='true'; $env:VITE_TURNSTILE_SITE_KEY='1x00000000000000000000AA'; npm run build` | PASS, local test artifact only |
| `npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts` with the V3 build | **18 PASS**, zero skips |
| `node --check scripts/measure-r2-staging.mjs` / `scripts/test-r2-interruption-staging.mjs` / `scripts/test-r2-orphan-staging.mjs` / `scripts/accept-r2-staging.mjs` | PASS, each supplied separately to node --check |
| Final V3-false/default-API build and `git diff --check` | PASS |

**103 distinct local cases passed (49 + 36 + 18).** This excludes the real performance failures below and does not describe them as passing. Earlier npm ci/audit, actionlint and runtime/security evidence is retained in the linked historical report. No production workflow ran.

## Real Cloudflare CPU and memory

Command: set `ALLOW_STAGING_WRITE=1`, `STAGING_API_URL=https://luvnote-api-staging.c-myanything.workers.dev`, `STAGING_SOURCE_COMMIT=5d77a9bbb74489028cb26d9f706903b9c26b1b5e`, then `node scripts/measure-r2-staging.mjs`. Three operator-owned synthetic sessions isolated workload measurement without changing public quotas or Turnstile; unused sessions were expired for normal cleanup.

Read **actual Cloudflare GraphQL Analytics**, filtered to this Worker and each recorded window. Schema introspection labels CPU/wall as microseconds and memory as bytes; the table converts to ms/MiB. Network wall time alone was not used as CPU evidence.

| Workload / UTC window | HTTP result | CPU p50 / p95 / p99, ms | CF wall p50 / p99, ms | Isolate memory p99 |
|---|---|---|---|---|
| 900×675 synthetic JPEG, 55,636 bytes; 06:01:59.748–06:02:03.476 | 5/5 uploaded | 122.442 / 214.089 / 214.089 | 635.402 / 744.777 | 37.9 MiB |
| Noisy 1024×1024 JPEG, 1,028,954 bytes; 06:02:09.150–06:02:15.369, successful group | 4/5 uploaded | 328.488 / 572.206 / 572.206 | 1216.322 / 1353.916 | 54.6 MiB |
| Same maximum workload, terminated group | 1/5 returned 503 | 406.599 / 406.599 / 406.599 | 581.728 / 581.728 | 47.1 MiB |
| Three concurrent maximum JPEGs; 06:02:21.127–06:02:21.648 | 0/3 uploaded, all 503 | 15.076 / 24.923 / 24.923 before termination | 175.622 / 223.955 | 20.2 MiB |

**9/13 succeeded; 4/13 failed (30.8%); no client timeout.** This is a small diagnostic sample, not a statistically robust load/capacity certification. Memory is a shared-isolate percentile, not a per-request peak. Terminated CPU does not represent completed decoding cost.

The workload reached the maximum permitted resolution, not every possible valid 1.5 MB/progressive-scan encoding. Those worst-case variants are not certified; the reproduced failures already prevent rollout on the current environment.

Independent differential at about 06:03:51 UTC: a 16×12 JPEG returned 201, then two maximum JPEGs returned 503/1102. `npx wrangler tail --config wrangler.staging.toml --format pretty` classified both as **Exceeded CPU Limit**. The general adversarial test repeated the failure. Remote deployed requests cannot be paused in a local debugger; source trace is reservation/body read → validateJpeg → jpeg-js decode → R2 put. Small/large input is the differing knob. Guard rejection/D1/R2 errors do not explain the HTML 1102 plus explicit runtime CPU classification. Earlier isolated successful maximum uploads are compatible with Cloudflare's documented rollover flexibility.

Account/Worker usage model is `standard`; **subscription tier and effective numeric CPU allowance remain unverified** because billing API returned 403/10000. A zone's Free Website plan does not establish the Workers plan. No billing or CPU limit was changed. See [Cloudflare CPU limits/rollover](https://developers.cloudflare.com/workers/platform/limits/) and [pricing/configurable limits](https://developers.cloudflare.com/workers/platform/pricing/).

Analytics query: `workersInvocationsAdaptive`, scriptName plus per-window datetime filters; dimensions `status`; sum `requests errors subrequests cpuTimeUs wallTime`; quantiles `cpuTimeP50 cpuTimeP95 cpuTimeP99 wallTimeP50 wallTimeP95 wallTimeP99 memoryUsageBytesP50 memoryUsageBytesP99`. Introspection exhausted the query budget once; the successful measurement query followed a backoff of more than five minutes. This was unrelated to upload errors. Credential values were never printed or saved in evidence.

## Latest real staging acceptance

Existing Worker **luvnote-api-staging**, D1 **luvnote-staging / 3967493c-55db-4ab8-bb2c-9ed3c157a543**, and private bucket **luvnote-media-staging** were reused. Verified no production routes/bindings; r2.dev disabled and no custom domains. Source 5d77a9b testing version **bbc931e8-9364-4d0a-b941-2e5aa6003490** opened a controlled write window at 06:00:30 UTC.

| Check / actual command | Evidence and result |
|---|---|
| Real non-dummy widget | Created/reused one Managed **LuvNote staging acceptance** widget, public site key `0x4AAAAAAFu3P7KP1Kckzd3a`, localhost/127.0.0.1 only. Secret installed directly into staging; test mode false, server allowlist localhost. Dummy token rejected with 403. |
| Real widget token / action / hostname / replay / expiry | Headless attempts did not issue a token. One challenge response was 401, not a definitive root cause. Positive non-dummy validation and action/hostname/replay/expiry acceptance remain **NOT_VERIFIED**. No mocked success or challenge bypass. [Cloudflare testing guidance](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) distinguishes real challenges from test keys. Interactive acceptance is required. |
| `node scripts/test-r2-staging.mjs` | **37 checks: 35 PASS, 1 FAIL (maximum JPEG 503), 1 NOT_VERIFIED (interruption)**. Actual D1 failure after R2 put, upload replay/conflict, slot/publication concurrency, atomic rollback, missing/expired/unowned assets, expired sessions/cards, consumed sessions, cleanup failure/retry/live preservation and five newly created Base64 V2 theme cards passed. Synthetic card `tmyxrp9`; operator-seeded capabilities disclosed. |
| `node scripts/test-r2-interruption-staging.mjs` | Sent only 262,144 bytes of a full-length HTTPS JPEG then destroyed the socket. No Worker journal appeared before cancellation: **NOT_VERIFIED** for the Worker interrupted-body path, rather than a false pass. Local interrupted-stream tests pass separately. |
| `node scripts/test-r2-orphan-staging.mjs` | Fresh R2 object with no D1 row survived actual scheduled cleanup byte-for-byte: **fresh grace PASS**. Fixture `v3/staging-orphan-230ad133-9cd3-4ab0-9df6-445abfc0d0a6.jpg`, uploaded 06:18:27–06:18:29 UTC. Aged deletion remains **NOT_VERIFIED** until **2026-11-02 06:18:29.566 UTC**. No clock/grace override. |
| Real scheduled cleanup/retry | Remote preview saw the same real D1 card, then processed 24 candidates with one scoped injected D1-delete failure; next run processed one retry with zero failures. Later run zero candidates/failures. Triggers removed; live images survived. Natural hourly cron was previously observed at 05:00:32 UTC. Lifecycle/backlog/alert-delivery drills are open. |
| `STAGING_BROWSER_READ_ONLY=1 STAGING_BROWSER_PUBLISH=0 node scripts/accept-r2-staging.mjs` with the real staging build | **15 PASS**: all five theme reads/reloads and actual R2 image decodes on desktop Chromium, Pixel 7 Chromium and iPhone 13 WebKit. Viewer origin rewrite uses real staging network responses; production API requests are blocked. Not physical-device evidence. |

The earlier 5/5 actual guest flows and 22 staging browser checks used public dummy keys on the earlier revision; they are historical evidence, not proof of the current non-dummy widget. Latest local tests preserve music/effects/share URLs; physical device/audio/perceptual/LINE app handoff remain unverified.

## Owner-approved encrypted production backup and restore

The Owner explicitly approved the read-only production export, encrypted local storage and isolated restore in this conversation. Verified deployed production binding/database: **luvnote / b48f8655-c980-47f3-bd72-a9549d813b09**.

- Backup: **luvnote-production-2026-11-01T06-11-29.727Z.lnvb**, only in **C:/Users/User/AppData/Local/LuvNote/Backups**, outside Git. Plain export length **5,693,811 bytes**, SHA-256 **4c235e0eb9c0b54e73f17f3b1c0e04db715eb1886fdd4cf9e4a5ed386a313a73**.
- AES-256-GCM; key wrapped with Windows DPAPI CurrentUser; manifest authenticated as AAD. ACL allows only current Windows identity and SYSTEM. SQL downloaded/decrypted in memory; no plaintext SQL files or presigned URLs were logged/saved.
- Recovery: **luvnote-restore-20261101 / 1578a192-8066-4aaf-a4c8-43e9dd31992c**, private, never bound to a Worker. Reused on retry; no duplicate DB.
- Read encrypted file back from disk, unwrapped/decrypted and verified digest; modified ciphertext rejected. Restored **7 cards + 8 theme_cards = 15 rows**. Every full-row hash and normalized schema hash matched (**2 schema objects**). Personal fields, card links and Base64 contents are not in reports/logs.
- Managed D1 file ingestion returned an error and was not counted as success. The successful method restored schemas and **bound row parameters from decrypted memory through the official D1 query API**, then independently compared all data/schema. Production rows/schema were unchanged.
- Actual commands: `.wrangler/secure-backup-directory.ps1`; `OWNER_APPROVED_D1_BACKUP=2026-11-01 node .wrangler/backup-restore.mjs` (encrypted export succeeded, managed import failed); `OWNER_APPROVED_D1_BACKUP=2026-11-01 node .wrangler/restore-encrypted-backup.mjs` (restore/integrity PASS). The tested restore utility and operator helper were also saved beside the protected backup. Run from the checked-out repository with its pinned Wrangler dependencies; credentials are retrieved only in memory.

**PASS covers this backup and isolated restore.** Off-host/profile-loss key recovery, off-site copy, recurring backups/retention and formal RPO/RTO are NOT_VERIFIED. Preserve the Windows profile/DPAPI material: the file alone is insufficient on another account. Take a fresh approved backup if data changes before rollout. The private recovery database remains intact for Owner review and disposal policy. [D1 export](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/) and [query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) are the official interfaces used.

## Rollback and final deployed state

Executed a **staging-only version rollback** with `npx wrangler rollback 96e4c13f-6363-4942-9002-ad80e0e74c70 --config wrangler.staging.toml --yes` from testing version bbc931e8. All five themes' V2 Base64 and V3 images returned 200; new sessions returned 503. D1/R2 were preserved. The rollback also restored its older Turnstile secret, as the CLI explicitly warned; secret/config dependencies require verification after version rollback.

Then redeployed latest application source with **uploads false / cleanup true / test mode false / hostname localhost**, and reinstalled the real staging secret using the official Worker secrets API. A CLI secret replacement attempt after rollback failed and was not marked successful. Final active version independently verified: **2182edbd-aff4-4bfa-b90f-204cace586a6**, Secret Change **06:22:02.600 UTC** (preceding latest-source deploy 87d2a805-582e-4723-8b9d-96610d1b917a). All-theme reads/session denial passed again. No production rollback or deployment occurred.

The rollback procedure is ready for operator review and **staging read preservation was tested**. Production artifact/version, secrets, environment protection and restore/cutover are not certified. Never roll production back to a pre-V3 reader after V3 cards exist. Preserve R2 bindings, metadata, V2/Base64 and V3 media routes.

## Remaining gates and next Owner action

1. **CPU FAIL:** current runtime terminates permitted uploads; Owner instructed to keep the current plan. Do not enable V3 based on earlier isolated success or local tests.
2. Non-dummy interactive Turnstile action/hostname/replay/expiry, interrupted requests, actual aged-orphan deletion and lifecycle/backlog acceptance are incomplete.
3. WAF custom/managed/rate-limit, alerting and billing APIs returned **403/10000** under existing OAuth. No protection was weakened. Native staging limits remain write 60/min and read 300/min; exact D1 quotas remain. WAF coverage of both custom-domain and workers.dev ingress, cost alerts and delivery must be verified through an authorized operator path.
4. Current production metadata has only its D1 binding. There is no production Turnstile binding and bucket listing contains only staging. Production bucket, widget/secrets, protected GitHub environment/reviewers, deployment token/variables remain unverified/unprovisioned.
5. Owner acceptance of link-accessible privacy, actual iPhone/Android/LINE handoff, cellular/slow network, HEIC and subjective image/audio/effects remain open. Browser emulation is not a physical device.
6. Backup round-trip passed; off-host recovery, recurring retention and DR objectives remain open. No customer data was deleted.

**Next Owner action:** review the retained CPU blocker and decide when/how to resume its resolution; arrange interactive/device acceptance and an authorized WAF/alerts operator. No production approval is requested prematurely. After all gates pass, approve the exact reviewed commit, fresh backup and each merge/provision/migration/deploy/pilot/frontend operation separately through the controlled manual workflow in [R2-OPERATIONS.md](R2-OPERATIONS.md). [R2-STAGING-SETUP.md](R2-STAGING-SETUP.md) describes safe resumption.

## Files and commits in this continuation

Modified `docs/R2-PRODUCTION-READINESS-REPORT.md`, `docs/R2-STAGING-SETUP.md`, `docs/R2-OPERATIONS.md`, `scripts/accept-r2-staging.mjs`; added `scripts/measure-r2-staging.mjs`, `scripts/test-r2-interruption-staging.mjs`, `scripts/test-r2-orphan-staging.mjs`. No application source changed. Local Cloudflare config, private operator artifacts and encrypted backups are excluded from Git.

Baseline integrated commit: **5d77a9bbb74489028cb26d9f706903b9c26b1b5e**. New continuation commit is titled **test: record final R2 acceptance and CPU rollout blocker**; obtain its exact hash with `git log --oneline -- docs/R2-PRODUCTION-READINESS-REPORT.md`. Earlier commit hashes and the complete remediation history remain in the linked historical report and PR #2. Work stays on the existing feature branch; PR #2 is not merged.
