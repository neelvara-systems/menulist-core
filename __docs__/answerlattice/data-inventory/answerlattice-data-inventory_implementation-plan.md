# Answerlattice Data Inventory Implementation Plan

**Status:** P0/P1-safe retention controls implemented; Knowledge Intake source compaction remains a product lifecycle decision
**Product scope:** Answerlattice only
**Created:** 2026-06-15
**Implemented:** 2026-06-15
**Deploy status:** Pending; Firebase CLI returned 403 for both Answerlattice prod and QA projects with current credentials
**Input reviewed:** Current Answerlattice codebase, doctrine, rules, indexes, cost docs, and MenuList data-inventory implementation pattern
**Decision rule:** Codebase truth first, Firebase cost second, external suggestions third

## 1. Executive summary

The same production principle from the MenuList data work applies to Answerlattice, but the implementation must be Answerlattice-specific:

> Firestore should hold governed answer truth, current workspace truth, and compact read models. It should not become the permanent warehouse for raw search events, operational logs, attachment history, source text, embedding cache rows, old compiled bundle versions, or notification/contact detail.

Answerlattice already has several strong controls:

- dedicated Firebase runtime, rules, indexes, Storage rules, and Cloud Functions;
- summary-first docs for integration health, Knowledge Intake summary, friction snapshot, predictive triggers, support board summary, activation summary, tenant registry, source versions, and context bundle manifests;
- integration TTL fields and Firestore TTL field overrides;
- signal-event cleanup after 12 months;
- friction-daily-stat cleanup after 90 days;
- AI operation accounting-only default with detailed payloads gated by feature flag;
- public/widget config and hosted help paths that reuse cache and compiled bundles.

The production work is focused, not architectural:

1. explicit retention/cleanup is now added for the remaining high-growth operational collections;
2. raw runtime histories now expire after the active feedback/support window;
3. old compiled bundle Storage objects and hard-delete attachments are now cleaned;
4. summary-first owner/operator reads remain the rule before adding new summary collections;
5. TTL field overrides were added only for `expiresAt` fields that are not query inputs.

## 1.1 Implemented scope

| Priority | Status | Implemented files |
| --- | --- | --- |
| P0.1 retention module | Implemented | `src/lib/answerlattice/dataRetention.ts`, `functions-answerlattice/src/answerlattice/dataRetention.ts` |
| P0.2 `expiresAt` writes | Implemented | Scheduler logs, search history, query embeddings, notification logs, owner notifications, rate counters, contact enquiries |
| P0.3 scheduler cleanup | Implemented | `cleanupAnswerlatticeOperationalRetention()` inside existing `answerlatticeNightly` |
| P0.4 raw search history retention | Implemented | 90-day expiry, bounded payload writer, scheduler cleanup |
| P0.5 query embedding cleanup | Implemented | 30-day expiry, stale-read delete, scheduler cleanup |
| P0.6 bundle cleanup | Implemented | Scheduler deletes old versioned public/private context bundle Storage objects |
| P0.7 TTL overrides | Implemented | `firestore-answerlattice.indexes.json` adds TTL overrides for new `expiresAt` fields |
| P1 attachment lifecycle | Implemented for hard delete | Chat image cleanup and ticket document/message attachment cleanup |
| P1 Knowledge Intake counter compaction | Implemented | Review-item edits update parent job counters transactionally instead of scanning source/review collections |
| P1 Knowledge Intake compaction | Deferred intentionally | Current published-job workflow still returns source/review details and no archive state exists |
| P2 summary-first enforcement | Enforced by design | No new summary collections added; scheduler totals reuse existing run log/read-model pattern |

## 2. Priority matrix

| Priority | Decision |
| --- | --- |
| P0 | Implemented for Answerlattice public/widget/search/support runtime. These are direct storage growth, privacy, or operational risk items. |
| P1 | Implemented where lifecycle-safe. Source-truth compaction remains deferred where the product workflow lacks an archive state. |
| P2 | Enforced by not adding new summary collections and reusing existing scheduler/read-model outputs. |
| P3 | No broad public payload rewrite now. Answerlattice already has public content cache and compiled context bundles. Focus on bundle retention instead. |
| P4 | TTL overrides for new `expiresAt` fields are implemented. Broad index exemption/removal remains deferred because it can break query paths. |

## 3. P0: production-safe storage and retention controls

### P0.1 Add an Answerlattice retention policy module

Implemented a small product-local retention policy module used by app routes and `functions-answerlattice`.

Implemented files:

- `src/lib/answerlattice/dataRetention.ts`
- `functions-answerlattice/src/answerlattice/dataRetention.ts`

Functions-side cleanup task failures report `ANSWERLATTICE_RETENTION_TASK_FAILED` plus bounded source-error metadata in logs. Scheduler run errors keep fixed task failure codes instead of raw exception text. Retention windows, cleanup queries, batch limits, and Storage deletion limits are unchanged.

Implemented policy constants:

| Data | Implemented default | Reason |
| --- | --- | --- |
| `answerlattice_schedulerRunLogs` | 90 days | Operational logs should not grow forever. |
| `answerlattice_notificationLogs` | 90 days | Delivery troubleshooting window, not permanent contact store. |
| `ownerNotificationEvents` | 90 days | Operational notification queue/audit. |
| `ownerNotificationDeliveries` | 90 days | Delivery diagnostics. |
| `ownerNotificationRateLimits` | 2 days | Daily counters only need short retention. |
| `answerlattice_contactEnquiries` | 365 days | Public lead/contact data should have explicit lifecycle. |
| `queryEmbeddings` | 30 days | Matches existing in-code staleness check. |
| `aiSearchHistory` raw detail | 90 days raw; compact aggregate beyond that if needed | Feedback/friction window while avoiding permanent answer-event warehouse. |
| Compiled context bundle versions | active + previous 2 versions | Rollback/debug without unbounded Storage growth. |
| Chat image/ticket message attachments | tied to parent record; delete when parent hard-deleted or archived after retention | Storage lifecycle parity with Firestore parent. |

Do not make these owner-facing settings. They are platform controls.

### P0.2 Add `expiresAt` to server-written operational documents

Added `expiresAt` fields in the write path for:

- `answerlattice_schedulerRunLogs`;
- `answerlattice_notificationLogs`;
- `ownerNotificationEvents`;
- `ownerNotificationDeliveries`;
- `ownerNotificationRateLimits`;
- `answerlattice_contactEnquiries`;
- `queryEmbeddings`;
- `aiSearchHistory`.

Use `Timestamp` values, not ISO strings, for Firestore TTL compatibility.

Validation:

- Existing queries do not depend on the absence of `expiresAt`.
- No client Firestore rule change is needed for admin-only collections unless a client read/write path is introduced.
- TTL field overrides were added only for `expiresAt`; cleanup queries use existing timestamp fields, not `expiresAt`.

### P0.3 Add cleanup to existing Answerlattice scheduler, not a new scheduled function

Per repo rule, no new standalone Answerlattice scheduled function was added. Bounded cleanup now runs inside the existing Answerlattice scheduler path.

Targets:

- legacy `answerlattice_schedulerRunLogs` without `expiresAt` and `startedAt` older than retention;
- legacy generic `answerlattice_notificationLogs` without `expiresAt` and `createdAt` older than retention;
- stale `queryEmbeddings` older than 30 days;
- processed owner-notification events/deliveries/rate counters without `expiresAt`;
- old context bundle Storage versions beyond active/last-ready plus previous two versions.

The scheduler cleanup uses per-task limits and diagnostics. Attachment cleanup is handled in hard-delete paths for chat sessions and support tickets rather than a broad orphan scan.

### P0.4 Compact or expire raw `aiSearchHistory`

`aiSearchHistory` is the largest Answerlattice runtime growth surface because every answer path writes to it. Keep it useful, but stop treating it as permanent raw history.

Implemented first-pass policy:

1. Keep raw per-answer rows for the active feedback/support window.
2. Truncate/cap high-cardinality fields:
   - `query`;
   - `craftedAnswer`;
   - `references`;
   - `generatedQueryFromImage`;
   - product context maps;
   - fallback/debug fields.
3. Add `expiresAt` to rows.
4. Add scheduler cleanup for legacy rows by `createdOn`.
5. Keep widget feedback rows for the 90-day support/friction window.

Do not add a new analytics warehouse inside Firestore. If long-term search analytics becomes necessary, export aggregated summaries later.

### P0.5 Delete stale `queryEmbeddings` instead of only skipping them

Query embeddings now get `expiresAt`, a TTL field override, stale-read best-effort delete, and scheduler cleanup using `createdAt < cutoff`.

### P0.6 Add compiled context bundle version cleanup

Context bundles are useful and should stay, but versioned Storage objects can grow.

Policy:

- Keep current `activeVersion`.
- Keep previous 2 ready versions for rollback/debug.
- Delete older public and private Storage paths under:
  - `answerlattice-context/public/{publicBundleId}/v{version}/...`;
  - `answerlattice-context/private/{tId}/{sId}/v{version}/...`.
- Keep manifest document compact and avoid storing an unbounded history array there.

Implementation runs as a bounded scheduler task after tenant nightly work, using the current manifest to keep active/last-ready plus previous two versions.

### P0.7 TTL field overrides after query/index audit

Current `firestore-answerlattice.indexes.json` already had TTL overrides for integration event/log/rate-limit collections. New TTL field overrides were added only for `expiresAt` fields that are not used by cleanup queries or composite indexes.

Implemented TTL overrides:

- `answerlattice_schedulerRunLogs.expiresAt`;
- `answerlattice_notificationLogs.expiresAt`;
- `ownerNotificationEvents.expiresAt`;
- `ownerNotificationDeliveries.expiresAt`;
- `ownerNotificationRateLimits.expiresAt`;
- `queryEmbeddings.expiresAt`;
- `answerlattice_contactEnquiries.expiresAt`;
- `aiSearchHistory.expiresAt`.

Broader high-cardinality field index exemptions and index removals remain deferred because they can break existing owner, widget, scheduler, and support queries.

## 4. P1: workflow compaction and attachment lifecycle

### P1.1 Knowledge Intake closed-job compaction

Knowledge Intake stores source text and review details because they are needed while a job is active. Compacting this layer after publication would be useful, but it is intentionally deferred because current code has `published` and `cancelled` states but no archive/closed lifecycle, and `getKnowledgeIntakeBundle()` still returns sources and review items for owner review.

The safe summary-pattern change is implemented before that lifecycle exists: review-item status edits now update the parent job counters transactionally. A normal accept/reject/draft edit no longer runs a full source/review-item recount after the item write. Full recounts remain only at lifecycle boundaries such as analyze and publish, where the item set can legitimately change and correctness matters more than saving a bounded read.

Future lifecycle:

| Job state | Retain |
| --- | --- |
| Collecting/reviewing | Full redacted source text, excerpts, review items, usage ledger, metadata. |
| Published/closed for 30 days | Full detail for support/debug. |
| After retention window | Keep job summary, source hashes, source titles, origin URLs, source type, published target ids, redaction counts, AI operation id, usage totals. Remove or archive full `contentText` and large generated review bodies. |

Do not compact audit logs, published KB articles, canonical proposals, or billing/usage ledger values required for accounting. Add this only after a product-visible archive state exists.

### P1.2 Support tickets and chat archival

Support records are workflow truth, so do not blindly delete active history. The implemented safe piece is attachment parity on hard delete:

- chat session hard delete reads the persisted session and removes chat image URLs before deleting Firestore;
- support ticket hard delete reads the persisted ticket and removes top-level documents plus message attachments before deleting Firestore.

Archive/compaction for old closed tickets and old chat sessions remains deferred until there is a product-defined support retention window and unresolved-case linking check.

### P1.3 Notification migration cleanup

There are two notification paths:

- generic `answerlattice_notificationLogs`;
- newer owner-notification events/deliveries/rate counters.

Implemented before production freeze:

1. Generic `answerlattice_notificationLogs` now expire after 90 days.
2. Owner-notification events and deliveries now expire after 90 days for Answerlattice rows.
3. Owner-notification rate counters now expire after 2 days for Answerlattice rows.
4. Rate-limit checks still use the current daily counter docs; cleanup windows are longer than the counter day.

### P1.4 Contact enquiry lifecycle

Public contact submissions include personal contact details and hashed IP. A 365-day platform lifecycle is now implemented for raw contact submissions:

- new writes get `expiresAt` and `retentionDays`;
- TTL field override covers `answerlattice_contactEnquiries.expiresAt`;
- scheduler cleanup removes legacy rows by `createdAt`.

Shorter spam/closed/converted lifecycle states can be added later if Answerlattice adopts a CRM/customer-record policy.

## 5. P2: enforce summary-first reads

Do not create new summary collections until existing Answerlattice summaries are proven insufficient.

Existing summary/read-model layer to prefer:

| Need | Existing summary/read model |
| --- | --- |
| Tenant discovery | `platformSummary/answerlatticeTenantsSummary` and tenant registry docs |
| Activation readiness | `platformSummary/answerlatticeActivationSummary_*` |
| Knowledge Intake dashboard | `platformSummary/knowledgeIntakeSummary_*` |
| Friction dashboard | `platformSummary/frictionSnapshot_*` |
| Predictive widget runtime | `platformSummary/predictiveTriggers_*` |
| Integration status | `platformSummary/integrationHealth_*` |
| Support board dashboard | `platformSummary/supportBoardSummary_*` |
| Public/compiled context | `platformSummary/answerlatticeContextBundleManifest_*` plus Storage bundles |
| Cache freshness | `answerlattice_cacheVersions` |

Required checks:

1. Inventory owner/dashboard routes for raw `aiSearchHistory`, `signalEvents`, `supportTickets`, `chatSessions`, and intake source scans.
2. Replace hot dashboard reads with existing summary docs where possible.
3. Prefer transactional parent counters for bounded parent/child workflows when the child record is small and the parent counter is the displayed state.
4. If a new summary is needed, add it to the existing scheduler/read-model pattern rather than creating a parallel analytics system.
5. Add caps/pagination to every remaining raw drill-down.

## 6. P3 decision: no broad public payload rewrite now

MenuList's P3 public payload/CDN move was skipped because public screens already had a cache layer. For Answerlattice, the same reasoning is stronger:

- public Help Center content cache already exists;
- hosted help domain registry uses cached registry docs;
- compiled context bundles already write public/private JSON objects to Storage;
- public bundle proxy has in-memory cache and path validation;
- widget config returns public bundle refs.

So P3 is not a broad rewrite. The production task is bundle retention and manifest hygiene, already covered in P0.6.

## 7. P4 decision: TTL done, broad index cleanup deferred

P4 means:

- Firestore TTL field override additions;
- large map/blob/vector index exemptions;
- removal of unnecessary index coverage;
- field override additions for fields that should never be indexed.

Current decision:

- TTL field overrides for the new `expiresAt` fields are implemented.
- Cleanup tasks do not query `expiresAt`, so disabling single-field indexes on `expiresAt` is safe.
- Broad field-index exemptions and index removals remain deferred.

Why broad cleanup remains deferred:

- Answerlattice has many query paths across owner UI, public API, widget, scheduler, functions, and support/admin routes.
- Removing indexes or exempting fields blindly can break queries.
- TTL deletes are billed deletes; they are retention/privacy controls, not free cost optimization.

Recommended flow:

1. Generate query inventory by collection and field.
2. Identify high-cardinality fields never used in queries.
3. Add field overrides for those fields.
4. Deploy any future Answerlattice index cleanup only after validation.

## 8. Implementation sequencing

Implemented order:

1. Add retention constants/helpers and doc policy.
2. Add `expiresAt` to new writes for scheduler logs, notifications, owner notifications, query embeddings, and selected contact records.
3. Add bounded cleanup tasks to Answerlattice scheduler for legacy rows and Storage bundle/attachment cleanup.
4. Add `aiSearchHistory` raw retention or compaction mode.
5. Run TypeScript validation for app and functions.
6. Deploy Answerlattice functions/indexes only for the changed Firebase targets.

Deploy attempt results:

- `firebase deploy --only firestore:indexes,functions:answerlattice --project answerlattice --config firebase-answerlattice.json` failed before deploy: Firestore Rules API returned 403.
- `firebase deploy --only functions:answerlattice --project answerlattice --config firebase-answerlattice.json` failed before deploy: Cloud Resource Manager returned 403.
- `firebase deploy --only firestore:indexes,functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json` failed before deploy: Firestore Rules API returned 403.
- `firebase deploy --only functions:answerlattice --project answerlattice-qa --config firebase-answerlattice.json` failed before deploy: Cloud Resource Manager returned 403.

## 9. Validation plan

Completed validation before shipping implementation:

- TypeScript: `npx tsc --noEmit --incremental false`.
- Functions build: `npm --prefix functions-answerlattice run build`.
- Firestore index JSON parse validation.
- Firestore rules check: no Firestore rules were changed.
- Deploy: attempted for Answerlattice prod and QA; blocked by Firebase project permissions before any deployment.

Post-deploy checks:
  - scheduler cleanup counts;
  - any permission errors;
  - any old documents skipped due missing scope fields;
  - bundle cleanup byte/object counts.

## 10. Firebase cost impact

Expected impact:

- New `expiresAt` fields add tiny write payload overhead.
- TTL deletes and scheduler deletes are billed deletes, so cleanup should be bounded and intentional.
- Removing stale embeddings and old bundle objects reduces long-term storage and index/storage overhead.
- Raw `aiSearchHistory` compaction/deletion reduces the biggest Answerlattice growth surface.
- Summary-first reads should reduce dashboard/support route reads if any raw scans remain.
- Knowledge Intake review-item edits avoid rereading bounded source/review collections for every single status change; parent job counters now move with the edited child row.

The goal is not to minimize every write. The goal is to keep Answerlattice's governed answer truth durable while preventing operational traces, raw runtime history, and caches from becoming permanent product data by accident.
