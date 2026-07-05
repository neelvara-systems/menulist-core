# Description Generation — Firebase Cost Tracking

**Feature:** AI-Powered Menu Item Description Generation
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 5, 2026
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

July 5 provider-response parse diagnostics are Firebase-cost neutral. Empty, malformed non-object, or malformed object-fragment provider JSON now logs capped `description_provider_response_parse_failed` diagnostics with fixed `return_description_generation_failed` policy and response-shape metadata only. The route still uses the existing bounded body admission, validation, permission gate, linked-outlet policy check, SAFE_MODE/rate-limit/capacity checks, single Gemini call, response normalization, `finalizeAiOperationAccounting()` write, and credit consumption order for valid output. Unusable provider responses still return the existing generic Description failure without a usable operation row or credit consumption. Shape-only local success/error logs and bounded item/language summaries in accounting input add no Firestore reads/writes/deletes, Storage operations, extra provider calls, AI accounting writes, credit consumption, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 5 editor returned-error diagnostics are also Firebase-cost neutral. `descriptionGeneration.shared.ts` still runs the same generated-description flow and direct-save fallback, but returned-error service results now log `menu_editor_description_generation_returned_error_message` with bounded result-message/file/project/message-type metadata only. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, AI accounting writes, cache invalidations, rules, indexes, schema fields, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

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
