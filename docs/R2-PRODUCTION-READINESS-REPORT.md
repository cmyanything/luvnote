# R2 Production Readiness — native JPEG acceptance

Updated **2026-11-01 UTC**. Independent acceptance of [PR #6](https://github.com/cmyanything/luvnote/pull/6), based on the unmerged [PR #2](https://github.com/cmyanything/luvnote/pull/2) feature branch. [Issue #5](https://github.com/cmyanything/luvnote/issues/5) retains the production gates.

## Decision: NO-GO for merging PR #6 as the CPU solution

```text
R2_NATIVE_VALIDATOR_CODE = FAIL
R2_NATIVE_SECURITY = FAIL
R2_NATIVE_CPU = PASS
R2_STAGING_VERIFIED = FAIL
R2_CPU_ACCEPTANCE = FAIL
R2_PRODUCTION_DEPLOYED = NO
R2_PRODUCTION_READY = NO
```

**Images.info() cannot replace the current strict JPEG decoder.** On real Cloudflare, it admitted three truncated/corrupt/missing-entropy JPEGs that the legacy validator rejected. Each returned 201, had a ready D1 journal, and its malformed bytes were retrieved from actual private R2. These synthetic objects were never published as cards. The implementation therefore fails its validation contract even though automated tests pass.

Native CPU PASS covers **42 bounded benchmark requests only**: 42/42 HTTP 201, zero 1102, complete matching tail events. It does not certify future capacity or security. The safe full-decoding path failed **29/42** comparable requests, so overall CPU acceptance remains FAIL. The Owner's instruction to retain the existing plan remains in force.

No production merge, deployment, migration, provisioning, customer-data access, billing/CPU-limit change or DNS change occurred in this continuation. No customer/legacy data was deleted or rewritten. Production configuration and frontend source remain unchanged; both PRs remain draft/unmerged.

## Source and reproducible evidence

- Started clean on PR #2's branch at f58c509. Fetched origin, verified PR #6 still targets feat/r2-private-media-v3 at that base, then switched to perf/r2-native-jpeg-validation. Remote PR #6 head was exactly **40cf547e8d25735343b9641f4d2c8ea4e3b28f0c**, with no newer commits or unrelated local changes.
- Independently verified [CI 41282530019](https://github.com/cmyanything/luvnote/actions/runs/41282530019) successful on 40cf547: **50 backend/security + 36 legacy frontend + 18 V3 frontend = 104 PASS**; deploy skipped. This did not establish native decoding safety.
- Native deployed source: **40cf547e8d25735343b9641f4d2c8ea4e3b28f0c**. Guard/regression fix and legacy comparison source: **e7028ddb73ef692e0ff530166c5a45a5ae5d91a4**. The full legacy decoder was unchanged; the new environment guard affects only explicit native mode.
- [Source CI 41286330628](https://github.com/cmyanything/luvnote/actions/runs/41286330628) **SUCCESS on exact e7028dd**, check passed/deploy skipped: **79 API + 4 native workerd + 36 legacy frontend + 18 legacy-validator V3 + 18 native-validator V3 = 155 reported pass executions**. Subsequent evidence/documentation commits do not change application code.
- Later [CI 41286747839](https://github.com/cmyanything/luvnote/actions/runs/41286747839) on documentation head **6594c13c17e8a60d88b1e2f93cfb5f1b735db099** succeeded with **154 clean passes + 1 flaky case recovered on retry**, not 155 clean passes. Native WebKit little-memories timed out at tests/r2-acceptance.spec.ts:86 with publicationCalls=0. The job's success skipped failure-only artifact upload; API confirmed no artifacts, so the CI trace is unavailable. A targeted local native WebKit run, **20 repetitions / zero retries**, passed 20/20 on Windows. Root cause remains **NOT_VERIFIED**; no speculative timeout increase/application fix was made. Final documentation records this risk without changing application source; its own CI status must be read from PR checks, not inferred from earlier runs.
- [Sanitized raw evidence](evidence/r2-native-acceptance-2026-11-01.json) contains exact source/version/window, input hashes, HTTP samples, the security matrix, actual tail CPU/wall observations and GraphQL quantiles. No images, bearer/Turnstile tokens, credentials, customer data or backup contents are embedded.

## Architecture and independent review

React prepares JPEGs once; Workers reserve an owned/quota-bounded upload slot before validation, store sanitized bytes in private R2, and mark the D1 journal ready. Publication batches ownership/expiry checks, card insertion and an idempotent receipt atomically. V2 reads materialize V3 references into card-scoped media URLs; V1/V2 Base64 remains intact. Five themes, URL formats, music/effects and LINE links were not redesigned.

Actual path: worker/media-v3.js uploadPhoto → readLimitedBody → worker/jpeg.js parseJpeg → strict jpeg-js.decode or validateJpegNative → IMAGES.info → format/dimension comparison → D1 size/hash → R2 put → ready journal. The parser bounds bytes/dimensions/scans and strips metadata; it does not establish that every MCU/coefficient is present. Native information does not close that gap.

Simpler-alternative review: doing nothing leaves CPU termination; repeating the full JavaScript decode restores the original cost. Empty-scan/minimum-byte checks do not reject same-length zeroed entropy. A reliable entropy/scans checker would be another substantial security-sensitive JPEG parser, not a small proven safeguard. No heuristic, reduced quality/limits, second decoder, new service/queue/database, or paid transformation was introduced. Native full transformation/decode was outside this unbilled info-only experiment and was not invoked.

**Privacy is unchanged:** private R2 does not make cards authenticated private albums. Anyone with a card link can copy JSON/images; seven base-32 characters provide 35 bits, and the client PIN/scratch interaction does not authorize API access. Owner acceptance of that policy remains a production gate.

## Current official Cloudflare contract

Verified on 2026-11-01 against official documentation:

- [Images binding](https://developers.cloudflare.com/images/optimization/binding/): Wrangler TOML uses an images table with binding IMAGES. The info method returns image information (format, fileSize, width, height); info calls are free. Documentation does **not** promise complete strict entropy/pixel validation or rejection of every corrupt/incomplete JPEG. Empirical results refute equivalence.
- [Images pricing](https://developers.cloudflare.com/images/pricing/): Images Free is the default and supports external-image optimization. No subscription/paid feature was enabled. The binding deployed and valid calls succeeded under existing access; no upgrade was needed. The exact Workers billing tier remains unverified from the earlier 403, not inferred from the zone plan.
- [Formats](https://developers.cloudflare.com/images/get-started/limits/): JPEG and other input formats are supported; progressive JPEG is documented. LuvNote retains only its bounded baseline/progressive 8-bit subset. Actual baseline/progressive fixtures passed; other JPEG variants are not automatically allowed because Images supports broader formats.
- [Worker timing](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/): CPU and wall time differ; rollover can allow some costly requests to succeed. No CPU limit was increased to obtain these results.

## Security matrix

Same deterministic corpus for local strict validation and real native uploads. Legacy column is the **local strict validator outcome**, not a claim that large legacy cloud uploads succeeded. MIME belongs to the API. Accepted native objects were retrieved directly from R2; rejected cases had no ready journal, but are not an independent R2 absence census.

| Synthetic case | Legacy strict / API | Real native API | Required policy | Result |
|---|---|---|---|---|
| Valid baseline 64×48 | accept | 201, sanitized R2 bytes match | accept | PASS |
| Valid progressive 64×48 | accept | 201, sanitized R2 bytes match | accept | PASS |
| Maximum 1024², 1,028,954 bytes | accept | 201, bytes match | accept | PASS |
| Noisy near-limit, 1,498,433 bytes | accept | 201, bytes match | accept | PASS |
| Exactly 1,500,000 bytes with comments | accept/strip | 201; stored 879 bytes, matching legacy | accept/strip | PASS |
| 1,500,001 bytes | reject | 413 | reject | PASS |
| Malformed marker structure | reject | 400 | reject | PASS |
| Truncation without EOI | reject | 400 | reject | PASS |
| Truncated entropy, valid EOI | reject | **201; malformed R2 object verified** | reject | **FAIL** |
| Zeroed entropy, same size/headers | reject | **201; malformed R2 object verified** | reject | **FAIL** |
| Undefined Huffman table | reject | 400 | reject | PASS |
| Out-of-bounds marker length | reject | 400 | reject | PASS |
| Forged headers/SOS/EOI, no image data | reject | **201; malformed R2 object verified** | reject | **FAIL** |
| APP1 EXIF/GPS-marked payload | reject | 400 | reject APP1 | PASS |
| APP1 XMP payload | reject | 400 | reject APP1 | PASS |
| APP13 IPTC-marked payload | reject | 400 | reject APP13 | PASS |
| Embedded COM comment | accept/strip | 201; sanitized hash matches | accept/strip | PASS |
| APP2 ICC payload | accept/strip | 201; sanitized hash matches | accept/strip | PASS |
| Zero dimension | reject | 400 | reject | PASS |
| Dimension 1025 | reject | 400 | reject | PASS |
| Excess pixels (2048²) | reject | 400 | reject | PASS |
| Duplicate frame | reject | 400 | reject | PASS |
| Trailing bytes after EOI | reject | 400 | reject | PASS |
| PNG bytes declared JPEG | reject | 400 | reject | PASS |
| Valid JPEG declared PNG | API 415 | 415 | reject | PASS |

**22/25 PASS, 3 FAIL.** Metadata probes test marker rejection/stripping; they are synthetic payloads, not a complete library of camera GPS/ICC/IPTC variants. Missing binding returned 503 with zero slots/objects locally. A throwing binding, wrong format/dimensions or null metadata rejected locally; actual provider outages were not induced. Both modes' MIME 415/zero-object behavior was separately executed locally. There is no silent fallback to JavaScript decoding.

Root-cause ledger: valid baseline/progressive inputs disprove an unavailable/misbound service. Same-size corrupt entropy disproves a simple size/dimension fix. Identical input hashes, ready journals and fetched R2 bytes rule out an HTTP-only/mock result. Legacy rejects original and stored malformed bytes while valid sanitized bytes decode, ruling out metadata stripping as the cause. The deployed Images service cannot be stepped in a local debugger; source trace plus real input differentials identify the failed boundary. Rejecting promotion preserves the contract.

## Paired real Cloudflare CPU benchmark

Same hashes/counts: 10 typical sequential + 10 maximum sequential + 10 near-limit sequential + 12 maximum uploads in four batches of three = **42 per mode**. Same account/Worker/D1/R2, unchanged plan/CPU limits, operator-owned sessions, no application Turnstile bypass. Native **07:34:00.296–07:35:01.026 UTC**; legacy **07:42:49.005–07:43:26.634 UTC**. Sequential comparison, not randomized long-running capacity certification.

Actual Wrangler tail CPU/wall values below are **milliseconds**, nearest-rank p50/p95/p99, not client network timers. Native tail coverage is 42/42. Legacy tail captured 35/42 (10 typical, 8 maximum, 5 near-limit, 12 concurrent); missing observations are not invented. HTTP samples cover all 84, and GraphQL confirms 29 legacy resource errors.

| Mode / workload | HTTP 201 / attempts | Tail group n | CPU p50 / p95 / p99 ms | CF wall p50 / p95 / p99 ms |
|---|---:|---:|---|---|
| Native typical 900×675, 55,636 bytes | 10/10 | 10 success | 8 / 19 / 19 | 504 / 808 / 808 |
| Native maximum 1024², 1,028,954 bytes | 10/10 | 10 success | 37 / 49 / 49 | 666 / 1253 / 1253 |
| Native noisy 1,498,433 bytes | 10/10 | 10 success | 51 / 82 / 82 | 721 / 1362 / 1362 |
| Native maximum concurrent ×3 | 12/12 | 12 success | 49 / 80 / 80 | 693 / 1218 / 1218 |
| Legacy typical, same bytes | 10/10 | 10 success | 119 / 243 / 243 | 578 / 973 / 973 |
| Legacy maximum, successful subset | 1/10 | 1 success | 356 / 356 / 356 | 1024 / 1024 / 1024 |
| Legacy maximum, failed subset | 9/10 failed | 7 captured failures | 10 / 453 / 453 before termination | 143 / 597 / 597 |
| Legacy near-limit | 0/10 | 5 captured failures | 10 / 10 / 10 before termination | 144 / 146 / 146 |
| Legacy concurrent, successful subset | 2/12 | 2 success | 236 / 333 / 333 | 997 / 1035 / 1035 |
| Legacy concurrent, failed subset | 10/12 failed | 10 failures | 10 / 20 / 20 before termination | 138 / 817 / 817 |

**Native: 42/42 success, zero 503/1102 and zero observed binding failures in this benchmark. Legacy: 13/42 success, 29 HTTP 503/1102**, corroborated by exceededCpu tail/GraphQL exceededResources. Terminated CPU is not completed decoding cost. Typical paired median fell from 119 to 8 ms (~93%). Maximum completed CPU fell from one 356 ms sample to native median 37 ms; one legacy success cannot establish its percentile distribution. Prior 122/328 ms medians, 572 ms large p95 and 9/13 success remain compatible with variable CPU rollover.

Actual whole-window GraphQL workersInvocationsAdaptive: native CPU **42.149/79.943/80.541 ms**, wall **671.668/1253.248/1362.484 ms**, isolate memory p50/p99 **13,177,384/32,251,756 bytes**. Legacy successful group CPU **122.995/356.640/356.640 ms**, wall **739.620/1035.843/1035.843 ms**, memory **41,551,988/59,066,636 bytes**; failed group CPU **10/20/453.048 ms**, memory **31,611,626/35,688,360 bytes**. Different success mixes prevent an aggregate apples-to-apples speedup claim.

GraphQL is adaptive, not an invocation census: native whole-window response represented 39 requests despite 42 client/tail observations; short buckets returned 10/11/8/13 instead of 10/10/10/12. Raw counts/quantiles are preserved, not relabeled exact. Legacy whole-window response was 13 success + 29 failures. Memory is sampled/shared-isolate usage, not peak per-request allocation or Images-service memory. Native service CPU is outside Worker JavaScript CPU. Small samples, one location/window, progressive worst cases, sustained load and outages remain uncertified. Zero 1102 in 42 attempts is not a reliability guarantee.

## Staging identity, rollback and final state

Existing authorized account **cee7f572be6cf7e3de1e4526f6d250d2**. Reused **luvnote-api-staging**, **luvnote-staging / 3967493c-55db-4ab8-bb2c-9ed3c157a543**, **luvnote-media-staging**. Verified private bucket (r2.dev off/no domains), no Worker custom domain/routes in config, no production bindings. No duplicates. Native write 60/min and read 300/min limits, guest Turnstile and D1 budgets retained. Test capabilities were operator-seeded/hash-only; tokens were not logged.

| Stage | Actual version / evidence |
|---|---|
| Parked preflight / prepared rollback | **2182edbd-aff4-4bfa-b90f-204cace586a6**, uploads false / cleanup true / test mode false |
| Native window, source 40cf547 | **7563e6ec-d178-4ec4-8e76-eba3f064742d**, Images binding, uploads true / cleanup false |
| Rejection rollback | Actual rollback to **2182edbd-aff4-4bfa-b90f-204cace586a6**; all five V2 Base64/V3 reads 200, new sessions 503 |
| Legacy comparison, source e7028dd | **acc5b8a8-b9e6-4e2c-bcce-e074a0bd9eb6**, legacy/no Images, uploads true / cleanup false |
| Final active, source e7028dd | **b0f3a112-e7a9-4250-b7bb-027e83dca378**, **legacy / uploads false / cleanup true / test mode false / localhost / no Images binding**; real staging secret retained |

Verified active deployment/version resources: after rollback the latest-upload settings endpoint still described the newer upload, while active version 2182edbd correctly denied writes. Final deployment has aligned settings. Keep 2182edbd or the final V3-read-capable legacy version as recovery targets; never the rejected native write-enabled version.

Final health 200; session/upload/publication POSTs each 503. New synthetic V1 Base64 card **6a5ea57** JSON/image returned 200 with matching image hash. All five prior synthetic V2 Base64/V3 R2 theme reads remained 200. Real browser read/reload/R2 decode: **15 PASS**, five themes × desktop Chromium/Pixel 7 Chromium/iPhone 13 WebKit emulation. No physical-device/installed-LINE test is claimed.

Normal cleanup on real Cloudflare remote preview processed **100 candidates/0 failures**, then **9/0**; remaining expired unlinked candidates **0**. Synthetic expired sessions included the three unpublished malformed objects. Live reads survived. Earlier actual D1-failure/retry evidence remains in the prior report, not counted as a new drill. Existing orphan aged-deletion check is due after **2026-11-02 06:18:29.566 UTC**. No grace/clock override or lifecycle change.

## Automated regression results

| Actually executed locally | Result / limits |
|---|---|
| npm run test:api | **79 PASS**, zero failed/skipped; Node reports 54 top-level tests plus 25 corpus subtests |
| npm run typecheck | PASS |
| VITE_R2_MEDIA_ENABLED=false npm run build; npm test | Build PASS, **36 PASS / 18 intentionally skipped** |
| VITE_R2_MEDIA_ENABLED=true VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA npm run build | PASS; local test artifact only |
| npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts | **18 PASS**, default legacy Worker |
| TEST_JPEG_VALIDATOR=images node --test tests/media-v3.workerd.test.mjs | **4 PASS**, local low-fidelity Images |
| TEST_JPEG_VALIDATOR=images npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts | **18 PASS**, local low-fidelity Images compatibility |
| TEST_JPEG_VALIDATOR=images npx playwright test tests/r2-acceptance.spec.ts --project=webkit-mobile --grep little-memories --repeat-each=20 --retries=0 | **20 PASS / 0 failures**, local bounded attempt to reproduce the CI flake; does not prove it fixed |
| node --check scripts/accept-native-jpeg-staging.mjs; git diff --check | PASS |
| STAGING_VALIDATOR=images node scripts/accept-native-jpeg-staging.mjs benchmark | Real Cloudflare **42/42 PASS** |
| STAGING_VALIDATOR=images node scripts/accept-native-jpeg-staging.mjs matrix | Real Cloudflare **22/25 PASS, 3 FAIL**; nonzero exit retained |
| STAGING_VALIDATOR=legacy node scripts/accept-native-jpeg-staging.mjs benchmark | Real Cloudflare **13/42 PASS, 29 FAIL**; nonzero exit retained |

Remote commands also require ALLOW_STAGING_WRITE=1, STAGING_API_URL, STAGING_SOURCE_COMMIT and STAGING_VERSION; see [staging instructions](R2-STAGING-SETUP.md). Matching input hashes/counts are in the evidence artifact.

Reported local baseline/configuration pass executions: **79+36+18+4+18 = 155**, plus **20 targeted diagnostic repetitions**. The last 22 configuration cases and the 20 diagnostics are repetitions, not additional unique scenarios. Local Images/test doubles do not establish Cloudflare security. CI now repeats native compatibility with an explicit low-fidelity warning. Both local configurations cover five-theme photo/cover uploads, publication/reopening, retry/idempotency, ownership, expiry, atomicity/failures and cleanup through existing tests. Real native cover/publication/full guest acceptance stopped after security failure; no success is invented. Final local frontend artifact is returned to V3 disabled before handoff.

## Confirmed fixes and remaining gates

Minimal confirmed fix: native mode now returns 503 outside ENVIRONMENT=staging, even with an Images binding, before consuming a slot. Tests cover absent/production environments and typo modes. Template defaults are legacy/writes off. The unsafe algorithm was not relabeled secure; its rejection is documented in source and a reproducible corpus.

e7028dd changes worker/jpeg.js, worker/media-v3.js, wrangler.staging.example.toml, package.json, .github/workflows/frontend.yml, integration/staging safety tests, workerd helper/declaration; adds jpeg-native tests, corpus, synthetic progressive fixture/README and scripts/accept-native-jpeg-staging.mjs. Documentation continuation updates this report, staging/operations instructions and sanitized evidence. No src or production wrangler.toml changes. Work stays on PR #6's existing branch; documentation hashes are available from git log.

Earlier approved encrypted D1 backup/isolated restore **PASS** is preserved in the [prior report](https://github.com/cmyanything/luvnote/blob/f58c509510f914a5cac2b74fec5c8e93cef27676/docs/R2-PRODUCTION-READINESS-REPORT.md): 15 row hashes/schema matched, AES-256-GCM + DPAPI outside Git. No customer data was reopened for this task. Off-host key recovery/retention/RPO/RTO remain unverified.

Other gates: non-dummy Turnstile action/hostname/replay/expiry, actual interrupted Worker requests, aged orphan/lifecycle, physical iPhone/Android/LINE, privacy approval, WAF ingress coverage, cost/usage alerts and delivery, protected production workflow configuration, fresh backup before migration and separate Owner approvals. Earlier billing/WAF/alerts 403 restrictions were not bypassed.

**Next action:** keep PR #6 draft/unmerged and V3 uploads off. Review the NO-GO evidence and choose a separately scoped strict-validation solution within the retained plan; metadata/length heuristics are insufficient. No billing change or production approval is requested. Complete the remaining operational/device gates before production. [Operations and rollback](R2-OPERATIONS.md) remain the controlled rollout plan.
