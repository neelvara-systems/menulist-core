# AI Extraction Internal Monitoring Dashboard — Implementation

**Feature:** Internal monitoring dashboard for the menu extraction pipeline
**Status:** Enabled internal platform surface — not current launch or deploy certification
**Feature Flag:** `ENABLE_EXTRACTION_MONITORING_DASHBOARD`
**Last Updated:** July 14, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

**Current surface boundary:** Desktop exposes health, quality, cost, recent jobs, Job Inspector, raw-data copy, and eligible failed-job retry. Mobile exposes manual-refresh health, cost, quality, and recent-job summaries only. The current snapshot does not read `platformSummary/extractionLearning` and no Ops Alerts panel is mounted.

**Owner-history boundary:** The platform monitor continues to read detailed extraction telemetry from top-level `MENULIST_AI_OPERATIONS`. Successful/partial authenticated owner extraction additionally creates a compact zero-credit activity row in `menulistAiOperations/{tId}/{sId}` so desktop/mobile owner Transactions reflect the work. Both rows share one document ID and commit in one Cloud Functions Firestore batch; public/unscoped work keeps only the platform record.

---

## File Structure

### New Files

```
src/
├── app/(main)/ops/extraction/
│   └── page.tsx                                    # Route page
├── components/templates/main-app/platform/
│   └── extractionMonitor/
│       ├── index.tsx                               # Main dashboard (health, quality, job feed inlined)
│       ├── JobInspector.tsx                         # Job detail drawer (tabs: overview, AI response, cost)
│       └── CostMonitor.tsx                          # AI cost panel
├── database/ops/
│   └── extraction.ts                               # DAL for extraction monitoring (6 functions)
└── lib/ops/
    └── extractionTypes.ts                          # TypeScript types
```

> **Note:** HealthOverview, JobFeed, and QualityMetrics panels are inlined in `index.tsx` rather than separate component files.

### Files to Modify

```
src/
├── config/features.ts                              # Add ENABLE_EXTRACTION_MONITORING_DASHBOARD
├── constants/navigations.ts                        # Add ops/extraction route (optional)
└── components/templates/main-app/platform/
    └── opsControlRoom/index.tsx                    # Add "Extraction Monitor" button
```

---

## Route & Access

```typescript
// src/app/(main)/ops/extraction/page.tsx
// Access: signed PLATFORM visibility + fresh current persisted authorization before browser reads
// Pattern: Same as /ops/scheduler (existing)
```

---

## Key Components

### 1. Main Dashboard (`extractionMonitor/index.tsx`)

Layout:

```
┌────────────────────────────────────────────────────────┐
│ Extraction Monitor                          [Refresh]  │
├────────────────┬───────────────────────────────────────┤
│ Health Overview │ Cost Monitor                          │
│ (4 stat cards)  │ (calls/day, cost/job, daily spend)   │
├────────────────┴───────────────────────────────────────┤
│ Quality Metrics                                        │
│ (avg score, confidence distribution, anomaly flags)    │
├────────────────────────────────────────────────────────┤
│ Recent Jobs                                    [Filter]│
│ ┌──────┬────────┬──────┬──────┬──────┬──────┬────────┐│
│ │ ID   │ Status │ Files│ Items│ Score│ Time │ Actions││
│ ├──────┼────────┼──────┼──────┼──────┼──────┼────────┤│
│ │ j_92 │ ✅     │ 3   │ 42  │ 88  │ 24s  │ View   ││
│ │ j_91 │ ❌     │ 2   │ —   │ —   │ —    │ View   ││
│ └──────┴────────┴──────┴──────┴──────┴──────┴────────┘│
└────────────────────────────────────────────────────────┘
```

### 2. Health Overview (`HealthOverview.tsx`)

```typescript
interface HealthMetrics {
  activeJobs: number;
  failedJobs24h: number;
  totalJobs24h: number;
  failureRate: number; // percentage
  avgProcessingTime: number; // seconds
  avgQualityScore: number; // 0-100
  healthStatus: "healthy" | "warning" | "critical" | "unknown";
}
```

Health badge logic:

- 🟢 `healthy`: failureRate < 2% AND avgTime < 30s
- 🟡 `warning`: failureRate 2-5% OR avgTime 30-60s
- 🔴 `critical`: failureRate > 5% OR avgTime > 60s
- ⚪ `unknown`: no jobs in last 24h

### 3. Job Feed (`JobFeed.tsx`)

Ant Design Table with columns:

- Job ID (truncated, copyable)
- Project ID (truncated)
- Status (Tag: pending/processing/completed/failed/cancelled/preview_ready)
- Files Count
- Items Extracted
- Quality Score (color-coded)
- Processing Time
- Created At (relative time via `timeAgo`)
- Actions (View button → opens JobInspector)

Filters:

- Status: All / Completed / Failed / Processing
- Date: Today / Last 7 days / Last 30 days
- Quality: All / Low (<40) / Medium (40-70) / High (>70)

Pagination: 20 per page, cursor-based.

### 4. Job Inspector (`JobInspector.tsx`)

Ant Design Drawer (right side, 600px wide).

Tabs:

1. **Overview** — Job metadata, per-file results, error details
2. **AI Response** — Raw `result.combinedData` when retained, or `result.summary` when an older auto-saved project job has been pruned
3. **Cost** — Token usage, credits, charge, batch results

Actions:

- "Retry Extraction" button (for failed jobs)
- "Copy Job ID" button
- "Copy Raw Data" button

Copy actions in the AI Response tab wait for browser clipboard acknowledgement before showing copied state. They use Clipboard API success or an acknowledged textarea fallback before success copy. Failed local copies log `extraction_job_inspector_copy_failed` with bounded job ID, copy label, copied-text presence/length, clipboard/fallback support booleans, job status, combined-data presence, and raw-response count only; raw extraction payloads and provider responses are not logged.

### 5. Cost Monitor (`CostMonitor.tsx`)

Simple stat cards:

- Gemini Calls Today
- Avg Cost Per Extraction
- Daily Spend (today)
- Most Expensive Job (24h)

Data source: Query `MENULIST_AI_OPERATIONS` collection for today's documents.

The main dashboard passes cost metrics from the deduped snapshot, so normal monitor loads do not trigger a second cost query. `CostMonitor.tsx` keeps its standalone compatibility path for direct reuse; if that direct `getExtractionCostMetrics()` call rejects, it logs bounded `extraction_cost_monitor_load_failed` diagnostics with refresh-trigger metadata only and renders fixed "Cost metrics unavailable" copy. It does not collapse the failure into the "No extraction calls today" empty state.

July 16 item-29 follow-up: every exported direct extraction monitor read and the shared dashboard snapshot uses `/api/platform/current-access` before browser Firestore work. Dashboard/job/health/quality/cost source failure throws after bounded diagnostics instead of returning an all-zero object. Desktop SWR and MobileShell show unavailable or explicitly stale state.

### 6. Quality Metrics (`QualityMetrics.tsx`)

Stat cards + simple indicators:

- Average Quality Score (last 50 jobs)
- Confidence Distribution (high/medium/low counts from last 50 jobs)
- Low Quality Rate (jobs with score < 40, percentage)

### 7. Scheduler-Based Alerts

The extraction monitor now reuses the shared ops alerting pipeline instead of a custom notification path.

- Source scheduler: `functions/src/triggers/schedulers.ts`
- Alert logic: `functions/src/schedulers/menuJobCleanup.ts`
- Delivery path: `functions/src/monitoring/alerts.ts` → `functions/src/monitoring/telegramAlert.ts`

Triggered conditions:

- stuck processing jobs cleaned by scheduler
- failure rate spike in the last hour
- quality degradation across recent completed jobs

---

## DAL Layer (`src/database/ops/extraction.ts`)

The dashboard component calls `getExtractionDashboardSnapshot()` through SWR with a five-minute `dedupingInterval`. This keeps manual cache misses bounded to one recent-job query plus one cost query, while duplicate platform dashboard mounts/revalidations inside five minutes reuse the cached snapshot. The Refresh button calls `mutate()` for an explicit operator refresh; no automatic refresh interval is enabled.

```typescript
// Query recent extraction jobs
async function getRecentExtractionJobs(
  filters: {
    status?: string;
    minQuality?: number;
    maxQuality?: number;
    days?: number;
  },
  pageSize: number = 20,
  lastDoc?: DocumentSnapshot,
): Promise<{ jobs: ExtractionJobSummary[]; hasMore: boolean }>;

// Get health metrics (aggregated from recent jobs)
async function getExtractionHealthMetrics(): Promise<HealthMetrics>;

// Get single job with full details
async function getExtractionJobDetails(
  jobId: string,
): Promise<ExtractionJobDetails | null>;

// Get cost metrics for today
async function getExtractionCostMetrics(): Promise<CostMetrics>;

// Get quality metrics (last N jobs)
async function getExtractionQualityMetrics(
  count: number,
): Promise<QualityMetrics>;

// Retry a failed extraction job
async function retryExtractionJob(jobId: string): Promise<string>; // returns new jobId
```

### Collection queries:

```typescript
// Recent jobs
const q = query(
  collection(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS),
  orderBy("createdAt", "desc"),
  limit(pageSize),
);

// Health metrics (24h)
const q = query(
  collection(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS),
  where("createdAt", ">=", Timestamp.fromDate(twentyFourHoursAgo)),
  orderBy("createdAt", "desc"),
);

// Cost metrics (today)
const q = query(
  collection(firebaseClient, "MENULIST_AI_OPERATIONS"),
  where("action", "==", "IMAGE_PROCESSING"),
  where("createdAt", ">=", todayStart),
  orderBy("createdAt", "desc"),
);
```

---

## Types (`src/lib/ops/extractionTypes.ts`)

```typescript
export interface ExtractionJobSummary {
  id: string;
  projectId: string;
  status: string;
  filesCount: number;
  itemsExtracted: number;
  categoriesExtracted: number;
  qualityScore: number | null;
  processingTime: number | null;
  createdAt: any;
  isFirstExtraction: boolean | null;
  hasError: boolean;
}

export interface ExtractionJobDetails extends ExtractionJobSummary {
  tId: string;
  sId: string;
  uId: string;
  files: Array<{ uid: string; name: string; type: string; size: number }>;
  targetLanguages: Array<{ code: string; name: string }>;
  result: {
    combinedData?: any;
    summary?: Record<string, unknown>;
    dataPrunedAt?: any;
    dataPrunedReason?: string;
    qualityScore: number;
    qualityDetails: {
      categoryQuality: number;
      itemQuality: number;
      priceQuality: number;
      descriptionQuality: number;
    };
    processingTime: number;
    confidenceSummary?: {
      highConfidenceCount: number;
      mediumConfidenceCount: number;
      lowConfidenceCount: number;
      averageConfidenceScore: number;
    };
    batchResults?: Array<{
      batchIndex: number;
      success: boolean;
      filesProcessed: number;
    }>;
  } | null;
  error: { code: string; message: string; retryable: boolean } | null;
  fileResults: Record<
    string,
    { categoriesCount: number; itemsCount: number }
  > | null;
  transaction: {
    transactionId: string;
    totalCredits: number;
    totalCharge: number;
  } | null;
}

export interface HealthMetrics {
  activeJobs: number;
  failedJobs24h: number;
  totalJobs24h: number;
  failureRate: number;
  avgProcessingTime: number;
  avgQualityScore: number;
  healthStatus: "healthy" | "warning" | "critical" | "unknown";
}

export interface CostMetrics {
  callsToday: number;
  avgCostPerExtraction: number;
  dailySpend: number;
  mostExpensiveJobId: string | null;
  mostExpensiveJobCost: number;
}

export interface QualityMetrics {
  avgScore: number;
  confidenceDistribution: { high: number; medium: number; low: number };
  anomalyCount: number;
  lowQualityRate: number;
}
```

---

## Retry Mechanism

When clicking "Retry Extraction" on a failed job:

1. The desktop DAL sends only the encoded job ID to `POST /api/ops/extraction/jobs/{jobId}/retry` with no-store, same-origin and manual-redirect policy. It caps the response at 4KB and accepts only a successful envelope containing a canonical Firestore auto-ID.
2. `withAuth(..., { requiredPlatformRole: 'PLATFORM' })` admits the signed session, then `getCurrentPlatformUser()` re-reads current persisted platform authority before tenant data.
3. The route applies a fail-closed `DATA_WRITE` limiter and SAFE_MODE, reads the original job, and runtime-validates failed/retryable state, the maximum of three retries, exact tenant/store/project/user identity, bounded files/languages, and duplicate file identities.
4. Every source URL must resolve to the original tenant/store's private `projects/files/...` or exact `menuLinkImports/.../{projectId}/...` Storage prefix. The nested canonical project path must still exist.
5. `createOrReuseActiveMenuExtractionJob()` transactionally rejects an already-active project job or creates one sanitized replacement with the original owner/scope, `retriedFromJobId`, and incremented `retryCount`.

The previous client implementation re-read any platform-visible job and sent it through the ordinary owner create route. That route correctly required the current session tenant, store, and user to match the original job, so a normal platform session could not perform the documented cross-tenant recovery action. Platform recovery is now explicit and independently authorized rather than weakening owner-route isolation.

The owner/mobile job listener also projects only a state value whose document ID equals the currently requested job ID. It clears the prior value before subscribing and on subscription error, preventing a previous completed job from being consumed during a project/job switch.

Monitor aggregation treats Firestore documents as untrusted runtime data: malformed timestamp rows are isolated, page/count inputs are bounded, and health, quality, confidence, processing-time, and charge arithmetic accepts only finite non-negative values (quality scores are additionally bounded to 0–100).

---

## Alert Boundary

The monitor UI does not implement an Ops Alerts panel. Existing extraction alerts are created by `functions/src/schedulers/menuJobCleanup.ts` through the shared platform alert pipeline; they are not read by `getExtractionDashboardSnapshot()`.

---

## Feature Flag

```typescript
// src/config/features.ts
ENABLE_EXTRACTION_MONITORING_DASHBOARD: true,
```

---

## UI Components (Ant Design)

| Component     | antd Component          | Purpose            |
| ------------- | ----------------------- | ------------------ |
| Health cards  | `Statistic` + `Card`    | Display metrics    |
| Health badge  | `Badge` + `Tag`         | Status indicator   |
| Job feed      | `Table`                 | Paginated job list |
| Job inspector | `Drawer` + `Tabs`       | Job details        |
| JSON viewer   | `react18-json-view`     | Raw AI response    |
| Status tags   | `Tag`                   | Job status badges  |
| Filters       | `Select` + `DatePicker` | Table filters      |
| Retry button  | `Button` + `Popconfirm` | Retry failed jobs  |

---

## Firestore Indexes Required

```json
{
  "collectionGroup": "menuImageProcessingJobs",
  "fields": [
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "menuImageProcessingJobs",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

Note: Some of these indexes may already exist. Verify before adding duplicates.

---

## Validation Checklist

| Requirement     | Implementation                           | Location                                 | Status |
| --------------- | ---------------------------------------- | ---------------------------------------- | ------ |
| Route page      | `/ops/extraction`                        | `src/app/(main)/ops/extraction/page.tsx` | ✅     |
| Health overview | Inline stat cards                        | `extractionMonitor/index.tsx`            | ✅     |
| Job feed        | Inline paginated table                   | `extractionMonitor/index.tsx`            | ✅     |
| Job inspector   | Drawer with tabs                         | `extractionMonitor/JobInspector.tsx`     | ✅     |
| Cost monitor    | Stat cards                               | `extractionMonitor/CostMonitor.tsx`      | ✅     |
| Quality metrics | Inline stat cards                        | `extractionMonitor/index.tsx`            | ✅     |
| DAL layer       | Query functions (6 of 6)                 | `src/database/ops/extraction.ts`         | ✅     |
| Types           | TypeScript interfaces                    | `src/lib/ops/extractionTypes.ts`         | ✅     |
| Feature flag    | `ENABLE_EXTRACTION_MONITORING_DASHBOARD` | `src/config/features.ts`                 | ✅     |
| Retry mechanism | Reuse existing job creation (max 3)      | DAL `retryExtractionJob()` + UI button   | ✅     |
| Shared extraction alerts | Existing scheduler/platform alert pipeline | `functions/src/schedulers/menuJobCleanup.ts` | ✅ Outside monitor UI |
| Access control  | Platform role check                      | extractionMonitor/index.tsx              | ✅     |

---

## Disagreements with ChatGPT

| ChatGPT Suggestion                                     | Our Decision     | Reason                                                                                                              |
| ------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| "Build separate side-by-side diff view (raw vs final)" | **NOT CURRENT SCOPE** | Raw batch responses now stored in `result.rawBatchResponses[]` (P0 hardening). Diff view would require a separate source-backed implementation decision. |
| "Re-run combine stage button"                          | **REJECT**       | Combine happens inside CF, not separately callable. Retry creates new job instead.                                  |
| "Track MISR/TTFP/HCR on dashboard"                     | **NOT CURRENT SCOPE** | HCR data exists (10.2 learning loop). MISR/TTFP need funnel event tracking first.                                   |
| "Build operational metrics into every page"            | **REJECT**       | Single monitoring page is sufficient for solo founder. Don't spread metrics across UI.                              |
| "Build AI request queue status panel"                  | **REJECT**       | No universal AI task queue exists (extraction has its own job queue).                                               |

---

_Document Status: Enabled internal platform surface; not current launch or deploy certification._
