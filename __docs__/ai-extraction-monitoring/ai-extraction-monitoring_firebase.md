# AI Extraction Internal Monitoring Dashboard — Firebase Cost Tracking

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** ✅ IMPLEMENTED — All 6 DAL functions implemented, dashboard reads working  
**Last Updated:** March 13, 2026

---

## Summary

- **Collections Read:** `menuImageProcessingJobs`, `MENULIST_AI_OPERATIONS` (note: `aiUsageLog` from AI System Layer is Phase 2 — not yet implemented)
- **Collections Written:** None (read-only dashboard)
- **New Collections:** None
- **Estimated Monthly Cost:** ~$0.50/month (read-only queries from existing collections)

---

## Firestore Operations

### Reads

| Operation                 | Collection                | Trigger                | Frequency           | Docs Read   | Notes                                                              |
| ------------------------- | ------------------------- | ---------------------- | ------------------- | ----------- | ------------------------------------------------------------------ |
| Health metrics (24h)      | `menuImageProcessingJobs` | Page load              | Per dashboard visit | 20-100      | Query jobs from last 24h for aggregation. Client-side aggregation. |
| Recent jobs feed          | `menuImageProcessingJobs` | Page load + pagination | Per page view       | 20 per page | Paginated query, orderBy createdAt desc, limit 20.                 |
| Job details (inspector)   | `menuImageProcessingJobs` | Click "View"           | Per inspection      | 1           | Direct doc read by jobId.                                          |
| Cost metrics (today)      | `MENULIST_AI_OPERATIONS`  | Page load              | Per dashboard visit | 10-50       | Query today's AI operations for extraction.                        |
| Quality metrics (last 50) | `menuImageProcessingJobs` | Page load              | Per dashboard visit | 50          | Query last 50 completed jobs for quality aggregation.              |

### Writes

| Operation | Collection | Trigger | Frequency | Notes                                                                                     |
| --------- | ---------- | ------- | --------- | ----------------------------------------------------------------------------------------- |
| None      | —          | —       | —         | Dashboard is read-only. Retry creates a new job via existing `createMenuProcessingJob()`. |

### Deletes

| Operation | Collection | Trigger | Frequency | Notes                        |
| --------- | ---------- | ------- | --------- | ---------------------------- |
| None      | —          | —       | —         | No deletions from dashboard. |

---

## Cost Estimate (per month)

### Assuming 10 dashboard visits/day × 30 days

| Resource                          | Operations/month                       | Unit Cost  | Monthly Cost     |
| --------------------------------- | -------------------------------------- | ---------- | ---------------- |
| Firestore Reads (health metrics)  | 3,000 (100 docs × 10 visits × 30 days) | $0.06/100K | $0.00            |
| Firestore Reads (job feed)        | 6,000 (20 docs × 10 visits × 30 days)  | $0.06/100K | $0.00            |
| Firestore Reads (job inspection)  | 300 (1 doc × 10 inspections × 30 days) | $0.06/100K | $0.00            |
| Firestore Reads (cost metrics)    | 15,000 (50 docs × 10 visits × 30 days) | $0.06/100K | $0.01            |
| Firestore Reads (quality metrics) | 15,000 (50 docs × 10 visits × 30 days) | $0.06/100K | $0.01            |
| **Total**                         | ~39,300 reads/month                    |            | **~$0.02/month** |

> **Note:** This dashboard is extremely cheap because it only reads existing data. No new writes, no new collections, no Cloud Functions.

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
| `result.combinedData`      | Job inspector AI response viewer                  |
| `error`                    | Failed job details                                |
| `fileResults`              | Per-file breakdown                                |
| `files`                    | File count display                                |
| `projectId`                | Job identification                                |
| `isFirstExtraction`        | Extraction type badge                             |

### `MENULIST_AI_OPERATIONS`

Already exists. Dashboard reads these fields:

| Field             | Used For                    |
| ----------------- | --------------------------- |
| `action`          | Filter for IMAGE_PROCESSING |
| `totalCharge`     | Cost per extraction         |
| `totalCredits`    | Credits consumed            |
| `totalTokenCount` | Token usage                 |
| `createdAt`       | Time-based filtering        |

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

| Function                        | File                             | Operation                               | Firestore Cost |
| ------------------------------- | -------------------------------- | --------------------------------------- | -------------- |
| `getExtractionHealthMetrics()`  | `src/database/ops/extraction.ts` | Read (getDocs query, 24h window)        | ~100 reads     |
| `getRecentExtractionJobs()`     | `src/database/ops/extraction.ts` | Read (getDocs query, paginated)         | 20 reads/page  |
| `getExtractionJobDetails()`     | `src/database/ops/extraction.ts` | Read (getDoc, single doc)               | 1 read         |
| `getExtractionCostMetrics()`    | `src/database/ops/extraction.ts` | Read (getDocs query, today)             | ~50 reads      |
| `getExtractionQualityMetrics()` | `src/database/ops/extraction.ts` | Read (getDocs query, last 50)           | 50 reads       |
| `retryExtractionJob()`          | `src/database/ops/extraction.ts` | Read + Write (read old job, create new) | 1R + 1W        |

---

## Security Rules Impact

No new security rules needed. Dashboard uses existing collections:

- `menuImageProcessingJobs`: Already has read rules for authenticated users
- `MENULIST_AI_OPERATIONS`: Already readable by platform admins

Dashboard access is enforced at the application level (platformRole check), not Firestore rules.

---

_Document Status: ✅ IMPLEMENTED — All 6 DAL functions + dashboard working_
