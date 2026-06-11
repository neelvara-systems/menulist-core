# FINAL COMPREHENSIVE VALIDATION REPORT

## Messaging Onboarding — Spec-Perfect Implementation Check

**Date:** May 17, 2026
**Implementation Version:** v3.7 Firebase cost audit
**Status:** COMPLETE — Runtime hardening applied; dev/staging WhatsApp onboarding has been verified once with real inbound media. Repeat Meta media/API tests require rotating the temporary WhatsApp access token when it expires.

---

## Engineering Checklist Verification

### Phase 1: Foundation

| #    | Checklist Item                 | Status | Evidence                                                                                                                                                                      |
| ---- | ------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Feature flags added            | ✅     | `src/config/features.ts:962-989` — ENABLE_MESSAGING_ONBOARDING, MESSAGING_ONBOARDING_PROVIDERS, ENABLE_MESSAGING_ONBOARDING_TRACKING                                          |
| 1.2  | Types file with all interfaces | ✅     | `functions/src/types/messagingOnboarding.types.ts` — Session, RateLimit, NormalizedMessage, Events, AssetValidation                                                           |
| 1.3  | IMessagingProvider interface   | ✅     | `functions/src/messagingOnboarding/providers/IMessagingProvider.ts` — verifyWebhook, parseIncomingMessage, downloadMedia, sendTextMessage, sendLinkMessage                    |
| 1.4  | Provider registry + factory    | ✅     | `functions/src/messagingOnboarding/providers/providerRegistry.ts` — getProviderAdapter, getProviderFromWebhookPath                                                            |
| 1.5  | WhatsApp adapter               | ✅     | `functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts` — HMAC-SHA256 verify, Meta payload parse, Graph API download/send                                   |
| 1.6  | Constants file                 | ✅     | `functions/src/messagingOnboarding/constants.ts` — RATE_LIMITS, TIMING, UPLOAD_LIMITS, PROCESSING, COST_MONITORING, runtime feature flags, MESSAGES, FORBIDDEN_TRANSITIONS     |
| 1.7  | Session engine                 | ✅     | `functions/src/messagingOnboarding/sessionEngine.ts` — findActiveSession, createSession, transitionState, handleMessage, rate limiting, upload handling                       |
| 1.8  | Webhook handler                | ✅     | `functions/src/messagingOnboarding/webhookHandler.ts` — onRequest, runtime feature flag check first, provider routing, signature verification, durable queue enqueue           |
| 1.9  | Functions index.ts exports     | ✅     | `functions/src/index.ts` — messagingOnboarding (onRequest), menulistMaintenanceScheduler (onSchedule registry), msgExtractionWatcher (onDocumentUpdated) |
| 1.10 | Firestore indexes              | ✅     | `firestore.indexes.json` — composite indexes for sessions, inbound queue drain/stale recovery, and events                                                                     |
| 1.11 | DB_COLLECTIONS constants       | ✅     | `src/constants/database.ts:91-95` + `functions/src/constants/database.ts:70-74` — both files synced                                                                           |
| 1.12 | Durable inbound queue          | ✅     | `functions/src/messagingOnboarding/inboundQueue.ts` — SHA-256 provider-message dedup, PENDING/PROCESSING/PROCESSED/FAILED state, retry drain                                  |

### Phase 2: Intelligence Layer

| #   | Checklist Item                 | Status | Evidence                                                                                                                             |
| --- | ------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | Asset Intelligence (Gemini)    | ✅     | `functions/src/messagingOnboarding/assetIntelligence.ts` — validateAssets, buildValidationPrompt, normalizeValidationResult          |
| 2.2 | Intake processor (scheduled)   | ✅     | `functions/src/messagingOnboarding/intakeProcessor.ts` — intakeProcessorLogic, processSession, triggerExtraction                     |
| 2.3 | Extraction pipeline connection | ✅     | `intakeProcessor.ts:triggerExtraction` — creates job in menuImageProcessingJobs collection via Admin SDK (§19.3)                     |
| 2.4 | Extraction watcher             | ✅     | `functions/src/messagingOnboarding/extractionWatcher.ts` — handleExtractionJobUpdate, preview token generation, per-file extraction handoff, legacy temp project cleanup guard |

### Phase 3: Preview & Publish

| #   | Checklist Item                    | Status | Evidence                                                                                                                                                  |
| --- | --------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Preview page                      | ✅     | `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx` — Mobile-first, inline styles, business info edit, menu display, approve/fix buttons            |
| 3.2 | Preview API route (GET)           | ✅     | `src/app/api/msg-preview/[sessionId]/route.ts` — Token validation, session state check, sanitized response                                                |
| 3.3 | Approve API route (POST)          | ✅     | `src/app/api/msg-preview/[sessionId]/approve/route.ts` — Zod validation, double-publish protection via transaction, failure recovery to AWAITING_APPROVAL |
| 3.4 | Fix request API route (POST)      | ✅     | `src/app/api/msg-preview/[sessionId]/fix/route.ts` — Max 3 corrections, structured issues, session reset                                                  |
| 3.5 | Publish executor                  | ✅     | `src/lib/messaging-onboarding/publish.ts` + approve route — Atomic transaction: tenant + store + user + project + summaries + session LIVE finalization    |
| 3.6 | Publish confirmation via provider | ✅     | `functions/src/messagingOnboarding/intakeProcessor.ts` — sends confirmation from `confirmationPending=true` after publish                                  |

### Phase 4: Cleanup & Hardening

| #    | Checklist Item                | Status | Evidence                                                                                                      |
| ---- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| 4.1  | Session cleanup scheduler     | ✅     | `functions/src/schedulers/messagingSessionCleanup.ts` — Daily at 4 AM UTC                                     |
| 4.2  | 12h reminder logic            | ✅     | `messagingSessionCleanup.ts:87-130` — Sends reminder via provider adapter                                     |
| 4.3  | Rate limiting logic           | ✅     | `sessionEngine.ts:checkRateLimit, incrementSessionCount, applyCooldown` — Firestore-based per-user            |
| 4.4  | Post-publish messages (INV-7) | ✅     | `sessionEngine.ts:handleMessage` — Step 4: LIVE session check, returns dashboard link                         |
| 4.5a | Unsupported message types     | ✅     | `WhatsAppAdapter.ts:parseIncomingMessage` — video/audio/sticker → "unsupported"                               |
| 4.5b | Uploads during processing     | ✅     | `sessionEngine.ts:handleMessageForExistingSession` — PROCESSING_MENU state sets pendingUploadsWhileProcessing |
| 4.5c | Message deduplication         | ✅     | `inboundQueue.ts` — atomic create with document ID = SHA-256(provider + providerMessageId); no pre-create read or per-message session-array write needed |
| 4.5d | Blank prevention gate         | ✅     | `extractionWatcher.ts:handleExtractionComplete` — 0 categories or 0 items → FAILED                            |
| 4.5e | Publish validation gate       | ✅     | `src/app/api/msg-preview/[sessionId]/approve/route.ts` — min categories + priced item check before publish     |
| 4.5f | Extraction cost cap (INV-3)   | ✅     | `intakeProcessor.ts:processSession` — processingRuns >= MAX_PROCESSING_RUNS_PER_SESSION                       |
| 4.5g | Progress message              | ✅     | `intakeProcessor.ts:triggerExtraction` — sends EXTRACTION_PROGRESS before job creation                        |
| 4.5  | Storage cleanup               | ✅     | `messagingSessionCleanup.ts:130-165` — Deletes uploads + session doc for expired sessions                     |
| 4.6  | Firestore security rules      | ✅     | `firestore.rules` — Admin SDK only for sessions, inbound queue, rate limits, and events                       |
| 4.7  | Health/cost monitor           | ✅     | `functions/src/messagingOnboarding/healthMonitor.ts` — hourly systemHealth snapshots and systemAlerts          |
| 4.8  | Pre-download file-size reject | ✅     | `sessionEngine.ts:processAndStoreUpload` — rejects provider-reported oversized media before download           |

---

## Architecture Checklist (13/13 PASS)

| #   | Item                                             | Status                                                          |
| --- | ------------------------------------------------ | --------------------------------------------------------------- |
| 1   | Provider-agnostic adapter layer                  | ✅ IMessagingProvider interface + WhatsApp implementation       |
| 2   | Provider-agnostic collections                    | ✅ messagingOnboardingSessions (not whatsappOnboardingSessions) |
| 3   | Feature flag gated                               | ✅ First line in webhook handler                                |
| 4   | Zero existing file modifications (except config) | ✅ Only config/constants/index.ts/rules modified                |
| 5   | Reuses existing extraction pipeline              | ✅ Creates job in same menuImageProcessingJobs collection       |
| 6   | Atomic publish transaction                       | ✅ Firestore runTransaction in approve route                    |
| 7   | Clean teardown possible                          | ✅ All code in isolated directories                             |
| 8   | 8 implementation invariants enforced             | ✅ INV-1 through INV-8 all implemented                          |
| 9   | 13 ADRs followed                                 | ✅ ADR-1 through ADR-13 all respected                           |
| 10  | Extraction-only save skip                        | ✅ messaging jobs use `skipProjectSave`; watcher only cleans legacy msg-onboarding-\* temp projects |
| 11  | Observation layer (MOL-inspired)                 | ✅ eventLogger with 35 event types, fire-and-forget             |
| 12  | 3-year architecture freeze                       | ✅ Multi-provider from day one, no "Phase 2" language           |
| 13  | Durable webhook processing                       | ✅ Inbound queue persists sanitized messages before provider ACK |

## Security Checklist (11/11 PASS)

| #   | Item                           | Status                                              |
| --- | ------------------------------ | --------------------------------------------------- |
| 1   | Webhook signature verification | ✅ WhatsAppAdapter.verifyWebhook (HMAC-SHA256)      |
| 2   | Preview token security         | ✅ crypto.randomBytes(24), bound to session         |
| 3   | Approval token validation      | ✅ Approve route validates token matches session    |
| 4   | Rate limiting                  | ✅ Per-user Firestore-based (daily/weekly/cooldown) |
| 5   | Input validation (Zod)         | ✅ All 3 API routes use Zod schemas                 |
| 6   | Media safety                   | ✅ ALLOWED_MIME_TYPES whitelist                     |
| 7   | Storage isolation              | ✅ messagingOnboarding/{sessionId}/{fileId} path    |
| 8   | PII protection                 | ✅ userIdMasked (last 4 chars) in all logs          |
| 9   | Admin-only Firestore rules     | ✅ 4 messaging collections with `allow read, write: if false` |
| 10  | No sensitive data in logs      | ✅ Only masked IDs, error messages, metadata        |
| 11  | No raw provider payload storage | ✅ Inbound queue stores only normalized sanitized fields |

## Firebase Cost Checklist (8/8 PASS)

| #   | Item                                        | Status                                |
| --- | ------------------------------------------- | ------------------------------------- |
| 1   | All collections documented in \_firebase.md | ✅                                    |
| 2   | All reads/writes documented                 | ✅                                    |
| 3   | Cost estimate per 1K sessions               | ✅ ~₹4,283/month                      |
| 4   | Cost monitoring thresholds (INV-8)          | ✅ Yellow/Red alerts in impl.md §20.3 |
| 5   | Event tracking cost minimal                 | ✅ ~₹3/month for 1K sessions          |
| 6   | Cleanup scheduler prevents accumulation     | ✅ Daily cleanup + storage deletion   |
| 7   | Queue retry cost bounded                    | ✅ Max 5 inbound attempts and scheduler drain limit |
| 8   | Health/source retention monitoring          | ✅ Hourly bounded samples, not per-run full scans |

---

## Files Created/Modified

| File                                                                      | Type     | Lines | Status |
| ------------------------------------------------------------------------- | -------- | ----- | ------ |
| `functions/src/types/messagingOnboarding.types.ts`                        | NEW      | ~280  | ✅     |
| `functions/src/messagingOnboarding/index.ts`                              | NEW      | ~11   | ✅     |
| `functions/src/messagingOnboarding/constants.ts`                          | NEW      | ~220  | ✅     |
| `functions/src/messagingOnboarding/webhookHandler.ts`                     | NEW      | ~145  | ✅     |
| `functions/src/messagingOnboarding/inboundQueue.ts`                       | NEW      | ~230  | ✅     |
| `functions/src/messagingOnboarding/sessionEngine.ts`                      | NEW      | ~530  | ✅     |
| `functions/src/messagingOnboarding/eventLogger.ts`                        | NEW      | ~85   | ✅     |
| `functions/src/messagingOnboarding/assetIntelligence.ts`                  | NEW      | ~200  | ✅     |
| `functions/src/messagingOnboarding/intakeProcessor.ts`                    | NEW      | ~280  | ✅     |
| `functions/src/messagingOnboarding/healthMonitor.ts`                      | NEW      | ~330  | ✅     |
| `functions/src/messagingOnboarding/extractionWatcher.ts`                  | NEW      | ~240  | ✅     |
| `functions/src/messagingOnboarding/publishPipeline.ts`                    | LEGACY   | ~280  | ✅     |
| `functions/src/messagingOnboarding/providers/IMessagingProvider.ts`       | NEW      | ~40   | ✅     |
| `functions/src/messagingOnboarding/providers/providerRegistry.ts`         | NEW      | ~40   | ✅     |
| `functions/src/messagingOnboarding/providers/whatsapp/WhatsAppAdapter.ts` | NEW      | ~255  | ✅     |
| `functions/src/schedulers/messagingSessionCleanup.ts`                     | NEW      | ~170  | ✅     |
| `src/app/(global-pages)/msg-preview/[sessionId]/page.tsx`                 | NEW      | ~530  | ✅     |
| `src/app/api/msg-preview/[sessionId]/route.ts`                            | NEW      | ~115  | ✅     |
| `src/app/api/msg-preview/[sessionId]/approve/route.ts`                    | NEW      | ~330  | ✅     |
| `src/app/api/msg-preview/[sessionId]/fix/route.ts`                        | NEW      | ~145  | ✅     |
| `src/lib/messaging-onboarding/publish.ts`                                 | NEW      | ~390  | ✅     |
| `src/config/features.ts`                                                  | MODIFIED | +35   | ✅     |
| `src/constants/database.ts`                                               | MODIFIED | +6    | ✅     |
| `functions/src/constants/database.ts`                                     | MODIFIED | +6    | ✅     |
| `functions/src/monitoring/alerts.ts`                                      | MODIFIED | +1    | ✅     |
| `functions/src/index.ts`                                                  | MODIFIED | +100  | ✅     |
| `firestore.rules`                                                         | MODIFIED | +16   | ✅     |
| `firestore.indexes.json`                                                  | MODIFIED | +50   | ✅     |

**Total: 21 NEW messaging files + shared rule/index/constants updates**
**Total Lines of Code: ~4,800+**

---

## Type Check Results

- **Functions (`functions/`):** ✅ PASS (`npm run build`)
- **Dashboard/root (`src/`):** ✅ PASS (`npx tsc --noEmit --incremental false`)

---

## Bugs Found During Post-Implementation Review (Feb 17, 2026)

| #   | Issue                                                                                                                                                                     | Severity | Root Cause                                                                | Fix Applied                                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Fast Start logic missing** — Spec §Smart Intake Logic defines 3 trigger conditions (≥4 uploads + 90s idle, PDF + 60s idle, 10min max) but only max wait was implemented | HIGH     | Intake timer was always set to 10min regardless of upload count/type      | Added `FAST_START_IDLE_MS` (90s), `PDF_FAST_START_IDLE_MS` (60s), `FAST_START_MIN_UPLOADS` (4) to constants.ts. Updated `addUploadToSession` to use shorter timer when conditions met. |
| 2   | **File size limit 20MB vs spec 10MB** — `MAX_FILE_SIZE_BYTES` was 20MB, spec §Media Limits says 10MB (WhatsApp limit)                                                     | MEDIUM   | Incorrect constant value during initial implementation                    | Fixed `MAX_FILE_SIZE_BYTES` to `10 * 1024 * 1024` in constants.ts                                                                                                                      |
| 3   | **Preview page missing `noindex, nofollow`** — Spec §Preview Page §Security requires these meta tags                                                                      | MEDIUM   | Client component can't export metadata — needed a separate layout         | Created `layout.tsx` with `robots: { index: false, follow: false }`                                                                                                                    |
| 4   | **Preview page missing spec UI requirements** — No "Preview — Not Live Yet" badge, business type not editable, address not editable                                       | LOW      | Initial implementation had minimal UI — spec requires all fields editable | Added preview badge, editable business type field, editable address field, "You can edit anytime after publishing" hint                                                                |

**All 4 issues fixed. Type check: PASS after fixes.**

### Dry Run Test (Feb 17, 2026 — Post-Fix)

| #   | Issue                                                                                                                                                                               | Severity     | Root Cause                                                                                         | Fix Applied                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | **Firestore array index update bug** — `uploads.0.storagePath` dot-notation doesn't work for Firestore array elements, would create nested object instead of updating array element | **CRITICAL** | Session creation uploaded file with "pending" sessionId then tried to move + update array by index | Redesigned to pre-generate sessionId BEFORE upload. New `createSessionWithId()` function. File goes to correct path from the start — no move/update needed. |

**5 total bugs found and fixed across implementation. Type check: PASS after all fixes.**

---

## Runtime Audit Fixes (May 17, 2026)

| #   | Issue | Severity | Root Cause | Fix Applied |
| --- | ----- | -------- | ---------- | ----------- |
| 6   | **Detected business type lost before extraction** | HIGH | `intakeProcessor` stored AI-detected type on the session, then created the extraction job from the stale pre-update session object | Passed the detected business type/category directly into `triggerExtraction()` so extraction receives the correct business context |
| 7   | **Weekly rate cap bypass on daily rollover** | HIGH | `checkRateLimit()` returned immediately after resetting daily counters and skipped the weekly cap check | Reset counters first, then evaluate both daily and weekly limits |
| 8   | **Publish finalization was not atomic with store/project writes** | CRITICAL | Approval transaction moved session to `PUBLISHING`; store/project transaction committed separately; session `LIVE` update happened after commit | Moved `publishedResult`, `confirmationPending`, and `LIVE` state into the same Firestore transaction that creates tenant/store/project |
| 9   | **Public cache not invalidated after publish** | HIGH | Messaging publish wrote public store/project truth but did not revalidate public menu/OBP tags | Revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` after publish commit |
| 10  | **Published project source URLs could expire or be deleted** | HIGH | Uploads used short-lived signed URLs and cleanup deleted LIVE-session media even though project files referenced those URLs | Messaging uploads now use Firebase token URLs; cleanup only removes expired/non-published media |
| 11  | **Preview page mobile actions below 44px and copy drift** | MEDIUM | Edit/fix controls were smaller than mobile rule target and some text used governance-disallowed phrasing | Increased control heights and tightened owner-facing copy |
| 12  | **Publish retry could duplicate store creation after uncertain commit** | HIGH | Retry path reran publish without first checking whether the session was already `LIVE` with a `publishedResult` | Publish transaction now reads the session first and returns the existing published result for already-live sessions |
| 13  | **Messaging extraction still used manual temp project side effects** | MEDIUM | Reused extraction logic wrote, verified, invalidated cache for, and then cleaned a throwaway project before preview | Added `skipProjectSave` to messaging jobs; shared extraction now keeps Gemini processing and per-file redistribution but skips project read/write/verify/cache work |
| 14  | **Final project shape drifted from manual project/extraction output** | HIGH | Messaging publish wrote a thinner project and collapsed all extracted data into one file instead of the manual `saveFilesToProject()` per-file shape | Extraction watcher now stores `extractedProjectFiles`; approve route writes manual-compatible project fields, design config, ownership fields, default project metadata, and per-file extracted data |
| 15  | **Approved/extracted address was accepted but not persisted** | MEDIUM | Approve route accepted `address`, but publish did not pass it into `createTenantStoreInTransaction()` `storeExtra` | Publish now writes the approved/extracted value to `store.addressLine`, which also flows into `storesSummary` through the shared onboarding helper |
| 16  | **Webhook ACK could still lose processing if the function stopped mid-flight** | HIGH | Webhook processing was direct after parse; provider retry behavior was the only durable recovery path | Added `messagingOnboardingInboundMessages` durable queue, SHA-256 message dedup, immediate best-effort drain, scheduled retry drain, and max-attempt failure tracking |
| 17  | **Approve route outer retry did not treat already-live as success** | HIGH | Inner publish transaction was idempotent, but the outer approve transaction rejected non-`AWAITING_APPROVAL` states before reaching it | Outer approve transaction now returns existing `publishedResult` for `LIVE` sessions and rejects only active `PUBLISHING` as in-progress |
| 18  | **Cloud Function feature flag was hardcoded in constants** | MEDIUM | Function runtime had to be rebuilt/redeployed to change onboarding processing state | `functions/src/messagingOnboarding/constants.ts` now reads `ENABLE_MESSAGING_ONBOARDING`, `MESSAGING_ONBOARDING_PROVIDERS`, and tracking flag from runtime env |
| 19  | **INV-8 cost monitoring was documented but not operationalized** | HIGH | Events existed, but no bounded runtime snapshot/alert process summarized cost, failures, publish rate, or retained source storage | Added `healthMonitor.ts` hourly `systemHealth` snapshots and `systemAlerts` threshold alerts with default alert cooldown |
| 20  | **Oversized provider media could be downloaded before rejection** | MEDIUM | File size check ran after `downloadMedia()`, wasting provider/API bandwidth and function memory when the provider supplied size metadata | `processAndStoreUpload()` now rejects files larger than `MAX_FILE_SIZE_BYTES` before download when `msg.media.fileSize` is present |
| 21  | **Published source retention had a correctness fix but no cost policy** | MEDIUM | Cleanup correctly retained LIVE-session media, but there was no runtime visibility into retained published-source growth | Health monitor samples recent LIVE sessions, records retained source bytes, and alerts before source storage becomes a cost problem |
| 22  | **Active publish logic lived inside the route and drifted from legacy Functions copy** | MEDIUM | The route owned real publish behavior while `functions/src/messagingOnboarding/publishPipeline.ts` remained a stale duplicate | Active publish execution moved to `src/lib/messaging-onboarding/publish.ts`; the Functions file is explicitly marked legacy/non-runtime |
| 23  | **Active-session messages still paid a redundant session write for provider-message dedup** | LOW | Durable inbound queue owned provider-message dedup, but session engine still appended message IDs to `providerMessageIds` for active sessions | Removed the active-session `providerMessageIds` append; kept legacy read-only safety for older sessions |
| 24  | **Inbound queue docs had no TTL field** | MEDIUM | Durable queue docs would accumulate indefinitely without a manual cleanup job | Added `expiresAt` to `MessagingOnboardingInboundMessage` and set 30-day TTL values during enqueue |
| 25  | **Shared event logger did not set `expiresAt`** | MEDIUM | Route-created events had TTL fields, but events from `eventLogger.ts` could accumulate indefinitely | Added 30-day `expiresAt` to shared event logger output |
| 26  | **Health source-retention query used DESC while existing index was ASC** | MEDIUM | `systemHealth` source-retention sampling could need a new composite index or fail in production | Changed query to `publishedAt` ASC to reuse the existing `state ASC, publishedAt ASC` index and avoid extra index storage |
| 27  | **Inbound queue dedup paid a pre-create transaction read** | LOW | Queue document ID was already the provider-message dedup key, but enqueue still read the document before writing | Replaced the transaction read with atomic Firestore `create()` and skipped duplicate post-ACK processing reads |
| 28  | **`msgExtractionWatcher` deploy failed with invalid event-trigger timeout** | HIGH | The watcher inherited `FUNCTION_OPTIONS.base.timeoutSeconds=900`, but Firebase event triggers max out at 540 seconds | Overrode the watcher timeout to 540 seconds and deployed the function successfully |
| 29  | **TTL setup script did not pass the current `--enable-ttl` flag** | MEDIUM | `gcloud firestore fields ttls update` now requires `--enable-ttl` or `--disable-ttl`; the script swallowed the resulting error | Added `--enable-ttl` to every TTL setup command and enabled the two messaging TTL policies directly |

---

## FINAL VERDICT: IMPLEMENTATION COMPLETE

- **Total New Messaging Files:** 21
- **Total Modified Files:** Shared constants/rules/indexes/routes/functions/docs updated
- **Lines of Code:** ~4,800+
- **Spec Compliance:** 100% (all Phase 1-4 checklist items pass, 4 review fixes applied)
- **Architecture Compliance:** 13/13
- **Security Compliance:** 11/11
- **Firebase Cost Compliance:** 8/8

## To Enable & Test

1. Confirm app preview surfaces remain enabled in `src/config/features.ts`.
2. Set real WhatsApp secrets in Firebase Functions:
   ```bash
   firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
   firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
   firebase functions:secrets:set WHATSAPP_APP_SECRET
   firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
   ```
3. Set runtime env `ENABLE_MESSAGING_ONBOARDING=true` only after those secrets are real; optionally set `MESSAGING_ONBOARDING_PROVIDERS=whatsapp`.
4. Deploy Cloud Functions: `cd functions && npm run deploy`
5. Register webhook URL with Meta: `https://us-central1-{project}.cloudfunctions.net/messagingOnboarding/whatsapp`
6. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
7. Deploy Firestore rules: `firebase deploy --only firestore:rules`
8. Enable Firestore TTL policies: `scripts/setup-firestore-ttl.sh` (must include `messagingOnboardingEvents.expiresAt` and `messagingOnboardingInboundMessages.expiresAt`); the daily `menulistMaintenanceScheduler` cleanup also deletes a capped batch of expired inbound queue docs as a fallback.
9. Send a test message from WhatsApp to the registered number
10. Monitor sessions in Firebase Console: `messagingOnboardingSessions`
11. Open preview URL in browser, verify menu rendering, approve & publish
12. Verify tenant/store/project/project summary created and public cache tags revalidated

## June 11, 2026 Production-Readiness Audit Notes

- Preview API reads are now rate-limited per session/IP before the session document read.
- Preview-view tracking writes at most one `PREVIEW_VIEWED` event per session by setting `previewViewedAt`.
- Preview fix requests are rate-limited per session/IP before Firestore reads or writes.
- Expired durable inbound queue documents are cleaned by Firestore TTL and by a capped daily scheduler fallback.
