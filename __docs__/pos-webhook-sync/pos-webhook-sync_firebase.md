# POS Webhook Sync — Firebase Cost Tracking

> **Document Type:** Firebase cost tracking (CRITICAL — directly impacts revenue)
> **Audience:** Founder, developers, cost auditors
> **Status:** Implemented
> **Last Updated:** July 6, 2026
> **Version:** 2.6

---

## Summary

- **Collections Used:** `stores`, `stores/{storeId}/posDeliveryLogs` (subcollection), `menuChangeLog/{tId}/{sId}` for secret-rotation audit events
- **Storage Buckets:** None (no file uploads)
- **Cloud Functions:** None (delivery handled by API routes)
- **External Services:** Outbound HTTP (webhook delivery)
- **Estimated Monthly Cost:** Low (~$1-2 per 1000 active stores with POS sync enabled)

> **Implementation note (July 2, 2026):** `pos_delivery_queue` collection is NOT used. Delivery is handled directly by the `/api/pos-sync/deliver` API route using Admin SDK. No POS Sync Cloud Function delivery worker or retry scheduler is active. See `_impl.md` §14 ADR and §15 inactive worker boundary.

---

## Firestore Operations

### Reads

| Operation                        | Collection                     | Trigger           | Frequency               | Docs Read | Indexed? | Notes                                 |
| -------------------------------- | ------------------------------ | ----------------- | ----------------------- | --------- | -------- | ------------------------------------- |
| Load store POS sync config       | `stores`                       | POS Sync tab open | Per settings page visit | 1         | Yes      | Already loaded by page, no extra read |
| Read webhook config for test/delivery | `stores`                  | API route trigger | Per test/delivery job   | 1         | Yes      | Reads webhook URL + secret, then rejects inactive, soft-deleted, platform-blocked, cross-tenant, or unauthorized target stores before provider validation or outbound fetch |
| Read project data for delivery   | `projects/{tId}/{sId}`         | API route trigger | Per delivery job        | 1         | Yes      | Admin SDK read scoped to request tenant/store/project |
| Load delivery logs (client)      | `stores/{sId}/posDeliveryLogs` | POS Sync tab open | Per settings page visit | 20 max    | Yes      | Last 20 logs, ordered by sentAt       |

### Writes

| Operation                      | Collection                     | Trigger                 | Frequency            | Docs Written | Fields        | Notes                                        |
| ------------------------------ | ------------------------------ | ----------------------- | -------------------- | ------------ | ------------- | -------------------------------------------- |
| Save POS sync config (client)  | `stores`                       | Owner saves settings    | Rare (setup only)    | 1            | merge update  | posSync object fields via updateStore() DAL  |
| Enable POS sync + gen secret   | `stores`                       | Owner enables toggle    | Once per store       | 1            | merge update  | Sets posSync.enabled, webhookSecret (client) |
| Create delivery log (server)   | `stores/{sId}/posDeliveryLogs` | After delivery attempt  | Per delivery attempt | 1            | full document | ~200 bytes per log entry                     |
| Update store sync status       | `stores`                       | After delivery/test (server) | Per delivery/test | 1            | merge update  | lastSentAt where applicable, lastStatus, owner-safe lastError, status |
| Update delivery failure counter | `stores`                      | After delivery/test or connection edit | Per delivery/test/edit | 1 merged with status write | merge update | `posSync.consecutiveFailures` resets on delivery success, test success, or owner URL/secret edits; live delivery failures increment it |
| Increment menuVersion (server) | `stores`                       | Menu change             | Per menu change      | 1            | merge update  | posSync.menuVersion++                        |
| Update instructions count      | `stores`                       | Prepare provider email draft | Max 3/day/store | 1            | merge update  | instructionsSentCount, sentDate (client)     |
| Regenerate secret (client)     | `stores`                       | Owner action            | Very rare            | 1            | merge update  | webhookSecret + latest rotation metadata via updateStore() DAL |
| Log secret rotation audit      | `menuChangeLog/{tId}/{sId}`    | Secret regeneration     | Very rare            | 1            | append-only event | Logs who/when only; never logs secret value |
| Cleanup old delivery logs      | `stores/{sId}/posDeliveryLogs` | On new log write        | Per delivery         | 0-N delete   | batch delete  | Keep max 20, delete oldest if >20            |

### Deletes

| Operation                 | Collection                     | Trigger         | Frequency    | Docs Deleted | Soft/Hard | Notes                               |
| ------------------------- | ------------------------------ | --------------- | ------------ | ------------ | --------- | ----------------------------------- |
| Cleanup old delivery logs | `stores/{sId}/posDeliveryLogs` | New log created | Per delivery | 0-N          | Hard      | Delete docs beyond 20 limit (batch) |

---

## Firebase Storage

No Firebase Storage operations. This feature uses only Firestore and outbound HTTP.

---

## Cloud Functions

> **Status (July 2, 2026):** No Cloud Functions implemented. Delivery is handled directly by the `/api/pos-sync/deliver` API route. POS Sync worker and retry scheduler names below are inactive design notes only.

| Function            | Status   | Notes                                                       |
| ------------------- | -------- | ----------------------------------------------------------- |
| `posDeliveryWorker` | Not active | Currently handled by `/api/pos-sync/deliver` API route      |
| `posRetryScheduler` | Not active | Current runtime uses one attempt per delivery               |

---

## Security Rules Impact

```javascript
// posDeliveryLogs — read by authenticated store owner, write by server only
match /stores/{storeId}/posDeliveryLogs/{logId} {
  allow read: if isAuthenticated() && belongsToStore(storeId);
  allow write: if false;  // API routes use Admin SDK (bypasses rules)
}
```

- `posDeliveryLogs` subcollection is readable by authenticated store owners (for PosSyncTab delivery history)
- Writes to `posDeliveryLogs` are server-only via Admin SDK in `/api/pos-sync/deliver`
- Store document `posSync` fields use existing store security rules (writes via `updateStore()` DAL)

---

## Cost Optimization Notes

### Current Optimizations

- **Debounce (25 sec):** Prevents multiple deliveries for rapid edits. 10 edits = 1 delivery, not 10.
- **Store doc reuse:** POS sync config is part of the store document, which is already loaded on the settings page. No extra read needed for UI display.
- **Subcollection for logs:** Delivery logs in subcollection avoid bloating the store document.
- **Max 20 logs:** Automatic cleanup prevents unbounded growth.
- **Log cleanup:** Automatic batch deletion of logs beyond the 20-entry limit prevents unbounded growth.
- **Scoped project read:** Delivery reads only `projects/{tenantId}/{storeId}/{projectId}` through Admin SDK. No legacy/global project fallback is used in the server route.
- **Webhook URL guard:** Desktop and mobile settings require a public HTTPS endpoint. Server-side test and delivery routes also resolve the validated hostname and reject localhost/private-network DNS targets before project reads, menu-version increments, test payload construction, or outbound fetch.
- **Target-store guard:** Server-side test and delivery routes reuse the existing store config read for `requireAnyStorePermissionForStoreData()`. This adds no extra Firestore read and rejects inactive, soft-deleted, platform-blocked, cross-tenant, or unauthorized target stores before webhook URL validation, project reads, menu-version writes, delivery logs, POS status writes, or outbound fetches.
- **POS Sync target document-ID boundary:** `/api/pos-sync/test` and `/api/pos-sync/deliver` validate caller-supplied tenant/store IDs through `normalizePosSyncNumericDocumentId()` before rate-limit key material, `stores/{storeId}` refs, scoped project refs, menu-version transactions, delivery logs, POS status writes, or provider/webhook work. This rejects malformed, whitespace-mutated, path-shaped, reserved, zero, negative, decimal, or nonnumeric tenant/store IDs as invalid input and adds no Firestore reads/writes/deletes, Storage operations, provider calls, Cloud Functions, cache invalidations, rules, indexes, Firebase deploy requirement, or Vercel deploy action.
- **POS delivery project ID boundary:** `/api/pos-sync/deliver` validates raw `projectId` with the existing POS project-ID character rule plus the shared Firestore document-ID boundary before store config reads, scoped project reads, menu-version writes, delivery logs, POS status writes, or outbound fetches. Malformed IDs, path-shaped IDs, reserved IDs, and whitespace-mutated project IDs fail during request validation. This adds no Firestore reads/writes/deletes for valid deliveries, Storage operations, provider calls, Cloud Functions, cache invalidations, rules, indexes, Firebase deploy requirement, or Vercel deploy action.
- **Limiter-key privacy:** Server-side POS test and delivery routes keep the same store-scoped 10/min and 20/min limits, but store only HMAC-hashed store key material in Upstash. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, or Firebase deploy requirement.
- **Settings save acknowledgements:** Desktop and mobile settings saves require the existing `updateStore()` write to return an acknowledgement before local POS Sync state or success copy changes. Rejected acknowledgements use `desktop_pos_sync_store_update_rejected` or `mobile_pos_sync_store_update_rejected`. This adds no Firestore read/write/delete beyond the existing save attempt.
- **Delivery failure threshold:** Live delivery failures increment `posSync.consecutiveFailures` on the same store status write. First and second failed live deliveries stay quiet for the owner; the third consecutive failed live delivery marks `connection_issue`. Successful delivery, successful connection test, owner URL save, owner secret rotation, and enable/disable changes reset the counter. This adds no new collection, rule, index, Cloud Function, Storage operation, provider call, Firebase deploy requirement, or Vercel deploy action.
- **Mobile save diagnostics:** Failed mobile settings saves log `mobile_pos_sync_settings_save_failed` with bounded URL/secret shape metadata only. This adds no Firestore read/write/delete beyond the existing `updateStore()` save attempt and never logs raw webhook URLs or secrets.
- **Desktop secret-rotation save diagnostics:** Failed desktop secret regeneration saves log `desktop_pos_sync_secret_rotation_save_failed`, roll the local draft secret back, and keep the modal open. This adds no Firestore read/write/delete beyond the existing `updateStore()` save attempt and existing non-blocking MOL audit write, and never logs raw webhook secrets or actor values.
- **Browser handoff diagnostics:** Failed desktop/mobile secret copy, desktop delivery-history load, provider-instruction prep, technical-summary copy, and sample-payload download actions log bounded metadata only. Secret and technical-summary copied feedback waits for Clipboard API success or acknowledged textarea fallback success, with clipboard/fallback support booleans recorded on failure. These add no Firestore read/write/delete beyond the existing delivery-history read attempt and existing settings/audit writes, and never log raw webhook URLs, webhook secrets, provider emails, setup text, or sample payload JSON.
- **Debounced delivery admission:** Client-side debounced delivery requires POS Sync to be enabled with both a provider connection URL and signing secret before calling `/api/pos-sync/deliver`. Misconfigured stores missing the signing secret do not create invalid delivery-route calls after menu saves. This avoids an avoidable API route call plus its store/project reads and status/log writes, and adds no Firestore reads/writes/deletes, Storage operations, API routes, Cloud Function logic, provider calls, rules, indexes, schema fields, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Debounced delivery diagnostics:** Failed client-side debounced delivery requests, non-OK delivery-route responses, and redirected `/api/pos-sync/deliver` handoffs log bounded `pos_sync_delivery_trigger_failed` diagnostics. This adds no Firestore reads/writes/deletes, Storage operations, API routes, Cloud Function logic, provider calls beyond the already-intended delivery request, rules, indexes, schema fields, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Shared test request policy and acknowledgement:** Desktop and mobile connection tests import `POS_SYNC_TEST_REQUEST_POLICY` from `src/lib/posSync/testResponse.ts` before the existing bounded response parser, then show reachable feedback only after an OK HTTP response plus `isSuccessfulPosSyncTestResponse()`. This changes no Firestore reads/writes/deletes, Storage operations, API routes, Cloud Function logic, provider calls, rules, indexes, schema fields, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.
- **Source gate:** POS Sync boundary source gate: `npm run verify:pos-sync-boundary` performs no Firestore reads/writes/deletes, Storage operations, provider calls, Cloud Function logic changes, cache invalidations, or deploy action. It only checks source/docs parity for the public-HTTPS/DNS guard, route auth/tenant/rate-limit order, debounced delivery URL+secret admission, desktop/mobile test-policy reuse, and MobileShell routing. It does not call an external POS provider.

### Potential Optimizations

- **Conditional worker extraction:** Moving delivery into Cloud Functions requires a separate scoped feature, cost review, deploy evidence, and production-host smoke.
- **Conditional menu snapshot:** Only build snapshot if store has posSync.enabled = true (already checked in API route).
- **Payload compression:** For large menus (500+ items), consider gzip compression before sending.

### Expensive Patterns to Watch

- **Large menus (500+ items):** Payload could be 2-5MB. Monitor API route response times.
- **Many outlets per tenant:** If a tenant has 50 outlets all with POS sync, one master menu change could trigger 50 API calls. Debounce helps but monitor.
- **Concurrent deliveries:** If many stores deliver simultaneously, API route concurrency could spike. Rate limiting (20/min per store) mitigates this.

---

## Cost Estimate (per 1000 active stores with POS sync enabled/month)

**Assumptions:**

- Average 3 menu changes per day per store
- Single attempt per delivery (no retry in current implementation)
- Average 20 delivery logs per store
- 1 settings page visit per day per store (average)

| Resource          | Operations/month | Unit Cost  | Monthly Cost |
| ----------------- | ---------------- | ---------- | ------------ |
| Firestore Reads   | 120,000          | $0.06/100K | $0.07        |
| Firestore Writes  | 270,000          | $0.18/100K | $0.49        |
| Firestore Deletes | ~90,000          | $0.02/100K | $0.02        |
| **Total**         |                  |            | **~$0.58**   |

> No Cloud Function costs — delivery handled by API routes (Next.js serverless functions).

### Breakdown per operation

| Operation                          | Monthly per 1000 stores | Reads | Writes | Deletes |
| ---------------------------------- | ----------------------- | ----- | ------ | ------- |
| Read store config (deliver route)  | 90,000                  | 90K   | 0      | 0       |
| Read project data (deliver route)  | 90,000                  | 90K   | 0      | 0       |
| Increment menuVersion (deliver)    | 90,000                  | 0     | 90K    | 0       |
| Create delivery log (deliver)      | 90,000                  | 0     | 90K    | 0       |
| Update store sync status (deliver) | 90,000                  | 0     | 90K    | 0       |
| Load delivery logs (client UI)     | 30,000 (1/day avg)      | 30K   | 0      | 0       |
| Cleanup old logs (deliver)         | ~90,000                 | 0     | 0      | ~90K    |

**Verdict:** Very low cost. Even at 1000 stores, total Firebase cost is ~$0.58/month for this feature. No Cloud Function costs.

---

## Firestore Operations — Server-Side (API Routes)

> Server routes use `admin.firestore()` (Admin SDK). These routes exist because they make outbound HTTP POST requests to external webhook URLs — which cannot be done client-side due to CORS.
> Webhook route guard (June 30, 2026): test and delivery calls validate public HTTPS URLs plus resolved DNS targets, then use manual redirect handling. Redirect responses are handled as connection issues and do not add Firebase reads, writes, or deletes.

| Operation                               | Route                   | Collection                     | Type           |
| --------------------------------------- | ----------------------- | ------------------------------ | -------------- |
| Read store posSync config               | `/api/pos-sync/test`    | `stores/{sId}`                 | Read (1 doc)   |
| Update store status on test result      | `/api/pos-sync/test`    | `stores/{sId}`                 | Write (merge)  |
| Read store config for delivery          | `/api/pos-sync/deliver` | `stores/{sId}`                 | Read (1 doc)   |
| Read scoped project data for delivery   | `/api/pos-sync/deliver` | `projects/{tId}/{sId}/{projectId}` | Read (1 doc) |
| Increment menuVersion                   | `/api/pos-sync/deliver` | `stores/{sId}`                 | Write (merge)  |
| Create delivery log entry               | `/api/pos-sync/deliver` | `stores/{sId}/posDeliveryLogs` | Write (add)    |
| Cleanup old delivery logs (>20)         | `/api/pos-sync/deliver` | `stores/{sId}/posDeliveryLogs` | Delete (batch) |
| Update store sync status/failure counter after delivery | `/api/pos-sync/deliver` | `stores/{sId}` | Write (merge) |

> **Failure-text invariant (Jun 27, 2026):** `posSync.lastError`, POS test responses, delivery responses, and delivery-log `error` values use fixed owner-safe connection text. Provider validation text, HTTP failure text, timeout labels, and exception messages stay out of persisted owner state and API responses; route diagnostics keep bounded status/code metadata only. This changes no Firestore read/write/delete counts.

> **Delivery-threshold invariant (July 2, 2026):** `/api/pos-sync/deliver` increments `posSync.consecutiveFailures` on failed live deliveries and only sets owner-facing `connection_issue` when the counter reaches three. Delivery/test success and owner connection edits reset the counter. This changes only fields on existing store merge writes and adds no Firestore collection, rule, index, Cloud Function, Storage operation, cache invalidation, Firebase deploy requirement, or Vercel deploy action.

> **Network-target invariant (Jun 28, 2026):** POS test and delivery routes perform server-side DNS resolution after static HTTPS validation and reject any blocked hostname or resolved local/private address before project reads, menu-version increments, payload construction, or outbound fetch. This adds one DNS lookup for valid server-side POS test/delivery requests and no Firestore read/write/delete, Storage, Cloud Function, rules, index, schema, or owner-setting change.

> **Browser-handoff invariant (Jun 30, 2026):** Secret-copy, setup-instruction, technical-summary, sample-payload, and delivery-history browser-local failures use bounded diagnostics only. Secret and technical-summary copied feedback waits for Clipboard API success or acknowledged textarea fallback success. This changes no POS Sync Firestore read/write/delete counts, routes, rules, indexes, Cloud Functions, Storage operations, cache invalidation, schema, or owner setting.

> **Test-response/request invariant (Jun 30, 2026; acknowledgement tightened July 1, 2026):** Desktop and mobile POS Sync connection tests import `POS_SYNC_TEST_REQUEST_POLICY` from `src/lib/posSync/testResponse.ts`, call `/api/pos-sync/test` with same-origin credentials, no-store cache policy, and manual redirect handling, then parse responses through the shared 16KB bounded response guard. Successful reachable feedback requires an OK HTTP response plus `isSuccessfulPosSyncTestResponse()`. Malformed, oversized, or invalid acknowledgements use bounded diagnostics only. This changes no POS Sync Firestore read/write/delete counts, route behavior, rate limits, outbound webhook checks, POS status writes, delivery logs, rules, indexes, Cloud Functions, Storage operations, cache invalidation, schema, owner setting, Firebase deploy requirement, or Vercel deploy action.

> **Secret-rotation persistence invariant (Jun 29, 2026):** Desktop secret regeneration shows success only after the existing store update resolves. Failed saves use bounded diagnostics and local rollback only; this changes no Firestore operation count, schema, routes, rules, indexes, Cloud Functions, Storage operations, cache invalidation, Firebase deploy requirement, or Vercel deploy action.

> **Settings-save acknowledgement invariant (Jun 30, 2026):** Desktop toggle, URL save, instruction-count update, secret regeneration, and mobile settings save show success or update local POS Sync state only after the existing `updateStore()` call returns an acknowledged store result. Rejected acknowledgements use bounded diagnostics only. This changes no POS Sync Firestore read/write/delete counts, route behavior, rate limits, outbound webhook checks, POS status writes, delivery logs, rules, indexes, Cloud Functions, Storage operations, cache invalidation, schema, owner setting, Firebase deploy requirement, or Vercel deploy action.

## Firestore Operations — Client-Side (PosSyncTab.tsx)

> These operations were moved from API routes to client-side (Feb 14, 2026) because they are simple Firestore reads/writes with no server-side logic needed. Uses client Firebase SDK via `firebaseClient` + `updateStore()` DAL.

| Operation                      | Component  | Collection                     | Type           |
| ------------------------------ | ---------- | ------------------------------ | -------------- |
| Toggle POS sync on/off         | PosSyncTab | `stores/{sId}`                 | Write (merge)  |
| Save webhook URL               | PosSyncTab | `stores/{sId}`                 | Write (merge)  |
| Regenerate webhook secret      | PosSyncTab | `stores/{sId}`                 | Write (merge)  |
| Log secret rotation audit      | PosSyncTab / MobilePosSyncScreen | `menuChangeLog/{tId}/{sId}` | Write (append) |
| Read delivery logs (last 20)   | PosSyncTab | `stores/{sId}/posDeliveryLogs` | Read (20 docs) |
| Update instructions sent count | PosSyncTab | `stores/{sId}`                 | Write (merge)  |

## API Routes & Their Firebase Impact

| Route                   | Method | Firebase Ops           | Rate Limited? | Notes                                                  |
| ----------------------- | ------ | ---------------------- | ------------- | ------------------------------------------------------ |
| `/api/pos-sync/test`    | POST   | 1R + 1W (store)        | Yes (10/min)  | 8KB body cap, hashed store limiter key, reads config, makes outbound HTTP, updates status |
| `/api/pos-sync/deliver` | POST   | 2R + 3W + batch delete | Yes (20/min)  | 8KB body cap, hashed store limiter key, read config+project, write version+log+status, cleanup |

> **Note (Feb 14, 2026):** Originally had 5 API routes. 3 were removed and moved client-side: `regenerate-secret`, `delivery-history`, `send-instructions`. See `_impl.md` §14 ADR-1 for rationale.

---

**Document Signature:** Firebase Cost Tracking
**Author:** Cascade + Founder
**Last Updated:** June 29, 2026
