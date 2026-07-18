# Menu Health Monitor — Firebase Cost Analysis

**Created:** February 20, 2026

**Launch boundary:** Not current launch certification or deploy approval. This Firebase cost doc describes source/cost behavior; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped Functions deploy evidence, post-publish smoke, browser/device QA where relevant, and production-host smoke.

---

## Cost Model

### Per Publish (healthy)

| Operation                                | Count            | Cost        |
| ---------------------------------------- | ---------------- | ----------- |
| Cheap-fail canonical user/tenant/store scope read | 3 reads | ~₹0.009 |
| Transactional user/tenant/store revalidation | 3 reads | ~₹0.009 |
| Update store.health field                | 1 write          | ~₹0.002     |
| DNS target validation + HTTP fetch to public URL | 0 Firestore cost | ₹0          |
| **Total per healthy publish**            |                  | **~₹0.020** |

### Per Publish (failure detected)

| Operation                    | Count   | Cost       |
| ---------------------------- | ------- | ---------- |
| Cheap-fail user/tenant/store scope reads | 3 | ~₹0.009 |
| Transactional user/tenant/store revalidation | 3 | ~₹0.009 |
| Update store.health field    | 1 write | ~₹0.002    |
| Check alert cooldown         | 1 read  | ~₹0.003    |
| Create alert doc             | 1 write | ~₹0.002    |
| **Total per failed publish** |         | **~₹0.025** |

### Monthly Estimates

| Scenario                     | Publishes/day | Monthly Cost |
| ---------------------------- | ------------- | ------------ |
| 20 stores × 2 publishes/day  | 40/day        | ~₹24/month    |
| 50 stores × 3 publishes/day  | 150/day       | ~₹90/month   |
| 200 stores × 3 publishes/day | 600/day       | ~₹360/month   |

**Verdict:** Negligible cost. No concern.

---

## Collections Affected

| Collection                | Operation             | Frequency     |
| ------------------------- | --------------------- | ------------- |
| `stores/{storeId}`        | Update `health` field | Every publish |
| `systemAlerts` (existing) | Write on failure only | Rare          |

**No new collections created.**

---

## Cloud Function Cost

| Function            | Trigger           | Memory | Est. Invocations/day           |
| ------------------- | ----------------- | ------ | ------------------------------ |
| `verifyMenuPublish` | onCall (callable) | 256MiB | 40-600 (matches publish count) |

Each invocation: ~2-5 seconds (DNS target validation + HTTP fetch + Firestore update).
Monthly Cloud Function cost at 50 stores: ~₹5-10/month.

---

## Cost Safety

- Feature flag: `ENABLE_MENU_HEALTH_MONITOR` — instant disable
- No recursive triggers (writes to store doc, not project doc)
- HTTP fetch has 15s timeout — prevents hanging invocations
- Public menu target validation requires public HTTPS and rejects DNS-resolved localhost/private/link-local/metadata-style targets before fetch. Local HTTP/HTTPS targets are allowed only in the Functions emulator.
- Canonical active user/tenant/store scope is read before DNS/network work, then re-read inside the transaction that writes `stores.health`. The boundary rejects deleted/inactive/disabled users, removed store membership, malformed IDs, inactive/deleted entities, and a store whose persisted tenant differs from the requested tenant.
- The health-check URL must use the canonical persisted custom-domain hostname or the canonical persisted subdomain under the configured MenuList public base domain. Hostname comparison reuses the same scope reads and adds no Firestore operation.
- Alert cooldown prevents repeated writes for same failure
- Client handoff diagnostics add no Firebase reads, writes, or extra callable invocations. Failed wrapper calls log only bounded store/tenant/public URL presence and length metadata plus normalized source error name/code/status; raw public URLs and provider error payloads are not logged.
- The `verifyMenuPublish` callable returns fixed failure copy for unexpected runtime failures and logs stable `OPERATIONS_VERIFY_MENU_PUBLISH_*` codes with bounded store/tenant/requester/public URL metadata only. This adds no Firestore reads/writes, Storage operations, extra callable invocations, alert writes, or provider calls.
- Menu health target hardening adds one DNS lookup before each valid publish verification fetch and no Firestore reads/writes, Storage operations, provider calls, API routes, cache tags, rules, indexes, schema changes, owner/customer UI, or Vercel deployment. Because this changes Cloud Function source, Firebase Functions deploy is required after validation.
- The July 13 identity/write boundary adds five net Firestore reads per admitted publish: user+tenant+store cheap-fail reads before the network call and the same three transaction reads replace the former single store read. It does not add a collection, index, rule, Storage operation, provider call, cache invalidation, or public DTO. Denied scope performs at most the three cheap-fail reads and no network or write.
- The July 16 recovery correction makes `forceRepublish` await the existing Functions public-cache helper before verification. A successful recovery adds the existing `/api/revalidate/menu` request and, when an initialized screen exists, one screen-summary read plus the existing two screen-version/mirror writes. Missing cache configuration, rejected targets, non-OK responses, or request errors fail with fixed `unavailable` copy and do not perform public verification or the health write. No collection, index, rule, route, scheduler, owner setting, or provider was added; the Functions change requires a scoped Firebase Functions deploy after validation.

Historical June 28, 2026 deploy evidence for shared Functions network-target and menu health target hardening reached Firebase predeploy lint/build and then failed before upload because Firebase could not read `menulist-qa` project metadata through Cloud Resource Manager: HTTP 403, caller does not have permission. Do not reuse the older command shape from that attempt. Current Menu Health Monitor retry evidence must start with `npm run verify:functions-deploy-preflight`; if a menu-health-specific Functions subset is used instead of the External Certification Runbook Gate 1 target set, record the exact scoped `menulist-qa` target list and reason in the production-readiness audit before deploy retry. Production deploys require QA evidence and explicit production deploy approval.
