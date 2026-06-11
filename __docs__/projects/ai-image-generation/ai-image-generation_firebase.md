# AI Image Generation — Firebase Cost Tracking

**Feature:** Menu Image Generation & Editing
**Status:** Controlled owner testing ready after June 2026 worker/auth/logging hardening
**Last Updated:** June 11, 2026
**Priority:** HIGH — Most expensive AI feature. Direct Gemini API + Storage costs per generation.

---

## Summary

- **Collections Used:** `imageBatchProcessingJobs/{tId}/{sId}`, `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** `media/menuItem/{tId}/{sId}/{entityId}/{fileId}` for item images; `media/menuBackground/...` and `media/projectImage/...` for design/project media through shared media profiles
- **Cloud Functions:** None (uses API routes + Google Cloud Tasks for batch)
- **Estimated Monthly Cost:** **HIGH** — Gemini/Imagen API costs dominate

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Linked-outlet policy check | `projects/{tId}/{sId}/{projectId}`, `stores/{masterStoreId}` | Image generation/editing and batch trigger | Per request | 1-2 | Direct doc | Project read always runs for project-scoped requests; master store read runs only for linked outlets. |
| AI capacity check | `subscriptions/{subscriptionId}` | Before Gemini/provider work | Per request or worker item | 1 | Query/direct helper | Prevents provider spend when credits are unavailable. |
| Batch job status listener | `imageBatchProcessingJobs/{tId}/{sId}` | Batch generation started | Real-time (onSnapshot) | Up to 5 per update | Query: projectId + status, limit 5 | `useImageBatchJobListener` hook selects the newest visible job client-side. This keeps reads bounded and avoids a new composite index. |
| Batch worker job read | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Cloud Tasks worker | Per item task | 1 | Direct doc | Verifies job, project, requested item, terminal/idempotent state. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Create batch job | `imageBatchProcessingJobs/{tId}/{sId}` | User starts batch gen | Per batch request | 1 | Full job doc | Client creates the visible job before trigger call. |
| Register requested item IDs | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Batch trigger validated | Per batch request | 1 | requestedItemIds | Admin SDK write used by worker authorization/idempotency. |
| Update batch job progress | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Per item processed | Per item | 1 | itemsList, generatedCount, status | Worker uses an Admin SDK transaction to merge the item result and compute the next generated count/status from the latest job doc; no item subcollection. |
| Save generated image URL to project | `projects/{tId}/{sId}/{projectId}` | User accepts image | Per accepted image | 1 | files[].extractedData.data.items[].image | Merge update with new image URL after Storage upload. |
| AI accounting | AI operation/accounting collections + subscription doc | Successful provider response | Per generated/edited image request | 1-2 | operation ledger, balance | Response/provider image bytes are summarized, not stored. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| None | — | — | — | — | — | Batch jobs kept for audit. Discarded images not saved. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload accepted single image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | User accepts generated image | Profile-bounded | Shared `uploadFile()` media profile path. Public-read image URL is saved only after owner acceptance. |
| Upload batch worker image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | Worker generates item image | Profile MIME/source-size guarded | Admin SDK upload with public Firebase download token; no browser session required. |

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

- `imageBatchProcessingJobs`: Browser read/write requires auth + tenant/store match. Server worker uses Admin SDK after task secret and project/job/item validation.
- Storage upload: browser uploads require auth + tenant/store path; worker uploads use Admin SDK only after authenticated Cloud Task secret validation.
- Rate limiting: `checkExpensiveAILimit()` — 5 requests per minute per user.
- Owner API routes use `withAuth()`; the worker route is Cloud Tasks-only and requires `project-id` plus `x-menulist-task-secret`.

---

## Cost Optimization Notes

### Current Optimizations
- **Rate limiting**: 5/min prevents runaway costs
- **Capacity before provider work**: Single and worker routes build deterministic prompts first, then check AI capacity using the actual prompt/image quantity before calling Gemini/Imagen.
- **Batch preflight capacity check**: Batch trigger estimates deterministic prompt/image quantity before enqueuing tasks, so multi-prompt batches are blocked before Cloud Tasks are created when capacity is insufficient.
- **Batch via Cloud Tasks**: Items are queued independently; each worker validates job/project/item state before provider work.
- **Bounded prompt/upload concurrency**: Multi-prompt image generation and worker Storage uploads run with small concurrency caps instead of unbounded parallelism.
- **Worker idempotency guard**: Replayed item tasks skip when an item already has generated images.
- **Payload summaries**: Provider responses and reference-image data are summarized in logs/accounting instead of storing image bytes.
- **User review before save**: Single generated images are returned as base64 previews and uploaded to Storage only when the owner accepts them.

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
| `addImageBatchProcessingJob` | `src/database/imageBatchProcessing/index.tsx` | Write (addDoc) |
| `useImageBatchJobListener` | `src/hooks/useImageBatchJobListener.ts` | Read (onSnapshot) |
| `uploadBase64ToStorage` | `src/database/storage/uploadBase64ToStorage.ts` | Storage upload |
| `uploadBase64MediaImageAdmin` | `src/database/storage/uploadBase64MediaImageAdmin.ts` | Server worker Storage upload |
| `getImageBatchProcessingJobByIdAdmin` | `src/database/imageBatchProcessing/server.ts` | Worker job read |
| `updateImageBatchProcessingJobAdmin` | `src/database/imageBatchProcessing/server.ts` | Worker/job server updates |
| `appendImageBatchItemResultAdmin` | `src/database/imageBatchProcessing/server.ts` | Transactional worker progress update |
| `updateProject` | `src/database/projects/index.ts:382` | Write (setDoc merge) |

## API Routes & Their Firebase Impact

| Route | Method | Firebase Ops | Rate Limited? | Notes |
|-------|--------|-------------|---------------|-------|
| `/api/image-generation` | POST | 2-3R + 1-2W on success | Yes (5/min) | Project/outlet policy + prompt-count AI capacity before provider; accounting write after success. Returns base64 preview and does not write Storage until owner acceptance. |
| `/api/image-generation/batch-trigger` | POST | 2-4R + 1W | Yes (3/5min) | Project/outlet policy + prompt-count batch capacity, registers requested item IDs, then enqueues Cloud Tasks. |
| `/api/image-generation/batch-generation` | POST | 2R + Storage uploads + 2-3W on success | Task secret | Reads job + prompt-count capacity, uploads generated images via Admin SDK with bounded concurrency, writes accounting and transactional progress. |
| `/api/image-editing` | POST | 2-3R + 1-2W on success | Yes (5/min) | Project/outlet policy + AI capacity before provider; accounting write after success. Returns base64 preview. |
