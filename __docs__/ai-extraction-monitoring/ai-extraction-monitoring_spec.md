# AI Extraction Internal Monitoring Dashboard — Product Specification

**Feature:** Internal monitoring dashboard for the menu extraction pipeline
**Status:** ✅ IMPLEMENTED — Feature flag OFF (`ENABLE_EXTRACTION_MONITORING_DASHBOARD`); controlled internal testing ready, not launch certification
**Feature Flag:** `ENABLE_EXTRACTION_MONITORING_DASHBOARD`
**Last Updated:** July 2, 2026

**Launch boundary:** This spec describes the implemented internal debug console. Enabling it for a release still requires target feature-flag review, platform-role access verification, current extraction data, and the External Certification Runbook evidence that applies to the release. It is not a standalone production-launch approval.

---

## Executive Summary

The AI Extraction Monitoring Dashboard is an internal-only tool for the solo founder to diagnose extraction pipeline issues fast. It is NOT an analytics dashboard. It is a debug console — showing what happened, why it failed, and enabling controlled recovery.

### What It Does

- **System Health** → Shows active/pending/failed jobs, processing time, failure rate
- **Quality Tracking** → Average quality score, confidence distribution, anomaly flags
- **Job Inspector** → Drill into any job: AI output, combined data, file-level results, errors
- **Retry Control** → Re-trigger failed extractions without user re-upload
- **Cost Monitor** → Gemini calls per day, cost per extraction, daily spend
- **Alerts** → Telegram notification when failure rate spikes or quality drops

### What It Does NOT Do

- ❌ No customer-facing analytics (this is founder-only)
- ❌ No charts/graphs for business metrics
- ❌ No real-time streaming dashboard
- ❌ No per-tenant extraction analytics (too granular for now)
- ❌ No automated remediation (manual investigation always required)

---

## Problem Statement

Currently the extraction pipeline operates as a black box. When something goes wrong:

1. **No visibility** — Must manually check Firebase Console for job documents
2. **No aggregation** — Can't see failure rate trends or quality degradation
3. **No fast diagnosis** — Opening individual job docs in Firestore console is slow
4. **No retry mechanism** — Failed jobs require the restaurant owner to re-upload
5. **No cost visibility** — Don't know daily Gemini API spend from extraction

As a solo founder, debugging time must be under 5 minutes from alert to diagnosis.

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
│  • platformSummary/extractionLearning (HCR data)  │
└──────────────────────────────────────────────────┘
```

---

## Goals

| Goal                    | Success Metric                                      |
| ----------------------- | --------------------------------------------------- |
| **Fast diagnosis**      | Identify extraction issue cause in < 5 minutes      |
| **Failure visibility**  | Failed jobs visible within 30 seconds of occurrence |
| **Quality monitoring**  | Quality degradation detected within 1 hour          |
| **Cost awareness**      | Daily AI spend visible at a glance                  |
| **Recovery capability** | Failed jobs can be retried without user re-upload   |

---

## User Stories

### Solo Founder

> "As the solo founder, I want to see extraction pipeline health at a glance so I can catch problems before restaurants complain."

**Acceptance Criteria:**

- Single page shows: active jobs, failure rate, avg quality, daily cost
- Alert triggers when failure rate > 5% or quality drops > 20%
- Can drill into any failed job to see raw AI response

### Solo Founder (Debugging)

> "As the solo founder, when I get an alert about a failed extraction, I want to diagnose the root cause in under 5 minutes."

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
| FR-01 | Health overview panel (job counts, failure rate, avg time) | P0       | 📝     |
| FR-02 | Recent jobs feed (last 50 jobs, sortable/filterable)       | P0       | 📝     |
| FR-03 | Job inspector (drill into any job's full data)             | P0       | 📝     |
| FR-04 | Failed job retry button                                    | P0       | 📝     |
| FR-05 | Quality metrics panel (avg score, confidence distribution) | P1       | 📝     |
| FR-06 | Cost monitor (calls/day, cost/extraction, daily spend)     | P1       | 📝     |
| FR-07 | Anomaly flags (items > 300, categories > 50, quality < 30) | P1       | 📝     |
| FR-08 | Telegram alert on failure rate spike                       | P1       | 📝     |
| FR-09 | Raw AI response viewer (JSON tree)                         | P1       | 📝     |
| FR-10 | File-level results breakdown                               | P2       | 📝     |
| FR-11 | Quality score trend (last 7 days)                          | P2       | 📝     |
| FR-12 | HCR (Human Correction Rate) from learning loop data        | P3       | 📝     |
| FR-13 | MISR (Menu Ingestion Success Rate) funnel                  | P3       | 📝     |
| FR-14 | TTFP (Time to First Publish) metric                        | P3       | 📝     |

### Non-Functional Requirements

| ID     | Requirement    | Target                                        |
| ------ | -------------- | --------------------------------------------- |
| NFR-01 | Page load time | < 3 seconds                                   |
| NFR-02 | Data freshness | Real-time for job feed, 15-min for aggregates |
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
- Date range (Today / Last 7 days / Last 30 days)
- Quality filter (All / Low < 40 / Medium 40-70 / High > 70)

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
| Daily Spend (7-day chart) | Simple bar chart of daily costs                        |
| Most Expensive Job        | Max totalCharge in last 24h                            |

### Panel 5: Retry Control

For failed jobs:

- "Retry Extraction" button
- Creates new job with same files and projectId
- References `retriedFromJobId` for audit trail
- Uses existing `createMenuProcessingJob` logic on server

---

## Alert System

### Telegram Alerts (Reuse Existing Infrastructure)

Uses existing `sendTelegramAlert()` from `functions/src/monitoring/telegramAlert.ts`.

| Alert            | Trigger                                | Message                                                                             |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| Failure Spike    | failure rate > 5% in last 1 hour       | "🔴 Extraction failure rate: {rate}% ({count} failed / {total} total in last hour)" |
| Quality Drop     | avg quality score < 55 in last 50 jobs | "🟡 Extraction quality degraded: avg {score}/100 (last 50 jobs)"                    |
| Processing Stuck | jobs in 'processing' for > 10 minutes  | "🟡 Extraction job stuck: {jobId} processing for {minutes}min"                      |

**Where to trigger:** Piggybacked on the existing 15-minute cleanup scheduler in Firebase Functions.

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

**Note:** This data is already being collected (10.2 is implemented). Only the dashboard display is new.

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
| Real-time WebSocket dashboard        | onSnapshot is sufficient for job feed               |
| Historical export (CSV)              | Can query Firestore directly for ad-hoc analysis    |
| Comparison with previous extractions | Would need extraction artifact storage first        |

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

_Document Status: ✅ IMPLEMENTED — Feature flag OFF; source-verified for controlled internal testing, with launch certification gated by the External Certification Runbook and current production-readiness audit._
