# R2 Production Readiness — JPEG validation experiments

Updated **2026-11-01 UTC**. Independent acceptance of [PR #6](https://github.com/cmyanything/luvnote/pull/6), based on the unmerged [PR #2](https://github.com/cmyanything/luvnote/pull/2) feature branch. [Issue #5](https://github.com/cmyanything/luvnote/issues/5) retains the production gates.

## Latest continuation — minimal changes, Free CPU gate still NO-GO

Verified **2026-11-01 12:50 UTC**. Continued from clean `86cece35fca20880e95515ba456baa735fdcfc70` on `perf/r2-native-jpeg-validation`. The Owner requested a simple implementation and retained the existing plan. **The complete media flow works in the tested staging window; it is not approved for production because CPU still exceeds the documented Workers Free budget.** No production merge, deployment, migration, customer-data access, billing change or new resource/service occurred.

### Retained change and exact source

Relative to `86cece3`, application changes are limited to **two files**:

- `worker/guards.js`: use the existing native BYOB `readAtLeast()` for bounded large bodies when available; retain the fallback reader, actual byte cap, EOF check and 20-second whole-operation deadline. Cancellation cannot turn an incomplete prefix into an accepted body.
- `worker/jpeg.js`: give Images one bounded immutable stream chunk. Keep the original structure/metadata parser, SHA-256 ownership/idempotency logic and output validation. No second full JS decode or image-quality reduction was added to requests.

All experimental Wasm/string scanners, alternate entry points and extra runtime flags were **removed**. No package, schema, frontend design or production configuration changed. `worker/media-v3.js` is identical to the starting version: the **30-attempt** staging diagnostic cap is restored and the counter was never reset. The only other retained engineering changes are regression cases in `tests/media-v3.integration.test.mjs` and `tests/media-v3.workerd.test.mjs`, plus Full Transformation repetitions in `.github/workflows/frontend.yml`.

Actual staging application source: **`5c61808b20f85517a9a37941f1899c6cf2c4e5de`**. Final source before this documentation: **`6d9951403d9842c6838d10245f661ade9e369083`**, which only restores the original diagnostic limit and updates its test/ledger. That final stricter quota was locally verified with **85/85 API tests**; the full runtime flow was tested at `5c61808`.

Commits created during this continuation, all on the existing PR #6 branch:

| Commit | Disposition |
|---|---|
| `98097ab1bfa10b6692acf338168a43f4d0ec60ae` | Bounded diagnostic window / initial comparison |
| `f88a01491d58ddade8cac3646e6d7f6b6a96b09c` | Typed-array search experiment, removed |
| `01c919bf15ca8f743e2c2c1ab274378eb8801af4` | String search experiment, removed |
| `fbc7de7cc108863fe40b7768a78d345d233f7b2a` | Retained bounded reader and regression coverage |
| `e1956853fe6190d91a8248a4548fec7034892195` | Wasm experiment, removed |
| `3b2c18ed272631ea66ff8577e2a407efc86af239` | Blob experiment, removed; reader negative tests retained |
| `ef01d41e741116c45f194a8acde406dcfc9ee447` | Retained single-chunk Images input |
| `5c61808b20f85517a9a37941f1899c6cf2c4e5de` | Remove speculative helpers; complete real acceptance |
| `6d9951403d9842c6838d10245f661ade9e369083` | Restore original 30-attempt diagnostic cap |
| Documentation/evidence commit | This section and sanitized evidence; exact hash in Git history |

### Actual Cloudflare acceptance

Reused account `cee7f572be6cf7e3de1e4526f6d250d2`, Worker `luvnote-api-staging`, D1 `luvnote-staging / 3967493c-55db-4ab8-bb2c-9ed3c157a543` and private R2 `luvnote-media-staging`. No production routes/bindings. Managed r2.dev access is disabled and custom R2 domains are empty.

The final controlled window **12:36:14–12:38:34 UTC**, version **`c3942c8c-bc1e-48f5-b91e-ee419edb2a7f`**, performed:

- **24 primary uploads: 22 HTTP 201 and two expected HTTP 400** (EXIF/GPS, fake PNG declared JPEG); **22 actual Images calls**, with no provider exception or observed 1102/9422.
- **22/22 ready-upload replays**, without new transformations. Three simultaneous maximum-size image uploads all succeeded.
- All three previously problematic damaged JPEGs were repaired under the explicit Owner-approved policy. Every successful object was downloaded from real private R2 and independently strict-decoded and checked for stripped metadata by the operator process. No original damaged input was stored.
- All five themes published with photo and cover, receipt retry and compatibility read/reopen: `pink-coquette`, `coquette-dream`, `little-memories`, `birthday-chat`, `velvet-gift`.
- **15/15 live browser read/reload checks**: five themes each on desktop Chromium, Pixel 7 Chromium emulation and iPhone 13 WebKit emulation. This is browser emulation, not physical-device or installed-LINE acceptance.
- Existing scheduled cleanup through an isolated remote preview reduced **50 expired unlinked metadata rows to zero**; all five live synthetic cards still read afterward. The existing aged-orphan grace check remains pending until **2026-11-02 06:18:29.566 UTC**; it was not bypassed.

Output hashes matched the previously verified Full Transformation outputs **22/22**. The prior browser quality comparisons therefore apply to identical bytes; their results and decoder-reference limitations are retained below. The new evidence also records the operator's decoder-based PSNR values, which are not interchangeable with browser perceptual comparisons. Dimensions, quality setting 95 and all theme/UI code are unchanged. Repaired damaged files are assessed for complete canonical output, not fidelity to missing source pixels. Maximum generated output remains 3 MB, raw input 1.5 MB and 1024×1024; no limits were weakened.

### Real CPU result and quota

Cloudflare tail percentiles use nearest-rank and **milliseconds**, separately from client/network time:

| Workload | n | CPU p50 / p95 / p99 | Cloudflare wall p50 / p95 / p99 |
|---|---:|---|---|
| Prior Full Transformation, same six sequential inputs/order | 6 | 71 / 128 / 128 | 1084 / 1506 / 1506 |
| Retained simple IO change, same six sequential inputs/order | 6 | **39 / 63 / 63** | 981 / 1034 / 1034 |
| Final mixed binding calls, including small/repaired images | 22 | **20 / 48 / 63** | 985 / 1260 / 1424 |

The same-hash comparison shows a reduction in this small, nonrandomized diagnostic sample. **It still fails the documented 10 ms Free CPU budget**; zero 1102 in 24 attempts cannot certify sustained reliability. The six-input baseline is the previous Full Transformation implementation, not a new jpeg-js run. Historical strict-decoder evidence remains below and must not be relabeled as a paired rerun.

Adaptive analytics for the final window represented 72 mixed invocations, including reads/publication: CPU p50/p95/p99 **5.462 / 39.737 / 63.030 ms**, memory p50/p99 **11,164,495 / 31,884,254 bytes**. This is sampled/shared-isolate usage, not peak per-upload memory or provider-service memory. Tail binding events are the primary upload CPU evidence. No CPU limit was increased.

This continuation used **78 additional diagnostic attempts**, taking the retained D1 counter **30 → 108**, including intermediate rejected approaches. The counter was never reset or deleted; code now again caps it at 30 and uploads are disabled. All calls reused synthetic inputs. **Images Free is Owner-confirmed, but the authoritative monthly account meter still returns 403 / NOT_VERIFIED**. Calls, HTTP requests and unique billable transformations are different counters; no monthly-zero claim is made. No billing change or paid plan was enabled.

### Regression commands and results

Local full workflow mirror passed; [CI run 41307409207](https://github.com/cmyanything/luvnote/actions/runs/41307409207) independently passed for exact staging source `5c61808`. **185 passing test executions, not 185 unique scenarios**:

| Command / environment | Result |
|---|---|
| `npm run test:api` (default legacy validator) | **85 PASS**, including nested security corpus and five workerd tests |
| `TEST_JPEG_VALIDATOR=images node --test tests/media-v3.workerd.test.mjs` | **5 PASS** |
| `TEST_JPEG_VALIDATOR=images-transform node --test tests/media-v3.workerd.test.mjs` | **5 PASS** |
| `VITE_R2_MEDIA_ENABLED=false npm run build`, then `npm test` | TypeScript/build PASS; **36 PASS / 18 intentional V3 SKIP** |
| V3 build with official dummy key for local tests, then `npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts` | **18 PASS** with default legacy decoder |
| Same V3 Playwright command, `TEST_JPEG_VALIDATOR=images` | **18 PASS** |
| Same V3 Playwright command, `TEST_JPEG_VALIDATOR=images-transform` | **18 PASS** |
| Final `VITE_R2_MEDIA_ENABLED=false npm run build` | TypeScript/build PASS; local artifact returned to disabled state |

Environment assignments above use shell-appropriate syntax (local PowerShell `$env:...`; CI `env`). Browser suites cover editor changes, preview, publication, retry/response loss, ownership, compatibility, read/reload and sharing URL generation. Local Images emulation is lower fidelity; it is not proof of real Cloudflare decodability, quality, performance or real Turnstile. Local tests after restoring quota at `6d99514`: **85 PASS**. [Exact-source CI 41308122708](https://github.com/cmyanything/luvnote/actions/runs/41308122708) also completed **SUCCESS: 185 passing executions**, deployment skipped.

Harness corrections were kept separate from product findings: the first live browser run used disallowed local port 4174; repeating on existing allowed 4173 passed without changing CORS. One earlier six-upload experiment failed a post-rollback assertion before persisting its CPU artifact; those six uploads have **no claimed CPU result**. A later check confirmed the parked version and write denials. Local differential/profiling experiments were not reported as remote CPU proof.

### Final parked state and decision

At **12:50:13.630 UTC**, the active version was again **`b0f3a112-e7a9-4250-b7bb-027e83dca378`**, 100% traffic: **legacy / uploads false / cleanup true / Turnstile test mode false / no Images binding**. Health was 200; session, upload and publication writes each returned 503. The temporary diagnostic route returned 404. Existing V1/V2 and V3 image reads remained available. Local test/preview servers were stopped.

Sanitized primary evidence: [latest acceptance, raw tail measurements, quality hashes and final bindings](evidence/r2-simple-io-acceptance-2026-11-01.json); [bounded experiment ledger](evidence/r2-cpu-continuation-ledger-2026-11-01.json). Tokens, session credentials and customer data are excluded.

| Current gate | Status |
|---|---|
| R2_FULL_TRANSFORMATION_CODE | PASS |
| R2_FULL_TRANSFORMATION_SECURITY | PASS — bounded corpus and Owner-approved canonical repair |
| R2_FULL_TRANSFORMATION_FUNCTIONAL | PASS |
| R2_FULL_TRANSFORMATION_CPU | **FAIL** |
| R2_STAGING_VERIFIED | **FAIL** — aggregate acceptance still blocked |
| R2_CPU_ACCEPTANCE | **FAIL** |
| R2_IMAGES_MONTHLY_METER | NOT_VERIFIED |
| R2_PRODUCTION_DEPLOYED | **NO** |
| R2_PRODUCTION_READY | **NO** |

**NO-GO for merging PR #6 as a resolved Workers Free CPU blocker.** Preserve the existing V2 production path and keep the V3 frontend disabled. Do not add more speculative accelerators. On the current evidence, no tested Full Transformation variant reliably meets the unchanged Free budget. Any plan change requires a separate Owner decision; none is requested or performed here.

Broader gates also remain: real public Turnstile positive/hostname/action/replay, real interrupted ingress, physical devices/LINE, monthly Images meter, aged orphan observation, lifecycle backstop, alert delivery/cost controls, off-host backup/key recovery and exact production approvals. The previously completed encrypted backup/isolated restore is historical evidence, not a fresh backup for an eventual rollout. Link-accessible private-R2 cards still confer image access to anyone with the card URL; they are not authenticated private albums. These limitations remain documented in the retained historical/operations sections below.

## Historical Full Transformation acceptance — superseded by the continuation above

The Owner confirmed **Images Free**, retained **Workers Free / R2 Paid**, and explicitly approved **creating a complete new JPEG from a damaged source and discarding the source**. This changes the earlier reject-every-damaged-input policy for this Full Transformation experiment only. It does not approve Images.info(), which can store malformed original bytes, or any production action.

**Functional canonicalization works; the CPU blocker remains.** The fixed full-transformation run completed 14/14 uploads, including three repaired malformed inputs, with actual private R2 output independently strict-decoded and all five themes published/read/replayed. However, normal full-transformation upload CPU was p50/p95/p99 **13/53/53 ms**. The two large images used **53/51 ms**, above the documented **10 ms Workers Free** budget. No 1102 in these small samples is not a steady-traffic guarantee: [Cloudflare documents](https://developers.cloudflare.com/workers/platform/limits/) limited isolate flexibility and eventual termination on consistent overruns. **Do not merge PR #6 as a proven Free-plan CPU solution.**

| Current gate | Evidence-based status |
|---|---|
| R2_FULL_TRANSFORMATION_CODE | PASS — guarded staging experiment, not production enablement |
| R2_FULL_TRANSFORMATION_SECURITY | PASS — bounded synthetic corpus under Owner-approved canonical repair |
| R2_FULL_TRANSFORMATION_FUNCTIONAL | PASS — five themes, photos/covers, publication/reopen/replay |
| R2_FULL_TRANSFORMATION_CPU | FAIL — observed CPU exceeds Workers Free budget |
| R2_STAGING_VERIFIED | FAIL — CPU gate and broader operational gates remain open |
| R2_CPU_ACCEPTANCE | FAIL |
| R2_IMAGES_MONTHLY_METER | NOT_VERIFIED |
| R2_PRODUCTION_DEPLOYED | NO |
| R2_PRODUCTION_READY | NO |

### Source, limits and controlled windows

Started clean at **41bef36a1427de16acaf48532413577a997ff664**, fetched origin and reconfirmed PR #6 targets PR #2's unmerged feature branch. No unrelated work changed.

| Commit created | Purpose |
|---|---|
| 235acef60be55df34d79adef3729d43c368aa40f | Account-cost recheck before Images plan confirmation |
| 7add11c96ea21b963aa5ac08d7604b1aea11b5f6 | Staging-only full JPEG transformation, exact diagnostic budget and acceptance script |
| d023c1538eed6892e6e584d462caa75cab44108e | Separate generated-output size bound, canonical-policy acceptance and browser quality measurement |
| f2b0f691fbdad7a875f29dfe832713e5db6fdfdf | Native indexOf scan experiment; not retained |
| f4f7d80579c3abdd5c31189f8b9662efe2cd4194 | Revert the unproven scan optimization; retained application is identical to d023c15 |
| Documentation/evidence continuation | This report, staging/operations notes and sanitized evidence; exact hash in git history / Issue #5 |

Production wrangler.toml and frontend source remain unchanged. Legacy decoding remains the default. The images-transform mode returns **503 outside ENVIRONMENT=staging or without the binding**, before consuming an upload slot. Ownership, Turnstile, session expiry, exact quotas, publication atomicity, idempotency and cleanup remain in the existing Worker/D1/R2 flow. No service, database, queue, subscription or CPU limit was added/changed.

Input stays **1,500,000 bytes**, **1024×1024 / 1,048,576 pixels**, bounded JPEG scans and the existing EXIF/GPS/XMP/IPTC rejection policy. Re-encoding a high-entropy valid image enlarged it beyond the first implementation's reused 1.5 MB input bound. The correction allows **at most 3,000,000 bytes only from the Images-generated output**, checks output MIME/dimensions/marker structure again and strips metadata before storing it. It does **not** increase raw upload limits or add a second JS decode to requests. Output quality is 95, with no resizing or speculative compression-quality reduction. The larger output cap is a storage/CPU tradeoff that remains staging-only.

The original 20-attempt diagnostic bound was explicitly expanded during authorized defect fixing to **30 total attempts including retries**, with **19 distinct synthetic input hashes**. The same exact D1 counter was retained, never reset, and ended at 30/30. Of those attempts, **25 reached the Images binding**; five were rejected by the existing input parser first. No more remote transformations were made after exhausting the bound.

### Actual Cloudflare resources and versions

Account **cee7f572be6cf7e3de1e4526f6d250d2**; existing Worker **luvnote-api-staging**, D1 **luvnote-staging / 3967493c-55db-4ab8-bb2c-9ed3c157a543**, R2 **luvnote-media-staging**. Private R2 remained r2.dev-disabled, with no public custom domain; no production route/binding or DNS change.

| Window / source | Actual active version | Result |
|---|---|---|
| Initial candidate, 7add11c | b6485236-6e6c-441e-8370-e4b2cdff2f7a | 10-case initial matrix; then Owner-approved canonical policy; 4 additional uploads exposed output-size issue |
| Fixed output bound, d023c15 | 0edbfa02-09e8-46e2-ae24-1d1f33c4ac1e | **14/14 HTTP 201**, five complete photo/cover card flows |
| Scan experiment, f2b0f69 | 4b669bb2-91fd-447f-b9f8-1cc9f942185c | Two concurrent large uploads completed, CPU 138/178 ms; source optimization reverted |
| Final rollback / parked reader | **b0f3a112-e7a9-4250-b7bb-027e83dca378** | **legacy / uploads false / cleanup true / test mode false / genuine staging secret / no Images binding** |

Each window returned to the parked reader; final health was 200 and session/upload/publication POSTs each 503 at **09:23:25.982 UTC**. Rollback preserves both legacy and new V3 reads, including generated JPEGs larger than the raw input cap. Use the active version's resource bindings rather than latest-upload settings after rollback.

### Account-level Images cost and quota

Owner-confirmed **Images Free** plus the [official pricing contract](https://developers.cloudflare.com/images/pricing/) establishes no additional Images transformation charges: 5,000 unique transformations/month are included; new over-limit transformations fail with **9422**, without a Free-plan overage charge. Workers Free and R2 Paid were recorded separately. luvnote.fun URL transformations were not enabled; the per-Worker raw-byte binding worked without changing that production zone feature.

The initial 0-requests/24-hour zone chart was **never treated as monthly account usage**. Subscription/Images stats reads still return 403; the available Dashboard is signed out. **Authoritative monthly account meter before/after remains NOT_VERIFIED.** Stored-image stats and sampled request analytics are not a unique-transformation billing census.

Observed counters: **30 upload attempts / 19 distinct synthetic inputs / 25 binding attempts / 24 completed transformations / one output-bound rejection**, with no observed 9422 or provider exception. HTTP totals: **24×201 / 6×400**, including five expected parser rejections and the one valid image rejected before the output-size fix. Repeated source/parameter combinations can deduplicate under the billing contract, so **25 calls is not a claim of 25 billable unique transformations**. No claim of zero account-wide monthly usage or an independently audited all-product invoice is made. No billing setting changed.

### Security and output completeness

Initial results were preserved under the original policy: 7/10 policy passes and three input-rejection failures. After the Owner explicitly approved canonical repair, those actual outputs were evaluated under the new policy; the fixed-source repeat then verified all three again. This is an explicit policy decision, not a silently relabeled strict-input test.

| Input | Legacy strict input outcome | Real Full Transformation / verified R2 output | Current policy result |
|---|---|---|---|
| Typical 900×675 baseline | accept | 201; complete, sanitized, same dimensions, new bytes | PASS |
| Progressive 64×48 | accept | 201; complete, sanitized, same dimensions, new bytes | PASS |
| Truncated entropy with EOI | reject | 201; **326-byte newly generated, strict-decodable JPEG** | PASS under Owner-approved repair |
| Same-size zeroed entropy | reject | 201; **618-byte newly generated, strict-decodable JPEG** | PASS under Owner-approved repair |
| Forged headers/no pixels | reject | 201; **321-byte newly generated, strict-decodable JPEG** | PASS under Owner-approved repair |
| Truncated file without EOI | reject | 400 before binding; failed journal, no ready object | PASS |
| Fake/incomplete PNG declared JPEG | reject | 400 before binding; failed journal | PASS |
| Invalid marker length | reject | 400 before binding | PASS |
| Duplicate frame | reject | 400 before binding | PASS |
| EXIF/GPS-marked synthetic payload | reject | 400 before binding | PASS |
| Maximum dimensions/noisy input, 1,028,954 bytes | accept | First 400 due output cap; after fix **201 / 1,855,090-byte complete JPEG** | Fixed, PASS |
| Near-limit input, 1,498,433 bytes | accept | **201 / 1,936,631-byte complete JPEG** | PASS |

The three repaired inputs were never published as cards. Their original bytes were not stored in R2. Every successful upload was downloaded from actual R2 and strict-decoded **in the operator process**, beyond MIME/header/success checks; generated size and sanitized-byte checks were also performed. No second full JS decode was introduced into the Worker. Missing/failing binding, bad output type/dimensions/metadata, over-limit output, production environment, replay and budget exhaustion have local fail-closed tests. Full real-camera GPS/ICC libraries, provider outage guarantees and every possible JPEG variant are not claimed certified.

### Actual CPU, wall time and memory

Primary measurements are captured Cloudflare tail events for binding invocations. CPU and wall columns are **p50 / p95 / p99 milliseconds**, nearest-rank; network/client wall time is separate. Client intervals in the first harness can include local scheduling delays around synchronous metadata commands, so they must not be used as Worker CPU or service wall time.

| Real workload / source | n | CPU ms | Cloudflare wall ms | Qualification |
|---|---:|---|---|---|
| Initial transformation calls, 7add11c | 9 | 8 / 37 / 37 | 758 / 1404 / 1404 | Includes the valid output-bound failure |
| Fixed canonical/photo/cover calls, d023c15 | 14 | **13 / 53 / 53** | **865 / 1934 / 1934** | All HTTP 201; five photo/cover pairs at concurrency two |
| Maximum noisy / near-limit, d023c15 | 1 each | **53 / 51** | **899 / 960** | Paired with smaller covers, not a capacity percentile |
| Native-search experiment, f2b0f69 | 2 | 138 / 178 / 178 | 1594 / 1605 / 1605 | Two largest images concurrently; candidate reverted |

**1102: 0/30 observed upload attempts.** All 25 binding-attempt tail events were captured with no exceededCpu/binding exception. This demonstrates success in the tested windows, not compliance with a sustained 10 ms Free CPU budget. The final code's maximum-image cost remains well above it. No CPU setting or plan was raised to obtain success.

Historical same-hash legacy comparison: typical 900×675 CPU **119/243/243 ms, n=10**; Full Transformation typical same-hash observations were **14, 9, 17 ms** across the initial/fixed windows. Legacy earlier completed **13/42** with **29 HTTP 503/1102**; its one completed maximum sample used 356 ms. This is material diagnostic improvement, **not a newly rerun paired capacity benchmark** or equal-sample percentile comparison.

Actual adaptive GraphQL evidence is retained. The fixed window returned CPU p50/p95/p99 **4.173/51.189/53.229 ms**, isolate memory p50/p99 **2,387,697/14,886,028 bytes**, but included publication/read invocations and represented 38 requests, not only 14 uploads. The scan trial represented both requests, CPU **138.825/178.273/178.273 ms**, memory **21,924,168/21,932,360 bytes**. Memory is sampled/shared-isolate usage, not peak per-request or Images-service memory. The first window represented 9 rather than 10 requests; do not turn adaptive counts into an exact census.

A local CPU profile located the byte scanner as a dominant cost. The native indexOf experiment reduced aggregate local Node CPU from 766 to 375 ms over 60 iterations and preserved outputs in **325 seeded differential checks**. Remote benefit was not established. The two-largest-images concurrency differs from the previous large+cover pairing, so the larger remote numbers do **not** establish a controlled causal regression. The candidate was reverted instead of claiming a win from local data.

### Quality, five themes and rollback acceptance

No dimensions were reduced. Actual-output comparisons in **Chromium and WebKit** gave typical/smooth PSNR approximately **59.48–59.83 dB**, maximum-noise **36.18 dB**, near-limit noise **36.67 dB**, and progressive **40.64 dB**. Twelve synthetic input/output pairs were checked in both engines (**24 comparisons**). Both engines agreed. These are numerical synthetic checks, not subjective customer-photo or physical-device acceptance.

The first jpeg-js-only RGB comparison reported progressive 23.72 dB. Falsification with Pillow and both browsers showed 40.64 dB: source 4:2:0 versus output 4:4:4 and different decoder chroma upsampling made jpeg-js an unsuitable perceptual reference. The diagnostic value is retained, not presented as real browser degradation. Full-resolution output completeness was separately checked by strict decoding.

Five new transformed-photo/cover cards: pink-coquette **6s2y3g7**, coquette-dream **5ag75n8**, little-memories **mc9zsu5**, birthday-chat **xp3sfv4**, velvet-gift **s3ud3sj**. Actual publication receipt retry, compatibility API, photo/cover URL reads and strict output decoding passed for all five.

- New transformed-card read/reload/photo+cover decoding: **15 PASS**, five themes × desktop Chromium / Pixel 7 Chromium / iPhone 13 WebKit emulation.
- Prior legacy/shared-card read/reload/image checks: **15 PASS** on the same three emulated profiles.
- Existing operator synthetic V1 Base64 image: HTTP 200.
- Actual cron cleanup: **12 candidates / 0 failures** at 09:00; scheduled isolated preview later reclaimed **6 / 0**, expired unlinked remainder **0**. All five live cards' photos/covers remained readable and strict-decodable afterward. Scheduled preview returns before background completion; final D1 verification was taken after completion.
- Final diagnostic counter **30**, uploads disabled, no Images binding in the active parked reader.

The temporary browser harness had an incorrect expected synthetic label and was corrected before the successful 15-case run; no application fix or false pass was attributed to that harness failure. Physical iPhone/Android, installed LINE handoff, subjective photo quality, real cellular delays and non-dummy guest Turnstile acceptance remain unverified.

### Automated verification and files changed

[Exact retained-source CI 41292160697](https://github.com/cmyanything/luvnote/actions/runs/41292160697) on **f4f7d80579c3abdd5c31189f8b9662efe2cd4194** is **SUCCESS / deployment skipped**, **159 clean reported pass executions**: **83 API + 4 local info-binding workerd + 36 legacy frontend + 18 default V3 + 18 local info-binding V3**. No flaky retry in this run. These are configuration repetitions, not 159 unique scenarios; the info-binding repetitions do not prove Full Transformation behavior.

Additional current local commands/results:

| Command | Actual result |
|---|---|
| npm run test:api | **83 PASS / 0 fail / 0 skip**; 58 top-level tests plus 25 corpus subtests |
| npm run typecheck; npm run build | PASS; V3-on local test build and final V3-off build both passed |
| TEST_JPEG_VALIDATOR=images-transform node --test tests/media-v3.workerd.test.mjs | **4 PASS** with local Images emulation |
| TEST_JPEG_VALIDATOR=images-transform npx playwright test tests/media-v3.spec.ts tests/r2-acceptance.spec.ts | **18 PASS** with local Images emulation |
| node scripts/measure-jpeg-transform-quality.mjs | **24 real-output/offline browser comparisons** |
| Seeded before/after parser differential | **325 PASS**, local experiment only; optimization reverted |
| node --check on changed Worker/operator scripts; git diff --check | PASS |
| node --test tests/staging-safety.test.mjs after final template comments | **2 PASS**, repeated subset |

Low-fidelity Miniflare uses Sharp and ignores output quality=95; its native-mode results are not Cloudflare security, quality or CPU proof. Live service evidence above is separate. CI may rerun for documentation-only descendants; do not infer their result from the retained-source run.

Modified executable files: worker/jpeg.js, worker/media-v3.js, scripts/staging-safety.mjs, tests/helpers/workerd-env.mjs and its declaration, tests/jpeg-native.test.mjs, tests/media-v3.integration.test.mjs, tests/staging-safety.test.mjs. Added scripts/accept-jpeg-transform-staging.mjs and scripts/measure-jpeg-transform-quality.mjs. Documentation/evidence updates are on the existing PR #6 branch. No production frontend/configuration, database schema, customer data or billing change.

### Remaining risks and next action

**Keep PR #6 draft/unmerged, the current plan, and the upload hold.** Full Transformation is useful canonicalization under the approved policy but is **not yet a reliable solution to the CPU blocker on Workers Free**. The generated-output size correction is bounded and preserves quality, but increases worst-case storage per image; production storage/quota policy must be reviewed separately. The staging diagnostic budget is exhausted and must not be reset just to continue this execution.

The smallest remaining investigation would be a **same-Worker streaming/byte-copy reduction experiment**, preserving bounded input/output validation, metadata policy, ownership and journal compensation. It requires fresh end-to-end CPU/security evidence; it is not implemented or approved as a remedy here. A strict optimized native/WASM codec is another unverified alternative with dependency/maintenance costs. Do not replace validation with info(), a browser-only check or header heuristics, reduce image quality/limits silently, introduce another service, or change the plan.

Broader production gates remain: real guest Turnstile action/hostname/replay/expiry, actual devices/LINE, interrupted request/aged orphan acceptance, privacy policy, WAF/alerts, recurring/off-host backup recovery and separate exact-commit production approvals. The previously Owner-approved encrypted D1 backup/restore remains historical evidence; no customer data was reopened.

[Sanitized Full Transformation evidence](evidence/r2-full-transformation-acceptance-2026-11-01.json) contains source/version IDs, raw per-input outcomes/hashes, strict-output checks, actual tail/GraphQL metrics, browser quality/results, cleanup and final state. No images, tokens, customer content or backup data is embedded.

---

## Historical Images.info() acceptance — NO-GO

The following record concerns the earlier metadata-only experiment, under the earlier strict-input policy. Its CPU measurements and failed security decision must not be attributed to Full Transformation.


## Earlier metadata-only decision

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
