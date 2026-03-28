# AI Data Extraction

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready  
**Model:** `gemini-2.5-flash` via `@google/genai` SDK  
**Last Updated:** March 12, 2026

---

## Overview

AI Data Extraction uses Google Gemini to read menu images and extract structured data (categories, items, prices, descriptions). It's powered by a Job Queue architecture with batch processing, parallel file upload, circuit breaker protection, per-item confidence scoring, and re-extraction workflow.

---

## Documentation

| Document                                                  | Audience          | Purpose                                       |
| --------------------------------------------------------- | ----------------- | --------------------------------------------- |
| `_spec.md`                                                | Product, Business | Requirements, user flows, quality scoring     |
| `_impl.md`                                                | Developers        | Job queue architecture, security, validation  |
| `_firebase.md`                                            | Developers        | Firestore operations, cost tracking           |
| `_marketing.md`                                           | Sales, Marketing  | Pitch, copy, objection handling               |
| `_website.md`                                             | Public            | Landing page content                          |
| `_helpdoc.md`                                             | Public            | Customer help documentation                   |
| `production-review.md`                                    | Developers        | Production review & issue analysis (Jan 2026) |
| `failure-mode-scale-audit.md`                             | Developers        | Failure mode & scale audit (Mar 2026)         |
| `_archive/chatgpt-review-extraction-hardening-2026-03.md` | Internal          | ChatGPT review validation (Mar 2026)          |

---

## Quick Reference

### Architecture

- **Job Queue:** `menuImageProcessingJobs/{jobId}`
- **PROD:** Firestore onCreate trigger (`functions/src/triggers/production.ts`)
- **DEV:** `dev_triggerProcessMenuImages` callable
- **Batch Processing:** Max 10 images per Gemini call, sequential between batches
- **File Upload:** Parallel via `Promise.all` to Gemini File API
- **Category Continuation:** Cross-batch category/item ID continuation
- **Re-extraction:** `preview_ready` status with client-side comparison engine

### Key Files (Actual Codebase)

```
src/
├── components/templates/main-app/projects/
│   ├── getProcessedFile.ts               # Creates processing job
│   └── index.tsx                         # Uses useMenuProcessingJob hook
├── hooks/
│   └── useMenuProcessingJob.ts           # Real-time job status listener
└── lib/firebase/
    └── menuProcessing.ts                 # Job creation, cancellation, active check

functions/src/
├── triggers/production.ts                # processMenuImagesJob (onCreate)
├── logic/
│   ├── processMenuImagesJob.ts           # Job orchestration (idempotency, branching)
│   ├── processMenuImages.ts              # Main AI processing (batch, upload, scoring)
│   ├── parallelProcessingPrompt.ts       # Gemini prompt with sourceFileIndex
│   ├── aiResponseUtils.ts                # Response parsing, validation, normalization
│   ├── redistributeUtils.ts             # Per-file data redistribution + sanitization
│   └── saveFilesToProject.ts            # Save to project with auto-merge
├── lib/
│   ├── circuitBreaker.ts                # Circuit breaker (CLOSED→OPEN→HALF_OPEN)
│   └── rateLimit.ts                     # Upstash rate limiting (5/min expensive)
├── constants/
│   └── ai.ts                            # Model config, batch settings, safety settings
└── types/
    ├── menuProcessingJob.types.ts       # Job document interface
    └── menuExtraction.types.ts          # Extracted data types, confidence, quality
```

### Security & Protection

- Per-project rate limiting (Upstash Redis, 5/min expensive AI ops)
- Custom response validation (`validateResponseStructure` + `normalizeResponseData`)
- Server-side HTML stripping (`stripHtml()` in redistributeUtils.ts)
- Circuit breaker with feature flag (`ENABLE_CIRCUIT_BREAKER`)
- Idempotency via Firestore transaction (prevents double processing)
- Multi-tenant isolation (`tId`/`sId` in job docs)
- Sentry error tracking

### Quality Scoring

| Score  | Status    | Action        |
| ------ | --------- | ------------- |
| 0-40   | ⚠️ Low    | Warning shown |
| 40-70  | 🟡 Medium | OK            |
| 70-100 | ✅ High   | Good          |

### Per-Item Confidence (Infrastructure Compounding 10.1)

Each extracted item includes confidence: `{ name: "high"/"medium"/"low", price: "high"/"medium"/"low" }`. Aggregated into `confidenceSummary` on job document.

### Job Statuses

| Status          | Meaning                                         |
| --------------- | ----------------------------------------------- |
| `pending`       | Job created, waiting for CF pickup              |
| `processing`    | AI extraction in progress                       |
| `preview_ready` | Re-extraction: raw data ready for client review |
| `completed`     | First extraction: auto-saved to project         |
| `failed`        | Error occurred                                  |
| `cancelling`    | User requested cancellation                     |
| `cancelled`     | Job cancelled                                   |

---

## Legacy Documentation

The following files have been **consolidated** into this folder:

| Legacy File                                                   | Status         |
| ------------------------------------------------------------- | -------------- |
| `Assessments/ASSESSMENT-02-AI-EXTRACTION.md`                  | → Consolidated |
| `Assessments/MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md`         | → Referenced   |
| `development_done/2-IMPLEMENTATION-AI-EXTRACTION-COMPLETE.md` | → Consolidated |
| `development_done/2-TESTING-GUIDE-AI-EXTRACTION.md`           | → Consolidated |
| `development_done/2-CROSS-CHECK-AI-EXTRACTION.md`             | → Consolidated |

---

## Related Features

| Feature                         | Relationship                             |
| ------------------------------- | ---------------------------------------- |
| Upload & File Processing        | Prepares files for extraction            |
| Data Editor                     | Displays and edits extracted data        |
| Multi-Language Translation      | Translates extracted content             |
| AI System Layer                 | Centralized AI gateway (planned)         |
| AI Extraction Monitoring        | Internal monitoring dashboard (planned)  |
| Extraction Learning Loop (10.2) | Tracks human corrections for improvement |
| Extraction Confidence (10.1)    | Per-item confidence scoring              |

---

_Last Updated: March 12, 2026_
