# R2 operational rollout and recovery plan

**Prepared, not executed.** Production provisioning, migrations, deployment, DNS changes, data deletion and PR merge are not authorized by this document. Obtain explicit Owner approval for the exact operation/commit and record it in the release ticket. Never treat passing local tests as production approval.

## 1. Provisioning and configuration plan

1. Resolve account R2 activation/billing error 10042 through the Owner's Cloudflare Dashboard. Complete isolated staging in `R2-STAGING-SETUP.md` first. Do not substitute production bindings.
2. After separate approval, create/verify private R2 Standard bucket `luvnote-media`. Disable r2.dev access; attach no public domain. Worker binding is `MEDIA`; no browser/S3 credentials are issued. Keep bucket CORS empty: browsers talk to Worker endpoints. No DNS changes are required or authorized.
3. After retention policy approval, configure a lifecycle backstop for prefix `v3/` to expire objects at **21 days after upload**. Card access lasts 15 days after publication, and sessions last 30 minutes, so this exceeds the normal live interval. This is a deletion policy: obtain approval, test on staging, and document backup/restore implications before enabling it. It bounds retained crash orphans even if scheduled cleanup is unavailable. Do not apply a lifecycle to legacy D1 records.
4. Create a production Managed Turnstile widget limited to actual editor domains (`luvnote.fun`, `www.luvnote.fun`, and only a genuinely used preview hostname). Action is `luvnote_media_upload`. Put the real secret in Worker secret `TURNSTILE_SECRET_KEY` via an authorized operator session. Only the public site key may enter `VITE_TURNSTILE_SITE_KEY`. Do not enable `TURNSTILE_TEST_MODE` or permit localhost/dummy responses in production.
5. Confirm the production Worker plan and CPU budget can decode a maximum-size noisy JPEG without exceeding limits; benchmark p50/p95/p99 CPU, memory, concurrency, request duration and error rate on staging. The 32 MiB decoder allocation guard is not a guarantee that total isolate memory/CPU fits every plan. Set an Owner-approved Worker CPU limit only after measuring it. A free-plan CPU assumption is not acceptable.
6. Confirm `WRITE_LIMITER` (namespace 472001) and `READ_LIMITER` (472003) do not collide with another Worker's namespaces. Staging uses 472002/472004. Verify native rate-limit bindings remotely. They are approximate per-location controls, so retain exact D1 daily quotas and WAF protections.
7. Configure GitHub `production` environment with the Owner as required reviewer and a main-only deployment rule. This repository change does not create or verify those rules. Set explicit `CLOUDFLARE_ACCOUNT_ID`, `PRODUCTION_D1_ID` and a least-privilege deployment token in protected configuration; do not select the first returned Cloudflare account. Review token scopes without printing token values.

## 2. D1 backup and additive migration

Before requesting migration approval, record the current Worker version, deployed frontend commit/artifact, production D1 UUID, schema and row counts (counts only, no customer data in reports). Export D1 to an encrypted, access-controlled location using the current Wrangler `d1 export` command and record a Time Travel bookmark if available on the account's plan. Check the current [Time Travel limits](https://developers.cloudflare.com/d1/reference/time-travel/) in the account. Never commit SQL exports or logs containing card content.

Restore that backup into a separate recovery database and verify V1/V2 row counts, representative synthetic records, schema, expiry behavior and an application's read-only compatibility checks. Backup existence alone is not a restore drill. Record backup timestamp, digest, bookmark, encryption/access location, restore duration and result. Customer data handling for a recovery drill requires Owner authorization and restricted access; none was performed in this task.

`worker/schema.sql` adds six media tables and indexes to the two legacy tables. It uses `CREATE ... IF NOT EXISTS` and does not alter, migrate or delete existing Base64 content. Review the exact diff and backup reference, then request explicit Owner approval for the production schema operation. Apply with the explicit production config/UUID only after approval. Verify all six media tables and indexes; test a no-op rerun on staging. Do not drop tables during rollback.

## 3. Controlled deployment sequence

1. Complete every staging/security/device acceptance gate and review `R2-PRODUCTION-READINESS-REPORT.md`. Keep PR #2 draft until review; do not auto-merge.
2. Obtain explicit Owner approval to merge the reviewed commit, provision production resources and apply the additive schema as separate listed actions. Reviewers must inspect merge conflict resolutions and rerun checks if the branch changes.
3. The API workflow is now **manual only**. It requires main, the repository Owner as actor, `OWNER_APPROVED_PRODUCTION`, the exact approved main SHA, a verified backup reference, the protected environment and `R2_PRODUCTION_CONFIG_VERIFIED=true`. Migration additionally requires `apply_schema=true`. Configure actual environment protection before relying on the workflow. A merge alone performs no API deployment/migration.
4. Deploy backend with `MEDIA_V3_UPLOADS_ENABLED=false` and `MEDIA_CLEANUP_ENABLED=false`. The file defaults preserve this state. Verify health, unchanged V1/V2 reads, native protections, private bucket access, schema and read API with synthetic fixtures under separately approved production tests. Review R2, D1 and Worker configuration in the Dashboard.
5. After explicit approval for the write/retention rollout, change the reviewed production configuration to enable V3 writes and cleanup, deploy that exact approved commit, and perform a small synthetic production flow. The workflow deploys the repository configuration; it does not override these flags from an unreviewed variable. Keep the frontend flag false until this backend flow passes.
6. Only then set the genuine public site key, `R2_PRODUCTION_CONFIG_VERIFIED=true` and `VITE_R2_MEDIA_ENABLED=true` for the frontend build. A main frontend build with V3 enabled is rejected if backend verification is absent or the site key has a testing/missing format. Review the actual artifact; no dummy key may ship. No repository variables were changed by this task.
7. Observe a limited pilot for at least a full cleanup cycle, inspect synthetic image availability and deletion outcomes, then approve broader rollout. Keep V2 and V3 read routes, all legacy data and R2 bindings available throughout.

## 4. Monitoring, abuse controls and cost alerts

These are **proposed, not configured/verified**:

- Enable restricted Worker observability without logging request bodies, bearer/Turnstile tokens, names, letters, image bytes or full image URLs. Preserve event names `media_v3_error`, `media_v3_compensation_failed`, `media_v3_cleanup_asset_failed`, `media_v3_orphan_cleanup_failed` and aggregate `media_v3_cleanup` counts/failures. Add an external synthetic read probe using non-customer fixtures; do not publish customer links in alerts.
- Page the operator for a compensation failure, missing live synthetic object or cleanup failure; alert when scheduled success is absent for two hours, cleanup backlog grows across two runs, 5xx exceeds 1% for five minutes, or p95 upload duration/CPU approaches the measured budget. Verify notifications actually arrive and record the alert owner/escalation path before launch.
- Monitor D1 reads/writes/storage/429s, session counts, reservations versus ready assets, orphan age, R2 object count/bytes and Class A/B operations, Worker requests/CPU, Turnstile verification failures and WAF blocks. A private bucket does not prevent hotlink/read cost through the Worker.
- Exact initial quotas are 100 V3 sessions globally/day (up to 900 MB newly reserved bytes/day), 5/IP/hour; legacy creates share 100/day and 10/IP/hour. Both are conservative pilot capacities, not sales capacity commitments. Read traffic and rejected requests still consume resources. Native rate limits are not global spending caps. Shared networks may reach a limit; an attacker may exhaust a public daily budget.
- Configure WAF/rate rules for public creation and enumeration paths using the existing Cloudflare account/plan. Verify both the custom domain and any workers.dev exposure are protected; a rule covering only the custom domain leaves another ingress. Do not disable Turnstile/WAF to troubleshoot. R2 uploads remain disabled if protections cannot be verified.
- Have the Owner choose the monthly budget and warning/critical thresholds (for example 50%/80%/100%), enable available account usage/billing notifications and service alerts, and test delivery. Check current [R2 pricing](https://developers.cloudflare.com/r2/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [Worker pricing](https://developers.cloudflare.com/workers/platform/pricing/). Billing alerts can lag and are not hard spend limits. Document a manual write kill-switch response and staffing coverage.

## 5. Rollback

Rollback code paths passed local tests; an actual Cloudflare rollback drill is still required.

1. Disable frontend V3 uploads (`VITE_R2_MEDIA_ENABLED=false`) and redeploy the reviewed frontend artifact. New cards resume the compatible, rate-limited V2 creation path.
2. Disable `MEDIA_V3_UPLOADS_ENABLED` in an Owner-approved Worker configuration and redeploy. Preserve `GET /v2/cards/:id`, `GET /v3/cards/:cardId/media/:assetId`, the D1 metadata tables and `MEDIA` binding. Keep R2 objects. Disabling writes was tested to leave V3 media readable locally.
3. If cleanup is suspect, disable `MEDIA_CLEANUP_ENABLED` independently. Do not remove the media read routes. Disable lifecycle deletion too if retention/restore is under investigation, with explicit approval.
4. Forward-fix or deploy a previously verified **V3-read-capable** Worker version. Reverting to the pre-R2 Worker breaks V3 cards and is not an acceptable general rollback after the first V3 publication. Store the approved read-capable recovery artifact/version before launch.
5. Do not revert/drop additive D1 tables, rewrite legacy rows, remove Base64 content, delete the bucket or rotate away needed read configuration. Verify legacy cards and every active synthetic V3 theme after rollback. Record timeline and recovery result.

## 6. Disaster recovery

Set recovery objectives with the Owner before launch. Proposed targets: RPO 24 hours for off-platform encrypted exports/object snapshots, and RTO 4 hours; **neither is verified**. D1 Time Travel availability/retention must be confirmed for the account. R2 strong consistency does not provide a cross-service transaction or a backup.

Keep encrypted D1 exports plus a manifest of referenced object keys/checksums and copies of those objects in a separately protected backup location (another private R2 bucket or an Owner-controlled encrypted export). Backups must include both data and media for a usable card. Obtain approval for backup resources, retention and customer-data access; none were created here. Document deletion requests and backup retention so restoration does not resurrect removed content improperly.

During an incident, freeze writes, disable scheduled cleanup and pause lifecycle deletion with approval. Preserve the failing deployment and logs without exporting customer content into the incident report. Restore D1 and media into isolated recovery resources, verify reference coverage, decoded synthetic images, all themes, V1/V2 reads, expiries and permissions, then request Owner approval for cutover. Do not repoint production at an empty/older D1 while cleanup is enabled: the orphan scanner could treat valid media as unreferenced. Never overwrite production to test recovery. Re-enable retention only after full reconciliation. If no matching object backup exists, deleted R2 media is not recoverable from D1 metadata alone.

## 7. Operational acceptance checklist

- [ ] R2 billing activated by Owner; isolated staging bucket/Worker/D1 identities and private access verified.
- [ ] Real staging smoke passes all five themes with direct R2 object and D1 verification.
- [ ] Real staging adversarial/concurrency/expiry/cleanup/failure recovery tests recorded.
- [ ] Real staging widget/action/hostname/replay tested; production dummy configuration rejected.
- [ ] Remote CPU/memory/plan, burst protections, exact quotas, WAF ingress and cost impact reviewed.
- [ ] Physical iPhone and Android, installed LINE handoff, slow/cellular network and image quality accepted.
- [ ] Owner accepts the link-accessible card policy, 35-bit IDs and client-side PIN limitation; confidential-content claims prohibited.
- [ ] Encrypted backups, isolated restore drill, read-capable rollback artifact and disaster recovery drill verified.
- [ ] Alerts, notification delivery, escalation owner, usage budget and kill-switch drill verified.
- [ ] Protected GitHub production environment, least-privilege token and explicit resource IDs verified.
- [ ] Exact production migration/deployment/retention/frontend enablement actions separately approved by Owner.
- [ ] Frontend V3 flag remains false until the deployed backend and production configuration pass acceptance.

## References

- [D1 batch semantics](https://developers.cloudflare.com/d1/worker-api/d1-database/): statements run as a transaction; a zero-row update is not itself an exception. The publication SQL explicitly gates a receipt on the preceding INSERT's [SQLite changes()](https://www.sqlite.org/lang_corefunc.html#changes) and ties dependent writes to that receipt, including the zero-row/random-ID-collision case.
- [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/): object consistency does not make D1 and R2 atomic.
- [Native rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/): per-location, approximate counters, so exact D1 quotas supplement the binding.
- [Turnstile validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/): dummy key behavior is isolated from production authorization.
