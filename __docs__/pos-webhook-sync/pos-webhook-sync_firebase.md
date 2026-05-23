# POS Webhook Sync — Firebase Cost Tracking

> **Document Type:** Firebase cost tracking (CRITICAL — directly impacts revenue)
> **Audience:** Founder, developers, cost auditors
> **Status:** Implemented
> **Last Updated:** May 23, 2026
> **Version:** 2.1

---

## Summary

- **Collections Used:** `stores`, `stores/{storeId}/posDeliveryLogs` (subcollection), `menuChangeLog/{tId}/{sId}` for secret-rotation audit events
- **Storage Buckets:** None (no file uploads)
- **Cloud Functions:** None (deferred — delivery handled by API routes)
- **External Services:** Outbound HTTP (webhook delivery)
- **Estimated Monthly Cost:** Low (~$1-2 per 1000 active stores with POS sync enabled)

> **Implementation note (Feb 14, 2026):** `pos_delivery_queue` collection is NOT used. Delivery is handled directly by the `/api/pos-sync/deliver` API route using Admin SDK. Cloud Functions for delivery worker and retry scheduler are deferred. See `_impl.md` §14 ADR.

---

## Firestore Operations

### Reads

| Operation                        | Collection                     | Trigger           | Frequency               | Docs Read | Indexed? | Notes                                 |
| -------------------------------- | ------------------------------ | ----------------- | ----------------------- | --------- | -------- | ------------------------------------- |
| Load store POS sync config       | `stores`                       | POS Sync tab open | Per settings page visit | 1         | Yes      | Already loaded by page, no extra read |
| Read webhook config for delivery | `stores`                       | API route trigger | Per delivery job        | 1         | Yes      | Reads webhook URL + secret            |
| Read project data for delivery   | `projects`                     | API route trigger | Per delivery job        | 1         | Yes      | Via getProjectData() DAL              |
| Load delivery logs (client)      | `stores/{sId}/posDeliveryLogs` | POS Sync tab open | Per settings page visit | 20 max    | Yes      | Last 20 logs, ordered by sentAt       |

### Writes

| Operation                      | Collection                     | Trigger                 | Frequency            | Docs Written | Fields        | Notes                                        |
| ------------------------------ | ------------------------------ | ----------------------- | -------------------- | ------------ | ------------- | -------------------------------------------- |
| Save POS sync config (client)  | `stores`                       | Owner saves settings    | Rare (setup only)    | 1            | merge update  | posSync object fields via updateStore() DAL  |
| Enable POS sync + gen secret   | `stores`                       | Owner enables toggle    | Once per store       | 1            | merge update  | Sets posSync.enabled, webhookSecret (client) |
| Create delivery log (server)   | `stores/{sId}/posDeliveryLogs` | After delivery attempt  | Per delivery attempt | 1            | full document | ~200 bytes per log entry                     |
| Update store sync status       | `stores`                       | After delivery (server) | Per delivery         | 1            | merge update  | lastSentAt, lastStatus, status               |
| Increment menuVersion (server) | `stores`                       | Menu change             | Per menu change      | 1            | merge update  | posSync.menuVersion++                        |
| Update instructions count      | `stores`                       | Send instructions       | Max 3/day/store      | 1            | merge update  | instructionsSentCount, sentDate (client)     |
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

> **Status (Feb 14, 2026):** No Cloud Functions implemented. Delivery is handled directly by the `/api/pos-sync/deliver` API route. Cloud Functions for delivery worker and retry scheduler are deferred for future implementation.

| Function            | Status   | Notes                                                       |
| ------------------- | -------- | ----------------------------------------------------------- |
| `posDeliveryWorker` | Deferred | Currently handled by `/api/pos-sync/deliver` API route      |
| `posRetryScheduler` | Deferred | Currently single attempt per delivery; multi-retry deferred |

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

### Potential Optimizations

- **Migrate to Cloud Functions:** When ready, move delivery to a Cloud Function triggered by Firestore for better reliability and retry support.
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

| Operation                               | Route                   | Collection                     | Type           |
| --------------------------------------- | ----------------------- | ------------------------------ | -------------- |
| Read store posSync config               | `/api/pos-sync/test`    | `stores/{sId}`                 | Read (1 doc)   |
| Update store status on test success     | `/api/pos-sync/test`    | `stores/{sId}`                 | Write (merge)  |
| Read store config for delivery          | `/api/pos-sync/deliver` | `stores/{sId}`                 | Read (1 doc)   |
| Increment menuVersion                   | `/api/pos-sync/deliver` | `stores/{sId}`                 | Write (merge)  |
| Create delivery log entry               | `/api/pos-sync/deliver` | `stores/{sId}/posDeliveryLogs` | Write (add)    |
| Cleanup old delivery logs (>20)         | `/api/pos-sync/deliver` | `stores/{sId}/posDeliveryLogs` | Delete (batch) |
| Update store sync status after delivery | `/api/pos-sync/deliver` | `stores/{sId}`                 | Write (merge)  |

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
| `/api/pos-sync/test`    | POST   | 1R + 1W (store)        | Yes (10/min)  | Reads config, makes outbound HTTP, updates status      |
| `/api/pos-sync/deliver` | POST   | 2R + 3W + batch delete | Yes (20/min)  | Read config+project, write version+log+status, cleanup |

> **Note (Feb 14, 2026):** Originally had 5 API routes. 3 were removed and moved client-side: `regenerate-secret`, `delivery-history`, `send-instructions`. See `_impl.md` §14 ADR-1 for rationale.

---

**Document Signature:** Firebase Cost Tracking
**Author:** Cascade + Founder
**Last Updated:** May 23, 2026
