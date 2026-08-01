# Messaging Onboarding — Firebase Cost Tracking

**Feature:** Messaging Onboarding — Zero-Friction SMB Acquisition Engine
**Status:** Source-implemented, provider-disabled — not a current launch or deploy certification
**Last Updated:** July 16, 2026
**Priority:** HIGH — Every onboarding session triggers multiple operations. Scales with acquisition volume.

**Launch boundary:** Not current launch certification or deploy approval. This Firebase cost doc describes source/cost behavior and fail-closed provider setup; production readiness still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, explicit target deploy approval, scoped Functions deploy evidence, real non-production Meta provider smoke, browser/device QA where relevant, and production-host smoke.

## July 16, 2026 Provider Network Cost Boundary

WhatsApp Graph lookups, downloads, and outbound sends now refuse redirects and use bounded abort timeouts. This adds no Firestore read/write/delete, Storage operation, collection, index, or scheduled task. It bounds provider-worker occupancy and avoids unintended repeated work caused by a stalled upstream call. Because Functions source changed, an isolated approved QA Functions deploy and real Meta provider smoke remain pending before enablement; checked-in target flags stay disabled.

## July 13, 2026 Ops Monitor Read/Cost Boundary

One successful manual `/api/ops/messaging-onboarding` refresh performs at most 30 document reads plus 18 aggregation-count queries:

| Source | Maximum per refresh | Reason |
| --- | ---: | --- |
| Health control + referenced snapshot | 2 document reads | Direct `lastSnapshotId` lookup; no health collection scan |
| Recent onboarding events | 12 document reads | Closed 24-hour window, descending timestamp, hard limit 12 |
| Recent onboarding sessions | 8 document reads | Descending `updatedAt`, hard limit 8 |
| Recent messaging alerts | 8 document reads | Indexed subsystem filter, descending timestamp, hard limit 8 |
| Inbound status counts | 3 aggregation queries | `PENDING`, `PROCESSING`, `FAILED` |
| Session-state counts | 8 aggregation queries | Fixed watched state set |
| 24-hour event-type counts | 7 aggregation queries | Fixed webhook event set and the same closed time window |

The prior alert path read 30 latest alerts across all subsystems and filtered afterward. It could miss messaging alerts and charged up to 22 unnecessary document reads. The current composite index on `systemAlerts(metadata.subsystem ASC, timestamp DESC)` makes the result correct and lowers the maximum document-read part of one refresh from 52 to 30. Aggregation queries remain deliberate because they avoid downloading unbounded session/event collections; the shared `DATA_READ` limiter and manual/no-store monitor keep refresh frequency bounded. This route performs no writes, provider calls, Storage operations, or browser Firestore reads.

The route also projects Firestore documents through `messagingOnboardingOpsBoundary.ts`; malformed counters, timestamps, nested objects, or excess rows do not become a browser read model. No new collection or summary-document write loop was added.

The public `/whatsapp` page is informational and routes its actions to the signed-in `/create-menu` photo or public-link intake. It must not expose a test number or active provider action while checked-in Functions targets remain disabled.

---

## Summary

- **Collections Used:** `messagingOnboardingSessions`, `messagingOnboardingInboundMessages`, `messagingOnboardingRateLimits`, `messagingOnboardingEvents` (tracking), `menuImageProcessingJobs` (reused), `tenants`, `stores`, `users`, `platformSummary`, `systemHealth`, `systemAlerts`
- **Storage Buckets:** `messagingOnboarding/{sessionId}/{fileId}` (uploaded menu media)
- **Cloud Functions:** `messagingOnboardingWebhook` (onRequest, per-provider routes), `menulistMaintenanceScheduler` (scheduled registry: messaging intake + session cleanup), `msgExtractionWatcher` (onDocumentUpdated), `processMenuImagesJob` (reused)
- **Architecture:** Provider-agnostic. All collections shared across providers. `provider` field on session doc identifies source.
- **External APIs:** WhatsApp Cloud API (Meta), Gemini AI (Google)
- **Estimated Monthly Cost:** Medium-High — scales linearly with onboarding volume

**July 5, 2026 preview route-param boundary note; July 6 strict raw-param update:** `/api/msg-preview/[sessionId]`, `/approve`, and `/fix` now normalize the route `sessionId` with `normalizeMessagingPreviewSessionId()` before hashed rate-limit keys and before Firestore session document reads, transaction reads, or mutation writes. The active publish executor in `src/lib/messaging-onboarding/publish.ts` uses the same normalizer before publish lifecycle event writes or the final session transaction. Valid links still use the Firestore auto-ID preview session shape produced by the Functions session engine. Malformed, reserved, path-shaped, or whitespace-mutated session values return `400 Invalid session` at the route boundary or fail closed in the helper before Firestore work. This does not add reads/writes/deletes, Storage operations, Cloud Function calls, provider calls, cache invalidations, rules, indexes, schema changes, Firebase deploy requirements, or Vercel deploy actions for valid links.

**June 29, 2026 browser handoff note; June 30 copy acknowledgement:** post-publish Copy Link and WhatsApp actions on `/msg-preview/[sessionId]` are browser-local only. Copy Link now waits for Clipboard API or acknowledged textarea fallback success before copied state, and rejected Clipboard API writes fall through to the same textarea fallback before failure. Failed copy diagnostics add clipboard/fallback support booleans to the existing session/link presence-length metadata. WhatsApp failure diagnostics still log message/URL lengths only. This does not add Firestore reads/writes/deletes, Storage operations, Cloud Function calls, provider calls, cache invalidations, rules, indexes, schema changes, or deploy requirements.

**June 29, 2026 preview response parsing note:** `/msg-preview/[sessionId]` browser responses for preview load, approve, and fix now use a shared 2MB bounded JSON parser and shape guards before page state changes. This adds no Firestore reads/writes/deletes, Storage operations, Cloud Function calls, provider calls, cache invalidations, rules, indexes, schema changes, Firebase deploy requirement, or Vercel deploy action.

**June 29, 2026 ops monitor response parsing note:** `/ops/messaging-onboarding` browser responses from `/api/ops/messaging-onboarding` now use a 256KB bounded JSON parser and snapshot shape guards before monitor state changes. The platform route read pattern, Admin SDK collection reads, count queries, DATA_READ limiter, Firestore rules/indexes, Cloud Functions, Firebase deploy requirement, and Vercel deploy action are unchanged.

**July 6, 2026 ops health snapshot ID boundary note:** `/api/ops/messaging-onboarding` now validates `systemHealth/messaging_onboarding_control.lastSnapshotId` with the shared Firestore document-ID guard before reading `systemHealth/{lastSnapshotId}`. Valid hourly health snapshot IDs keep the same single follow-up read; malformed, reserved, empty, or path-shaped values return the existing unknown health state without adding reads/writes/deletes, Storage operations, Cloud Functions, provider calls, rules, indexes, Firebase deploy requirements, or Vercel deploy actions.

**July 30, 2026 publication-truth and result-scope note:** the existing atomic
publish transaction now writes one `lastPublishedAt` value into its newly
created store, project and project-summary entry while writing the matching
session `publishedAt`. This adds fields to the same writes, not additional
Firestore operations. Publish admission validates the exact renderer file
graph, and both app and Functions consumers reject a persisted
`publishedResult` whose encoded project tenant/store differs from its
`tenantId/storeId`. No collection, rule, index, Storage path, provider call or
cache tag changed. `npm run verify:functions-deploy-preflight` and the complete
messaging/extraction emulator matrix pass. The required QA deployment target is
`functions:messagingOnboarding,functions:msgExtractionWatcher,functions:menulistMaintenanceScheduler`;
the July 30 attempt stopped before upload because Firebase CLI authentication
was unavailable.

**June 29, 2026 intake diagnostics note:** intake processor provider-send and processing-run counter failures now log bounded Cloud Functions diagnostics only. They add no Firestore reads/writes/deletes beyond the existing session, rate-limit, event, and extraction-job paths, no Storage operations, no additional provider calls, no rules/index changes, and no Vercel deployment requirement. Because `functions/src/messagingOnboarding/intakeProcessor.ts` is imported by `menulistMaintenanceScheduler`, a scoped scheduler Functions deploy is required when cloud access permits.

**June 29, 2026 cleanup diagnostics note:** expired-session upload cleanup still makes the same Storage delete attempts and still tolerates already-missing objects. Non-missing delete failures now log bounded `MESSAGING_SESSION_FILE_CLEAN_FAILED` diagnostics with session/upload/path presence-length metadata only. This adds no Firestore reads/writes/deletes, no additional Storage operations, no provider calls, no rules/index changes, and no Vercel deployment requirement. Because `functions/src/schedulers/messagingSessionCleanup.ts` is imported by `menulistMaintenanceScheduler`, a scoped scheduler Functions deploy is required when cloud access permits.

---

## Firestore Operations

### Reads

| Operation                          | Collection                      | Trigger                        | Frequency        | Docs Read | Indexed?                                      | Notes                                                     |
| ---------------------------------- | ------------------------------- | ------------------------------ | ---------------- | --------- | --------------------------------------------- | --------------------------------------------------------- |
| Persist/dedup inbound message      | `messagingOnboardingInboundMessages` | Every incoming webhook     | Per message      | 0 normal reads | Direct doc by SHA-256(provider + providerMessageId) | BulkWriter `create()` persists every message in a provider batch; duplicate retries require no read |
| Drain pending inbound queue        | `messagingOnboardingInboundMessages` | Intake processor | Per queued message | 1 claim transaction read | Yes (`status` + `nextAttemptAt`) | Token claim prevents concurrent processing; handler result is checkpointed before delivery |
| Reset stale inbound processing     | `messagingOnboardingInboundMessages` | Intake processor           | Every 2 min      | 0-20 query reads plus one transaction read per stale candidate | Yes (`status` + `processingStartedAt`) | Token-aware reset cannot overwrite a newer worker result |
| Find active session for user       | `messagingOnboardingSessions`   | Queued message processing      | Per message      | 1         | Yes (`provider` + `providerUserId` + `state`) | Query: provider=X, userId=Y, state NOT IN (LIVE, EXPIRED) |
| Check rate limits                  | `messagingOnboardingRateLimits` | Every new session creation     | Per new session  | 1         | Direct doc (userHash)                         | Single doc read. Hash = SHA-256 of `{provider}:{userId}`  |
| Check existing owner by phone      | `users`                         | First message from user        | Per new session  | 0-1       | Yes (`phone` field)                           | Finds an existing owner account before creating a messaging session |
| Find sessions ready for processing | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-1       | Yes (`state` + `intakeExpiresAt`)             | One model-backed session per run keeps the shared scheduler bounded |
| Find preview links to resend       | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-1       | Yes (`state` + `previewMessagePending`)       | Retries preview-link delivery if the first provider send failed |
| Find publish confirmations to send | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-1       | Yes (`state` + `confirmationPending`)         | Sends provider confirmation after approval route commits publish |
| Find fix acknowledgements to send  | `messagingOnboardingSessions`   | Intake processor (every 2 min) | 720/day          | 0-1       | Yes (`state` + `fixMessagePending`)           | Sends provider acknowledgement after preview fix request |
| Find expired/cooldown sessions     | `messagingOnboardingSessions`   | Cleanup scheduler (daily)      | 1/day            | 0-50 expiry + 0-20 retention reads | Yes (`state` + `expiresAt`) | Active states transition to `EXPIRED`; immutable terminal `COOLDOWN` rows enter retention cleanup directly after the 48-hour safety threshold. Invalid terminal documents are precondition-deleted by queried reference without following unvalidated Storage paths |
| Drain orphaned upload pointers     | `messagingOnboardingSessions`   | Immediate mutation + cleanup scheduler | Per full resend/publish/fix plus 1/day fallback | 1 source read + 1 completion transaction read | Single field (`uploadCleanupPending`) | Maximum 45 session-owned paths; Storage or Firestore failures retain pointers for retry; malformed rows retain raw pointers but clear the selector transactionally; concurrent completion counts only pointers removed by that transaction |
| Find sessions needing reminder     | `messagingOnboardingSessions`   | Cleanup scheduler (daily)      | 1/day            | 0-50      | Yes (`state` + `reminderSentAt`)              | 12h after preview with no approval                        |
| Read session for preview page      | `messagingOnboardingSessions`   | Preview page load              | Per preview view | 1         | Direct doc                                    | Server-side read in Next.js; rate-limited per session/IP before the read |
| Read extraction job result         | `menuImageProcessingJobs`       | After extraction completes     | Per extraction   | 1         | Direct doc                                    | Polls/listens for job completion                          |
| Read platform counter floors       | `platformSummary/summary`, legacy `default`, `storesSummary` | Publish pipeline | Per publish | 3 + bounded occupied-candidate probes | Direct docs | Inside Firestore transaction; exact numeric values only |
| Health snapshot control            | `systemHealth/messaging_onboarding_control` | Intake processor | First 4 minutes of each UTC hour; at most 48 checks/day on the 2-minute cadence | 1 | Direct doc | Transaction claim persists an opaque lease ID. Snapshot write and control settlement share one transaction that requires the same current lease ID; stale workers cannot publish, clear a replacement lease, regress `lastSnapshotId`, or emit alerts. Idle runs outside the window make no health-control read. |
| Health/cost sample                 | Sessions + events + `systemHealth` | Health monitor | Hourly | Up to 200 sessions + 1000 events + 250 live sessions | Single-field/composite indexes | Bounded sample for cost, publish rate, failure, and retained-source storage monitoring |

### Writes

| Operation                          | Collection                      | Trigger                          | Frequency       | Docs Written | Fields                                                    | Notes                                                         |
| ---------------------------------- | ------------------------------- | -------------------------------- | --------------- | ------------ | --------------------------------------------------------- | ------------------------------------------------------------- |
| Create session                     | Sessions + per-user rate-limit doc | First valid upload from new user | Per new session | 2 in one transaction | Session plus counters and `activeSessionId` | Prevents concurrent first uploads from creating two active sessions |
| Create inbound queue message       | `messagingOnboardingInboundMessages` | Every unique provider message | Per message | 1 | Sanitized normalized payload, status, attempt counters | Enables provider ACK after durable write and retry drain       |
| Update inbound queue status        | `messagingOnboardingInboundMessages` | Queue claim/checkpoint/finalize/retry | Per queued message | 3 normal writes after create | status, token, handlerCompletedAt, replyText, processedAt | Delivery retry reuses the checkpointed reply; max 5 attempts |
| Update session (add upload)        | `messagingOnboardingSessions`   | Each media message               | Per upload      | 1 transactional write | uploads[], lastUploadAt, intakeExpiresAt | Exact cap/dedup/current-state check; attempt-unique Storage paths avoid retry overwrite, and rejected/throwing finalization adds one exact session read before cleanup so committed references survive acknowledgement loss |
| Update session (state change)      | `messagingOnboardingSessions`   | State transitions                | 5-8 per session | 1            | state, stateHistory[], updatedAt                          | Append to stateHistory array                                  |
| Update session (validation result) | `messagingOnboardingSessions`   | After asset intelligence         | Per session     | 1 transactional write | validMenuFiles, invalidFiles, extractedBusinessInfo, etc. | Commits only if the exact upload snapshot is unchanged; otherwise returns to intake |
| Update session (extraction result) | `messagingOnboardingSessions`   | After extraction completes       | Per session     | 1            | extractedMenuData, extractedProjectFiles, qualityScore     | Heavy write (~10-80 KB depending on menu size and per-file extraction data) |
| Update session (published result)  | `messagingOnboardingSessions`   | After publish                    | Per publish     | 1            | publishedResult, state=LIVE, delete extractedProjectFiles  | Final update happens inside the publish transaction           |
| Mark preview viewed                | `messagingOnboardingSessions` + `messagingOnboardingEvents` | First preview view only | 0-1 per session | 1 session merge + 1 event | `previewViewedAt`, `PREVIEW_VIEWED` | Repeated page refreshes do not create repeated preview-view events |
| Create/update rate limit           | `messagingOnboardingRateLimits` | Session creation, extraction quota, cooldown | Per admitted mutation | 1 in owning transaction | Counters, active session pointer, 90-day `expiresAt` | Small doc. Key = SHA-256 of `{provider}:{userId}`; legacy rows gain expiry on their next admitted write |
| Create extraction job              | `menuImageProcessingJobs`       | After asset validation           | Per extraction  | 1            | Full job doc, `source`, `skipProjectSave`                 | Triggers existing processMenuImagesJob CF without temp project save |
| Create tenant                      | `tenants`                       | Publish pipeline                 | Per publish     | 1            | Full doc                                                  | Inside Firestore transaction                                  |
| Create store                       | `stores`                        | Publish pipeline                 | Per publish     | 1            | Full doc                                                  | Inside Firestore transaction, includes roles, timeSlotPresets |
| Create/update user                 | `users`                         | Publish pipeline                 | Per publish     | 1            | Full doc or merge                                         | Links phone to user account                                   |
| Update platformSummary counters    | `platformSummary/summary`       | Publish pipeline                 | Per publish     | 1            | collision-checked tenants.count, stores.count             | Inside Firestore transaction; legacy `default` remains read-only |
| Update storesSummary               | `platformSummary/storesSummary` | Publish pipeline                 | Per publish     | 1            | stores.{storeId}                                          | Merge update, inside transaction                              |
| Create project                     | Project collection              | After publish                    | Per publish     | 1            | Full project with extractedData                           | Heavy write (~50-100 KB)                                      |
| Write health snapshot              | `systemHealth`                  | Health monitor hourly            | Hourly          | 1            | Metrics, cost estimate, source-retention sample, alerts   | Admin-only operational telemetry                              |
| Create system alert                | `systemAlerts`                  | Health threshold breach          | On threshold    | 0-1          | title, severity, subsystem metadata                       | Uses default cooldown to avoid repeated alert spam             |

### Deletes

| Operation                 | Collection                      | Trigger            | Frequency | Docs Deleted           | Soft/Hard                           | Notes                                   |
| ------------------------- | ------------------------------- | ------------------ | --------- | ---------------------- | ----------------------------------- | --------------------------------------- |
| Cleanup expired sessions  | `messagingOnboardingSessions`   | Daily scheduler    | Daily     | 0-50                   | Hard delete (after 30 days archive) | Sessions older than 30 days past expiry |
| Expire inactive rate-limit rows | `messagingOnboardingRateLimits` | Firestore TTL on `expiresAt` | Continuous after 90 days of inactivity | N/A | TTL delete | Current session/quota/cooldown writes refresh expiry; all enforced windows are shorter than retention |
| Expire inbound queue docs | `messagingOnboardingInboundMessages` | Firestore TTL on `expiresAt` plus daily scheduler fallback | Continuous + daily | 0-100/day via scheduler fallback | TTL/hard delete | 30-day retention for processed/failed queue docs; scheduler fallback continues while the product flag is disabled so a rollout pause cannot extend payload retention |
| Expire tracking events    | `messagingOnboardingEvents`     | Firestore TTL on `expiresAt` | Continuous | N/A | TTL delete | 30-day retention for lifecycle events written by shared logger and API routes |

---

## Onboarding Tracking Events (Internal Observability)

| Operation              | Collection                  | Trigger                  | Frequency         | Docs Written | Notes                                                  |
| ---------------------- | --------------------------- | ------------------------ | ----------------- | ------------ | ------------------------------------------------------ |
| Log lifecycle event    | `messagingOnboardingEvents` | Every significant action | 15-20 per session | 1            | Fire-and-forget, ~0.5-1 KB per event. Non-blocking.    |
| Read events (analysis) | `messagingOnboardingEvents` | On-demand admin queries  | Rare              | 0-100        | Indexed by sessionId, eventType, provider. Admin only. |

**Feature flag:** `ENABLE_MESSAGING_ONBOARDING_TRACKING: true` (ON by default when onboarding is enabled)

**Retention:** shared event logger and preview API routes set `expiresAt` for 30-day TTL. Enable Firestore TTL on `messagingOnboardingEvents.expiresAt` via `scripts/setup-firestore-ttl.sh`.

**Diagnostic boundary:** the shared lifecycle-event writer sanitizes retained event metadata before Firestore writes, stores event errors as code/retry metadata only, and caps event write/preparation source error names/codes before logging. The app-side preview/publish event writes use the same bounded metadata policy, and the platform-only ops reader applies the bounded display policy for older 30-day event rows. They keep allowlisted scalar telemetry, truncate allowed string enums, record sensitive identifiers/URLs/names/hashes as presence/length metadata, and drop nested objects/arrays. Preview approve/fix and app-side publish events do not retain raw business names, issue arrays, tenant IDs, store IDs, or project IDs in metadata. Webhook signature-failure events store IP presence/length metadata only. Webhook logger diagnostics also keep provider path, IP, inbound message ID, and provider-user values as presence/length metadata with source error name/code/status only. Inbound queue lifecycle event metadata and processing-failure logger diagnostics keep message IDs as presence/length metadata and source error names/codes capped; real message IDs remain only in required queue document IDs and return values for idempotency. Session-engine, intake-processor, and health-monitor logger diagnostics keep session IDs and source error metadata bounded; real session IDs remain only in required state documents, event records, queue/session fields, and Storage paths. Intake processor state-history reasons for validation retry failure and extraction-job creation use fixed local text instead of raw exception or job IDs, and intake queue/query/send/validation diagnostics cap source error names/codes before logging. WhatsApp provider parse diagnostics cap source error names/codes; send diagnostics keep provider-user and provider response body values as presence/length metadata only, and failed text sends throw stable provider failure codes for downstream retry diagnostics. WhatsApp provider media URL rejections keep media URL and validation errors as presence/length metadata only after the shared Functions public HTTPS + DNS target validator runs. The retained Cloud Functions publish-pipeline reference logs session, tenant, store, and project identifiers as presence/length metadata only, and caps provider confirmation source error names/codes before logging.

**Upload finalization cleanup diagnostics:** duplicate/capped/stale append results and thrown create/append finalization now perform one exact session read before Storage compensation. Valid persisted upload arrays that do not reference the attempt path authorize deletion; a matching reference, malformed persisted row, or read failure defers cleanup with bounded session/upload presence-length diagnostics. Attempt-unique object IDs prevent a replay from overwriting the download token of a previously committed source. This adds one Firestore read only on rejected or throwing finalization paths and no read on an ordinary admitted upload.

**Legacy temp-project cleanup diagnostics:** current messaging extraction jobs set `skipProjectSave: true`, so the temp project delete path is legacy-only. If a legacy temp project delete fails, `msgExtractionWatcher` logs bounded session/temp-project presence-length metadata, a fixed cleanup target, and bounded source error name/code only. This adds no Firestore reads/writes/deletes beyond the already-attempted temp project delete and no Storage operations.

**Recovery-message send diagnostics:** extraction failure and blank-result recovery still attempt the same provider message asking the owner to send clearer photos. If that provider send rejects, `msgExtractionWatcher` logs `EXTRACTION_CLEARER_PHOTOS_SEND_FAILED` with bounded session metadata and source error name/code only. This adds no Firestore reads/writes/deletes, no Storage operations, and no provider calls beyond the already-attempted recovery message.

**Monthly cost impact at 1,000 sessions:** ~₹3 (negligible — 15K-20K writes at ₹15/100K)

---

## Durable Inbound Queue

| Operation              | Collection                            | Trigger                 | Frequency    | Docs Written | Notes |
| ---------------------- | ------------------------------------- | ----------------------- | ------------ | ------------ | ----- |
| Queue inbound message  | `messagingOnboardingInboundMessages`  | Unique provider message | Per message  | 1            | BulkWriter `create()` by SHA-256(provider + providerMessageId). Stores sanitized normalized payload only. |
| Claim queued message   | `messagingOnboardingInboundMessages`  | Scheduled drain | Per message | 1            | Transactional PENDING → PROCESSING with attempt and unique token. |
| Checkpoint handler     | `messagingOnboardingInboundMessages`  | Session handling completed | Per message | 1 | Saves bounded reply text before provider delivery so retries do not rerun mutations. |
| Finalize queued message | `messagingOnboardingInboundMessages` | Success/failure         | Per message  | 1            | Token-bound PROCESSED or retry/FAILED with backoff. |

**Retention:** queue docs set `expiresAt` for 30-day TTL. Enable Firestore TTL on `messagingOnboardingInboundMessages.expiresAt` via `scripts/setup-firestore-ttl.sh`. `menulistMaintenanceScheduler.messaging_session_cleanup` also deletes up to 100 expired inbound docs per daily run as a bounded fallback.

**Feature-independent lifecycle:** `ENABLE_MESSAGING_ONBOARDING` gates new product activity and the 12-hour provider reminder, but it does not gate expiry, terminal-session/Storage cleanup, durable upload cleanup, or inbound-message deletion. Disabling the feature cannot pause declared retention obligations.

---

## Firebase Storage

| Operation                          | Path Pattern                                   | Trigger                             | Size              | Notes                                                                 |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------- | ----------------- | --------------------------------------------------------------------- |
| Upload menu images (from provider) | `messagingOnboarding/{sessionId}/{fileId}.jpg` | Media download via provider adapter | 0.5-5 MB per file | Downloaded by Cloud Function via `IMessagingProvider.downloadMedia()` |
| Upload PDF (from provider)         | `messagingOnboarding/{sessionId}/{fileId}.pdf` | Media download via provider adapter | 0.5-10 MB         | Single file                                                           |
| Read images (asset validation/extraction) | Same paths                              | assetIntelligence + processMenuImagesJob CF | —       | Asset Intelligence reads exact session-scoped paths through Admin Storage with CRC, byte, MIME-signature and SHA-256 checks; extraction consumes the separately validated job file contract |
| Delete superseded full-resend media | `messagingOnboarding/{sessionId}/{oldFileId}.*` | Full-resend restart after its Firestore transaction commits | — | Best-effort delete of pre-preview sources removed from the authoritative replacement cycle; failures are bounded and observable |
| Delete expired media               | `messagingOnboarding/{sessionId}/`             | Cleanup scheduler                   | —                 | Deletes media only for expired/non-published sessions                 |
| Retain published source media      | `messagingOnboarding/{sessionId}/`             | Successful publish                  | 0.5-10 MB/file    | Intentional: project file records keep these URLs for dashboard source preview and extraction retry workflows |

---

## Cloud Functions

| Function                        | Trigger                                     | Frequency                 | Duration | Memory | Notes                                                                                          |
| ------------------------------- | ------------------------------------------- | ------------------------- | -------- | ------ | ---------------------------------------------------------------------------------------------- |
| `messagingOnboardingWebhook`    | onRequest (HTTP POST from provider)         | Per provider webhook      | <5s ACK target after durable bulk create | 256 MB | Verifies signature, normalizes up to 100 batched messages, and ACKs only after BulkWriter closes. Processing is scheduler-only. |
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
- **Durable inbound queue** — Webhook ACK happens after BulkWriter dedup creates for every batched message; scheduled retries use a saved handler/reply checkpoint
- **No pre-create queue read** — The inbound queue uses the provider-message hash as the document ID, so normal webhook persistence avoids a transaction read before every insert
- **No general per-message session dedup write** — The inbound queue owns provider-message dedup. The session retains only its first-message trace plus bounded full-resend and invalid-upload reply markers needed to make the mutation/checkpoint crash window idempotent without losing the owner reply.
- **Bounded outbound delivery leases** — Preview, confirmation, and fix producers reset token-bound delivery state; each claim consumes one of five attempts, expired preview/fix rows are discarded, and a poison row cannot permanently starve the next pending session.
- **Bounded replacement staging and cleanup** — Post-preview files use a separate 15-file `replacementUploads` set, so the three-file restart signal remains reachable even when the authoritative preview used 15 sources. Full resend, old-preview publish, and fix requests move orphaned paths into a 45-path durable cleanup queue. Deletion is attempted immediately and retried by the daily scheduler; expired-session cleanup also includes authoritative, staged, and queued paths. Legacy cumulative rows split by the latest preview timestamp.
- **Transactional 24-hour hard expiry** — Active lookup plus upload/rejection, intake, validation, and extraction transactions re-check the immutable session `expiresAt`. Expired work becomes `EXPIRED` and clears pending delivery state before any later upload, AI request, extraction job, preview, or recovery message; the daily scheduler remains the bounded fallback and Storage cleanup owner.
- **Firestore TTL fields** — inbound queue docs and lifecycle events set `expiresAt` to prevent long-term metadata storage growth without a cleanup scan
- **Provider-reported file-size precheck** — Oversized files are rejected before provider media download when `fileSize` is available
- **Intake window batching** — Collects all uploads before processing (single extraction job)
- **SHA-256 dedup** — Duplicate images silently ignored (no extra processing cost)
- **Transactional upload append** — One session read/write enforces current state, identity dedup, and the 15-file cap; rejected deterministic Storage paths are cleaned
- **Snapshot-bound validation** — A stale model result cannot overwrite a newly appended upload set
- **Rate limits** — Per-user caps and the active-session pointer are consumed atomically with session creation
- **Session expiry + cleanup** — No zombie sessions accumulating storage
- **Asset Intelligence filtering** — Only valid menu files sent to extraction (reduces Gemini calls by ~30%)
- **Single collection for all providers** — No per-provider collection overhead, simpler queries
- **Extraction-only project save skip** — Messaging jobs set `skipProjectSave: true`, so shared extraction avoids the manual-dashboard temp project read/write/verify/delete cycle
- **Hourly health snapshots** — Cost and failure scans are bounded and hourly. The control lease is checked only during the first four UTC minutes of the hour, reducing the enabled idle control path from about 720 reads/day to at most 48 without a new task or document.
- **Exact snapshot and isolated alert settlement** — Each deterministic hourly `systemHealth/messaging_onboarding_{hour}` document is a complete snapshot and exact-replaces stale/unknown fields. Threshold alerts are independent derived effects: every admitted alert is attempted even when another alert write fails, and each failure emits bounded alert-key/severity diagnostics without misreporting the committed snapshot as failed.
- **Outbound retry observability** — Preview, publish-confirmation, and fix delivery helpers return sent/error counts to the consolidated scheduler. Successful outbound work becomes meaningful activity, and provider query/send failures contribute to the existing health error metric instead of being logged as a quiet successful run.
- **Published source retention monitor** — Published media is retained because projects reference it; `systemHealth` samples retained bytes and raises alerts instead of deleting live source files blindly

### Conditional Optimizations

- **Gemini batch API** — If available, batch validation + extraction in fewer calls
- **Image compression before extraction** — Smaller images = cheaper Gemini processing
- **Cached extraction for similar menus** — If same business re-onboards (unlikely but possible)

### Warnings: Expensive Patterns to Watch

- **Re-extraction loops** — Each fix request → new extraction costs full Gemini API. Capped at 3 corrections/session.
- **Large PDFs** — 40-page PDF = 40 Gemini extraction calls = expensive. Asset Intelligence should filter pages first.
- **Intake processor polling** — Runs every 2 minutes. If session count grows, query cost increases. Mitigated by Firestore index.
- **Storage accumulation** — Expired-session cleanup must keep running. Published source files are retained intentionally because the created project references them.
- **Short-lived signed URLs** — Do not use signed URLs for project files. Messaging uploads now store Firebase token URLs so owner dashboard source previews do not break after 24-25 hours.

Asset Intelligence diagnostics add no Firestore reads/writes. Each readable source still performs one Storage read, now through Admin Storage rather than a public token URL. Valid sessions whose base64-expanded prompt estimate is at most 18 MiB use one Gemini generation call and no Files API calls. Larger sessions add one temporary Gemini Files API upload per readable file plus one best-effort delete per known provider file; the provider documents Files API storage as temporary, and cleanup runs in `finally`, including partial upload failure. Record, integrity, Storage-read, provider-cleanup, temp-cleanup, and parse failures use stable `ASSET_VALIDATION_*` codes with counts/lengths only; raw upload IDs, Storage URLs, provider file names, Gemini response snippets, and exception messages must not be logged.

Session cleanup diagnostics add no Firestore reads/writes or Storage operations beyond the existing expiry, reminder, cleanup, and inbound queue cleanup paths. Failures are logged with stable `MESSAGING_*` codes plus bounded source metadata instead of raw session IDs or exception messages.

Active publish cache revalidation diagnostics add no Firestore reads/writes, Storage operations, Cloud Function calls, provider calls, indexes, rules, or cache tags beyond the existing successful publish path. The existing store/global tags, Digital Screens touch, and project-scoped Owner Business Assistant invalidation are independently settled after commit so one failure cannot skip later effects. Revalidation failures are logged once with stable `messaging_onboarding_publish_cache_revalidation_failed` diagnostics, bounded tenant/store/project/user metadata, tag count, failed-effect count, and source error metadata only; raw IDs and exception messages must not be logged.

Active publish lifecycle-event diagnostics add no Firestore reads/writes beyond the existing best-effort event write attempt. If `PUBLISH_STARTED` or `PUBLISH_COMPLETED` event creation fails, `messaging_onboarding_publish_event_write_failed` records session/provider presence-length metadata, fixed event type/state, metadata key count, and bounded source error metadata only. Publish success, session finalization, cache revalidation, and public output are unchanged.

Preview route diagnostics add no Firestore reads/writes, Storage operations, Cloud Function calls, provider calls, indexes, rules, or cache tags beyond the existing token read/action paths and best-effort event write attempts. Top-level GET, approve/fix, publish retry, and preview event write failures are logged with stable `messaging_preview_*` diagnostics and bounded route/session/provider/request-IP/state/count metadata only. Expected approve-transaction failures use typed local error codes for invalid token, missing session, in-progress publish, not-ready session, and expired session; the route does not branch on raw transaction exception text. `PUBLISH_FAILED` event documents retain code/retry metadata and do not store raw retry exception messages.

Shared lifecycle-event metadata sanitization adds no Firestore reads/writes, Storage operations, Gemini calls, provider calls, Cloud Function invocations, indexes, rules, new routes, cache tags, or owner/customer UI beyond the existing event-write attempts and platform-only ops read. Existing lifecycle events still write one event document when tracking is enabled, but retained metadata is now allowlisted and bounded at the shared writer and platform ops reader.

Asset validation Storage and model-input hardening adds no Firestore reads/writes, indexes, rules, routes, cache tags, or owner/customer UI. It replaces the public-URL/DNS round trip with one bounded Admin Storage stream per readable source. The stream is canceled at 10 MB or 15 seconds and the resulting bytes must match the immutable record's size, MIME signature, and SHA-256. Inline Gemini requests are estimated before base64 conversion; sessions above the 18 MiB ceiling use temporary Files API uploads and deletes instead of sending an invalid oversized inline request. Because this changes Cloud Function source, Firebase Functions deploy is required after validation.

WhatsApp provider media URL and response-size hardening adds one bounded JSON parse for the Meta media lookup response, one DNS lookup through the shared Functions network-target helper before the existing media binary download, and no Firestore reads/writes, Storage writes/deletes, Gemini calls, extra provider calls, indexes, rules, new routes, cache tags, or owner/customer UI. Media IDs are URL-encoded before the Graph API lookup, provider media URL lookup/download/too-large failures use stable local failure codes, and returned media URLs are rejected before download unless they are public HTTPS targets whose resolved addresses are not local/private/link-local/metadata-style network targets. The adapter now reads the lookup response through a 64KB bounded JSON reader and reads the media response through `readResponseUint8ArrayWithLimit()`, which rejects oversized headers and cancels streams that cross `UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES` before returning the binary buffer. Because this changes Cloud Function source, Firebase Functions deploy is required after validation.

The June 29 WhatsApp media lookup parse diagnostic adds no Firestore reads/writes/deletes, Storage operations, Gemini calls, provider calls beyond the existing media lookup, indexes, rules, API routes, cache tags, owner/customer UI, schema changes, or rate-limit changes. Malformed or oversized lookup JSON still results in the existing `WHATSAPP_MEDIA_URL_REJECTED` path after an empty URL fallback, but now logs `WHATSAPP_MEDIA_URL_RESPONSE_PARSE_FAILED` with bounded source metadata so production support can distinguish provider parse failure from an ordinary invalid URL.

WhatsApp Graph API message endpoint hardening adds no Firestore reads/writes, Storage writes/deletes, Gemini calls, provider calls, indexes, rules, routes, cache tags, or owner/customer UI. It only URL-encodes the configured WhatsApp phone-number ID before existing text and interactive `/messages` sends. Because this changes Cloud Function source, Firebase Functions deploy is required after validation.

Historical June 28-29, 2026 deploy attempts for Asset Intelligence diagnostics, session-cleanup diagnostics, WhatsApp media lookup parsing, messaging response-size hardening, Meta endpoint-ID encoding, lifecycle-event metadata sanitization, asset-validation upload URL and media URL hardening, shared network-target/public-output hardening, and asset-intelligence upload target validation reached Firebase predeploy lint/build and then failed before upload because Firebase could not read `menulist-qa` project metadata through Cloud Resource Manager: HTTP 403, caller does not have permission.

Do not reuse the older command shapes from those historical attempts. Current messaging-onboarding retry evidence must start with `npm run verify:functions-deploy-preflight`; if the retry needs a messaging-specific Functions subset instead of the External Certification Runbook Gate 1 target set, record the exact scoped `menulist-qa` target list and reason in the production-readiness audit before deploy retry. Production deploys require QA evidence and explicit production deploy approval.

App-side preview/publish event metadata sanitization adds no Firestore reads/writes, Storage operations, Gemini calls, provider calls, Cloud Function invocations, indexes, rules, new routes, cache tags, or owner/customer UI beyond existing preview/fix/publish event write attempts. It changes only retained event metadata and the non-ready publish response copy; no Firebase deploy is required.

---

## Cost Estimate (per 1,000 successful onboardings/month)

| Resource                                              | Operations/month          | Unit Cost  | Monthly Cost (₹)    |
| ----------------------------------------------------- | ------------------------- | ---------- | ------------------- |
| Firestore Reads (session queries)                     | 15,000                    | ₹5/100K    | ₹0.75               |
| Firestore Reads (intake processor baseline)           | ~129,600 (6 bounded query/control checks × 720/day × 30) | ₹5/100K | ₹6.48 |
| Firestore Reads (preview + publish)                   | 3,000                     | ₹5/100K    | ₹0.15               |
| Firestore Writes (session updates)                    | 10,000 (avg 10/session)   | ₹15/100K   | ₹1.50               |
| Firestore Writes (inbound queue durability)           | ~20,000 (avg 5 messages/session × create + claim + handler checkpoint + finalize) | ₹15/100K | ₹3.00 |
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
| `getBusinessCategory`       | `src/data/shared/businessTypes.ts`      | Helper (used in publish)      |
| Messaging publish transaction | `functions/src/messagingOnboarding/publishPipeline.ts` | Canonical store and `storesSummary` projection write together during publish |

---

## API Routes & Their Firebase Impact

| Route                                  | Method    | Firebase Ops                     | Rate Limited?          | Notes                                                                                                                  |
| -------------------------------------- | --------- | -------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `messagingOnboardingWebhook` (CF)      | POST      | 0R + 1W per unique message (max 100-message batch) | Per-user in Firestore  | BulkWriter persists every normalized message before ACK. Partial failure returns 500; deterministic IDs make retry idempotent. |
| `/api/msg-preview/[sessionId]`         | GET       | 1R                               | Token access + hashed session/IP read limiter | Route `sessionId` must match the Firestore auto-ID preview session shape before rate-limit keys or Firestore reads. Reads session doc for preview rendering. Rate-limit provider key stores hashed session/IP segments, not raw preview identifiers. |
| `/api/msg-preview/[sessionId]/approve` | POST      | 4-6R + 8-10W                     | Idempotent per attempt + hashed IP publish limiter | Route `sessionId` must match the Firestore auto-ID preview session shape before transaction reads or publish writes. Rejects bodies above 4KB before JSON parsing. Reads session, checks existing phone user and subdomain, then transactionally re-reads/claims the canonical phone-owner document before tenant/store writes. New messaging and phone-OTP identities share one HMAC-derived user document ID. Existing candidates must remain phone-matched and unscoped. The same transaction writes tenant+store+user+project+summaries, finalizes session to LIVE, and deletes session `extractedProjectFiles`; a stale/concurrent owner claim returns 409 and leaves no business documents. Successful commit revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. Other retryable publish failures may retry once before recovery to AWAITING_APPROVAL. |
| `/api/msg-preview/[sessionId]/fix`     | POST      | 1R + 1W                          | 3/session max + hashed session/IP action limiter | Route `sessionId` must match the Firestore auto-ID preview session shape before rate-limit keys or Firestore reads/writes. Rejects bodies above 4KB and limits issue choices to 5 before Firestore work. Reads session, writes fix request to session. Rate-limit provider key stores hashed session/IP segments. |
| `menulistMaintenanceScheduler.messaging_intake` (CF task) | scheduled | Up to 2 inbound claims, 1 model-backed session, and 1 pending row per delivery kind plus one task lease | N/A | Ten-minute lease prevents overlap; token/transaction checks protect queue, validation, and delivery state |
| `menulistMaintenanceScheduler.messaging_session_cleanup` (CF task) | scheduled | 1-100R + 0-50W + Storage deletes plus one lightweight task lease | N/A | Reads expired sessions, deletes media; runs daily inside the maintenance scheduler |

---

_Document Status: Source implementation current (v5.10 — July 13, 2026 bounded delivery claims, deterministic replay replies, bounded replacement staging/cleanup with poison/failure/concurrency convergence, safe invalid-terminal retirement, cooldown retention, producer invalidation, and transactional hard-expiry enforcement are documented. Runtime provider, deploy, TTL, and hosted certification remain separate launch evidence.)_
