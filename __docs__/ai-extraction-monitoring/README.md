# AI Extraction Internal Monitoring Dashboard

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** Enabled internal platform surface — not current launch or deploy certification
**Source:** ChatGPT extraction hardening session (Mar 2026) → Cascade codebase validation  
**Feature Flag:** `ENABLE_EXTRACTION_MONITORING_DASHBOARD`  
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

---

## Overview

An internal-only dashboard that gives the solo founder fast visibility into extraction pipeline health. Not analytics — operational diagnosis. The goal is to answer three questions in under 30 seconds:

1. **Is the pipeline working?** (system health)
2. **Is extraction quality stable?** (AI quality)
3. **What went wrong?** (job inspection + retry)

---

## Documentation

| Document             | Audience          | Purpose                                         |
| -------------------- | ----------------- | ----------------------------------------------- |
| `_spec.md`           | Product, Business | Requirements, metrics, user flows               |
| `_impl.md`           | Developers        | Technical blueprint, file structure, components |
| `_firebase.md`       | Developers        | Firestore operations, cost tracking             |
| `_marketing.md`      | Internal          | Internal positioning                            |
| `_website.md`        | Public            | N/A — internal tool                             |
| `_helpdoc.md`        | Public            | N/A — internal tool                             |
| `_mobile-support.md` | Internal          | Mobile relevance assessment                     |
| `_release-validation.md` | QA, Engineering | Manual release signoff for extraction lifecycle |

---

## Quick Reference

### Route & Access

- **Desktop routes:** `/ops/extraction` and `/platform/extraction-monitor`
- **Mobile route state:** `MobileShell` → More → Platform → Extraction Monitor
- **Access:** signed `platformRole === 'PLATFORM'`, followed by `/api/platform/current-access` exact current persisted authorization before browser snapshot reads
- **Navigation:** Ops Control Room → "Extraction Monitor" button, or direct URL

### Data Sources

| Source              | Collection                                   | What It Provides                           |
| ------------------- | -------------------------------------------- | ------------------------------------------ |
| Job documents       | `menuImageProcessingJobs`                    | Job status, timing, errors, quality scores |
| AI operations       | `MENULIST_AI_OPERATIONS`                     | Token usage, cost per extraction, job/tenant/store context |

No separate `aiUsageLog` collection is read by this dashboard. Current extraction cost data comes from `MENULIST_AI_OPERATIONS`; billable app-route operations live in `menulistAiOperations/{tId}/{sId}` outside this extraction monitor.

### Dashboard Sections

1. **Health Overview** — Active/pending/failed job counts, avg processing time, failure rate
2. **Quality Metrics** — Avg quality score, confidence distribution, low-quality rate
3. **Job Feed** — Recent jobs with status, scores, timing
4. **Job Inspector** — Drill into any job: normalized extraction output, stored raw provider responses, file results, token usage, owner units, retry status, and acknowledged raw-data copy actions with bounded failure diagnostics
5. **Cost Monitor** — Gemini calls/day, actual INR cost/extraction, daily spend, and highest job cost. Values are stored as paise and rendered as INR. Platform rows include `jobId`, tenant/store/user context, destination, source, token counts, failure status/error code, retry-after seconds when present, and Firestore `createdAt` timestamps. If the standalone cost-panel compatibility load fails, the panel logs bounded `extraction_cost_monitor_load_failed` diagnostics and shows fixed "Cost metrics unavailable" copy instead of reporting zero extraction calls.
6. **Mobile summary** — Manual-refresh health, cost, quality, and recent-job cards. Mobile does not expose the desktop Job Inspector or retry action.

Persisted monitor rows are runtime-projected before aggregation. Invalid timestamps exclude only their own row; malformed numeric quality, duration, confidence, and charge fields cannot coerce or poison the dashboard. Desktop retry uses a platform-only server recovery route with current-user reauthorization, original-job/project/Storage ownership validation, SAFE_MODE, fail-closed rate limiting, and active-job transaction protection.

Snapshot read failure rejects the load and renders unavailable/previous-snapshot copy on desktop and mobile. It is never converted into zero calls, zero failures or a healthy pipeline.

---

## Key Metrics

| Metric                  | Definition                             | Healthy Value | Alert Threshold |
| ----------------------- | -------------------------------------- | ------------- | --------------- |
| **Failure Rate**        | failed jobs / total jobs (24h)         | < 2%          | > 5%            |
| **Avg Processing Time** | Mean job completion time               | < 30s         | > 60s           |
| **Avg Quality Score**   | Mean quality score (last 50 jobs)      | > 70          | < 55            |
| **Pending Jobs**        | Jobs in pending/processing state       | < 5           | > 20            |
| **429 Error Rate**      | Gemini rate limit errors / total calls | < 1%          | > 5%            |

---

## Related Features

| Feature            | Relationship                     |
| ------------------ | -------------------------------- |
| AI Data Extraction | The pipeline being monitored     |
| AI System Layer    | Provides cross-feature cost data |
| Ops Control Room   | Parent navigation context        |
| Scheduler Monitor  | Sibling ops dashboard            |

---

_Document Status: Enabled internal platform surface; not current launch or deploy certification._
_Last Updated: July 10, 2026_
