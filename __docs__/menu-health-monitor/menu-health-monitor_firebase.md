# Menu Health Monitor — Firebase Cost Analysis

**Created:** February 20, 2026

---

## Cost Model

### Per Publish (healthy)

| Operation                                | Count            | Cost        |
| ---------------------------------------- | ---------------- | ----------- |
| Read store doc (for consecutiveFailures) | 1                | ~₹0.003     |
| Update store.health field                | 1 write          | ~₹0.002     |
| DNS target validation + HTTP fetch to public URL | 0 Firestore cost | ₹0          |
| **Total per healthy publish**            |                  | **~₹0.005** |

### Per Publish (failure detected)

| Operation                    | Count   | Cost       |
| ---------------------------- | ------- | ---------- |
| Read store doc               | 1       | ~₹0.003    |
| Update store.health field    | 1 write | ~₹0.002    |
| Check alert cooldown         | 1 read  | ~₹0.003    |
| Create alert doc             | 1 write | ~₹0.002    |
| **Total per failed publish** |         | **~₹0.01** |

### Monthly Estimates

| Scenario                     | Publishes/day | Monthly Cost |
| ---------------------------- | ------------- | ------------ |
| 20 stores × 2 publishes/day  | 40/day        | ~₹6/month    |
| 50 stores × 3 publishes/day  | 150/day       | ~₹22/month   |
| 200 stores × 3 publishes/day | 600/day       | ~₹90/month   |

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
- Alert cooldown prevents repeated writes for same failure
- Client handoff diagnostics add no Firebase reads, writes, or extra callable invocations. Failed wrapper calls log only bounded store/tenant/public URL presence and length metadata plus normalized source error name/code/status; raw public URLs and provider error payloads are not logged.
- The `verifyMenuPublish` callable returns fixed failure copy for unexpected runtime failures and logs stable `OPERATIONS_VERIFY_MENU_PUBLISH_*` codes with bounded store/tenant/requester/public URL metadata only. This adds no Firestore reads/writes, Storage operations, extra callable invocations, alert writes, or provider calls.
- Menu health target hardening adds one DNS lookup before each valid publish verification fetch and no Firestore reads/writes, Storage operations, provider calls, API routes, cache tags, rules, indexes, schema changes, owner/customer UI, or Vercel deployment. Because this changes Cloud Function source, Firebase Functions deploy is required after validation.

Deployment of the June 28, 2026 shared Functions network-target and menu health target hardening was attempted with `firebase deploy --only functions:messagingOnboarding,functions:menulistMaintenanceScheduler,functions:processMenuImagesJob,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --project menulist-qa --non-interactive`. The predeploy lint/build completed, but Firebase failed to read `menulist-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.
