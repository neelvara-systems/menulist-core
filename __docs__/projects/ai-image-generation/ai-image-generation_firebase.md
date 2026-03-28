# AI Image Generation — Firebase Cost Tracking

**Feature:** AI-Powered Image Generation & Editing  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** HIGH — Most expensive AI feature. Direct Gemini API + Storage costs per generation.

---

## Summary

- **Collections Used:** `imageBatchProcessingJobs/{tId}/{sId}`, `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** `MenuListAi/project/generated/{projectId}/{fileId}`, `MenuListAi/project/assets/{projectId}/{fileId}`
- **Cloud Functions:** None (uses API routes + Google Cloud Tasks for batch)
- **Estimated Monthly Cost:** **HIGH** — Gemini/Imagen API costs dominate

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Load project for generation | `projects/{tId}/{sId}/{projectId}` | User opens image gen modal | Per modal open | 1 | Direct doc | Reads project to get item details for prompt. |
| Batch job status listener | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Batch generation started | Real-time (onSnapshot) | 1 per update | Direct doc | `useImageBatchJobListener` hook. Updates per item processed. |
| Batch job items listener | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}/items` | Batch generation | Real-time (onSnapshot) | 1-50+ per batch | Subcollection | Each item gets its own status doc. Listener fires per item completion. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Create batch job | `imageBatchProcessingJobs/{tId}/{sId}` | User starts batch gen | Per batch request | 1 | Full job doc | `addImageBatchProcessingJob()`. Contains item list, config, status. |
| Update batch item status | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}/items/{itemId}` | Per item processed | Per item in batch | 1 per item | status, imageUrl, error | Worker updates each item as it completes. |
| Update batch job progress | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Per item processed | Per item | 1 | progress count, status | Incremental progress updates. |
| Save generated image URL to project | `projects/{tId}/{sId}/{projectId}` | User accepts image | Per accepted image | 1 | files[].extractedData.data.items[].image | Merge update with new image URL after Storage upload. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| None | — | — | — | — | — | Batch jobs kept for audit. Discarded images not saved. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload accepted single image | `MenuListAi/project/assets/{projectId}/{fileId}` | User accepts generated image | 0.5-2MB | Base64 → Storage upload via `uploadBase64ToStorage`. |
| Upload accepted batch images | Same pattern | User accepts batch results | 0.5-2MB per item | Multiple uploads for batch acceptance. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| None directly | — | — | — | — | Uses API routes instead. |

## External Services

| Service | Trigger | Cost | Notes |
|---------|---------|------|-------|
| Gemini 2.0 Flash (image gen) | Per generation request | ~$0.002-0.01/image | Primary generation model |
| Imagen 3 (fallback) | When Gemini fails | ~$0.01-0.03/image | Higher quality, higher cost |
| Google Cloud Tasks | Batch generation | $0.40/million | Queues individual item tasks for batch processing |

---

## Security Rules Impact

- `imageBatchProcessingJobs`: Write requires auth + tenant match. Read requires auth + own tenant.
- Storage upload: requires auth. Path includes projectId for tenant isolation.
- Rate limiting: `checkExpensiveAILimit()` — 5 requests per minute per user.
- All API routes protected with `withAuth()` middleware.

---

## Cost Optimization Notes

### Current Optimizations
- **Rate limiting**: 5/min prevents runaway costs
- **Batch via Cloud Tasks**: Items processed sequentially, prevents Gemini rate limit errors
- **User review before save**: Generated images shown as preview — only accepted images uploaded to Storage
- **Discarded images not stored**: If user rejects, no Storage cost

### Potential Optimizations
- **Image caching**: Same item name → same image. Cache by item name hash
- **Batch discount**: If Gemini offers batch pricing, migrate from individual calls
- **Quality tiers**: Offer "quick" (lower quality, cheaper) vs "premium" generation

### Warnings: Expensive Patterns
- **Bulk generation of 50+ items**: Each item = 1 Gemini call. 50 items × $0.01 = $0.50 per batch
- **Re-generation loops**: User doesn't like result → generates again → double cost
- **Image editing**: Each edit is another Gemini call on top of generation

---

## Cost Estimate (per 1000 image generations/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads | 5,000 | $0.06/100K | $0.00 |
| Firestore Writes (jobs + items) | 3,000 | $0.18/100K | $0.01 |
| Firestore Writes (project updates) | 1,000 | $0.18/100K | $0.00 |
| Storage (accepted images) | 1.5GB | $0.026/GB | $0.04 |
| Cloud Tasks | 1,000 | $0.40/M | $0.00 |
| **Gemini API** | 1,000 calls | ~$0.005/call avg | **~$5.00** |
| **Total** | | | **~$5.05/month** |

> **Note:** Gemini API cost is 99% of total. Firebase costs are negligible. Monitor generation volume closely.

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `addImageBatchProcessingJob` | `src/database/projects/imageBatch.ts` | Write (addDoc) |
| `useImageBatchJobListener` | `src/hooks/useImageBatchJobListener.ts` | Read (onSnapshot) |
| `uploadBase64ToStorage` | `src/database/storage/uploadBase64ToStorage.ts` | Storage upload |
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| `/api/image-generation` | POST | 0R + 0W (Gemini only) | Yes (5/min) | Single image gen. Returns base64. No Firestore. |
| `/api/image-generation/batch-trigger` | POST | 1R + 1W | Yes (5/min) | Creates Cloud Tasks for batch. |
| `/api/image-generation/batch-generation` | POST | 1R + 2W | N/A (worker) | Per-item worker. Reads job, writes result + progress. |
| `/api/image-editing` | POST | 0R + 0W | Yes (5/min) | Edit existing image. Returns base64. No Firestore. |
