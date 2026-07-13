# AI Extraction Internal Monitoring Dashboard — Product Specification

**Feature:** Internal monitoring dashboard for the menu extraction pipeline
**Status:** Enabled internal platform surface — not current launch or deploy certification
**Feature Flag:** `ENABLE_EXTRACTION_MONITORING_DASHBOARD`
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

**Current surface boundary:** Desktop exposes health, quality, cost, recent jobs, Job Inspector, raw-data copy, and eligible failed-job retry. Mobile exposes manual-refresh health, cost, quality, and recent-job summaries only. The current snapshot does not read `platformSummary/extractionLearning` and no Ops Alerts panel is mounted.

---

## Executive Summary

The AI Extraction Monitoring Dashboard is an internal-only tool for the solo founder to diagnose extraction pipeline issues fast. It is NOT an analytics dashboard. It is a debug console — showing what happened, why it failed, and enabling controlled recovery.

### What It Does

- **System Health** → Shows active/pending/failed jobs, processing time, failure rate
- **Quality Tracking** → Average quality score, confidence distribution, low-quality rate
- **Job Inspector** → Drill into any job: AI output, combined data, file-level results, errors
- **Retry Control** → Re-trigger failed extractions without user re-upload
- **Cost Monitor** → Gemini calls per day, cost per extraction, daily spend
- **Shared Alerts** → Existing scheduler logic creates extraction alerts through the platform alert pipeline

### What It Does NOT Do

- ❌ No customer-facing analytics (this is founder-only)
- ❌ No charts/graphs for business metrics
- ❌ No real-time streaming dashboard
- ❌ No per-tenant extraction analytics (too granular for now)
- ❌ No automated remediation (manual investigation always required)
- ❌ No HCR, MISR, TTFP, or Ops Alerts panel in the current monitor

---

## Problem Statement

Without the monitor, extraction diagnosis depends on reading raw Firebase records. The current platform surface consolidates bounded evidence for:

1. **Health visibility** — Recent active, failed, and completed jobs
2. **Quality visibility** — Scores and confidence distribution from recent completed jobs
3. **Diagnosis** — Desktop job details and retained extraction evidence
4. **Controlled recovery** — Desktop retry for an eligible failed job
5. **Cost visibility** — Today’s extraction operation rows from `MENULIST_AI_OPERATIONS`

The monitor reduces console hopping, but no diagnosis-time or provider-recovery guarantee is certified by source alone.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│ MONITORING DASHBOARD (/ops/extraction)            │
│                                                    │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ Health Panel  │  │ Quality Panel│              │
│  └──────────────┘  └──────────────┘              │
│  ┌──────────────┐  ┌──────────────┐              │
│  │ Job Feed     │  │ Cost Monitor │              │
│  └──────────────┘  └──────────────┘              │
│  ┌──────────────────────────────────┐            │
│  │ Job Inspector (click to expand)  │            │
│  └──────────────────────────────────┘            │
└───────────────────────┬──────────────────────────┘
                        │
          Reads from:   │
                        ▼
┌──────────────────────────────────────────────────┐
│ DATA SOURCES                                      │
│                                                    │
│  • menuImageProcessingJobs (job status + results) │
│  • MENULIST_AI_OPERATIONS (cost/token data)       │
│  • No separate aiUsageLog collection is read      │
│  • No extractionLearning summary read             │
└──────────────────────────────────────────────────┘
```

---

## Goals

| Goal                    | Success Metric                                      |
| ----------------------- | --------------------------------------------------- |
| **Bounded diagnosis**   | Recent job evidence is available in one platform surface |
| **Failure visibility**  | Failed jobs appear on the next load or manual refresh |
| **Quality monitoring**  | Recent completed-job quality is summarized from the bounded snapshot |
| **Cost awareness**      | Today’s extraction operation cost is visible from the bounded ledger query |
| **Recovery capability** | Eligible failed jobs can be retried from desktop only |

---

## User Stories

### Solo Founder

> "As the solo founder, I want to see extraction pipeline health at a glance so I can catch problems before restaurants complain."

**Acceptance Criteria:**

- Single page shows: active jobs, failure rate, avg quality, daily cost
- Shared scheduler alerts remain separate from the monitor UI
- Can drill into any failed job to see raw AI response

### Solo Founder (Debugging)

> "As the solo founder, when an extraction fails, I want the available job evidence in one controlled platform surface."

**Acceptance Criteria:**

- Click failed job → see error details + raw AI response
- Compare raw AI response vs normalized data
- See which file in the upload caused the issue
- Retry extraction with one click

---

## Requirements

### Functional Requirements

| ID    | Requirement                                                | Priority | Status |
| ----- | ---------------------------------------------------------- | -------- | ------ |
| FR-01 | Health overview panel (job counts, failure rate, avg time) | P0       | Mounted |
| FR-02 | Recent jobs feed from a bounded snapshot                    | P0       | Mounted |
| FR-03 | Desktop job inspector                                      | P0       | Mounted |
| FR-04 | Desktop eligible-failed-job retry                          | P0       | Mounted |
| FR-05 | Quality metrics panel (avg score, confidence distribution) | P1       | Mounted |
| FR-06 | Cost monitor (calls today, avg cost, daily spend)          | P1       | Mounted |
| FR-07 | Shared scheduler extraction alerts                         | P1       | Outside monitor UI |
| FR-08 | Raw and normalized extraction evidence when retained       | P1       | Desktop only |
| FR-09 | File-level results breakdown                               | P1       | Desktop only |
| FR-10 | HCR, MISR, and TTFP panels                                 | N/A      | Not mounted |

### Non-Functional Requirements

| ID     | Requirement    | Target                                        |
| ------ | -------------- | --------------------------------------------- |
| NFR-01 | Read boundary  | Desktop up to 150 jobs + 100 cost rows; mobile uses the same snapshot with 20 displayed jobs |
| NFR-02 | Data freshness | Initial load, filter change, or explicit refresh; no automatic refresh interval |
| NFR-03 | Access control | platformRole === 'PLATFORM' only              |
| NFR-04 | Feature flag   | `ENABLE_EXTRACTION_MONITORING_DASHBOARD`      |

---

## Dashboard Panels (Detailed)

### Panel 1: Health Overview (Top Row)

| Metric              | Source                                                               | Calculation     |
| ------------------- | -------------------------------------------------------------------- | --------------- |
| Active Jobs         | `menuImageProcessingJobs` where status in [pending, processing]      | Count           |
| Failed (24h)        | `menuImageProcessingJobs` where status = failed, createdAt > 24h ago | Count           |
| Failure Rate        | Failed / Total (24h)                                                 | Percentage      |
| Avg Processing Time | `completedAt - startedAt` for completed jobs (24h)                   | Mean in seconds |
| Avg Quality Score   | `result.qualityScore` for completed jobs (last 50)                   | Mean            |

**Health badge:**

- 🟢 Healthy: failure rate < 2%, avg time < 30s
- 🟡 Warning: failure rate 2-5%, or avg time 30-60s
- 🔴 Critical: failure rate > 5%, or avg time > 60s

### Panel 2: Job Feed (Main Content)

Columns:

- Job ID (truncated)
- Project ID (truncated)
- Status (badge: pending/processing/completed/failed/cancelled/preview_ready)
- Files Count
- Items Extracted
- Categories Extracted
- Quality Score
- Processing Time
- Created At
- Actions (View Details)

Filters:

- Status filter (All / Completed / Failed / Processing)
- Desktop table sorting remains client-side within the bounded snapshot.

### Panel 3: Job Inspector (Expandable)

Clicking a job opens full inspection:

**Tab 1: Overview**

- Job metadata (ID, project, tenant, store, status, timing)
- Per-file results table (file name, categories, items, warnings)
- Error details (if failed)

**Tab 2: AI Response** (P1)

- Raw combined AI response (JSON viewer)
- File messages (per-file warnings/errors)
- Confidence summary

**Tab 3: Extracted Data** (P1)

- Final combined menu structure (categories → items tree)
- Quality score breakdown (4 components)

**Tab 4: Cost** (P2)

- Token usage (prompt, candidate, total)
- Credits consumed
- Charge calculated
- Batch results (if multi-batch)

### Panel 4: Cost Monitor (Side Panel)

| Metric                    | Source                                                 |
| ------------------------- | ------------------------------------------------------ |
| Gemini Calls Today        | `MENULIST_AI_OPERATIONS` count where createdAt = today |
| Avg Cost/Extraction       | Total charge / extraction count                        |
| Daily Spend Today         | Sum of today’s extraction operation charges            |
| Most Expensive Job        | Max totalCharge in last 24h                            |

### Panel 5: Retry Control

For failed jobs:

- "Retry Extraction" button
- Creates new job with same files and projectId
- References `retriedFromJobId` for audit trail
- Uses existing `createMenuProcessingJob` logic on server

---

## Shared Alert System

### Existing Scheduler Alerts

`functions/src/schedulers/menuJobCleanup.ts` creates extraction alerts through the shared platform alert pipeline. Delivery configuration is operational infrastructure outside the monitor UI.

| Alert            | Trigger                                | Message                                                                             |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Failure Spike    | failure rate > 5% in last 1 hour       | "🔴 Extraction failure rate: {rate}% ({count} failed / {total} total in last hour)" |
| Quality Drop     | avg quality score < 55 in last 50 jobs | "🟡 Extraction quality degraded: avg {score}/100 (last 50 jobs)"                    |
| Processing Stuck | jobs in 'processing' for > 10 minutes  | "🟡 Extraction job stuck: {jobId} processing for {minutes}min"                      |

These alerts are not an Ops Alerts panel and are not read by the monitor snapshot.

---

## Metrics Definitions (From ChatGPT Session — Validated)

### HCR (Human Correction Rate) — P3

**Definition:** Percentage of extracted fields edited by the user.

**Formula:** `HCR = (fields edited by user) / (total extracted fields)`

**Data source:** Extraction Learning Loop (Infrastructure Compounding 10.2)

- Collection: `menuChangeLog` with type `EXTRACTION_CORRECTION`
- Created by: `detectAndLogChanges()` in `src/database/projects/index.ts`
- Aggregated by: `functions/src/analytics/extractionLearning.ts`
- Summary at: `platformSummary/extractionLearning`

**Healthy value:** HCR < 10%

**Current source note:** `platformSummary/extractionLearning` is not read or rendered by the current monitor snapshot. Any HCR display in this specification is design context, not mounted runtime.

### MISR (Menu Ingestion Success Rate) — P3

**Definition:** Percentage of menu uploads that result in a published menu.

**Formula:** `MISR = (menus published) / (menus uploaded)`

**Data source:** Would require funnel event tracking (not yet implemented).

Events needed:

1. `menuUploadStarted` — User initiates upload
2. `extractionCompleted` — AI processing done
3. `editorOpened` — User enters editor
4. `menuPublished` — User publishes menu

**Healthy value:** MISR > 90%

### TTFP (Time to First Publish) — P3

**Definition:** Time from first upload to first menu publish.

**Formula:** `TTFP = timestamp(firstPublish) - timestamp(firstUpload)`

**Data source:** Would need to correlate `menuImageProcessingJobs.createdAt` with `project.lastPublishedAt` (from Infrastructure Compounding 10.3).

**Healthy value:** TTFP < 10 minutes

---

## Error Messages

| Scenario                | Message                                                                           |
| ----------------------- | --------------------------------------------------------------------------------- |
| Dashboard access denied | "Access restricted to platform administrators."                                   |
| No extraction data      | "No extraction jobs found. The dashboard will populate once menus are processed." |
| Retry failed            | "Retry failed: {error}. The original files may no longer be available."           |
| Data loading error      | "Could not load extraction data. Please try refreshing."                          |

---

## Out of Scope

| Feature                              | Reason                                              |
| ------------------------------------ | --------------------------------------------------- |
| Per-tenant extraction analytics      | Too granular; adds Firestore cost for minimal value |
| Automated remediation                | Manual investigation always required for AI issues  |
| Real-time WebSocket dashboard        | Current bounded load/filter/manual-refresh model avoids continuous reads |
| Historical export (CSV)              | Not mounted in the internal monitor                 |
| Comparison with previous extractions | Retained artifacts exist, but no comparison workflow is mounted |

---

## Related Documents

| Document                                | Purpose                      |
| --------------------------------------- | ---------------------------- |
| `_impl.md`                              | Technical blueprint          |
| `_firebase.md`                          | Cost tracking                |
| `__docs__/projects/ai-data-extraction/` | The pipeline being monitored |
| `__docs__/ai-system-layer/`             | AI infrastructure layer      |

---

## Version History

| Version | Date     | Changes                                                         |
| ------- | -------- | --------------------------------------------------------------- |
| 1.0     | Mar 2026 | Initial documentation from ChatGPT review + codebase validation |

---

_Document Status: Enabled internal platform surface; not current launch or deploy certification._
