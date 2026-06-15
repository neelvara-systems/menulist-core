# SMB Data Inventory Implementation Plan

**Status:** P0/P1/P2 implemented 2026-06-14; repo-grounded production hardening added; P3 intentionally skipped; P4 deferred
**Product scope:** MenuList only
**Created:** 2026-06-14
**Input reviewed:** ChatGPT discussion attached in Codex thread after the SMB data inventory docs
**Decision rule:** Codebase truth first, Firebase cost second, external suggestions third

## 1. Executive summary

The ChatGPT discussion is directionally useful, but it needs to be narrowed to the current MenuList architecture.

Validated core idea:

> Firestore should hold current app truth and small read models. It should not become the raw event warehouse, raw log warehouse, public CDN, or permanent job-history store.

This matches MenuList's existing direction: `platformSummary/storesSummary`, `platformSummary/projects_{sId}`, analytics dashboard summaries, Business Health current/snapshot docs, MOL-derived `menuItemState`, `extractionLearning`, and `storeTruthConfidence` already exist as summary/read-model layers.

The plan is not to add many new collections immediately. The plan is to:

1. stop avoidable write growth at the source;
2. enforce existing summaries as normal read paths;
3. compress internal logs after they have served active workflow/support needs;
4. add missing retention and index exemptions only after query audit;
5. move public menu payload serving toward cache/Storage/CDN without weakening public output truth.

## 1.1 Implementation status on 2026-06-14

Implemented in this pass:

| Priority | Status | Code decision |
| --- | --- | --- |
| P0 analytics write policy | Implemented | Added shared `filterAnalyticsUpdateData` policy and enforced it in browser queue, direct writer, public API, and Admin writer. `sessionId` is no longer written to analytics Firestore docs. |
| P0 MOL summary mode | Implemented | Added `MENU_OBSERVATION_MODE`, defaulted to `summary`, and changed project update detection to one `MENU_REVISION_SUMMARY` write by default. Detailed per-item writes remain available only in detailed mode. |
| P0 `menuChangeLog` path divergence | Implemented | Multi-outlet MOL events now use shared scoped nested DAL writes under `menuChangeLog/{tId}/{sId}`. |
| P1 AI operation compaction | Implemented | App-side and extraction-function AI operation logs default to accounting-only. Raw provider response text/details are retained only in detailed mode with `detailExpiresAt`. |
| P1 extraction/job compaction | Implemented | Extraction jobs now carry detail retention metadata; existing completed-job pruning also removes raw batch responses. Image batch job `statusHistory` is capped to 20 entries. |
| P1 snapshot retention | Implemented | Menu snapshots now carry `expiresAt`, `retentionDays`, and scheduler cleanup deletes expired nested snapshot docs in bounded batches. |
| P1 notification detail retention | Implemented | Owner notification events, deliveries, rate-limit counters, and legacy `messageLogs` now carry expiry metadata; scheduler cleanup deletes expired docs. |
| P2 summary-first dashboard/Business Health usage | Verified | Owner dashboard, OBP dashboard, analytics hooks, and Business Health hooks already use existing dashboard summary/current/index read models before raw data paths. No new summary collection was added. |
| Production-prep location analytics default | Implemented | Customer geolocation is now opt-in. Location collection only runs when store analytics preferences explicitly enable location tracking. |
| Production-prep staleness log retention | Implemented | Direct staleness-detection `messageLogs` now carry `expiresAt`, with retention longer than the staleness cooldown to preserve idempotency. |
| Repo-grounded feedback event retention | Implemented | `feedbackEvents` now carry `expiresAt`; the consolidated maintenance scheduler deletes expired events and legacy timestamp-only event docs older than the retention window. |
| Repo-grounded scheduler run-log retention | Implemented | MenuList scheduler run logs now carry `expiresAt`; the consolidated maintenance scheduler deletes expired run logs and legacy startedAt-only run logs older than the retention window. |

Skipped/deferred:

| Priority | Decision |
| --- | --- |
| P3 public payload compiled/Storage/CDN move | Skipped for now because current public screens already have a cache layer and this was larger than the requested P0/P1/P2 pass. |
| P4 index/TTL field override work | Deferred. P4 means Firestore index and TTL policy cleanup: exempting large maps/blobs from indexing and configuring TTL fields. That needs a separate query/index audit so we do not accidentally break required queries. |

## 2. Official Firebase cost ground rules

Verified against official Firebase docs on 2026-06-14:

| Rule | Implementation consequence for MenuList |
| --- | --- |
| Firestore bills document reads, writes, deletes, index entries read, storage including metadata/index overhead, and bandwidth. | Reduce fan-out writes and avoid wide indexed blobs. |
| Each `set` or `update` is billed as a write. Batching improves atomicity/network behavior but does not reduce billed writes. | Write budgets must count documents, not batches. |
| Query listeners bill reads when result documents are added, updated, or removed. | Do not listen to hot analytics/log/history collections. |
| Aggregation queries are billed through index entries read, with a minimum read. | Frequently displayed counts should be materialized into summary docs. |
| Offsets bill skipped documents; cursors/limits should be used. | All raw drill-down lists should use cursor pagination. |
| TTL deletes are not included in free usage. | TTL is privacy/storage control, not the main cost-control mechanism. |
| TTL fields and large array/map fields should usually be exempted from indexing when not queried. | `firestore.indexes.json` needs field override work after query audit. |
| Data bundles can reduce cost for public/common/semi-static data but are wrong for private or user-specific data. | Public menu/reference payloads may fit; owner dashboards, billing, OTP, raw feedback, MOL, and AI logs do not. |

Official sources:

- [Cloud Firestore billing](https://firebase.google.com/docs/firestore/pricing)
- [Cloud Firestore best practices](https://firebase.google.com/docs/firestore/best-practices)
- [Firestore data bundles blog](https://firebase.blog/posts/2021/04/firestore-supports-data-bundles/)
- [Firestore Bundle Builder extension](https://firebase.google.com/docs/extensions/official/firestore-bundle-builder)
- [Firebase case studies summary](https://firebase.google.com/case-studies)

## 3. ChatGPT verdict matrix

| ChatGPT proposal | Verdict | MenuList decision |
| --- | --- | --- |
| Compress MOL from per-item/per-field events to one summary revision per save/publish. | Valid, high priority. | Implement as a new summary event shape inside existing nested `menuChangeLog/{tId}/{sId}`, not as a brand-new top-level `menuRevisions` collection. |
| Disable MOL on draft/autosave. | Valid, needs source tagging. | Add mutation source/save-intent plumbing so draft/autosave paths skip MOL while publish/extraction/bulk paths can log summary events. |
| Fix `menuChangeLog` path divergence. | Valid, high priority. | Move multi-outlet MOL helper to nested path or shared DAL so all readers/writers agree. |
| Snapshot only on publish. | Already mostly satisfied. | Current snapshot creation is publish-gated; add retention/latest-N/monthly baseline rather than changing creation trigger first. |
| Remove scalar `sessionId` from analytics daily docs. | Valid, high priority. | Keep session id in browser/sessionStorage for dedupe, but stop writing scalar `sessionId` to Firestore update payload. |
| Cap analytics high-cardinality maps. | Valid, but not as naive top-N writes. | In basic mode, stop writing some high-cardinality maps at event time; rely on summaries and allowlisted buckets. Scheduled top-N summaries already exist but do not prevent raw daily map growth. |
| Disable customer geolocation lat/lng by default. | Valid. | Default location analytics to timezone/region only unless store analytics preferences or diagnostic mode explicitly enable coarse geo. |
| Create `analyticsMode: off/basic/full`. | Valid. | Implement through existing feature/config pattern, not owner-facing settings. |
| Add many new read-model collections (`feedbackSummary`, `aiUsageSummary`, `billingSummary`, etc.) immediately. | Partial. | Reuse existing analytics dashboard summaries and Business Health feedback summaries first. Add new summaries only where route inventory proves raw reads are still hot. |
| Public menu payload should move out of repeated Firestore full project reads. | Valid, larger change. | Add compiled public-safe payload on publish, with pointer/hash/version in existing summary docs first. Avoid a new routing collection unless needed. |
| Decommission legacy `messageLogs`. | Partial. | Keep until owner-notification migration is proven complete. Add TTL/detail compaction and prefer queue-first path for new sends. |
| Move raw analytics to BigQuery/GA4 now. | Research item, not P0. | Keep Firestore aggregate staging for current product; design a later export path if scale proves it. |
| Use Firestore bundles for public payloads. | Partial. | Useful only for public/common/semi-static payloads. For full menus, compiled JSON/Storage/CDN is simpler than Firestore bundles as the first step. |
| Add write/read budget guards. | Valid, but instrument first. | Add budgets to docs/tests/instrumentation. Do not throw in production until paths are measured and bypass rules are explicit. |

## 4. Current codebase cross-check

### 4.1 Existing summary/read-model architecture

MenuList already has summary/read-model infrastructure:

- `platformSummary/storesSummary` and `platformSummary/projects_{sId}` are used for public routing and project summaries: `src/app/client/[[...slug]]/page.tsx:207-215`.
- Owner dashboard has a settled dashboard summary document path: `src/database/ownerDashboard/index.ts:72-83`, `src/database/ownerDashboard/index.ts:1703-1723`.
- OBP dashboard reads a dashboard summary doc first: `src/database/ownerDashboard/index.ts:2438-2475`.
- Analytics dashboard aggregation compacts daily docs into owner-facing summaries and top-N maps: `functions/src/analytics/dashboardSummaryAggregation.ts:1139-1215`.
- Business Health embeds feedback summaries into current/snapshot docs instead of reading raw feedback at answer time: `functions/src/ownerBusinessAssistant/buildOwnerBusinessHealthSnapshot.ts:68-147`, `__docs__/owner-business-assistant/owner-business-assistant_impl.md:305-306`.

Decision:

Do not build a parallel forest of summary collections until we prove an existing read-model cannot satisfy the screen. Summary consolidation should happen through existing `analytics/*_dashboard_summary` and `platformSummary/ownerBusinessHealth*` where possible.

### 4.2 Current write-growth risks are real

MOL fan-out is real:

- `detectAndLogChanges` loops each item and can call `logMenuChange` for item added, price change, extraction correction, name correction, availability, active state, and removal: `src/database/projects/index.ts:159-237`.
- `logMenuChanges` just loops and calls `logMenuChange` repeatedly: `src/database/menuChangeLog/index.ts:209-212`.
- The current feature flag describes event-ledger tracking and 5-second per-item/per-change debounce, but that still permits many writes per save: `src/config/features.ts:592-626`, `src/config/features.ts:674-683`.

Analytics width is real:

- Before this implementation pass, the unified analytics writer stored scalar `sessionId`; the current code keeps it local-only and applies the shared write policy at all write boundaries.
- It writes free-form campaign/source/content maps, item names, per-item views/clicks, hourly per-item click maps, search terms, and zero-result terms: `src/lib/analytics/unified.ts:780-786`, `src/lib/analytics/unified.ts:815-845`, `src/lib/analytics/unified.ts:857-871`.
- Summary aggregation already top-N compacts for dashboard docs, but raw daily docs can still grow before compaction: `functions/src/analytics/dashboardSummaryAggregation.ts:1176-1215`.

Public route Firestore reads are real:

- Public route resolution reads project summaries but still fetches full project docs for render: `src/app/client/[[...slug]]/page.tsx:207-215`, `src/app/client/[[...slug]]/page.tsx:308-318`.
- Special menu resolution can add another project read when active: `src/app/client/[[...slug]]/page.tsx:365-377`.

Job/log compaction gaps are real:

- AI logs serialize response text up to 4000 characters and write full accounting context: `src/lib/ai/operationLog.ts:60-129`.
- Completed extraction jobs still need active result data for workflow completion, but current code adds detail-retention metadata and prunes raw batch responses with completed auto-saved job details.
- Image batch jobs keep generated item results for UI selection, but current code caps `statusHistory`.
- Existing scheduler cleanup now covers public drafts, owner-business-assistant docs, AI operation detail compaction, menu snapshot cleanup, and owner-notification retention.

Index-exemption opportunity is real:

- `firestore.indexes.json` currently has many composite indexes but only a few field overrides, and none for high-cardinality analytics maps/job blobs: `firestore.indexes.json:1747-1794`.

## 5. Implementation architecture

### 5.1 Data intensity modes

Add typed internal modes to the existing config pattern.

Frontend:

- `src/config/features.ts`
- analytics writer helpers under `src/lib/analytics/`
- MOL/project update helpers under `src/database/projects/` and `src/database/menuChangeLog/`

Functions:

- `functions/src/constants/features.ts`
- analytics aggregators under `functions/src/analytics/`
- cleanup tasks under `functions/src/schedulers/menulistMaintenanceScheduler.ts`

Proposed modes:

```ts
type DataIntensityMode = 'lean' | 'standard' | 'diagnostic';
type AnalyticsMode = 'off' | 'basic' | 'full';
type MenuObservationMode = 'off' | 'summary' | 'detailed';
type MenuSnapshotMode = 'off' | 'publish_only' | 'diagnostic';
type AiLogMode = 'accounting_only' | 'preview_14d' | 'debug';
type TelemetryMode = 'errors_only' | 'summary' | 'verbose';
```

Default:

```ts
DATA_INTENSITY_MODE = 'lean';
ANALYTICS_MODE = 'basic';
MENU_OBSERVATION_MODE = 'summary';
MENU_SNAPSHOT_MODE = 'publish_only';
AI_LOG_MODE = 'accounting_only';
TELEMETRY_MODE = 'errors_only';
```

Rules:

- These are internal platform controls, not owner-facing settings.
- Any diagnostic mode must support tenant/store/project scoping and an expiry window.
- Do not add Remote Config until a separate runtime-config decision is made. Existing feature config and function constants are enough for the first implementation.

### 5.2 Analytics write policy

Implementation status: first pass implemented on 2026-06-14.

Owner value:

- Keep views, action counts, search counts, zero-result counts, item/category totals, source buckets, device buckets, OBP/customer-app totals, and dashboard summaries.
- Stop storing identifiers and high-cardinality free-form maps by default.

Code changes:

1. In `src/lib/analytics/unified.ts`, keep `sessionId` only for browser/sessionStorage dedupe and session milestones. Remove it from `updateData`.
2. Add `src/lib/analytics/writePolicy.ts` or equivalent helper for:
   - analytics mode;
   - allowed fields per mode;
   - bucketed source/campaign/content values;
   - item-name write policy;
   - location write policy.
3. Current implemented policy:
   - writes only known scalar/map field families;
   - denies scalar `sessionId`;
   - caps string value lengths;
   - validates map key segments and hourly per-item click shape;
   - applies at browser queue, direct Firestore writer, public analytics API, and Admin writer boundaries.
4. Future tightening still open:
   - stricter source/campaign/content allowlists;
   - counts-only search mode;
   - item-name write reduction after dashboard label fallback is verified;
   - optional removal of `hourlyClicksByItem` from basic mode after time-eligibility consumers are checked.
5. In `functions/src/analytics/dashboardSummaryAggregation.ts`, keep dashboard top-N summaries but update naming resolution so dashboards can label item IDs from current project summary/menu data when raw daily `itemNames` is missing.

Validation:

- Unit test field filtering for basic/full/diagnostic modes.
- Simulate menu view, item click, search, zero-result search, OBP action, and customer-app open.
- Verify dashboard summary still renders top items and searches without `sessionId`.
- Verify public analytics API drops disallowed keys rather than failing public pages.

Cost impact:

- Reduces index/storage growth and daily document width.
- Write count per event may remain one, but each write touches fewer indexed paths and smaller payloads.

### 5.3 MOL compression and path unification

Implementation status: default summary mode and path unification implemented on 2026-06-14.

Owner value:

- Keep enough internal memory to know that the menu changed, what category of change happened, whether extraction corrections occurred, and what needs confidence/staleness attention.
- Stop one-save-to-many-MOL-doc fan-out by default.

Code changes:

1. Extend `src/types/menuObservation.ts` with a summary event type, for example `MENU_REVISION_SUMMARY`.
2. Add a summary builder in `src/database/projects/index.ts` that compares old/new project state once and returns:

```ts
{
  changeType: 'MENU_REVISION_SUMMARY',
  projectId,
  source: 'editor_save' | 'publish' | 'bulk_command' | 'extraction_apply' | 'multi_outlet',
  counts: {
    itemsAdded,
    itemsRemoved,
    pricesChanged,
    availabilityChanged,
    namesChanged,
    activeChanged,
    extractionCorrections,
  },
  affectedItemIdsSample,
  beforeMenuHash,
  afterMenuHash,
  changedAt,
}
```

3. Change `detectAndLogChanges` behavior:
   - `MENU_OBSERVATION_MODE='off'`: no write.
   - `summary`: one `MENU_REVISION_SUMMARY` write.
   - `detailed`: current per-item/per-field writes.
4. Current implemented policy:
   - summary mode writes one `MENU_REVISION_SUMMARY` per project update when changes exist;
   - detailed mode preserves the old detailed entries;
   - multi-outlet events use the shared scoped nested DAL.
5. Follow-up still open:
   - update `functions/src/analytics/menuDriftMetrics.ts`, `extractionLearning.ts`, and `storeTruthConfidence.ts` to derive richer signals from summary events instead of relying on detailed mode.

Validation:

- Save one project with 10 price changes and verify exactly one MOL summary write in summary mode.
- Run detailed mode on one diagnostic store and verify current event behavior is preserved.
- Run menu drift/extraction learning against summary-mode fixture and detailed-mode fixture.
- Verify multi-outlet propagation writes to the nested path only.

Cost impact:

- Reduces worst-case MOL write fan-out from O(changed items/fields) to O(1) per save/publish/source event in default mode.

### 5.4 Snapshot retention

Current state:

- Snapshot creation is already publish-gated in `publishProject`: `src/database/projects/index.ts:1303-1324`.
- The missing piece is retention/compaction, not the publish-only trigger.

Code changes:

1. Add snapshot metadata fields:
   - `snapshotType: 'publish' | 'monthly_baseline' | 'pre_extraction_apply'`;
   - `menuVersion`;
   - `expiresAt` for non-baseline snapshots.
2. Add cleanup task inside `functions/src/schedulers/menulistMaintenanceScheduler.ts`, not a standalone scheduled function.
3. Retention policy:
   - keep latest 10 publish snapshots per store/project;
   - keep one monthly baseline;
   - keep pre-extraction snapshots for 90 days unless linked to an unresolved support issue.

Validation:

- Seed 12 publish snapshots and verify cleanup keeps latest 10 plus monthly baseline.
- Verify publish still does not block if snapshot creation or cleanup fails.

Cost impact:

- Does not reduce publish writes immediately; reduces long-term storage/index growth.

### 5.5 AI and extraction log compaction

Owner value:

- Keep accounting, cost, model, token counts, status, and transaction id.
- Short-retain previews/raw provider/job artifacts for support.
- Do not store raw response previews and large extraction intermediates indefinitely.

Code changes:

1. In `src/lib/ai/operationLog.ts`, add mode-aware fields:
   - always keep action/model/token/cost/unit/status/accounting fields;
   - in `accounting_only`, do not persist serialized response text;
   - in `preview_14d`, store preview fields with `detailExpiresAt`;
   - in `debug`, store current details but require diagnostic expiry/scope.
2. In `src/app/api/ai-operations/route.ts`, keep owner sanitization and make owner history use compact fields first.
3. In `functions/src/logic/processMenuImagesJob.ts`, add terminal compaction:
   - after active review window, strip `result.combinedData`, `result.rawBatchResponses`, large `batchResults`, and long provenance blobs from completed jobs;
   - keep `projectId`, status, timestamps, quality score, confidence summary, result summary, cost/accounting summary, source hash/fingerprint, and failure reason.
4. In `src/database/imageBatchProcessing/server.ts`, cap `statusHistory`. Keep `itemsList` because the active owner UI uses generated image selections from that array.
5. Add scheduler cleanup/compaction tasks in `menulistMaintenanceScheduler`.

Validation:

- First extraction, re-extraction preview, failed extraction, public draft extraction, and link import flows still show active job state.
- Owner AI operation history still displays enough billing/support detail.
- Completed job compaction does not remove project menu truth or generated images.

Cost impact:

- Reduces storage/index growth for AI/extraction workflows while preserving billing and support records.

### 5.6 Notification and message logs

Current state:

- Legacy lifecycle messages still write `messageLogs`: `functions/src/messaging/messagingEngine.ts:161-248`.
- New queue-first owner notifications write `ownerNotificationEvents`, deliveries, and rate limits: `functions/src/ownerNotifications/processor.ts:468-513`.

Decision:

Do not delete or bypass `messageLogs` until the migration flags are proven stable. Instead:

1. Prefer queue-first owner notification path for new sends.
2. Add `expiresAt` / retention for delivery attempt details.
3. Keep aggregate notification state in a compact summary only if an owner/platform screen actually needs it.
4. Mask or avoid raw recipient data in new summary docs.
5. Keep legacy `messageLogs` admin/support-only and plan deprecation after parity is verified.
6. Keep staleness-detection `messageLogs` until the staleness workflow moves fully to queue-first notifications; these logs must retain longer than the cooldown window for idempotency.

Validation:

- Payment, publish, staleness, and credit events still send once and remain idempotent.
- Critical failures still create `systemAlerts` when required.

Cost impact:

- Prevents delivery detail history from growing indefinitely and avoids premature migration risk.

### 5.7 Public menu/OBP payload serving

Current state:

- Public routing uses project summaries but still reads full project docs for render.
- Multi-outlet and special-menu paths can add additional project reads.

Plan:

1. Keep `platformSummary/projects_{sId}` as the routing source.
2. On publish, compile a public-safe render payload:
   - stripped of internal fields already covered by MCE sanitizer patterns;
   - includes public menu, OBP/trust-signal fields, compliance render inputs, menu version, language payload, and cache key;
   - excludes owner/private/admin/AI/MOL/internal fields.
3. Store compiled payload as one of:
   - P1 simple path: Firebase Storage JSON artifact with path/hash/version stored in `platformSummary/projects_{sId}` entry;
   - later path: Hosting/CDN or bundle if traffic justifies it.
4. Public page reads summary/routing metadata and loads cached payload. If missing, fall back to current full project read and enqueue/rebuild compiled payload.
5. Keep cache invalidation tied to existing public cache tags.

Validation:

- Public menu, OBP, special menu, multi-outlet, compliance pages, trust signals, sitemap, and metadata use the same public-safe payload or documented fallback.
- Verify payload does not include `_mce`, source file metadata, publicDecisionBlocks internals beyond safe block output, AI fields, MOL fields, owner emails/phone unless already public contact data.

Cost impact:

- Biggest read-cost win once public traffic grows: fewer full project Firestore reads on customer routes.

### 5.8 Read-model enforcement

Do first:

- Enforce `getOwnerDashboardSettled` for owner analytics where summary exists.
- Avoid `getOwnerDashboardData` legacy fallback as the normal first load once summary coverage is reliable.
- Keep Business Health answer paths on `ownerBusinessHealthCurrent` and `health.feedbackSummary`.
- Keep raw guest feedback, AI operation history, payment transactions, notification deliveries, scheduler logs, and system telemetry behind drill-down/admin/support screens with cursor pagination.

Add only after measured gap:

- `ownerHome` summary if the actual owner home route still reads many collections.
- `menuOpsSummary` only if owner UI/Business Health needs a compact menu-ops state beyond existing `storeTruthConfidence`, `menuItemState`, and health current docs.
- `aiUsageSummary`, `billingSummary`, and `notificationSummary` only if dashboard/settings cards currently query raw histories.

Rejected for now:

- Creating eight new top-level summary collections immediately. That duplicates existing summary architecture and risks more write churn before we prove read savings.

### 5.9 Firestore index exemptions

Do not blindly add field overrides. First confirm every proposed field is not queried.

Candidate fields for exemption:

- analytics map fields not queried directly: `itemNames`, `searchTerms`, `zeroResultSearchTerms`, `hourlyClicksByItem`, `viewsByContent`, diagnostic maps;
- AI preview/context blobs;
- extraction raw/provenance blobs;
- job `statusHistory` arrays;
- notification metadata blobs;
- TTL fields that are only used by TTL or cleanup jobs, after confirming query needs.

Implementation:

1. Add field overrides to `firestore.indexes.json`.
2. Validate against current queries.
3. Deploy indexes only when explicitly doing Firebase infrastructure work.

Important:

Changing `firestore.indexes.json` is a Firebase infrastructure change. When implemented, it requires validation and a scoped Firebase index deploy to the MenuList project. Do not combine with Vercel deploys.

## 6. Priority sequence

### P0 - Stop avoidable high-cardinality writes

1. Add internal data intensity modes.
2. Remove scalar analytics `sessionId` from Firestore writes.
3. Add analytics write policy for basic mode.
4. Switch MOL default to summary event mode.
5. Fix top-level multi-outlet MOL path divergence.
6. Add tests/fixtures for analytics and MOL write shape.

Why P0:

- These are direct write/storage/index growth controls.
- They do not require a new public-serving architecture.
- They reduce cost without changing owner/customer feature surface.

### P1 - Retention and compaction

1. Add AI log preview/detail expiry and accounting-only mode.
2. Add terminal extraction job compaction.
3. Cap image batch `statusHistory`.
4. Add snapshot retention/latest-N/monthly baseline cleanup.
5. Add notification delivery detail retention.
6. Add these cleanup tasks to `menulistMaintenanceScheduler`.

Why P1:

- Storage/privacy wins.
- Uses existing scheduler contract.
- Does not affect public UX when done after terminal workflow windows.

### P2 - Read-model enforcement

1. Route owner analytics screens through dashboard summary docs by default.
2. Remove raw daily analytics fallback from first-load paths once summary coverage is verified.
3. Add route read-budget docs/tests for owner dashboard, analytics overview, public menu, OBP, feedback inbox, AI history, billing, notifications, and admin ops.
4. Add missing summaries only for measured hot reads.

Why P2:

- Existing summaries already cover several surfaces.
- Need route inventory before adding new summary docs.

### P3 - Public payload serving

1. Define public-safe payload schema.
2. Compile payload on publish.
3. Store payload in Storage and pointer/hash/version in existing summary docs.
4. Update public menu/OBP rendering to use compiled payload with safe fallback.
5. Add invalidation/rebuild tests.

Why P3:

- Highest future read-scale win.
- Larger blast radius because it touches customer-facing public routes.

### P4 - Firestore index and warehouse strategy

1. Add field overrides after query audit.
2. Consider GA4/BigQuery export only after analytics scale proves Firestore summaries are insufficient.
3. Consider Firestore bundles only for public/common/semi-static data, not private owner data.

Why P4:

- Useful, but wrong exemptions or premature BigQuery/bundles add complexity before the write/read policy is fixed.

## 7. Concrete implementation checklist

### Analytics

- [x] Add analytics write policy helper.
- [x] Remove scalar `sessionId` from Firestore `updateData`.
- [x] Add first-pass storage/retention mode constants.
- [x] Make customer location analytics opt-in by default.
- [ ] Bucket source/campaign/content.
- [ ] Basic mode: counts-only search terms and zero-result terms.
- [ ] Basic mode: no `itemNames` on every event.
- [ ] Basic mode: no `hourlyClicksByItem`.
- [x] Add server-side disallowed-field filtering in `/api/public/analytics/track`.
- [ ] Update dashboard aggregation name resolution.
- [ ] Add tests for mode-specific update payloads.

### MOL

- [x] Add `MENU_REVISION_SUMMARY` type.
- [x] Add summary diff builder.
- [ ] Add menu hash helper.
- [x] Implement `MENU_OBSERVATION_MODE`.
- [x] Switch default path to one summary event per project update.
- [ ] Keep detailed extraction correction support or summary support in extraction learning.
- [x] Fix multi-outlet top-level write path.
- [ ] Update drift/extraction/truth-confidence jobs for summary events.
- [ ] Add fixtures for editor save, publish, bulk command, extraction apply, multi-outlet propagation.

### Retention and compaction

- [x] Add AI operation detail expiry/accounting-only default.
- [x] Add extraction job terminal detail compaction for raw batch responses.
- [x] Add image batch status history cap.
- [x] Add snapshot retention cleanup.
- [x] Add notification delivery retention.
- [x] Add cleanup tasks to existing scheduler with leases/state/cost notes.

### Public serving

- [ ] Define `PublicMenuPayloadV1`.
- [ ] Compile payload on publish.
- [ ] Store payload in Storage with hash/version.
- [ ] Store pointer in `platformSummary/projects_{sId}` entry.
- [ ] Update public route to prefer compiled payload.
- [ ] Keep fallback full project read with rebuild marker.
- [ ] Test customer route, OBP, special menu, multi-outlet, trust signals, compliance, sitemap/metadata.

### Indexes

- [ ] Query-audit each candidate field.
- [ ] Add safe field overrides.
- [ ] Validate with emulator or staging index deployment.
- [ ] Deploy Firebase indexes only when explicitly implementing the infra change.

## 8. Cross-check against full inventory

| Inventory area | Covered by plan? | Decision |
| --- | --- | --- |
| Users/tenants/stores | Yes | Keep as core truth; do not optimize away. |
| Projects/menu truth | Yes | Keep canonical project docs; add public compiled payload for customer reads. |
| Public summaries | Yes | Reuse and strengthen `platformSummary` before adding new collections. |
| Analytics | Yes | P0 write policy, mode control, no scalar sessionId, bounded maps, summary enforcement. |
| MOL/menu observation | Yes | P0 summary event mode and path unification. |
| Menu snapshots | Yes | Publish trigger already mostly correct; add retention. |
| Menu item state/drift | Yes | Update downstream jobs to read summary events. |
| Extraction learning/store truth confidence | Yes | Preserve value; adapt to compressed MOL. |
| Owner control usage | Yes | Keep monthly/debounced; not P0 unless write volume proves high. |
| Menu Health Monitor | Yes | Keep current `stores.health`; avoid noisy alerts. |
| Menu Trust Signals | Yes | No writes; include in public payload read optimization. |
| Menu Correctness Engine | Yes | Keep `_mce`; ensure public payload strips internals. |
| Menu Command Center | Yes | Treat as mutation source for summary MOL events. |
| Guest feedback | Yes | Raw 90-day retention remains; reuse Business Health feedback summary. |
| Business Health/assistant | Yes | Keep current summary-doc architecture; no raw feedback reads at answer time. |
| AI operation logs | Yes | P1 accounting-only/detail-expiry mode. |
| Extraction/import jobs | Yes | P1 terminal compaction. |
| Public menu drafts | Yes | Existing cleanup retained; no change unless source artifact retention needs tightening. |
| Image batch jobs | Yes | P1 status history cap/completion compaction. |
| Billing/payment/webhooks | Yes | Keep audit; consider summary only after read inventory. |
| Auth/OTP/security | Yes | Keep; no bundles/public payload. |
| Messaging/notifications | Yes | Queue-first path, retention, no premature legacy removal. |
| POS logs | Yes | Current latest-20 cap acceptable. |
| Compliance pages | Yes | Keep overrides-only; include generated compliance in public payload where safe. |
| Reviews/GBP | Yes | Keep disabled/scaffolded until live; no default writes. |
| System telemetry/alerts/scheduler | Yes | Summary/failure-only posture; cleanup through consolidated scheduler. |
| Firestore indexes | Yes | Query-audited field overrides, not blind changes. |

## 9. Rejected or downgraded ideas

### Rejected: new top-level `menuRevisions` collection as the first MOL fix

Reason:

Existing functions and docs expect `menuChangeLog/{tId}/{sId}`. A new top-level collection would create another migration surface. Use a compressed event in the existing nested path first.

### Rejected: adding many summary collections before route measurement

Reason:

MenuList already has analytics dashboard summaries and Business Health summary docs. Extra summary docs can become write amplification if they are not tied to a real hot read.

### Rejected: Firestore bundles for private/owner data

Reason:

Official Firebase guidance says bundles are wrong for private data because server-generated bundles can bypass security rules. Owner dashboards, billing, feedback contact data, OTP, MOL, AI logs, and payment audit must not use bundles.

### Downgraded: BigQuery/GA4 as immediate raw analytics replacement

Reason:

MenuList currently writes aggregate Firestore analytics, not raw per-event docs. Fix high-cardinality daily maps first; plan BigQuery/GA4 export only when scale or reporting needs justify it.

### Downgraded: decommissioning `messageLogs`

Reason:

The queue-first notification path exists, but legacy lifecycle messaging still uses `messageLogs` and has idempotency/rate-limit behavior. Decommission only after migration parity.

## 10. Verification plan for future implementation

Docs/code checks:

- Update this folder and the relevant feature docs before code changes.
- Keep exact `file:line` evidence for changed data contracts.
- Add Firebase cost notes to each affected feature doc.

Code validation:

- `npx tsc --noEmit --incremental false` after code changes.
- Targeted unit tests for analytics write policy, MOL summary builder, compaction helpers, public payload sanitizer, and scheduler cleanup tasks.
- Emulator/staging test for Firestore index changes before deploy.
- No production build or Vercel deploy unless explicitly requested.

Runtime simulation:

- One owner save with 10 price changes.
- One publish with snapshot and public payload compile.
- One bulk Command Center edit.
- One first extraction and one re-extraction preview.
- One public menu view, OBP view, special menu view, and multi-outlet view.
- One guest feedback submit.
- One notification failure and one notification success.

Cost reporting:

- For each changed path, record expected reads/writes/deletes/storage impact.
- Mark whether the change reduces writes, reads, index/storage, or only privacy/retention risk.

## 11. Final implementation recommendation

Start with the P0/P1 work before public payload serving:

1. analytics write policy and `sessionId` removal;
2. MOL summary mode and path unification;
3. AI/extraction/job detail compaction;
4. snapshot and notification retention;
5. query-audited index exemptions.

Then do public compiled payload serving as a focused customer-route project.

This sequence gives immediate Firebase cost reduction without destabilizing MenuList's public menu output, owner dashboard, Business Health, billing, or extraction workflows.
