# Description Generation — Firebase Cost Tracking

**Feature:** AI-Powered Menu Item Description Generation
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** March 14, 2026
**Priority:** MEDIUM — Gemini API cost per call, but lighter than image generation.

---

## Current Launch Boundary

This Firebase cost document is description-generation cost evidence; it is not current production deployment approval. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, target feature-flag/provider review, AI accounting/source gates, provider smoke, browser/mobile editor QA, and deploy evidence for the target environment.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** None
- **Cloud Functions:** None (uses API route)
- **Estimated Monthly Cost:** **Low-Medium** — Gemini API dominates

---

## Firestore Operations

### Reads

| Operation                     | Collection                         | Trigger                    | Frequency   | Docs Read | Indexed?   | Notes                                                               |
| ----------------------------- | ---------------------------------- | -------------------------- | ----------- | --------- | ---------- | ------------------------------------------------------------------- |
| Load project for descriptions | `projects/{tId}/{sId}/{projectId}` | User opens description gen | Per request | 1         | Direct doc | Reads full project to get item names/categories for prompt context. |

### Writes

| Operation                   | Collection                         | Trigger                    | Frequency | Docs Written | Fields                                         | Notes                                                                                            |
| --------------------------- | ---------------------------------- | -------------------------- | --------- | ------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Save generated descriptions | `projects/{tId}/{sId}/{projectId}` | After generation completes | Per batch | 1            | files[].extractedData.data.items[].description | Merge update. All descriptions saved at once. Uses `updateProject()` with `requestBodyComposer`. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                          |
| --------- | ---------- | ------- | --------- | ------------ | --------- | ---------------------------------------------- |
| None      | —          | —       | —         | —            | —         | Descriptions overwrite in place, no deletions. |

---

## Firebase Storage

None — descriptions are text stored directly in Firestore project documents.

---

## Cloud Functions

None — uses Next.js API route `/api/descriptions`.

---

## Security Rules Impact

- Project read/write requires auth + tenant isolation (`{tId}/{sId}`)
- API route protected with `withAuth()` middleware
- Rate limiting: `checkAIOperationLimit()` — 20 requests per minute

---

## Cost Optimization Notes

### Current Optimizations

- **Batch processing**: All items in a file processed in one Gemini call (not per-item)
- **"Generate Empty" mode**: Only generates for items without descriptions (skips existing)
- **Sequential file processing**: Files processed one at a time to prevent rate limits

### Warnings: Expensive Patterns

- **"Rewrite All" mode**: Regenerates ALL descriptions, even existing ones. Use sparingly.
- **Multi-language**: Generates descriptions in ALL project languages simultaneously = larger prompt = higher token cost

---

## Cost Estimate (per 1000 description batches/month)

| Resource         | Operations/month | Unit Cost    | Monthly Cost     |
| ---------------- | ---------------- | ------------ | ---------------- |
| Firestore Reads  | 1,000            | $0.06/100K   | $0.00            |
| Firestore Writes | 1,000            | $0.18/100K   | $0.00            |
| **Gemini API**   | 1,000 calls      | ~$0.001/call | **~$1.00**       |
| **Total**        |                  |              | **~$1.00/month** |

---

## DAL Functions Used

| Function        | File                                 | Operation Type       |
| --------------- | ------------------------------------ | -------------------- |
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |

## API Routes & Their Firebase Impact

| Route               | Method | Firebase Ops          | Rate Limited? | Notes                                                    |
| ------------------- | ------ | --------------------- | ------------- | -------------------------------------------------------- |
| `/api/descriptions` | POST   | 0R + 0W (Gemini only) | Yes (20/min)  | Returns generated descriptions. Client saves to project. |
