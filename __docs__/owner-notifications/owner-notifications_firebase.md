# Owner Notifications - Firebase And Cost Plan

**Status:** Implemented for current owner-notification rollout
**Date:** 2026-06-02
**Audience:** Engineering, platform owner

## Firebase Projects

| Product | Firebase target | Rule |
| --- | --- | --- |
| MenuList | `menulist-qa` project | Owner notification events and deliveries live in MenuList Firestore. |
| Answerlattice | Answerlattice Firebase project | Owner notification events and deliveries live in Answerlattice Firestore. |

Do not mix product data in one collection unless the runtime explicitly requires it and the `productId`/tenant guard is enforced.

## Collections

### `ownerNotificationEvents`

Append-only trigger queue.

MenuList recipient and formatting context reads use canonical top-level `stores/{storeId}` first. The processor keeps a nested tenant-store fallback only for old data compatibility, so normal MenuList delivery does not depend on duplicate store documents under tenants.

June 30, 2026 legacy notification trigger browser request hardening is cost-neutral. `src/lib/notifications/client.ts` still fire-and-forgets `/api/notifications/send` without blocking ticket/message source operations, but the browser POST now uses no-store cache, same-origin credentials, manual redirect handling, and development-only bounded rejected-response diagnostics. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, route behavior, rules, indexes, schema fields, owner settings, Firebase deploy requirement, or Vercel deploy action.

| Field | Type | Cost note |
| --- | --- | --- |
| `productId` | string | Required for product boundary |
| `triggerType` | string | Registry key |
| `tenantId` | string | Scope |
| `storeId` / `workspaceId` | string | Scope |
| `referenceId` | string | Business idempotency reference |
| `dedupeKey` | string | Deterministic direct lookup key |
| `recipientRole` | string | Resolver input |
| `requestedChannels` | array | Optional channel override |
| `metadata` | map | Snapshot only; max size required |
| `priority` | string | Delivery policy |
| `status` | string | pending/processing/delivered/partial/failed/skipped |
| `source` | map | Runtime and path |
| `createdAt` | Timestamp | Sort/audit |
| `updatedAt` | Timestamp | State tracking |
| `expiresAt` | Timestamp | TTL target |

### `ownerNotificationDeliveries`

One document per channel attempt.

| Field | Type | Cost note |
| --- | --- | --- |
| `eventId` | string | Parent event reference |
| `productId` | string | Boundary |
| `triggerType` | string | Debug/filter |
| `channel` | string | email/whatsapp |
| `recipientHash` | string | No raw phone/email in indexes |
| `recipientMasked` | string | Debug-safe display |
| `status` | string | sent/failed/skipped/rate_limited |
| `templateKey` | string | Template registry key |
| `templateVersion` | string | Migration/debug |
| `providerMessageId` | string | Provider result |
| `attempt` | number | Retry count |
| `error` | string | Sanitized local error code only |
| `createdAt` | Timestamp | History |
| `sentAt` | Timestamp | Success |
| `expiresAt` | Timestamp | TTL target |

MenuList Functions delivery processing writes stable local failure codes such as `whatsapp_send_failed`, `owner_notification_processing_failed`, and existing skipped/rate-limit reasons. It does not persist raw SMTP/WhatsApp provider responses, raw Graph API response bodies, raw exception messages, or raw event IDs in diagnostic logs. This changes no collection, index, read/write count, retention field, provider call count, owner setting, public route, or Firestore rule behavior.

Deployment of the June 28, 2026 MenuList Functions processor diagnostic hardening was attempted with `firebase deploy --only functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:verifyMenuPublish --project menulist-qa --non-interactive`. The predeploy lint/build completed, but Firebase failed to read `menulist-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

WhatsApp Graph API endpoint-ID encoding and response parsing hardening adds no Firestore reads/writes/deletes, Storage operations, provider calls, indexes, rules, API routes, owner/customer UI, durable event streams, retention fields, or rate-limit changes. It changes only the URL path construction for existing app-side and Functions WhatsApp delivery calls so configured phone-number IDs are encoded before the `/messages` request, and successful Graph API responses are parsed through a 64KB bounded JSON reader. Delivery rows keep only bounded string provider message IDs. The app-side path requires the normal Next.js deployment path when released; the Functions processor path requires a scoped Firebase Functions deploy after validation.

The June 29 app-side and Functions processor response-parse diagnostics add no Firestore reads/writes/deletes, Storage operations, provider calls, indexes, rules, API routes, owner/customer UI, durable event streams, retention fields, or rate-limit changes. Malformed or oversized successful Graph API JSON still produces a sent delivery without a provider message ID, matching the existing fallback, but now emits `whatsapp_response_parse_failed` with bounded source metadata for production support. The app-side path requires the normal Next.js release path when released; no Vercel deploy was run.

The June 29 platform dashboard response parsing guard adds no Firestore reads/writes/deletes, Storage operations, provider calls, indexes, rules, API routes, owner/customer UI, durable event streams, retention fields, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action. `/api/ops/owner-notifications` load/action response JSON is capped at 256KB in the browser and must match the expected snapshot/action envelope before UI state or success copy changes.

The June 30 platform dashboard message-copy acknowledgement adds no Firestore reads/writes/deletes, Storage operations, provider calls, indexes, rules, API routes, owner/customer UI, durable event streams, retention fields, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action. Prefilled Email/WhatsApp message copy feedback waits for Clipboard API success or acknowledged textarea fallback success, and failed copy diagnostics record only bounded support metadata.

The June 30 platform dashboard request-boundary hardening is browser-local only. It adds no Firestore reads/writes/deletes, Storage operations, provider calls, indexes, rules, API routes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action. The dashboard still uses the same platform-role API and 256KB response cap; browser requests now use no-store cache policy, same-origin credentials, and manual redirect handling before response validation.

The June 30 app-side WhatsApp redirect boundary adds no Firestore reads/writes/deletes, Storage operations, provider calls, indexes, rules, API routes, owner/customer UI, durable event streams, retention fields, Cloud Function logic, Firebase deploy requirement, or Firebase deploy action. It changes only the Next.js app-side Graph API fetch policy to `redirect: 'manual'`, so a provider 3xx response is not followed. No Vercel deploy was run.

Deployment of the June 29, 2026 Functions processor response-parse diagnostic was attempted with `PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions:messagingOnboarding,functions:menulistMaintenanceScheduler,functions:verifyMenuPublish,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring --project menulist-qa --non-interactive`. The predeploy lint/build completed, but Firebase failed to read `menulist-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 28, 2026 Meta Graph endpoint-ID encoding change was attempted with `firebase deploy --only functions:messagingOnboarding,functions:menulistMaintenanceScheduler,functions:verifyMenuPublish,functions:gcpBudgetAlertWebhook,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:triggerSchedulerManually --project menulist-qa --non-interactive`. The predeploy lint/build completed, but Firebase failed to read `menulist-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission.

Deployment of the June 29, 2026 bounded WhatsApp provider JSON response parsing change was attempted with `firebase deploy --only functions:messagingOnboarding,functions:menulistMaintenanceScheduler,functions:verifyMenuPublish,functions:computeDecisionBlocksScores,functions:triggerStoreNightlyScheduler,functions:triggerDecisionBlocksScoring --project menulist-qa --non-interactive`. The predeploy lint/build completed, but Firebase failed to read `menulist-qa` project metadata through Cloud Resource Manager with HTTP 403: caller does not have permission. The app-side WhatsApp sender still requires the normal Next.js release path; no Vercel deploy was run.

### `ownerNotificationRateLimits`

Direct-ID compact counters.

Recommended IDs:

- `daily:{productId}:{scopeId}:{channel}:{yyyyMMdd}`
- `recipient:{productId}:{recipientHash}:{channel}:{yyyyMMdd}`
- `test:{productId}:{scopeId}:{yyyyMMddHH}`

No collection scans should be needed for rate limits.

## Indexes

Implemented rollout uses deterministic document IDs, bounded direct document reads, and single-field status queries for retry/digest helpers. No composite index was added in this pass.

Deferred optional indexes for future admin/support inspection:

| Collection | Index | Purpose |
| --- | --- | --- |
| `ownerNotificationEvents` | `status ASC, createdAt ASC` | Scheduled retry/backfill worker |
| `ownerNotificationEvents` | `productId ASC, tenantId ASC, storeId ASC, createdAt DESC` | Admin/support inspection |
| `ownerNotificationDeliveries` | `eventId ASC, createdAt ASC` | Delivery details for one event |
| `ownerNotificationDeliveries` | `productId ASC, triggerType ASC, createdAt DESC` | Platform debugging |

Idempotency should prefer deterministic document IDs or `dedupeKey` docs, not repeated composite queries.

## Cloud Functions

### MenuList

| Function | Trigger | Purpose |
| --- | --- | --- |
| `sendOwnerLifecycleNotification` | Called from `functions/src/messaging/messagingEngine.ts` | Write event and process delivery inline |
| `processOwnerNotificationEvent` | Internal helper | Deliver one event |
| `retryFailedOwnerNotifications` | Called through existing lifecycle messaging retry helper | Retry bounded failed events |
| `getOwnerNotificationDigest` | Called through existing lifecycle messaging digest helper | Bounded delivery digest |

No new standalone scheduled function was added. Existing deployed Functions that now load this code: `verifyMenuPublish`, `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, `triggerStoreNightlyScheduler`.

### Answerlattice

| Function | Trigger | Purpose |
| --- | --- | --- |
| App-side owner notification core | Called from `src/lib/notifications/index.ts` for owner-test notifications | Write event and process delivery inline in Answerlattice Firestore |
| Answerlattice Functions worker | Not implemented in this pass | Reserved for future Answerlattice Cloud Functions owner triggers |

## Cost Model Per Notification

### Happy path email only

| Operation | Count |
| --- | ---: |
| Event write | 1 |
| Event read by worker | 1 |
| Store/workspace preference read | 1 |
| Dedupe/rate-limit direct reads | 1-3 |
| Rate-limit counter write | 1 |
| Delivery log write | 1 |
| Event status update | 1 |

Estimated Firestore operations: 2-3 reads, 3-4 writes.

### Happy path email + WhatsApp

WhatsApp delivery hashes the canonical international recipient digits, not the owner-entered local display number. This keeps rate limits and delivery rows stable when the same phone is stored as `phone`, `phoneNumber` + `dialCode`, notification settings WhatsApp number, or an explicit manual recipient hint.

| Operation | Count |
| --- | ---: |
| Event write | 1 |
| Event read by worker | 1 |
| Store/workspace preference read | 1 |
| Dedupe/rate-limit direct reads | 2-5 |
| Rate-limit counter writes | 2 |
| Delivery log writes | 2 |
| Event status update | 1 |

Estimated Firestore operations: 4-7 reads, 6 writes.

## Internal Tracking Dashboard Cost

The platform dashboard at `/ops/owner-notifications` is intentionally manual and bounded. POST recovery actions keep the platform-role gate, apply the per-operator limiter with HMAC-hashed key material, and reject bodies above 8KB before event reads, retry processing, manual send enqueueing, or manual handoff writes.

June 30 follow-up: `/api/ops/owner-notifications` query validation, recovery-action rate-limit, and recovery-action validation security events use bounded route metadata instead of raw session/request context. Invalid attempted action text is summarized as presence/length metadata. This changes no Firestore reads/writes/deletes, provider calls, API routes, Cloud Function logic, rules, indexes, Firebase deploy requirement, or Vercel deploy action.

July 1 source gate: `npm run verify:owner-notifications-boundary` checks the owner-notification registry mirror, platform-only route/body/rate-limit boundaries, bounded platform monitor responses, canonical store recipient lookup, WhatsApp response caps, and retention cleanup registration. The verifier does not run Firestore reads/writes, SMTP, WhatsApp, browser smoke, Firebase deploy, or Vercel deploy.

June 29 follow-up: `src/lib/notifications/notificationService.ts` remains a disabled legacy facade. Moving its blocked-call breadcrumbs from the generic logger to bounded notification diagnostics adds no Firestore reads/writes/deletes, no Storage operations, no Firebase Auth operations, no Cloud Function logic changes, no provider calls, no delivery attempts, no rules/indexes/schema changes, and no Firebase deploy requirement.

### List refresh

| Operation | Count |
| --- | ---: |
| Bounded event query | Up to 90 document reads |
| Status count aggregations | 6 aggregation queries |
| Delivery reads | 0 |
| Scope/contact reads | 0 |
| Writes | 0 |

The dashboard does not attach realtime listeners and does not page through the full history.

### Detail drawer

| Operation | Count |
| --- | ---: |
| Direct event read | 1 |
| Delivery query by `eventId` | Up to 12 document reads |
| Store/workspace scope read | 0-1 |
| Writes | 0 |

Full recipient contact is resolved only after one event is selected.

### Recovery actions

| Action | Firebase impact |
| --- | --- |
| Retry | Reuses the central processor: event read, optional scope read, delivery write, status update, and rate-limit direct read/write as needed. |
| Prefilled Email/WhatsApp Web | Uses the selected-event detail response and in-memory template rendering only; opening the external tool adds no Firebase write. |
| Manual system send | Writes one new owner notification event and processes it through the normal channel path. |
| Manual handoff record | Writes one delivery doc and updates the source event with manual handoff audit fields. |

No new composite index, Firestore rule, Storage path, Cloud Function, or scheduler was added for the dashboard.

### Retry

Retry should read only bounded failed/partial events, not all events.

Per retried channel:

- 1 event read
- 1 delivery log write
- 1 event update
- 1 rate-limit direct read/write if the retry is allowed

## Cost At Practical Scale

At 1,000 stores with:

- 2 required email notifications per store per month
- 0.5 critical WhatsApp notifications per store per month
- 200 onboarding WhatsApp sessions per month

Estimated monthly Firestore operations:

| Workload | Reads | Writes |
| --- | ---: | ---: |
| Required email | ~6,000 | ~8,000 |
| Critical email + WhatsApp | ~3,500 | ~3,000 |
| Onboarding WhatsApp delivery logs | ~1,000 | ~1,200 |
| Retries/admin overhead | ~1,000 | ~500 |
| Total | ~11,500 | ~12,700 |

This remains low-cost. Provider costs matter more than Firestore costs for WhatsApp.

## WhatsApp Provider Cost Policy

WhatsApp messages must be limited to owner-critical or owner-initiated messages because provider pricing and template policy can change by country/category.

Rules:

- Do not mirror every email to WhatsApp.
- Do not send advisory notices by WhatsApp by default.
- Use WhatsApp for critical billing risk, publish failure/live state, onboarding state, and exhausted credits only when consent/template rules allow it.
- Log provider category and template key for cost review.

## Security Rules

Client access should be limited.

Recommended MenuList rules:

- Owners may read their own event/delivery summaries only through API first. Direct Firestore read can be added later only if needed.
- Clients must not create notification events directly unless using a tightly scoped API.
- Only server/Admin SDK writes events and delivery logs.
- Default deny for notification collections.

Recommended API path:

- Protected enqueue route with `withAuth()`.
- Cloud Functions/Admin SDK for internal triggers.

## Retention

| Collection | Retention |
| --- | --- |
| `ownerNotificationEvents` | 180 days |
| `ownerNotificationDeliveries` | 180 days |
| `ownerNotificationRateLimits` | 2-14 days based on key |

Use Firestore TTL where available.

## Firebase Deploy Impact

Implementation may require:

- Firestore indexes
- Firestore rules
- Cloud Functions code

Per repo rule, if implementation changes rules, indexes, or Firebase function logic, deploy the matching Firebase target after validation. Documentation preparation alone does not deploy anything.
