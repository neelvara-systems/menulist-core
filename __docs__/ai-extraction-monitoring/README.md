# AI Extraction Internal Monitoring Dashboard

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** ✅ IMPLEMENTED — Feature flag OFF (`ENABLE_EXTRACTION_MONITORING_DASHBOARD`)  
**Source:** ChatGPT extraction hardening session (Mar 2026) → Cascade codebase validation  
**Feature Flag:** `ENABLE_EXTRACTION_MONITORING_DASHBOARD`  
**Last Updated:** April 5, 2026

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

- **Route:** `/ops/extraction` (under Ops Control Room)
- **Access:** `platformRole === 'PLATFORM'` only
- **Navigation:** Ops Control Room → "Extraction Monitor" button, or direct URL

### Data Sources

| Source              | Collection                                   | What It Provides                           |
| ------------------- | -------------------------------------------- | ------------------------------------------ |
| Job documents       | `menuImageProcessingJobs`                    | Job status, timing, errors, quality scores |
| AI operations       | `MENULIST_AI_OPERATIONS`                     | Token usage, cost per extraction           |
| Extraction learning | `platformSummary/extractionLearning`         | Correction patterns (10.2)                 |
| AI usage log        | `aiUsageLog` (Phase 2 — not yet implemented) | Cross-feature AI cost (future)             |

### Dashboard Sections

1. **Health Overview** — Active/pending/failed job counts, avg processing time, failure rate
2. **Quality Metrics** — Avg quality score, confidence distribution, HCR trend
3. **Job Feed** — Recent jobs with status, scores, timing
4. **Job Inspector** — Drill into any job: raw AI output, combined data, file results
5. **Cost Monitor** — Gemini calls/day, cost/extraction, daily spend
6. **Ops Alerts** — Scheduler-driven alerts for stuck jobs, failure spikes, and quality drops

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

_Last Updated: April 5, 2026_
