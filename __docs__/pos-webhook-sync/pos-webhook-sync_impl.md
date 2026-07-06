# POS Webhook Sync — Implementation Plan

> **Document Type:** Technical Blueprint (Developers)
> **Status:** Implemented (Feature flag: `ENABLE_POS_SYNC: true`)
> **Last Updated:** July 6, 2026
> **Version:** 2.14

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    OWNER EDITS MENU                         │
│              (item/price/category/availability)              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│              DEBOUNCE LAYER (25 sec)                         │
│    eventBuilder.ts — wait for edits to settle, then fire    │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│         CLIENT calls POST /api/pos-sync/deliver             │
│         (fire-and-forget, never blocks UI)                  │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│          API ROUTE: /api/pos-sync/deliver                    │
│   1. Auth + tenant verification + 8KB body cap + rate limit │
│   2. Read target store config and re-check store permission  │
│   3. Validate public HTTPS URL + DNS-resolved target         │
│   4. Read tenant/store-scoped project data                   │
│   5. Increment menuVersion on store doc                     │
│   6. Build, sign, and POST webhook payload (5s timeout)      │
│   7. Log result to posDeliveryLogs subcollection            │
│   8. Update store posSync status                            │
└─────────────────────────────────────────────────────────────┘
```

> **Implementation note (July 2, 2026):** No Cloud Function delivery worker or retry scheduler is active. Current delivery uses a direct API route with a single attempt per menu-affecting save. See §14 ADR-1 and §15 for the inactive worker design boundary.

### Data Flow Summary

```
Frontend (menu edit in Editor.tsx)
  → syncChanges() saves project via updateProject()
  → triggerPosSyncDebounced() starts 25s timer when sync is enabled and URL + signing secret exist (eventBuilder.ts)
  → After 25s: POST /api/pos-sync/deliver
  → Server: auth → validate → read store → reject unavailable target stores → validate HTTPS + DNS target → read project → version → build payload → sign → POST webhook without following redirects
  → Server: log to stores/{storeId}/posDeliveryLogs → update posSync status
```

> **Route security note (June 30, 2026):** `/api/pos-sync/test` and `/api/pos-sync/deliver` validate the configured public HTTPS URL, resolve the target host server-side, and use manual redirect handling. A 3xx provider response is treated as a failed provider response instead of being followed to a new target.

> **Target-store note (July 1, 2026):** Both POS API routes re-run `requireAnyStorePermissionForStoreData()` against the canonical `stores/{storeId}` document after body validation and the store read. Inactive, soft-deleted, platform-blocked, cross-tenant, or unauthorized target stores fail before webhook URL validation, project reads, menu-version writes, delivery logs, POS status writes, or outbound fetches.

> **Target document-ID boundary (July 6, 2026):** `/api/pos-sync/test` and `/api/pos-sync/deliver` validate caller-supplied tenant/store IDs through `normalizePosSyncNumericDocumentId()` before rate-limit key material, `stores/{storeId}` refs, `projects/{tenantId}/{storeId}/{projectId}` refs, menu-version transactions, delivery logs, POS status writes, or webhook provider work. The guard requires an exact positive numeric MenuList ID and the shared Firestore document-ID boundary, so whitespace-mutated, path-shaped, reserved, zero, negative, decimal, or nonnumeric IDs fail as invalid input before Firestore or outbound work. Valid permissions, tenant access, public HTTPS/DNS checks, signed payloads, delivery-log retention, failure threshold, test ping, and response shape are unchanged.

> **Project ID boundary (July 5, 2026):** POS delivery project ID boundary validation uses the shared Firestore document-ID guard after the existing POS project-ID character rule. Malformed, path-shaped, or reserved project IDs fail during request validation before store config reads, scoped project reads, menu-version writes, delivery logs, POS status writes, or outbound fetches.

> **Source gate (July 2, 2026):** POS Sync boundary source gate: `npm run verify:pos-sync-boundary` locks the public-HTTPS and DNS target guard, route auth/tenant/rate-limit order, debounced delivery URL+secret admission, desktop/mobile shared test request policy, MobileShell More routing, and docs/audit parity. The gate is source-only and does not call an external POS provider.

---

## 2. ChatGPT Analysis & Cascade Adjustments

### Agreements

| ChatGPT Suggestion                      | Cascade Verdict | Notes                                                      |
| --------------------------------------- | --------------- | ---------------------------------------------------------- |
| Full snapshot only (no delta)           | AGREE           | Permanent decision. Simplest, most reliable.               |
| Store-level only                        | AGREE           | Industry standard. Each outlet may use different POS.      |
| Async delivery through API route        | AGREE           | Never block UI. Current runtime calls the delivery route directly after debounce. |
| HMAC-SHA256 signature                   | AGREE           | Industry standard (Stripe, GitHub, Shopify model).         |
| Retry with backoff                      | CONDITIONAL     | Not active. Requires a separate worker implementation before automatic retries exist. |
| Debounce 25 sec                         | AGREE           | Prevents rapid-fire webhooks during bulk edits.            |
| Silent operation (no toasts)            | AGREE           | Aligns with MenuList doctrine. Infrastructure = invisible. |
| Test webhook with real payload          | AGREE           | Critical for activation. Prevents 80% support issues.      |
| Send instructions email                 | AGREE           | Smart activation accelerator for India/SEA market.         |
| Public docs page                        | AGREE           | Long-term asset. POS vendors will reference it.            |
| Mark "connection_issue" (not disable)   | AGREE           | Correct. Toggle stays ON but status = unhealthy.           |

### Disagreements / Adjustments

| ChatGPT Suggestion                      | Cascade Adjustment             | Reason                                                                                                                                                      |
| --------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Separate `pos_event_queue` collection   | Use `pos_delivery_queue` only  | One collection for queue + one for logs is sufficient. No event queue.                                                                                      |
| Complex internal architecture (6 files) | Simplified to 3 core lib files | `eventBuilder.ts`, `payloadFormatter.ts`, `signature.ts`. No separate `deliveryQueue.ts`, `retryWorker.ts`, `logWriter.ts` — those live in Cloud Functions. |
| WhatsApp share button                   | Separate scoped addition       | Copy technical summary covers this use case. WhatsApp deep-link adds complexity.                                                                            |
| Payload preview panel                   | Out of current runtime         | Sample download covers developer needs.                                                                                                                     |
| Auto-detection of POS vendor            | Rejected for now               | Only useful at scale. Zero value for initial launch.                                                                                                        |

---

## 2.5 Cascade's Independent Analysis (Web Search + Codebase Review)

### Industry Research (Feb 13, 2026)

Searched and reviewed: Toast POS menus webhook, Lightspeed HMAC webhook docs, Shopify webhooks guide (2025), integrate.io webhook best practices, apidog signature verification guide, Delivery Hero POS integration docs.

### What the Industry Does

**Toast POS (market leader):** Uses a **notify-then-pull** pattern — webhook sends a tiny notification (`restaurantGuid` + `publishedDate`), then the receiver calls Toast's API to fetch the full menu. This requires Toast to maintain a public API + auth for receivers.

**Our approach (full snapshot in payload):** We send the **complete menu in the webhook body**. This is actually **better for MenuList's context** because:

- No API to build/maintain (simpler architecture)
- No additional auth tokens for POS to manage
- One HTTP request = full menu (no round trips)
- POS vendors don't need to implement a polling client
- Smaller SMB POS systems can just receive and apply — zero integration work on their side

**Verdict:** Full-snapshot-in-payload is the right choice for MenuList. Toast's pull pattern makes sense when you're a POS platform with thousands of integrations. MenuList is upstream-authority broadcasting truth — the simpler pattern wins.

### Security Improvements (from web research)

| Finding                                                           | Source               | Our Status                               | Action Needed                                 |
| ----------------------------------------------------------------- | -------------------- | ---------------------------------------- | --------------------------------------------- |
| Use `crypto.timingSafeEqual()` not `===` for signature comparison | apidog, Stripe docs  | Not yet implemented                      | Add to POS vendor docs + our own test route   |
| Sign the **raw body bytes**, not parsed+re-stringified JSON       | apidog, Stripe docs  | Documented in spec                       | Critical: must use raw body in Cloud Function |
| Include timestamp in signature for replay protection              | apidog, GitHub docs  | Added `X-MenuList-Timestamp` header      | POS should reject events >5 min old           |
| Add delivery ID for idempotency                                   | integrate.io         | Added `X-MenuList-Delivery-Id` header    | POS can deduplicate using this                |
| Exponential backoff needs **jitter**                              | integrate.io         | Missing                                  | Add random jitter to retry delays             |
| Fast ACK pattern (respond 2xx quickly, process async)             | integrate.io, GitHub | Documented in POS vendor guide           | Recommend in public docs                      |
| SHA-1 is deprecated — SHA-256 only                                | apidog               | Already using SHA-256                    | Correct ✅                                    |
| Store secrets in env vars, never in code                          | apidog               | webhookSecret in Firestore (server-side) | Correct ✅                                    |

### Jitter Addition to Retry Schedule

```typescript
// BEFORE (no jitter — all failing stores retry at same time)
const RETRY_DELAYS_MS = [0, 30_000, 120_000, 600_000, 3_600_000];

// AFTER (with jitter — prevents retry storms)
function getRetryDelay(attempt: number): number {
  const BASE_DELAYS = [0, 30_000, 120_000, 600_000, 3_600_000];
  const base = BASE_DELAYS[attempt] || 3_600_000;
  const jitter = Math.random() * base * 0.2; // ±20% jitter
  return base + jitter;
}
```

### Replay Attack Protection (New Header)

```typescript
// When sending:
const timestamp = Math.floor(Date.now() / 1000);
headers["X-MenuList-Timestamp"] = timestamp.toString();

// Signature covers: timestamp + body
const signatureInput = `${timestamp}.${rawBody}`;
const signature = crypto
  .createHmac("sha256", secret)
  .update(signatureInput)
  .digest("hex");

// POS should verify timestamp is within 5 minutes
```

### Existing Codebase Reference: ShareModal Pattern

The existing `ShareModal.tsx` + `getOutputJson()` in `src/components/templates/main-app/projects/utils/excelUtils.ts` already implements a manual version of menu data sharing:

```
ShareModal.handleSubmit()
  → getOutputJson(projectData)
    → Iterates projectData.files[].extractedData.data
    → Combines categories + items + languages
    → Deduplicates by ID
  → fetch(userUrl, { method: 'POST', body: JSON.stringify(data) })
```

**Key differences for POS Sync:**

| Aspect     | ShareModal (existing)           | POS Sync (new)                        |
| ---------- | ------------------------------- | ------------------------------------- |
| Trigger    | Manual button click             | Automatic on menu change              |
| Auth       | None (public endpoint)          | HMAC-SHA256 signed                    |
| Payload    | Subset (name, desc, price only) | ALL fields (full ExtractedDataItem)   |
| Retry      | None                            | Single attempt per menu-affecting save |
| Delivery   | Client-side fetch               | API route (server-side)               |
| Debounce   | None                            | 25 sec                                |
| Logging    | None                            | Last 20 deliveries tracked            |
| Versioning | None                            | menuVersion integer                   |

**The `getOutputJson()` function is the starting point** for the payload builder, but POS Sync's `payloadFormatter.ts` must:

1. Include ALL item fields (images, tags, attributes, duration, available, isBestSeller, orderIndex)
2. Include ALL category fields (images, timeSlots, orderIndex)
3. Strip only internal fields (`descriptionSource`, `ownerBoost`, processing metadata)
4. Add envelope fields (event, version, timestamp, tenantId, storeId, currency, languages)
5. Resolve `currency` from the store's selected `currencyCode` for live deliveries, test pings, sample downloads, and public pull API parity.

### What We're Doing Right (Confirmed by Research)

1. **Full snapshot** — eliminates sync corruption, simpler than delta
2. **HMAC-SHA256** — industry standard (Stripe, GitHub, Shopify, Lightspeed all use it)
3. **Async delivery** — API route handles delivery without blocking UI
4. **Atomic versioning** — Firestore transaction prevents duplicate versions on concurrent deliveries
5. **Version number** — enables idempotency on receiver side
6. **Store-level isolation** — each outlet independently configured
7. **Silent operation** — no UI noise when healthy
8. **Payload size monitoring** — internal warning log when payload > 1MB

### What We Should Add (From Research)

1. ✅ **Jitter on retries** — documented for the inactive worker design, not current runtime
2. ✅ **Timestamp in signature** — replay attack protection
3. ✅ **Delivery ID header** — receiver-side idempotency
4. ✅ **Raw body signing** — documented, must enforce in implementation
5. ✅ **timingSafeEqual** — documented for POS vendor verification guide
6. ⬜ **Consider: Gzip for large menus** — 500+ items could be 2-5MB; gzip reduces to ~200KB (defer to implementation)
7. ⬜ **Consider: Polling fallback recommendation** — Toast recommends POS also poll every 30 min as safety net (document in public docs, don't build)

---

## 3. Database Schema

### 3.1 Store Document Extension

**Collection:** `stores`
**Document:** `{storeId}`

Add `posSync` field to existing store document:

```typescript
// Added to store document
posSync: {
  enabled: boolean; // Master toggle
  webhookUrl: string; // POS endpoint URL
  webhookSecret: string; // Auto-generated HMAC secret (whsec_...)
  status: "healthy" | "retrying" | "connection_issue" | "disabled";
  lastSentAt: Timestamp | null; // Last successful delivery
  lastStatus: "success" | "failed" | "never_sent";
  lastError: string; // Owner-safe connection status text only; no provider/runtime detail
  menuVersion: number; // Current menu version (incremented on change)
  consecutiveFailures: number; // Failed live deliveries in a row; reset on success or connection edit
  instructionsSentCount: number; // Daily counter for email abuse protection
  instructionsSentDate: string; // YYYY-MM-DD for daily reset
  secretRotatedAt?: string; // ISO timestamp of latest owner-triggered secret rotation
  secretRotatedByEmail?: string; // Actor email for latest secret rotation audit metadata
  secretRotatedByUserId?: string; // Actor user id for latest secret rotation audit metadata
}
```

### 3.2 Delivery Queue Collection (Inactive Worker Design Only)

> **Status (July 2, 2026):** This schema is not active. The `POS_DELIVERY_QUEUE` constant exists in `database.ts`, but no current code reads or writes to this collection. Current delivery uses the direct `/api/pos-sync/deliver` route. See ADR-1 and ADR-9.

**Collection:** `pos_delivery_queue`
**Document ID:** Auto-generated

```typescript
{
  storeId: number;
  tId: number;
  projectId: string;
  menuVersion: number;
  status: "pending" | "processing" | "completed" | "failed";
  attempt: number; // Current attempt (1-5)
  maxAttempts: 5;
  payload: string; // JSON stringified menu snapshot
  createdOn: Timestamp;
  processedAt: Timestamp | null;
  nextRetryAt: Timestamp | null;
  lastError: string | null; // Worker mode: stable code/owner-safe text only; no provider/runtime detail
  webhookUrl: string; // Snapshot at time of creation
  webhookSecret: string; // Snapshot at time of creation
}
```

### 3.3 Delivery Logs Subcollection

**Collection:** `stores/{storeId}/posDeliveryLogs`
**Document ID:** Auto-generated
**Retention:** Keep last 20 per store. **Hard delete** older entries on every new log write (batch delete, not archive, not soft delete). Simple retention — no TTL, no archival.

```typescript
{
  deliveryId: string;
  menuVersion: number;
  status: "success" | "failed" | "timeout";
  responseCode: number | null;
  attempt: number;
  sentAt: Timestamp;
  duration: number; // milliseconds
  error: string | null; // Owner-safe connection status text only; no provider/runtime detail
  payloadSize: number; // bytes
  payloadHash: string; // sha256 of raw payload — for debugging & no-op detection
}
```

> **payloadHash (added Mar 14, 2026):** sha256 hash of the raw JSON payload. Enables: (1) skip redundant deliveries if hash matches last delivery, (2) debug "POS says menu mismatch" without storing full payload, (3) detect data drift over time. See ADR-10.

---

## 4. API Contracts

### 4.1 Test Webhook

**Route:** `POST /api/pos-sync/test`
**Auth:** `withAuth()` + `verifyTenantAccess()`
**Admission:** auth and permission guard first, then 8KB bounded JSON body before request validation, POS config reads, or outbound fetch. Test and delivery limiter keys stay store-scoped but store only HMAC-hashed store key material in Upstash.

```typescript
// Request
const schema = z.object({
  storeId: z.number().positive(),
  tenantId: z.number().positive(),
});

// Response (200)
{
  success: boolean;
  statusCode: number | null; // HTTP response from POS, or null when no response was received
  responseTime: number;      // ms
  error?: string;
}
```

### 4.2 Save POS Sync Config

Uses existing `updateStore()` DAL function. No separate API route needed.

Desktop and mobile settings saves must require an acknowledged `updateStore()` result before local POS Sync state or success copy changes. Rejected acknowledgements use bounded codes such as `desktop_pos_sync_store_update_rejected` and `mobile_pos_sync_store_update_rejected`. Desktop `posSync.*` Firestore update fields must also be reflected back into local `storeDetails.posSync`, not stored as literal dotted keys on the local store object.

Mobile settings saves use the same DAL path. Failed mobile saves must log `mobile_pos_sync_settings_save_failed` through bounded mobile owner diagnostics with store/tenant presence, status shape, enabled-state booleans, webhook URL/secret presence-length metadata, pending-secret-rotation presence, and changed-field booleans only. Raw webhook URLs, webhook secrets, provider responses, API response text, and exception text must not be logged.

Desktop toggle, provider URL save, instruction-count update, and secret regeneration are immediate persistence actions. Success copy must only show after the `updateStore()` callback resolves and the acknowledgement guard passes. Failed toggle saves log `desktop_pos_sync_toggle_save_failed` and roll local toggle/secret draft state back; failed URL saves log `desktop_pos_sync_url_save_failed`; failed secret saves log `desktop_pos_sync_secret_rotation_save_failed` and keep the modal open. Raw webhook URLs, webhook secrets, actor email values, provider responses, API response text, and exception text must not be logged. Secret-rotation MOL audit logging remains non-blocking through the shared MOL logger.

Browser-local setup handoffs are also bounded. Desktop delivery-history load failures log `desktop_pos_sync_delivery_history_load_failed`; desktop secret copy, provider-instruction prep, technical-summary copy, and sample-payload download failures log `desktop_pos_sync_secret_copy_failed`, `desktop_pos_sync_instructions_prepare_failed`, `desktop_pos_sync_technical_summary_copy_failed`, and `desktop_pos_sync_sample_download_failed`. Mobile secret-copy failures log `mobile_pos_sync_secret_copy_failed`. Desktop secret/technical-summary copied feedback and mobile secret copied feedback must wait for Clipboard API success or acknowledged textarea fallback success. Copy diagnostics record only bounded store/tenant, secret presence/length, setup text length, sample payload length, provider email presence/length, status, clipboard/fallback support booleans, and source error metadata. They must not log raw webhook URLs, webhook secrets, provider emails, setup text, sample payload JSON, provider responses, API response text, or exception text.

Desktop and mobile connection-test responses are bounded before UI state updates. Both surfaces use the shared `POS_SYNC_TEST_REQUEST_POLICY` from `src/lib/posSync/testResponse.ts`, then parse `/api/pos-sync/test` through `readJsonResponseWithLimit()` with a 16KB cap and the shared `isPosSyncTestResponse()` guard. Successful reachable feedback requires both an OK HTTP response and the shared `isSuccessfulPosSyncTestResponse()` acknowledgement, including `success: true`, finite `responseTime`, and numeric `statusCode`. Malformed or oversized responses log `desktop_pos_sync_test_response_parse_failed` / `mobile_pos_sync_test_response_parse_failed`; invalid successful acknowledgements log `desktop_pos_sync_test_response_invalid` / `mobile_pos_sync_test_response_invalid`. The owner still sees only `Could not reach connected system`.

June 29 follow-up: `/api/pos-sync/test` and `/api/pos-sync/deliver` hash the store limiter key segment before calling the shared limiter. The 10/min test limit, 20/min delivery limit, auth/permission/tenant gates, bounded body cap, webhook validation, DNS target guard, signing, owner-safe failure copy, delivery logging, and POS status writes remain unchanged; raw store IDs must not be stored in limiter key names.

**Fields saved via store update:**

```typescript
posSync: {
  enabled: boolean;
  webhookUrl: string;
  webhookSecret: string; // Auto-generated on first enable
  consecutiveFailures: number; // Reset when the owner changes URL/secret or a delivery/test succeeds
  // Other fields set by system
}
```

### 4.3 Client-Side Operations (No API Routes)

> **Decision (Feb 14, 2026):** These operations were originally 3 separate API routes but were moved to client-side because they are simple Firestore reads/writes that don't require server-side logic like outbound HTTP calls. See §11 Architecture Decision Record for full rationale.

**Regenerate Secret** — Client-side `crypto.getRandomValues()` + `updateStore()` DAL. No API route needed.

**Delivery History** — Client-side Firestore query on `stores/{storeId}/posDeliveryLogs` subcollection using `collection()` + `orderBy('sentAt', 'desc')` + `limit(20)`. No API route needed.

**Send Instructions** — Client-side counter update via `updateStore()` DAL plus a `mailto:` draft opened on the owner's device. Tracks `posSync.instructionsSentCount` and `posSync.instructionsSentDate` for daily rate limiting (max 3/day). No server-side email service exists in the current runtime.

---

## 5. File Structure

### Frontend Files

```
src/
├── config/
│   └── features.ts                          # Add ENABLE_POS_SYNC flag
├── components/
│   └── templates/
│       └── main-app/
│           └── businessSettings/
│               └── tabs/
│                   ├── PosSyncTab.tsx        # NEW: Main POS Sync settings tab
│                   └── index.ts             # MODIFY: Export PosSyncTab
├── lib/
│   └── posSync/
│       ├── types.ts                         # NEW: Shared POS sync types
│       ├── eventBuilder.ts                  # NEW: Client-side debounce trigger
│       ├── payloadFormatter.ts              # NEW: Build full menu snapshot
│       └── signature.ts                     # NEW: HMAC-SHA256 signing utility
├── app/
│   └── api/
│       └── pos-sync/
│           ├── test/route.ts                # Server-side: Test webhook (outbound HTTP)
│           └── deliver/route.ts             # Server-side: Deliver snapshot (outbound HTTP)
```

> **Note:** `regenerate-secret`, `delivery-history`, and `send-instructions` routes were removed (Feb 14, 2026). These operations are handled client-side in PosSyncTab.tsx. See §11 Architecture Decision Record.

### Modified Existing Files

```
src/
├── components/templates/main-app/businessSettings/
│   ├── index.tsx                            # MODIFY: Add PosSyncTab + updateStore DAL callback
│   └── tabs/index.ts                       # MODIFY: Export PosSyncTab
├── components/templates/main-app/projects/
│   └── editorView/Editor.tsx                # MODIFY: Call triggerPosSyncDebounced in syncChanges
├── config/features.ts                       # MODIFY: Add ENABLE_POS_SYNC
├── constants/database.ts                    # MODIFY: Add POS_DELIVERY_QUEUE collection
├── types/platform/store.ts                  # MODIFY: Add posSync field to StoreDataType
```

---

## 6. Security Checklist

| Rule | Requirement                    | Implementation                                          |
| ---- | ------------------------------ | ------------------------------------------------------- |
| R1   | `withAuth()` on all API routes | Both server routes (`test`, `deliver`) use `withAuth()` |
| R2   | `verifyTenantAccess()`         | Both routes verify tenant+store ownership               |
| R3   | Zod input validation           | Both request bodies validated with Zod schemas          |
| R4   | Security event logging         | Failed auth + rate limit violations logged              |
| R5   | Rate limiting                  | Test: 10/min, Deliver: 20/min                           |
| R7   | No sensitive data in logs      | Webhook secrets never logged or returned                |
| R9   | Generic error messages         | "Invalid request" not "Store not found"                 |
| R18  | Secure logging                 | `secureLog`/`secureError` throughout                    |
| R20  | Simple solutions               | Only 2 server routes; 3 ops moved client-side           |

### Webhook Secret Security

- Generated using `crypto.randomBytes(32).toString('hex')` prefixed with `whsec_`
- Stored in store document (server-side only)
- Shown to owner once on generation (copy button)
- Never transmitted in webhook payload
- Used only for HMAC-SHA256 signature computation

---

## 7. Implementation Status

### Implementation Status (All DONE — Feb 14, 2026)

| Task                                       | File                                            | Status  |
| ------------------------------------------ | ----------------------------------------------- | ------- |
| Add `ENABLE_POS_SYNC` feature flag         | `src/config/features.ts`                        | ✅ DONE |
| Add delivery constants to DB_COLLECTIONS   | `src/constants/database.ts`                     | ✅ DONE |
| Add `posSync` to `StoreDataType`           | `src/types/platform/store.ts`                   | ✅ DONE |
| Create shared types                        | `src/lib/posSync/types.ts`                      | ✅ DONE |
| Create signature utility                   | `src/lib/posSync/signature.ts`                  | ✅ DONE |
| Create payload formatter                   | `src/lib/posSync/payloadFormatter.ts`           | ✅ DONE |
| Create event builder (debounce)            | `src/lib/posSync/eventBuilder.ts`               | ✅ DONE |
| Create test webhook API route              | `src/app/api/pos-sync/test/route.ts`            | ✅ DONE |
| Create deliver API route                   | `src/app/api/pos-sync/deliver/route.ts`         | ✅ DONE |
| Create PosSyncTab component                | `src/components/.../tabs/PosSyncTab.tsx`        | ✅ DONE |
| Add PosSyncTab to BusinessSettings         | `src/components/.../businessSettings/index.tsx` | ✅ DONE |
| Wire triggerPosSyncDebounced to editor     | `src/components/.../editorView/Editor.tsx`      | ✅ DONE |
| Track live delivery failure threshold      | `src/app/api/pos-sync/deliver/route.ts`         | ✅ DONE |

### Not in Current Runtime

| Capability                           | Current boundary                              |
| ------------------------------------ | --------------------------------------------- |
| Cloud Function delivery worker       | API route handles delivery directly           |
| Cloud Function retry scheduler       | Single delivery attempt per menu-affecting save |
| Public POS sync docs page            | Technical docs remain in this repo            |
| Server email template for instructions | Owner-device `mailto:` draft plus counter tracking |

---

## 8. Debounce System Design

```
Edit 1 (t=0s)    → Set timer: 25s
Edit 2 (t=3s)    → Reset timer: 25s from now
Edit 3 (t=10s)   → Reset timer: 25s from now
...no more edits...
Timer fires (t=35s) → POST /api/pos-sync/deliver

Result: 1 webhook sent for all edits
```

**Current implementation: Client-side debounce + delivery API route**

- After menu save, `triggerPosSyncDebounced()` receives the current store POS Sync config
- It exits unless POS Sync is enabled and both provider connection URL and signing secret exist
- It waits 25 seconds after the last edit
- On fire, it calls `/api/pos-sync/deliver` with same-origin credentials, `no-store` cache, and manual redirect handling
- The delivery route validates auth, tenant, store state, public HTTPS URL, resolved DNS target, and scoped project data before outbound delivery

**Inactive worker design boundary**

- `pos_delivery_queue` is not read or written by current code
- No Cloud Function trigger or scheduler exists for POS Sync delivery
- If owner closes the browser before the debounce fires, the next menu-affecting save creates the next delivery attempt

---

## 9. Retry Schedule

> **Current implementation (July 2, 2026):** Single attempt per delivery. Failed live deliveries increment `posSync.consecutiveFailures`; only the third consecutive live delivery failure marks `connection_issue`. No automatic retry worker exists.

```
Current reality:
- Single attempt only
- No automatic retries
- Failed live delivery #1 and #2: logged, `lastStatus = failed`, no owner warning
- Failed live delivery #3: `connection_issue` shown
- Successful delivery or successful connection test resets `consecutiveFailures` to 0
- Owner connection URL/secret edits reset `consecutiveFailures` to 0
- Invalid/blocked provider URL configuration marks `connection_issue` immediately
- Next menu edit creates a new delivery attempt
```

**Inactive worker retry design:**

```typescript
// CONDITIONAL WORKER MODE — not active in current runtime
const BASE_RETRY_DELAYS_MS = [
  0, // Attempt 1: immediate
  30_000, // Attempt 2: 30 seconds
  120_000, // Attempt 3: 2 minutes
  600_000, // Attempt 4: 10 minutes
  3_600_000, // Attempt 5: 1 hour
];

const MAX_ATTEMPTS = 5;

// Add jitter to prevent retry storms (from web research: integrate.io best practices)
function getRetryDelay(attempt: number): number {
  const base = BASE_RETRY_DELAYS_MS[attempt] || 3_600_000;
  const jitter = Math.random() * base * 0.2; // ±20% jitter
  return Math.floor(base + jitter);
}
```

If a worker implementation is added under a separate audited scope, after 5 failed attempts:

1. Mark delivery job as `failed`
2. Update store's `posSync.status` to `connection_issue`
3. Stop retrying
4. Next menu change creates a NEW delivery job (fresh retry cycle)

---

## 10. Signature Verification (for POS vendors)

**How POS should verify:**

⚠️ **CRITICAL:** Signature must be verified against the **raw request body** (before JSON parsing), not `JSON.stringify(parsedBody)`. Key ordering and whitespace differences will break verification.

```javascript
// Node.js example for POS vendor
const crypto = require("crypto");
const express = require("express");
const app = express();

// IMPORTANT: Capture raw body BEFORE JSON parsing
app.use(
  "/webhook/menulist",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);

function verifySignature(rawBody, timestamp, signature, secret) {
  // 1. Check timestamp freshness (reject replays > 5 min old)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false; // Timestamp too old or too far ahead
  }

  // 2. Compute expected signature (timestamp + '.' + rawBody)
  const signatureInput = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signatureInput)
    .digest("hex");

  // 3. Constant-time comparison (prevents timing attacks)
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Webhook handler:
app.post("/webhook/menulist", (req, res) => {
  const signature = req.headers["x-menulist-signature"];
  const timestamp = req.headers["x-menulist-timestamp"];
  const deliveryId = req.headers["x-menulist-delivery-id"];

  // Verify signature
  const isValid = verifySignature(
    req.rawBody,
    timestamp,
    signature,
    process.env.MENULIST_SECRET,
  );

  if (!isValid) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  // Optional: Check deliveryId for idempotency
  // if (alreadyProcessed(deliveryId)) return res.status(200).json({ received: true });

  // ACK immediately (best practice: process async)
  res.status(200).json({ received: true });

  // Process menu update asynchronously
  const { menu, version, event } = req.body;
  if (event === "test.ping") {
    console.log("Test ping received, version:", version);
    return;
  }

  // Replace full menu in POS (version-based: skip if version <= current)
  processMenuUpdate(menu, version);
});
```

### Python example (FastAPI)

```python
import hmac
import hashlib
import time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
MENULIST_SECRET = os.environ['MENULIST_SECRET']

@app.post('/webhook/menulist')
async def menulist_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get('x-menulist-signature', '')
    timestamp = request.headers.get('x-menulist-timestamp', '')

    # Check timestamp freshness
    if abs(time.time() - int(timestamp)) > 300:
        raise HTTPException(status_code=401, detail='Timestamp too old')

    # Verify signature
    signature_input = f'{timestamp}.{raw_body.decode("utf-8")}'
    expected = hmac.new(
        MENULIST_SECRET.encode(), signature_input.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail='Invalid signature')

    # ACK and process
    payload = await request.json()
    # process_menu_update(payload['menu'], payload['version'])
    return {'received': True}
```

---

## 11. Email Template Structure

**Subject:** `MenuList POS Menu Sync — Setup Instructions for {Business Name}`

**Recipients:**

- To: POS provider email
- CC: Store owner email

**Sections:**

1. Introduction (what MenuList is, what this email is about)
2. Client details (business name, store name, city, contact)
3. What MenuList sends (full menu snapshot explanation)
4. Technical details (endpoint requirements, headers, signature verification)
5. Sample payload (JSON)
6. Setup steps (1-5 numbered steps for POS developer)
7. Documentation link (`menulist.ai/pos-sync`)
8. Boundary statement ("For POS configuration, coordinate directly with your client")

**Abuse protection:** Max 3 provider email drafts per day per store, tracked via `instructionsSentCount` and `instructionsSentDate` on store document.

---

## 12. Testing Guide

### Manual Testing Checklist

| Test Case                               | Expected Result                          |
| --------------------------------------- | ---------------------------------------- |
| Explanation layer renders first         | Owner sees value copy, diagram, trust bullets, and "Who should use this?" before technical fields |
| Enable External Sync toggle             | Secret auto-generated, fields enabled    |
| Enter provider connection URL           | Public HTTPS URL saved on form submit; localhost/private-network URLs rejected, and server routes reject DNS targets that resolve to local/private addresses before outbound fetch |
| Click "Test connection" with valid URL  | Success message, log entry created       |
| Click "Test connection" with invalid URL | Owner-safe connection failure shown; route logs bounded diagnostic code |
| Edit menu item price                    | Delivery job created after debounce      |
| Edit 5 items in 10 seconds              | Only 1 delivery job created (debounce)   |
| Webhook returns 200                     | Status: success, log entry: 200          |
| Webhook returns 500 once or twice       | Attempt logged, `lastStatus` becomes `failed`, owner warning stays quiet |
| Webhook returns 500 three times in a row | Third failed live delivery changes status to `connection_issue`, owner-safe connection failure stored |
| Webhook times out (>5s)                 | Timeout logged by status/code only; third consecutive live delivery failure changes status to `connection_issue` |
| Next menu change after a failure        | Creates a fresh single delivery attempt and increments the failure counter only if it fails |
| Fix URL, click "Send Test" successfully | Status recovers to "healthy"             |
| Regenerate secret                       | New secret generated, masked by default, old one invalidated, rotation metadata and MOL audit event stored |
| Send instructions (first time)          | Owner email draft opens, counter = 1     |
| Send instructions (4th time same day)   | Blocked: "Maximum 3 sends per day"       |
| Disable POS sync toggle                 | All delivery stops, status = disabled    |
| Menu version increments                 | Version in payload matches store version |
| Delivery logs show last 20              | Oldest entries cleaned up                |

---

## 13. Runtime Boundary Tracking

| Runtime area                 | Status   | Notes                                         |
| ---------------------------- | -------- | --------------------------------------------- |
| Core infrastructure          | ✅ DONE  | Feature flag + lib files + types              |
| API routes                   | ✅ DONE  | 2 server routes (test + deliver)              |
| Frontend UI                  | ✅ DONE  | PosSyncTab + BusinessSettings + Editor wiring |
| Delivery failure threshold   | ✅ DONE  | `posSync.consecutiveFailures` gates live delivery warnings |
| Public docs route            | Not active | Technical docs remain in repo docs            |
| Server email delivery        | Not active | Owner-device `mailto:` draft is the current runtime |

---

## 14. Architecture Decision Record (ADR)

> **Purpose:** This section captures the WHY behind every non-obvious decision made during POS Sync implementation. This is the single source of truth for later sessions — if you're wondering "why was it built this way?", the answer is here.

### ADR-1: Why Only 2 Server-Side API Routes (Not 5)

**Date:** Feb 14, 2026
**Decision:** Keep `test` and `deliver` as server-side API routes. Move `regenerate-secret`, `delivery-history`, and `send-instructions` to client-side.

**Context:** Initially built 5 API routes following the security-first pattern (all operations through authenticated server routes). During review, founder asked: "are these really needed server-side?"

**Reasoning:**

- `test` and `deliver` **must** be server-side because they make **outbound HTTP POST requests to external URLs** — browser CORS policies block arbitrary cross-origin POST requests from the client.
- `regenerate-secret` is just `crypto.getRandomValues()` + a Firestore write. The client already generates secrets on first enable using the same approach. No server logic needed.
- `delivery-history` is a simple Firestore subcollection read (`stores/{storeId}/posDeliveryLogs`). Client SDK handles this directly.
- `send-instructions` is currently a Firestore counter update plus an owner-device `mailto:` draft. No server logic needed.

**Trade-off:** Moving to client-side means Firestore security rules must allow reads/writes to the subcollection. Server routes bypassed rules via Admin SDK. Acceptable because the client is already authenticated and the store document is already writable by the owner.

### ADR-2: Why Client-Side Debounce (Not Server-Side)

**Date:** Feb 13, 2026
**Decision:** Use client-side 25-second debounce in `eventBuilder.ts`, not server-side Cloud Function.

**Reasoning:**

- Simpler architecture — no Cloud Function scheduler needed
- If owner closes browser mid-edit, next save triggers sync anyway
- 25 seconds chosen to batch rapid edits without excessive delay
- Non-blocking failure — POS sync never blocks the UI or shows errors to owner, but failed debounced delivery requests, non-OK delivery responses, and redirected `/api/pos-sync/deliver` handoffs log bounded `pos_sync_delivery_trigger_failed` diagnostics with store/tenant/project presence-length metadata only.

### ADR-3: Why Full Snapshot (Not Delta/Partial Updates)

**Date:** Feb 13, 2026
**Decision:** Every delivery sends the complete menu (all categories + items), never partial/delta updates.

**Reasoning:**

- **Simplicity:** No state tracking needed. POS always has the full picture.
- **Reliability:** If any delivery fails, next one is self-healing (contains everything).
- **POS vendor simplicity:** Vendors do a full replace, no merge logic needed.
- **3-Year Freeze compliance:** Delta sync would require version tracking, conflict resolution — over-engineering for the use case.

### ADR-4: Why posDeliveryLogs Subcollection (Not Top-Level Collection)

**Date:** Feb 13, 2026
**Decision:** Delivery logs stored at `stores/{storeId}/posDeliveryLogs`, not in `posDeliveryQueue` top-level collection.

**Reasoning:**

- **Per-store isolation:** Each store's logs are naturally scoped
- **Auto-cleanup:** Easy to limit to 20 per store (query + batch delete)
- **No cross-store queries needed:** Logs are only read by the owning store
- **Cost:** Reads are per-store, not scanning a large shared collection

### ADR-5: Why updateStore() DAL Directly (Not form.setFieldValue)

**Date:** Feb 13, 2026
**Decision:** POS Sync tab uses `updateStore()` DAL directly in the `onStoreUpdate` callback, not `form.setFieldValue`.

**Reasoning:**

- BusinessSettings uses an Ant Design form that saves on the global "Save" button click
- POS Sync toggle and URL save must persist **immediately** to Firestore
- If we used `form.setFieldValue`, the change would be lost if the owner navigates away without clicking Save
- Direct DAL call ensures immediate persistence for critical config changes

### ADR-6: Why webhookSecret Must Never Be in API Responses

**Date:** Feb 13, 2026 (Bug fix during review)
**Decision:** The `send-instructions` route (now removed) originally returned `webhookSecret` in its JSON response. This was a security vulnerability.

**Reasoning:**

- Webhook secrets should only be generated and stored — never echoed back in HTTP responses
- The client already has the secret from the store document (client-side Firestore read)
- API responses could be logged by proxies, CDNs, or browser extensions
- Follows the principle: "secrets are write-only, never read back through APIs"
- Owner-facing settings must also avoid showing the full secret by default. Desktop and mobile show a truncated preview, provide a deliberate reveal action, preserve latest rotation metadata (`secretRotatedAt`, `secretRotatedByUserId`, `secretRotatedByEmail`) on the same store write, and append a `POS_SYNC_SECRET_REGENERATED` MOL event without logging the secret value.

### ADR-7: Why .gitignore Blocked "logs" Route Name

**Date:** Feb 13, 2026
**Decision:** Renamed `/api/pos-sync/logs` to `/api/pos-sync/delivery-history` (later removed entirely).

**Reasoning:**

- The project's `.gitignore` contains a `logs` pattern that matches directories named "logs"
- This caused the `src/app/api/pos-sync/logs/` directory to be git-ignored
- Renamed to `delivery-history` to avoid the conflict
- Later the entire route was removed (moved to client-side), making this moot

### ADR-8: Why No Separate DAL Functions for POS Sync

**Date:** Feb 13, 2026
**Decision:** POS sync Firestore operations are inline in API route handlers and PosSyncTab, not in separate DAL functions in `src/database/stores/`.

**Reasoning:**

- Rule 20 (Simple Solutions): Only 2 server routes with straightforward Firestore ops
- Creating `createDeliveryJob()`, `getDeliveryLogs()`, `updatePosSyncStatus()` etc. would add 6+ functions for what amounts to simple reads/writes
- The operations are specific to POS sync and not reused elsewhere
- If POS sync grows in complexity, DAL functions can be extracted then

### ADR-9: Why No Separate Event Ledger (menu_events) for POS Sync

**Date:** Mar 14, 2026 (ChatGPT audit)
**Decision:** Do NOT create a separate `menu_events` collection for POS sync. Use existing MOL (Menu Observation Log) instead.

**Context:** ChatGPT suggested creating an event ledger (`menu_events`) for infrastructure-grade webhook reliability. This is a correct architectural principle — but MenuList already has it.

**Existing infrastructure:**

- `menuChangeLog/{tId}/{sId}/{entryId}` — Append-only change entries with `MenuChangeType` union (PRICE, AVAILABILITY, ITEM_ADDED, ITEM_DELETED, etc.)
- `menuSnapshots/{tId}/{sId}/{snapshotId}` — Immutable point-in-time menu state on every publish
- Both collections are already populated by `updateProject()` in `src/database/projects/index.ts`

**Why this is sufficient:**

- MOL records every menu mutation — same purpose as ChatGPT's proposed `menu_events`
- `menuSnapshots` provides the exact "canonical state" that ChatGPT wanted as a separate doc
- Adding a third event system would duplicate data and create maintenance burden
- If event subscriptions are ever needed, MOL is the hook point

### ADR-10: Why payloadHash on Delivery Logs (Not Store Document)

**Date:** Mar 14, 2026 (ChatGPT audit)
**Decision:** Store `payloadHash` (sha256 of raw payload) on each delivery log entry, not on the store document.

**Reasoning:**

- Hash per delivery enables: skip no-op deliveries, debug mismatches, detect drift
- On store doc would only track "last" hash — loses history
- On delivery log preserves full hash timeline for debugging
- Cheap: one string field per delivery log entry, no additional reads

### ADR-11: Why 3 Failed Live Deliveries Before connection_issue

**Date:** Mar 14, 2026 (ChatGPT audit)
**Decision:** Use three failed live deliveries in a row before marking `connection_issue`.

**Context:** Original implementation updated the owner-facing status too aggressively. ChatGPT correctly identified this as noisy for transient network problems.

**Reasoning:**

- Network glitches happen — single timeout shouldn't alarm the owner
- Three failed live deliveries in a row = genuine connectivity problem (not transient)
- Prevents false alarms in the UI
- Owner still gets immediate feedback from test button (instant status)
- Implementation: track `consecutiveFailures` count on store's `posSync`, reset on delivery success, test success, or owner connection edits

### ADR-12: Why extractedData IS the Canonical Menu State

**Date:** Mar 14, 2026 (ChatGPT audit)
**Decision:** Reject ChatGPT's suggestion to create a separate `stores/{storeId}/menuState` document. Continue building POS payload from `project.files[].extractedData`.

**Context:** ChatGPT suggested the payload builder should read from a "canonical menu state" doc, not "extraction artifacts". This misunderstands our data model.

**Why extractedData IS canonical:**

- AI extraction writes the initial data, but the owner **edits in place** on the same structure
- `extractedData.data.categories[]` and `extractedData.data.items[]` contain the owner's current menu truth
- There is no separate "raw extraction" vs "edited" layer — edits mutate extractedData directly
- This IS the canonical state — it's what renders on the public menu, what MCE validates, what MOL tracks
- Creating a separate `menuState` doc would require syncing two sources of truth — exactly what we avoid

**Conditional note:** If extraction pipeline ever separates raw AI output from edited state, revisit this decision under a scoped architecture review.

---

## 15. Inactive Worker Architecture Boundary

> **Status:** Design only. Not active in the current runtime. Do not treat this as approved implementation scope.

ChatGPT correctly identified that client-side delivery creates a browser dependency. The ideal architecture removes this:

```
Current runtime:
  Editor save → client debounce (25s) → POST /api/pos-sync/deliver → webhook

Conditional worker mode:
  Editor save → updateProject() → Firestore write
  → Cloud Function onDocumentUpdated trigger
  → Enqueue to pos_delivery_queue
  → Worker CF (every 30s) → process queue → webhook delivery
  → Delivery smoothing: scheduledAt = now + random(0-20s)
  → Worker concurrency: max 50 concurrent deliveries
```

**Admission evidence required before worker mode exists:**

- 100+ active stores using POS sync
- Evidence of browser-crash-related missed deliveries
- Need for multi-attempt retry (current: single attempt)
- Scoped docs, source changes, cost review, Firebase deploy evidence, and production-host smoke

**What worker mode would add:**

1. **Server-driven trigger** — Cloud Function on project update, not browser debounce
2. **Real queue** — `pos_delivery_queue` collection becomes active (schema already designed in §3.2)
3. **Worker** — Scheduled CF processes queue, handles retries with jitter
4. **Delivery smoothing** — Random 0-20s offset prevents burst storms at peak edit times
5. **Concurrency cap** — Max 50 concurrent webhook deliveries to prevent API saturation

**What worker mode would NOT change:**

- Payload format (same full snapshot)
- Signature scheme (same HMAC-SHA256)
- Delivery logs (same subcollection)
- UI (same PosSyncTab)
- Feature flag (same ENABLE_POS_SYNC)

---

## 15. Revision History

### v2.13 — July 2, 2026

- Live delivery failures now track `posSync.consecutiveFailures`.
- First and second failed live deliveries stay owner-quiet while still logging the failed delivery; the third failed live delivery in a row sets `connection_issue`.
- Successful delivery, successful connection test, owner URL save, owner secret rotation, and enable/disable changes reset the counter.
- Active docs no longer present Cloud Function delivery/retry workers or `pos_delivery_queue` as current runtime scope.

### v2.6 — June 28, 2026

- Server-side POS test and delivery routes now resolve the validated webhook hostname before outbound fetch.
- DNS targets that resolve to localhost, private, link-local, or metadata-style network addresses are rejected before project reads, menu-version increments, payload building, or provider delivery.
- Rejections keep the existing owner-safe connection issue copy and bounded diagnostic metadata.

### v2.8 — June 29, 2026

- Desktop and mobile POS Sync browser-local setup handoffs now log bounded diagnostics for failed secret copy, delivery-history load, provider-instruction prep, technical-summary copy, and sample-payload download. Secret and technical-summary copied feedback waits for Clipboard API success or acknowledged textarea fallback success.
- Successful POS Sync settings, test, delivery, secret generation/rotation, provider email draft, and sample payload behavior remain unchanged.

### v2.9 — June 29, 2026

- Desktop POS Sync secret regeneration now waits for the store save before closing the modal or showing success.
- Failed desktop secret-rotation saves log `desktop_pos_sync_secret_rotation_save_failed`, roll the local secret back, and keep raw webhook secrets and actor values out of diagnostics.
- Successful secret generation, MOL audit logging, POS tests, delivery routes, and browser setup handoffs remain unchanged.

### v2.10 — June 29, 2026

- Client-side debounced delivery failures are now observable through bounded `pos_sync_delivery_trigger_failed` diagnostics.
- Non-OK `/api/pos-sync/deliver` responses throw the coded `pos_sync_delivery_request_rejected` source error so failed delivery requests are not hidden behind a resolved fetch.
- The owner UI remains non-blocking and silent; the debounce interval and server delivery route remain unchanged.

### v2.11 — June 29, 2026

- Desktop and mobile POS Sync connection tests now parse `/api/pos-sync/test` responses through a shared 16KB bounded response guard before showing a successful reachable result.
- Malformed, oversized, or invalid test acknowledgements log bounded desktop/mobile diagnostics and keep raw provider responses, API response text, webhook URLs, and webhook secrets out of logs.

### v2.12 — July 2, 2026

- Client-side debounced delivery now requires the store POS Sync config to include both a provider connection URL and signing secret before calling `/api/pos-sync/deliver`.
- Misconfigured stores with a missing signing secret no longer create repeated invalid delivery-route calls after menu saves. Valid delivery behavior, server-side fail-closed checks, debounce timing, payload shape, delivery logs, and owner-visible status behavior are unchanged.
- Successful POS tests, route auth/rate limits, outbound webhook checks, POS status writes, and delivery logging remain unchanged.

### v2.12 — June 30, 2026

- Desktop POS Sync toggle, provider URL save, instruction-count update, and secret regeneration now route through an acknowledged `updateStore()` callback before success copy or local nested `posSync` state changes.
- Mobile POS Sync settings saves now require `assertStoreUpdateSucceeded()` before local state or saved copy changes.
- Successful POS Sync settings, tests, delivery routes, webhook payloads, delivery logs, and secret audit behavior remain unchanged.

### v2.13 — June 30, 2026

- Desktop and mobile POS Sync connection-test requests now use same-origin credentials, no-store cache policy, and manual redirect handling before the existing 16KB bounded acknowledgement guard.
- Desktop and mobile POS Sync connection-test success now requires the shared successful-response acknowledgement guard plus an OK HTTP response before showing reachable feedback.
- Successful POS tests, route auth/rate limits, outbound webhook checks, POS status writes, and delivery logging remain unchanged.

### v2.14 — June 30, 2026

- `src/lib/posSync/testResponse.ts` now owns `POS_SYNC_TEST_REQUEST_POLICY` alongside the shared response cap and shape guard.
- Desktop and mobile POS Sync connection tests import that shared policy instead of carrying duplicate local policy constants.
- Successful POS tests, settings saves, route auth/rate limits, outbound webhook checks, POS status writes, delivery logs, Firestore rules/indexes, Cloud Functions, Firebase deployment, and Vercel deployment remain unchanged.

---

**Document Signature:** Technical Implementation Blueprint
**Author:** Cascade + Founder
**Last Updated:** June 30, 2026
