# Messaging Onboarding — Firebase Cost Tracking

**Feature:** Messaging Onboarding — Zero-Friction SMB Acquisition Engine  
**Status:** Draft — Documentation Phase  
**Last Updated:** February 17, 2026  
**Priority:** HIGH — Every onboarding session triggers multiple operations. Scales with acquisition volume.

---

## Summary

- **Collections Used:** `messagingOnboardingSessions`, `messagingOnboardingRateLimits`, `messagingOnboardingEvents` (tracking), `menuImageProcessingJobs` (reused), `tenants`, `stores`, `users`, `platformSummary`
- **Storage Buckets:** `messagingOnboarding/{sessionId}/{fileId}` (uploaded menu media)
- **Cloud Functions:** `messagingOnboardingWebhook` (onRequest, per-provider routes), `msgIntakeProcessor` (scheduled), `msgSessionCleanup` (scheduled), `msgExtractionWatcher` (onDocumentUpdated), `processMenuImagesJob` (reused)
- **Architecture:** Provider-agnostic. All collections shared across providers. `provider` field on session doc identifies source.
- **External APIs:** WhatsApp Cloud API (Meta), Gemini AI (Google)
- **Estimated Monthly Cost:** Medium-High — scales linearly with onboarding volume

---

## Firestore Operations

### Reads

| Operation                          | Collection                      | Trigger                        | Frequency        | Docs Read | Indexed?                                      | Notes                                                     |
| ---------------------------------- | ------------------------------- | ------------------------------ | ---------------- | --------- | --------------------------------------------- | --------------------------------------------------------- |
| Find active session for user       | `messagingOnboardingSessions`   | Every incoming message         | Per message      | 1         | Yes (`provider` + `providerUserId` + `state`) | Query: provider=X, userId=Y, state NOT IN (LIVE, EXPIRED) |
| Check rate limits                  | `messagingOnboardingRateLimits` | Every new session creation     | Per new session  | 1         | Direct doc (userHash)                         | Single doc read. Hash = SHA-256 of `{provider}:{userId}`  |
| Check existing store for user      | `stores`                        | First message from user        | Per new session  | 0-1       | Yes (`phone` field)                           | Checks if user already owns a store                       |
| Find sessions ready for processing | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-50      | Yes (`state` + `intakeExpiresAt`)             | Scheduled function queries for intake-expired sessions    |
| Find expired sessions              | `messagingOnboardingSessions`   | Cleanup scheduler (daily)      | 1/day            | 0-100     | Yes (`state` + `expiresAt`)                   | Daily batch cleanup                                       |
| Find sessions needing reminder     | `messagingOnboardingSessions`   | Cleanup scheduler (daily)      | 1/day            | 0-50      | Yes (`state` + `reminderSentAt`)              | 12h after preview with no approval                        |
| Read session for preview page      | `messagingOnboardingSessions`   | Preview page load              | Per preview view | 1         | Direct doc                                    | Server-side read in Next.js                               |
| Read extraction job result         | `menuImageProcessingJobs`       | After extraction completes     | Per extraction   | 1         | Direct doc                                    | Polls/listens for job completion                          |
| Read platformSummary for counters  | `platformSummary/summary`       | Publish pipeline               | Per publish      | 1         | Direct doc                                    | Inside Firestore transaction                              |

### Writes

| Operation                          | Collection                      | Trigger                          | Frequency       | Docs Written | Fields                                                    | Notes                                                         |
| ---------------------------------- | ------------------------------- | -------------------------------- | --------------- | ------------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| Create session                     | `messagingOnboardingSessions`   | First valid upload from new user | Per new session | 1            | Full doc                                                  | ~2-3 KB initial size. Includes `provider` field.              |
| Update session (add upload)        | `messagingOnboardingSessions`   | Each media message               | Per upload      | 1            | uploads[], lastUploadAt, intakeExpiresAt                  | Merge update, grows with uploads                              |
| Update session (state change)      | `messagingOnboardingSessions`   | State transitions                | 5-8 per session | 1            | state, stateHistory[], updatedAt                          | Append to stateHistory array                                  |
| Update session (validation result) | `messagingOnboardingSessions`   | After asset intelligence         | Per session     | 1            | validMenuFiles, invalidFiles, extractedBusinessInfo, etc. | Medium write (~1 KB)                                          |
| Update session (extraction result) | `messagingOnboardingSessions`   | After extraction completes       | Per session     | 1            | extractedMenuData, qualityScore                           | Heavy write (~10-50 KB depending on menu size)                |
| Update session (published result)  | `messagingOnboardingSessions`   | After publish                    | Per publish     | 1            | publishedResult, state=LIVE                               | Final update                                                  |
| Create/update rate limit           | `messagingOnboardingRateLimits` | Session creation                 | Per new session | 1            | Counters increment                                        | Small doc. Key = SHA-256 of `{provider}:{userId}`             |
| Create extraction job              | `menuImageProcessingJobs`       | After asset validation           | Per extraction  | 1            | Full job doc                                              | Triggers existing processMenuImagesJob CF                     |
| Create tenant                      | `tenants`                       | Publish pipeline                 | Per publish     | 1            | Full doc                                                  | Inside Firestore transaction                                  |
| Create store                       | `stores`                        | Publish pipeline                 | Per publish     | 1            | Full doc                                                  | Inside Firestore transaction, includes roles, timeSlotPresets |
| Create/update user                 | `users`                         | Publish pipeline                 | Per publish     | 1            | Full doc or merge                                         | Links phone to user account                                   |
| Update platformSummary counters    | `platformSummary/summary`       | Publish pipeline                 | Per publish     | 1            | tenants.count, stores.count                               | Inside Firestore transaction                                  |
| Update storesSummary               | `platformSummary/storesSummary` | Publish pipeline                 | Per publish     | 1            | stores.{storeId}                                          | Merge update, inside transaction                              |
| Create project                     | Project collection              | After publish                    | Per publish     | 1            | Full project with extractedData                           | Heavy write (~50-100 KB)                                      |

### Deletes

| Operation                 | Collection                      | Trigger            | Frequency | Docs Deleted           | Soft/Hard                           | Notes                                   |
| ------------------------- | ------------------------------- | ------------------ | --------- | ---------------------- | ----------------------------------- | --------------------------------------- |
| Cleanup expired sessions  | `messagingOnboardingSessions`   | Daily scheduler    | Daily     | 0-50                   | Hard delete (after 30 days archive) | Sessions older than 30 days past expiry |
| Reset rate limit counters | `messagingOnboardingRateLimits` | Daily/weekly reset | Daily     | 0 (update, not delete) | N/A                                 | Reset counters, keep doc                |
| Purge old tracking events | `messagingOnboardingEvents`     | Cleanup scheduler  | Daily     | 0-100                  | Hard delete (events >365 days old)  | Only for expired/failed sessions        |

---

## Onboarding Tracking Events (Internal Observability)

| Operation              | Collection                  | Trigger                  | Frequency         | Docs Written | Notes                                                  |
| ---------------------- | --------------------------- | ------------------------ | ----------------- | ------------ | ------------------------------------------------------ |
| Log lifecycle event    | `messagingOnboardingEvents` | Every significant action | 15-20 per session | 1            | Fire-and-forget, ~0.5-1 KB per event. Non-blocking.    |
| Read events (analysis) | `messagingOnboardingEvents` | On-demand admin queries  | Rare              | 0-100        | Indexed by sessionId, eventType, provider. Admin only. |

**Feature flag:** `ENABLE_MESSAGING_ONBOARDING_TRACKING: true` (ON by default when onboarding is enabled)

**Monthly cost impact at 1,000 sessions:** ~₹3 (negligible — 15K-20K writes at ₹15/100K)

---

## Firebase Storage

| Operation                          | Path Pattern                                   | Trigger                             | Size              | Notes                                                                 |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------- | ----------------- | --------------------------------------------------------------------- |
| Upload menu images (from provider) | `messagingOnboarding/{sessionId}/{fileId}.jpg` | Media download via provider adapter | 0.5-5 MB per file | Downloaded by Cloud Function via `IMessagingProvider.downloadMedia()` |
| Upload PDF (from provider)         | `messagingOnboarding/{sessionId}/{fileId}.pdf` | Media download via provider adapter | 0.5-10 MB         | Single file                                                           |
| Read images (extraction)           | Same paths                                     | processMenuImagesJob CF             | —                 | Reads for Gemini extraction                                           |
| Delete expired media               | `messagingOnboarding/{sessionId}/`             | Cleanup scheduler                   | —                 | Deletes entire session folder                                         |

---

## Cloud Functions

| Function                        | Trigger                                     | Frequency                 | Duration | Memory | Notes                                                                                          |
| ------------------------------- | ------------------------------------------- | ------------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------- |
| `messagingOnboardingWebhook`    | onRequest (HTTP POST from provider)         | Per incoming message      | 1-5s     | 256 MB | Must respond < 5s. Routes to provider adapter. Downloads media async.                          |
| `msgIntakeProcessor`            | onSchedule (every 2 min)                    | 720/day                   | 5-30s    | 512 MB | Checks intake windows, triggers validation + extraction (provider-agnostic)                    |
| `msgSessionCleanup`             | onSchedule (daily at 4 AM UTC)              | 1/day                     | 10-60s   | 256 MB | Expiry, reminders (via provider adapter), storage cleanup                                      |
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
- `messagingOnboardingRateLimits` — **Admin SDK only**. Rule: `allow read, write: if false;`
- `messagingOnboardingEvents` — **Admin SDK only**. Rule: `allow read, write: if false;` (tracking events)
- `menuImageProcessingJobs` — Existing rules unchanged. Messaging onboarding jobs use admin SDK.
- `tenants`, `stores`, `users` — Existing rules unchanged. Publish pipeline uses admin SDK (inside Cloud Function).
- Storage: `messagingOnboarding/*` — Admin SDK only for writes. Read access for extraction Cloud Function only.

---

## Cost Optimization Notes

### Current Optimizations (Built-In)

- **Reuses existing extraction pipeline** — No duplicate Gemini integration
- **Intake window batching** — Collects all uploads before processing (single extraction job)
- **SHA-256 dedup** — Duplicate images silently ignored (no extra processing cost)
- **Rate limits** — Per-user caps prevent cost explosion from abuse
- **Session expiry + cleanup** — No zombie sessions accumulating storage
- **Asset Intelligence filtering** — Only valid menu files sent to extraction (reduces Gemini calls by ~30%)
- **Single collection for all providers** — No per-provider collection overhead, simpler queries

### Potential Future Optimizations

- **Gemini batch API** — If available, batch validation + extraction in fewer calls
- **Image compression before extraction** — Smaller images = cheaper Gemini processing
- **Cached extraction for similar menus** — If same business re-onboards (unlikely but possible)

### Warnings: Expensive Patterns to Watch

- **Re-extraction loops** — Each fix request → new extraction costs full Gemini API. Capped at 3 corrections/session.
- **Large PDFs** — 40-page PDF = 40 Gemini extraction calls = expensive. Asset Intelligence should filter pages first.
- **Intake processor polling** — Runs every 2 minutes. If session count grows, query cost increases. Mitigated by Firestore index.
- **Storage accumulation** — If cleanup fails, expired session media accumulates. Monitor storage size weekly.

---

## Cost Estimate (per 1,000 successful onboardings/month)

| Resource                                              | Operations/month          | Unit Cost  | Monthly Cost (₹)    |
| ----------------------------------------------------- | ------------------------- | ---------- | ------------------- |
| Firestore Reads (session queries)                     | 15,000                    | ₹5/100K    | ₹0.75               |
| Firestore Reads (intake processor)                    | 21,600 (720/day × 30)     | ₹5/100K    | ₹1.08               |
| Firestore Reads (preview + publish)                   | 3,000                     | ₹5/100K    | ₹0.15               |
| Firestore Writes (session updates)                    | 10,000 (avg 10/session)   | ₹15/100K   | ₹1.50               |
| Firestore Writes (publish: tenant+store+user+summary) | 5,000                     | ₹15/100K   | ₹0.75               |
| Firestore Writes (extraction jobs)                    | 4,000                     | ₹15/100K   | ₹0.60               |
| Storage (uploads)                                     | 5 GB (avg 5 MB × 1000)    | ₹2.15/GB   | ₹10.75              |
| Cloud Functions (webhook)                             | 5,000 invocations × 3s    | Compute    | ₹5.00               |
| Cloud Functions (intake processor)                    | 21,600 × 10s avg          | Compute    | ₹15.00              |
| Cloud Functions (extraction — reused)                 | 1,000 × 60s avg           | Compute    | ₹40.00              |
| Cloud Functions (cleanup)                             | 30 × 30s                  | Compute    | ₹1.00               |
| **Gemini AI (asset validation)**                      | 1,500 calls               | ₹0.50/call | ₹750.00             |
| **Gemini AI (extraction)**                            | 4,000 calls (avg 4 files) | ₹0.80/call | ₹3,200.00           |
| **WhatsApp API (service conv)**                       | 1,000 free + 500 paid     | ₹0.50/msg  | ₹250.00             |
| **Total**                                             |                           |            | **~₹4,276/month**   |
| **Per successful onboarding**                         |                           |            | **~₹4.28 (~$0.05)** |

> **Note:** Gemini API costs dominate (~92%). Firebase costs are minimal. WhatsApp service conversations are free for the first 1,000/month. Above 1,000 sessions/month, WhatsApp costs increase.

---

## DAL Functions Used

| Function                    | File                                    | Operation Type                |
| --------------------------- | --------------------------------------- | ----------------------------- |
| `createMenuProcessingJob`   | `src/lib/firebase/menuProcessing.ts`    | Write (reused for extraction) |
| `createDefaultRoles`        | `src/data/defaultRoles.ts`              | Helper (used in publish)      |
| `getDefaultTimeSlotPresets` | `src/config/defaultTimeSlotPresets.ts`  | Helper (used in publish)      |
| `getBusinessCategory`       | `src/constants/common.ts`               | Helper (used in publish)      |
| `syncStoreToSummary`        | `src/database/platformSummary/index.ts` | Write (used in publish)       |

---

## API Routes & Their Firebase Impact

| Route                                  | Method    | Firebase Ops                     | Rate Limited?          | Notes                                                                                                                  |
| -------------------------------------- | --------- | -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `messagingOnboardingWebhook` (CF)      | POST      | 2R + 1-2W                        | Per-user in Firestore  | Reads session + rate limit, writes upload to session                                                                   |
| `/api/msg-preview/[sessionId]`         | GET       | 1R                               | No (token-based)       | Reads session doc for preview rendering                                                                                |
| `/api/msg-preview/[sessionId]/approve` | POST      | 1R + 8-10W                       | Idempotent per attempt | Reads session, writes tenant+store+user+project+summaries. May retry if publish fails (recovery to AWAITING_APPROVAL). |
| `/api/msg-preview/[sessionId]/fix`     | POST      | 1R + 1W                          | 3/session max          | Reads session, writes fix request to session                                                                           |
| `msgIntakeProcessor` (CF)              | scheduled | 1-50R + 0-5W                     | N/A                    | Reads pending sessions, writes state changes                                                                           |
| `msgSessionCleanup` (CF)               | scheduled | 1-100R + 0-50W + Storage deletes | N/A                    | Reads expired sessions, deletes media                                                                                  |

---

_Document Status: Implementation-Complete (v3.1 — All reads/writes/deletes verified against codebase. API routes, Cloud Functions, Storage operations, and cost estimates confirmed accurate. Last verified: Feb 17, 2026.)_
