# AI Extraction Internal Monitoring Dashboard — Firebase Cost Tracking

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** Enabled source/cost evidence — not current launch or deploy certification
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

---

## Summary

- **Collections Read:** `menuImageProcessingJobs`, `MENULIST_AI_OPERATIONS` (no separate `aiUsageLog` collection is read)
- **Collections Written:** No direct monitor writes. A platform admin can use the desktop retry action, which creates one new extraction job through the existing queue path.
- **New Collections:** None
- **Estimated Monthly Cost:** ~₹4/month at 10 internal visits/day (read-only queries from existing collections; assumes Firestore read pricing at $0.06/100K reads and ₹83/USD)
- **Browser-local copy diagnostics:** Job Inspector copy hardening adds no Firestore, Storage, Cloud Function, provider, or cache operations. Failed clipboard handoffs use the existing ops diagnostics boundary with bounded metadata only, including clipboard/fallback support booleans and copied-text length rather than raw extraction payloads.
- **Standalone cost-panel diagnostics:** The dashboard snapshot path remains the normal cost source. If `CostMonitor.tsx` is reused without snapshot cost data and its direct compatibility read rejects, the component logs bounded `extraction_cost_monitor_load_failed` diagnostics and shows fixed unavailable copy instead of reporting zero calls. This adds no reads beyond the already-attempted compatibility read and no writes, Storage operations, Cloud Functions, provider calls, rules, indexes, or deploy requirement.

---

## Firestore Operations

### Reads

| Operation                                | Collection                | Trigger           | Frequency           | Docs Read | Notes                                                                 |
| ---------------------------------------- | ------------------------- | ----------------- | ------------------- | --------- | --------------------------------------------------------------------- |
| Dashboard snapshot                       | `menuImageProcessingJobs` | Page load/refresh | Per dashboard visit | Up to 150 | One query powers health, quality, and recent jobs. Client aggregates. |
| Cost metrics (today)                     | `MENULIST_AI_OPERATIONS`  | Page load/refresh | Per dashboard visit | Up to 100 | Query today's AI operations for extraction cost tracking.             |
| Job details (inspector)                  | `menuImageProcessingJobs` | Click "View"      | Per inspection      | 1         | Direct doc read by jobId.                                             |
| Compatibility DAL calls, when used alone | `menuImageProcessingJobs` | Direct caller     | Caller-dependent    | Bounded   | Legacy helpers remain exported but monitor screens use the snapshot.  |

### Writes

| Operation | Collection | Trigger | Frequency | Notes                                                                                     |
| --------- | ---------- | ------- | --------- | ----------------------------------------------------------------------------------------- |
| Retry action | `menuImageProcessingJobs` | Platform admin retries an eligible failed job from desktop Job Inspector | 1 new job through the existing queue path | Mobile summary has no retry action. |

### Deletes

| Operation | Collection | Trigger | Frequency | Notes                        |
| --------- | ---------- | ------- | --------- | ---------------------------- |
| None      | —          | —       | —         | No deletions from dashboard. |

---

## Cost Estimate (per month)

### Assuming 10 dashboard visits/day × 30 days

| Resource                         | Operations/month                        | Unit Cost                   | Monthly Cost |
| -------------------------------- | --------------------------------------- | --------------------------- | ------------ |
| Firestore Reads (job snapshot)   | 45,000 (150 docs × 10 visits × 30 days) | $0.06/100K (~₹4.98/100K)    | ~₹2.24       |
| Firestore Reads (cost snapshot)  | 30,000 (100 docs × 10 visits × 30 days) | $0.06/100K (~₹4.98/100K)    | ~₹1.49       |
| Firestore Reads (job inspection) | 300 (1 doc × 10 inspections × 30 days)  | $0.06/100K (~₹4.98/100K)    | <₹0.01       |
| **Total**                        | ~75,300 bounded reads/month             |                             | **~₹3.75**   |

> **Note:** Monitor loads read existing collections and create no new collection. The desktop retry action is a separate operator mutation through the existing extraction queue; scheduler-based extraction alerts run through existing Functions infrastructure.

---

## Existing Collections Used (Reference)

### `menuImageProcessingJobs/{jobId}`

Already exists. Dashboard reads these fields:

| Field                      | Used For                                          |
| -------------------------- | ------------------------------------------------- |
| `status`                   | Health metrics, job feed status badges            |
| `createdAt`                | Time-based filtering, processing time calculation |
| `completedAt`              | Processing time calculation                       |
| `startedAt`                | Processing time calculation                       |
| `result.qualityScore`      | Quality metrics                                   |
| `result.qualityDetails`    | Quality breakdown                                 |
| `result.confidenceSummary` | Confidence distribution                           |
| `result.processingTime`    | Processing time display                           |
| `result.combinedData`      | Job inspector AI response viewer when retained    |
| `result.summary`           | Counts/confidence fallback after project payload pruning |
| `result.dataPrunedAt`      | Explains why full normalized data is no longer present |
| `timings`                  | Queue wait, AI time, save time, worker total      |
| `error`                    | Failed job details                                |
| `fileResults`              | Per-file breakdown                                |
| `files`                    | File count display                                |
| `projectId`                | Job identification                                |
| `isFirstExtraction`        | Extraction type badge                             |
| `sourceFingerprint`        | Owner-upload completed-job reuse diagnostics      |

### `MENULIST_AI_OPERATIONS`

Already exists. Dashboard reads these fields:

| Field             | Used For                    |
| ----------------- | --------------------------- |
| `action`          | Filter for IMAGE_PROCESSING |
| `jobId`           | Link provider cost row back to `menuImageProcessingJobs/{jobId}` |
| `tId` / `sId` / `uId` | Tenant, store, and user context for platform drilldown |
| `jobSource`       | Entry point (`owner_upload`, `public_create_menu`, messaging, link import) |
| `destinationType` | Destination (`project`, `public_menu_draft`, `messaging_onboarding`) |
| `destinationId`   | Project, draft, or session id for drilldown |
| `totalCharge`     | Cost per extraction         |
| `totalCredits`    | Credits consumed            |
| `totalTokenCount` | Token usage                 |
| `status` / `success` | Success/failure state for provider attempts |
| `errorCode` / `retryAfterSeconds` | Failed attempt diagnosis and provider retry window |
| `createdAt`       | Firestore timestamp for time-based filtering |

Failed extraction attempts are recorded with zero `totalTokenCount`, zero `totalCharge`, and zero `unitsConsumed`. They still count as provider attempts for operational diagnosis, but not as owner credit usage.

---

## Indexes Required

May already exist — verify before adding:

```json
{
  "collectionGroup": "menuImageProcessingJobs",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## DAL Functions

| Function                           | File                             | Operation                                  | Firestore Cost        |
| ---------------------------------- | -------------------------------- | ------------------------------------------ | --------------------- |
| `getExtractionDashboardSnapshot()` | `src/database/ops/extraction.ts` | SWR-deduped dashboard snapshot: one recent-job query + one cost query | Cache miss or explicit refresh: up to 150R + 100R; duplicate loads within 5 minutes: 0 additional reads |
| `getExtractionHealthMetrics()`     | `src/database/ops/extraction.ts` | Compatibility helper, 24h health window    | Up to 100 reads       |
| `getRecentExtractionJobs()`        | `src/database/ops/extraction.ts` | Compatibility helper, paginated feed       | 20 reads/page default |
| `getExtractionJobDetails()`        | `src/database/ops/extraction.ts` | Read (getDoc, single doc)                  | 1 read                |
| `getExtractionCostMetrics()`       | `src/database/ops/extraction.ts` | Read (getDocs query, today)                | Up to 100 reads       |
| `getExtractionQualityMetrics()`    | `src/database/ops/extraction.ts` | Compatibility helper, last completed jobs  | Up to 150 reads       |
| `retryExtractionJob()`             | `src/database/ops/extraction.ts` | Read + Write (read old job, create new)    | 1R + 1W               |

---

## Security Rules Impact

No new security rules needed. Dashboard uses existing collections:

- `menuImageProcessingJobs`: ordinary authenticated users can read only their own jobs; platform admins can read all jobs for the monitor
- `MENULIST_AI_OPERATIONS`: readable only by platform admins

Desktop and mobile components suppress monitor reads unless `platformRole === 'PLATFORM'`, and Firestore rules independently enforce the cross-tenant job and cost-ledger boundary.

---

_Document Status: Enabled source/cost evidence; not current launch or deploy certification._

July 1 QP-1 hardening adds a five-minute SWR dedupe window in `src/components/templates/main-app/platform/extractionMonitor/index.tsx`. The first platform dashboard load, a filter-key change, or explicit Refresh still performs the bounded snapshot reads above. Duplicate mounts or revalidations inside the dedupe window reuse the cached snapshot, and no automatic refresh interval is enabled. If this dashboard is ever broadened beyond platform-only use or given automatic refresh, server-side pre-aggregation is required before launch.
