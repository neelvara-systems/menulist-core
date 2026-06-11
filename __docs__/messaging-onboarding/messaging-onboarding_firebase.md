# Messaging Onboarding — Firebase Cost Tracking

**Feature:** Messaging Onboarding — Zero-Friction SMB Acquisition Engine
**Status:** Implementation-Complete — WhatsApp runtime gated until real provider credentials are configured
**Last Updated:** June 11, 2026
**Priority:** HIGH — Every onboarding session triggers multiple operations. Scales with acquisition volume.

---

## Summary

- **Collections Used:** `messagingOnboardingSessions`, `messagingOnboardingInboundMessages`, `messagingOnboardingRateLimits`, `messagingOnboardingEvents` (tracking), `menuImageProcessingJobs` (reused), `tenants`, `stores`, `users`, `platformSummary`, `systemHealth`, `systemAlerts`
- **Storage Buckets:** `messagingOnboarding/{sessionId}/{fileId}` (uploaded menu media)
- **Cloud Functions:** `messagingOnboardingWebhook` (onRequest, per-provider routes), `menulistMaintenanceScheduler` (scheduled registry: messaging intake + session cleanup), `msgExtractionWatcher` (onDocumentUpdated), `processMenuImagesJob` (reused)
- **Architecture:** Provider-agnostic. All collections shared across providers. `provider` field on session doc identifies source.
- **External APIs:** WhatsApp Cloud API (Meta), Gemini AI (Google)
- **Estimated Monthly Cost:** Medium-High — scales linearly with onboarding volume

---

## Firestore Operations

### Reads

| Operation                          | Collection                      | Trigger                        | Frequency        | Docs Read | Indexed?                                      | Notes                                                     |
| ---------------------------------- | ------------------------------- | ------------------------------ | ---------------- | --------- | --------------------------------------------- | --------------------------------------------------------- |
| Persist/dedup inbound message      | `messagingOnboardingInboundMessages` | Every incoming webhook     | Per message      | 0 normal reads | Direct doc by SHA-256(provider + providerMessageId) | Atomic `create()` by dedup doc ID; duplicate provider retries are acknowledged without a second processing read |
| Drain pending inbound queue        | `messagingOnboardingInboundMessages` | Intake processor / immediate drain | Per queued message | 1 | Yes (`status` + `nextAttemptAt`) | Claims PENDING → PROCESSING before session handling |
| Reset stale inbound processing     | `messagingOnboardingInboundMessages` | Intake processor           | Every 2 min      | 0-20      | Yes (`status` + `processingStartedAt`)        | Recovers interrupted webhook/session processing |
| Find active session for user       | `messagingOnboardingSessions`   | Queued message processing      | Per message      | 1         | Yes (`provider` + `providerUserId` + `state`) | Query: provider=X, userId=Y, state NOT IN (LIVE, EXPIRED) |
| Check rate limits                  | `messagingOnboardingRateLimits` | Every new session creation     | Per new session  | 1         | Direct doc (userHash)                         | Single doc read. Hash = SHA-256 of `{provider}:{userId}`  |
| Check existing owner by phone      | `users`                         | First message from user        | Per new session  | 0-1       | Yes (`phone` field)                           | Finds an existing owner account before creating a messaging session |
| Find sessions ready for processing | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-50      | Yes (`state` + `intakeExpiresAt`)             | Scheduled function queries for intake-expired sessions    |
| Find preview links to resend       | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-10      | Yes (`state` + `previewMessagePending`)       | Retries preview-link delivery if the first provider send failed |
| Find publish confirmations to send | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-10      | Yes (`state` + `confirmationPending`)         | Sends provider confirmation after approval route commits publish |
| Find fix acknowledgements to send  | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-10      | Yes (`state` + `fixMessagePending`)           | Sends provider acknowledgement after preview fix request |
| Find expired sessions              | `messagingOnboardingSessions`   | Cleanup scheduler (daily)      | 1/day            | 0-100     | Yes (`state` + `expiresAt`)                   | Daily batch cleanup                                       |
| Find sessions needing reminder     | `messagingOnboardingSessions`   | Cleanup scheduler (daily)      | 1/day            | 0-50      | Yes (`state` + `reminderSentAt`)              | 12h after preview with no approval                        |
| Read session for preview page      | `messagingOnboardingSessions`   | Preview page load              | Per preview view | 1         | Direct doc                                    | Server-side read in Next.js; rate-limited per session/IP before the read |
| Read extraction job result         | `menuImageProcessingJobs`       | After extraction completes     | Per extraction   | 1         | Direct doc                                    | Polls/listens for job completion                          |
| Read platformSummary for counters  | `platformSummary/summary`       | Publish pipeline               | Per publish      | 1         | Direct doc                                    | Inside Firestore transaction                              |
| Health snapshot control            | `systemHealth/messaging_onboarding_control` | Intake processor | Every 2 min cheap guard; expensive scans hourly | 1 | Direct doc | Prevents the 2-minute scheduler from doing expensive health scans every run |
| Health/cost sample                 | Sessions + events + `systemHealth` | Health monitor | Hourly | Up to 200 sessions + 1000 events + 250 live sessions | Single-field/composite indexes | Bounded sample for cost, publish rate, failure, and retained-source storage monitoring |

### Writes

| Operation                          | Collection                      | Trigger                          | Frequency       | Docs Written | Fields                                                    | Notes                                                         |
| ---------------------------------- | ------------------------------- | -------------------------------- | --------------- | ------------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| Create session                     | `messagingOnboardingSessions`   | First valid upload from new user | Per new session | 1            | Full doc                                                  | ~2-3 KB initial size. Includes `provider` field.              |
| Create inbound queue message       | `messagingOnboardingInboundMessages` | Every unique provider message | Per message | 1 | Sanitized normalized payload, status, attempt counters | Enables provider ACK after durable write and retry drain       |
| Update inbound queue status        | `messagingOnboardingInboundMessages` | Queue claim/process/retry     | Per queued message | 1-2 | status, attempts, nextAttemptAt, processedAt, lastError | Max 5 attempts with backoff                                  |
| Update session (add upload)        | `messagingOnboardingSessions`   | Each media message               | Per upload      | 1            | uploads[], lastUploadAt, intakeExpiresAt                  | Merge update, grows with uploads                              |
| Update session (state change)      | `messagingOnboardingSessions`   | State transitions                | 5-8 per session | 1            | state, stateHistory[], updatedAt                          | Append to stateHistory array                                  |
| Update session (validation result) | `messagingOnboardingSessions`   | After asset intelligence         | Per session     | 1            | validMenuFiles, invalidFiles, extractedBusinessInfo, etc. | Medium write (~1 KB)                                          |
| Update session (extraction result) | `messagingOnboardingSessions`   | After extraction completes       | Per session     | 1            | extractedMenuData, extractedProjectFiles, qualityScore     | Heavy write (~10-80 KB depending on menu size and per-file extraction data) |
| Update session (published result)  | `messagingOnboardingSessions`   | After publish                    | Per publish     | 1            | publishedResult, state=LIVE, delete extractedProjectFiles  | Final update happens inside the publish transaction           |
| Mark preview viewed                | `messagingOnboardingSessions` + `messagingOnboardingEvents` | First preview view only | 0-1 per session | 1 session merge + 1 event | `previewViewedAt`, `PREVIEW_VIEWED` | Repeated page refreshes do not create repeated preview-view events |
| Create/update rate limit           | `messagingOnboardingRateLimits` | Session creation                 | Per new session | 1            | Counters increment                                        | Small doc. Key = SHA-256 of `{provider}:{userId}`             |
| Create extraction job              | `menuImageProcessingJobs`       | After asset validation           | Per extraction  | 1            | Full job doc, `source`, `skipProjectSave`                 | Triggers existing processMenuImagesJob CF without temp project save |
| Create tenant                      | `tenants`                       | Publish pipeline                 | Per publish     | 1            | Full doc                                                  | Inside Firestore transaction                                  |
| Create store                       | `stores`                        | Publish pipeline                 | Per publish     | 1            | Full doc                                                  | Inside Firestore transaction, includes roles, timeSlotPresets |
| Create/update user                 | `users`                         | Publish pipeline                 | Per publish     | 1            | Full doc or merge                                         | Links phone to user account                                   |
| Update platformSummary counters    | `platformSummary/summary`       | Publish pipeline                 | Per publish     | 1            | tenants.count, stores.count                               | Inside Firestore transaction                                  |
| Update storesSummary               | `platformSummary/storesSummary` | Publish pipeline                 | Per publish     | 1            | stores.{storeId}                                          | Merge update, inside transaction                              |
| Create project                     | Project collection              | After publish                    | Per publish     | 1            | Full project with extractedData                           | Heavy write (~50-100 KB)                                      |
| Write health snapshot              | `systemHealth`                  | Health monitor hourly            | Hourly          | 1            | Metrics, cost estimate, source-retention sample, alerts   | Admin-only operational telemetry                              |
| Create system alert                | `systemAlerts`                  | Health threshold breach          | On threshold    | 0-1          | title, severity, subsystem metadata                       | Uses default cooldown to avoid repeated alert spam             |

### Deletes

| Operation                 | Collection                      | Trigger            | Frequency | Docs Deleted           | Soft/Hard                           | Notes                                   |
| ------------------------- | ------------------------------- | ------------------ | --------- | ---------------------- | ----------------------------------- | --------------------------------------- |
| Cleanup expired sessions  | `messagingOnboardingSessions`   | Daily scheduler    | Daily     | 0-50                   | Hard delete (after 30 days archive) | Sessions older than 30 days past expiry |
| Reset rate limit counters | `messagingOnboardingRateLimits` | Daily/weekly reset | Daily     | 0 (update, not delete) | N/A                                 | Reset counters, keep doc                |
| Expire inbound queue docs | `messagingOnboardingInboundMessages` | Firestore TTL on `expiresAt` plus daily scheduler fallback | Continuous + daily | 0-100/day via scheduler fallback | TTL/hard delete | 30-day retention for processed/failed queue docs; scheduler fallback prevents buildup if TTL is delayed |
| Expire tracking events    | `messagingOnboardingEvents`     | Firestore TTL on `expiresAt` | Continuous | N/A | TTL delete | 30-day retention for lifecycle events written by shared logger and API routes |

---

## Onboarding Tracking Events (Internal Observability)

| Operation              | Collection                  | Trigger                  | Frequency         | Docs Written | Notes                                                  |
| ---------------------- | --------------------------- | ------------------------ | ----------------- | ------------ | ------------------------------------------------------ |
| Log lifecycle event    | `messagingOnboardingEvents` | Every significant action | 15-20 per session | 1            | Fire-and-forget, ~0.5-1 KB per event. Non-blocking.    |
| Read events (analysis) | `messagingOnboardingEvents` | On-demand admin queries  | Rare              | 0-100        | Indexed by sessionId, eventType, provider. Admin only. |

**Feature flag:** `ENABLE_MESSAGING_ONBOARDING_TRACKING: true` (ON by default when onboarding is enabled)

**Retention:** shared event logger and preview API routes set `expiresAt` for 30-day TTL. Enable Firestore TTL on `messagingOnboardingEvents.expiresAt` via `scripts/setup-firestore-ttl.sh`.

**Monthly cost impact at 1,000 sessions:** ~₹3 (negligible — 15K-20K writes at ₹15/100K)

---

## Durable Inbound Queue

| Operation              | Collection                            | Trigger                 | Frequency    | Docs Written | Notes |
| ---------------------- | ------------------------------------- | ----------------------- | ------------ | ------------ | ----- |
| Queue inbound message  | `messagingOnboardingInboundMessages`  | Unique provider message | Per message  | 1            | Atomic `create()` by SHA-256(provider + providerMessageId). Stores sanitized normalized payload only. |
| Claim queued message   | `messagingOnboardingInboundMessages`  | Immediate/scheduled drain | Per message | 1            | PENDING → PROCESSING with attempt increment. |
| Finalize queued message | `messagingOnboardingInboundMessages` | Success/failure         | Per message  | 1            | PROCESSED or retry/FAILED with backoff. |

**Retention:** queue docs set `expiresAt` for 30-day TTL. Enable Firestore TTL on `messagingOnboardingInboundMessages.expiresAt` via `scripts/setup-firestore-ttl.sh`. `menulistMaintenanceScheduler.messaging_session_cleanup` also deletes up to 100 expired inbound docs per daily run as a bounded fallback.

---

## Firebase Storage

| Operation                          | Path Pattern                                   | Trigger                             | Size              | Notes                                                                 |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------- | ----------------- | --------------------------------------------------------------------- |
| Upload menu images (from provider) | `messagingOnboarding/{sessionId}/{fileId}.jpg` | Media download via provider adapter | 0.5-5 MB per file | Downloaded by Cloud Function via `IMessagingProvider.downloadMedia()` |
| Upload PDF (from provider)         | `messagingOnboarding/{sessionId}/{fileId}.pdf` | Media download via provider adapter | 0.5-10 MB         | Single file                                                           |
| Read images (extraction)           | Same paths                                     | processMenuImagesJob CF             | —                 | Reads for Gemini extraction                                           |
| Delete expired media               | `messagingOnboarding/{sessionId}/`             | Cleanup scheduler                   | —                 | Deletes media only for expired/non-published sessions                 |
| Retain published source media      | `messagingOnboarding/{sessionId}/`             | Successful publish                  | 0.5-10 MB/file    | Intentional: project file records keep these URLs for dashboard source preview and extraction retry workflows |

---

## Cloud Functions

| Function                        | Trigger                                     | Frequency                 | Duration | Memory | Notes                                                                                          |
| ------------------------------- | ------------------------------------------- | ------------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------- |
| `messagingOnboardingWebhook`    | onRequest (HTTP POST from provider)         | Per incoming message      | <5s ACK; best-effort immediate drain | 256 MB | Verifies provider, writes durable queue doc, then attempts processing. If processing stops, scheduler retries. |
| `menulistMaintenanceScheduler`  | onSchedule (every 2 min)                    | 720/day                   | 5-540s   | 1 GB   | Runs registry tasks: `messaging_intake` every 2 min, `messaging_session_cleanup` daily at 4 AM UTC, and other MenuList maintenance tasks with per-task Firestore leases |
| `msgExtractionWatcher`          | onDocumentUpdated (menuImageProcessingJobs) | Per extraction job update | 1-5s     | 256 MB | Detects extraction completion for `msg-onboarding-*` jobs. Updates session, generates preview. |
| `processMenuImagesJob` (reused) | onDocumentCreated                           | Per extraction            | 30-120s  | 2 GB   | Existing function, reused for messaging onboarding sessions                                    |

---

## External API Costs

### WhatsApp Cloud API (Meta)

| Operation                              | Cost                         | Frequency             | Notes                                          |
| -------------------------------------- | ---------------------------- | --------------------- | ---------------------------------------------- |
| Service conversations (user-initiated) | FREE (1,000/month/WABA)      | Per session           | Owner initiates by sending message             |
| Utility template messages              | ~₹0.30-0.50 per message      | 2-3 per session       | Preview link, publish confirmation             |
| Business-initiated conversations       | ~₹0.50-1.00 per conversation | Rare (reminders only) | Only for 12h reminder if owner doesn't respond |

### Gemini AI (Google)

| Operation                                  | Cost               | Frequency             | Notes                      |
| ------------------------------------------ | ------------------ | --------------------- | -------------------------- |
| Asset Intelligence validation              | ~₹0.50 per session | Per session           | Single multi-image call    |
| Menu extraction (via processMenuImagesJob) | ~₹0.80 per file    | 3-6 files per session | Reused existing extraction |

---

## Security Rules Impact

- `messagingOnboardingSessions` — **Admin SDK only** (Cloud Functions). No client-side access. Rule: `allow read, write: if false;`
- `messagingOnboardingInboundMessages` — **Admin SDK only**. Rule: `allow read, write: if false;`
- `messagingOnboardingRateLimits` — **Admin SDK only**. Rule: `allow read, write: if false;`
- `messagingOnboardingEvents` — **Admin SDK only**. Rule: `allow read, write: if false;` (tracking events)
- `menuImageProcessingJobs` — Existing rules unchanged. Messaging onboarding jobs use admin SDK.
- `tenants`, `stores`, `users` — Existing rules unchanged. Publish pipeline uses admin SDK (inside Cloud Function).
- Storage: `messagingOnboarding/*` — Admin SDK only for writes. Read access for extraction Cloud Function only.

---

## Cost Optimization Notes

### Current Optimizations (Built-In)

- **Reuses existing extraction pipeline** — No duplicate Gemini integration
- **Durable inbound queue** — Webhook ACK happens after an atomic dedup `create()`; retries are handled by the scheduler instead of re-downloading or losing messages
- **No pre-create queue read** — The inbound queue uses the provider-message hash as the document ID, so normal webhook persistence avoids a transaction read before every insert
- **No per-message session dedup write** — Provider-message dedup moved to the inbound queue, so active-session messages no longer append to `providerMessageIds`
- **Firestore TTL fields** — inbound queue docs and lifecycle events set `expiresAt` to prevent long-term metadata storage growth without a cleanup scan
- **Provider-reported file-size precheck** — Oversized files are rejected before provider media download when `fileSize` is available
- **Intake window batching** — Collects all uploads before processing (single extraction job)
- **SHA-256 dedup** — Duplicate images silently ignored (no extra processing cost)
- **Rate limits** — Per-user caps prevent cost explosion from abuse
- **Session expiry + cleanup** — No zombie sessions accumulating storage
- **Asset Intelligence filtering** — Only valid menu files sent to extraction (reduces Gemini calls by ~30%)
- **Single collection for all providers** — No per-provider collection overhead, simpler queries
- **Extraction-only project save skip** — Messaging jobs set `skipProjectSave: true`, so shared extraction avoids the manual-dashboard temp project read/write/verify/delete cycle
- **Hourly health snapshots** — Cost and failure scans are bounded and hourly, not every two-minute scheduler run
- **Published source retention monitor** — Published media is retained because projects reference it; `systemHealth` samples retained bytes and raises alerts instead of deleting live source files blindly

### Potential Future Optimizations

- **Gemini batch API** — If available, batch validation + extraction in fewer calls
- **Image compression before extraction** — Smaller images = cheaper Gemini processing
- **Cached extraction for similar menus** — If same business re-onboards (unlikely but possible)

### Warnings: Expensive Patterns to Watch

- **Re-extraction loops** — Each fix request → new extraction costs full Gemini API. Capped at 3 corrections/session.
- **Large PDFs** — 40-page PDF = 40 Gemini extraction calls = expensive. Asset Intelligence should filter pages first.
- **Intake processor polling** — Runs every 2 minutes. If session count grows, query cost increases. Mitigated by Firestore index.
- **Storage accumulation** — Expired-session cleanup must keep running. Published source files are retained intentionally because the created project references them.
- **Short-lived signed URLs** — Do not use signed URLs for project files. Messaging uploads now store Firebase token URLs so owner dashboard source previews do not break after 24-25 hours.

---

## Cost Estimate (per 1,000 successful onboardings/month)

| Resource                                              | Operations/month          | Unit Cost  | Monthly Cost (₹)    |
| ----------------------------------------------------- | ------------------------- | ---------- | ------------------- |
| Firestore Reads (session queries)                     | 15,000                    | ₹5/100K    | ₹0.75               |
| Firestore Reads (intake processor baseline)           | ~129,600 (6 bounded query/control checks × 720/day × 30) | ₹5/100K | ₹6.48 |
| Firestore Reads (preview + publish)                   | 3,000                     | ₹5/100K    | ₹0.15               |
| Firestore Writes (session updates)                    | 10,000 (avg 10/session)   | ₹15/100K   | ₹1.50               |
| Firestore Writes (inbound queue durability)            | ~15,000 (avg 5 messages/session × 3 queue status writes) | ₹15/100K | ₹2.25 |
| Firestore Writes (publish: tenant+store+user+summary) | 5,000                     | ₹15/100K   | ₹0.75               |
| Firestore Writes (extraction jobs)                    | 4,000                     | ₹15/100K   | ₹0.60               |
| Storage (published source files retained)             | 5 GB (avg 5 MB × 1000)    | ₹2.15/GB   | ₹10.75 first month; cumulative until manual/source-file retention policy changes |
| Cloud Functions (webhook)                             | 5,000 invocations × 3s    | Compute    | ₹5.00               |
| Cloud Functions (intake processor)                    | 21,600 × 10s avg          | Compute    | ₹15.00              |
| Cloud Functions (extraction — reused)                 | 1,000 × 60s avg           | Compute    | ₹40.00              |
| Cloud Functions (cleanup)                             | 30 × 30s                  | Compute    | ₹1.00               |
| **Gemini AI (asset validation)**                      | 1,500 calls               | ₹0.50/call | ₹750.00             |
| **Gemini AI (extraction)**                            | 4,000 calls (avg 4 files) | ₹0.80/call | ₹3,200.00           |
| **WhatsApp API (service conv)**                       | 1,000 free + 500 paid     | ₹0.50/msg  | ₹250.00             |
| **Total**                                             |                           |            | **~₹4,283/month**   |
| **Per successful onboarding**                         |                           |            | **~₹4.28 (~$0.05)** |

> **Note:** Gemini API costs dominate (~92%). Firebase costs are minimal. WhatsApp service conversations are free for the first 1,000/month. Above 1,000 sessions/month, WhatsApp costs increase.

---

## DAL Functions Used

| Function                    | File                                    | Operation Type                |
| --------------------------- | --------------------------------------- | ----------------------------- |
| `createMenuProcessingJob`   | `src/lib/firebase/menuProcessing.ts`    | Manual dashboard/mobile analog. Messaging writes the same `menuImageProcessingJobs` contract via Admin SDK with `skipProjectSave: true` |
| `createDefaultRoles`        | `src/data/defaultRoles.ts`              | Helper (used in publish)      |
| `getDefaultTimeSlotPresets` | `src/config/defaultTimeSlotPresets.ts`  | Helper (used in publish)      |
| `getBusinessCategory`       | `src/constants/common.ts`               | Helper (used in publish)      |
| `syncStoreToSummary`        | `src/database/platformSummary/index.ts` | Write (used in publish)       |

---

## API Routes & Their Firebase Impact

| Route                                  | Method    | Firebase Ops                     | Rate Limited?          | Notes                                                                                                                  |
| -------------------------------------- | --------- | -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `messagingOnboardingWebhook` (CF)      | POST      | 1R + 1W queue write, then best-effort drain | Per-user in Firestore  | ACKs only after durable inbound queue write; session/rate-limit reads happen from queue processing                      |
| `/api/msg-preview/[sessionId]`         | GET       | 1R                               | No (token-based)       | Reads session doc for preview rendering                                                                                |
| `/api/msg-preview/[sessionId]/approve` | POST      | 3-5R + 8-10W                     | Idempotent per attempt | Reads session, checks existing phone user and subdomain, writes tenant+store+user+project+summaries, finalizes session to LIVE in the same transaction, deletes session `extractedProjectFiles`, then revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. May retry if publish fails before commit (recovery to AWAITING_APPROVAL). |
| `/api/msg-preview/[sessionId]/fix`     | POST      | 1R + 1W                          | 3/session max          | Reads session, writes fix request to session                                                                           |
| `menulistMaintenanceScheduler.messaging_intake` (CF task) | scheduled | Queue drain + 1-50R + 0-5W plus one lightweight task lease | N/A | Drains pending inbound messages, reads pending sessions, writes state changes, runs hourly bounded health snapshot |
| `menulistMaintenanceScheduler.messaging_session_cleanup` (CF task) | scheduled | 1-100R + 0-50W + Storage deletes plus one lightweight task lease | N/A | Reads expired sessions, deletes media; runs daily inside the maintenance scheduler |

---

_Document Status: Implementation-Complete (v3.7 — Firebase cost audit removed redundant session dedup writes, added 30-day TTL fields for inbound queue and shared lifecycle events, and aligned source-retention health sampling with the existing Firestore index. Last verified: May 17, 2026.)_
