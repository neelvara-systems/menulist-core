# AI Image Generation — Firebase Cost Tracking

**Feature:** Menu Image Generation & Editing
**Status:** Controlled owner testing ready after June 2026 worker/auth/logging hardening
**Last Updated:** July 9, 2026
**Priority:** HIGH — Most expensive AI feature. Direct Gemini API + Storage costs per generation.

---

## Summary

- **Collections Used:** `imageBatchProcessingJobs/{tId}/{sId}`, `aiImagePromptCache`, `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** `media/menuItem/{tId}/{sId}/{entityId}/{fileId}` for item images; `system/aiImagePromptCache/...` for private reusable batch prompt-cache source objects; `media/menuBackground/...` and `media/projectImage/...` for design/project media through shared media profiles
- **Cloud Functions:** `menulistMaintenanceScheduler` only for bounded retention cleanup; generation itself uses API routes + Google Cloud Tasks for batch
- **Estimated Monthly Cost:** **HIGH** — Gemini image-generation API costs dominate

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Linked-outlet policy check | `projects/{tId}/{sId}/{projectId}`, `stores/{masterStoreId}` | Image generation/editing and batch trigger | Per request | 1-2 | Direct doc | Project read always runs for project-scoped requests; master store read runs only for linked outlets. |
| AI capacity check | `subscriptions/{subscriptionId}` | Before Gemini/provider work | Per request or worker item | 1 | Query/direct helper | Prevents provider spend when credits are unavailable. |
| Batch job status listener | `imageBatchProcessingJobs/{tId}/{sId}` | Batch generation started | Real-time (onSnapshot) | Up to 5 per update | Query: projectId + status, limit 5 | `useImageBatchJobListener` hook selects the newest visible job client-side. This keeps reads bounded and avoids a new composite index. |
| Batch worker job read | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Cloud Tasks worker | Per item task | 1 | Direct doc | Verifies job, project, requested item, terminal/idempotent state. |
| Batch retention cleanup scan | `platformSummary/storesSummary`, `imageBatchProcessingJobs/{tId}/{sId}` | `menulistMaintenanceScheduler` | Daily | Capped to 200 stores, then up to 25 job docs per scanned store | Single-field marker queries: `expiresAt`, `itemsExpiresAt`; bounded legacy status scan | Deletes expired terminal job docs and prunes expired `itemsList` without a new composite index. |
| Prompt-cache source cleanup scan | `aiImagePromptCache` | `menulistMaintenanceScheduler` | Daily | Up to 25 expired docs | Single-field query: `expiresAt` | Deletes expired prompt-cache source objects before deleting cache docs. No tenant/store media URLs are reused. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Create batch job | `imageBatchProcessingJobs/{tId}/{sId}` | User starts batch gen | Per batch request | 1 | Full job doc | Client creates the visible job before trigger call and requires a returned job ID acknowledgement before calling the batch trigger route. |
| Register requested item IDs | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Batch trigger validated | Per batch request | 1 | requestedItemIds | Admin SDK write used by worker authorization/idempotency. |
| Update batch job progress | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Per item processed | Per item | 1 | itemsList, generatedCount, status | Worker uses an Admin SDK transaction to merge the item result and compute the next generated count/status from the latest job doc; no item subcollection. |
| Mark terminal batch job retention | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Worker or owner action sets `completed`, `failed`, `cancelled`, `finished`, or `discarded` | Per terminal transition | Included in the existing status write | `itemsExpiresAt`, `expiresAt` | `itemsList` is eligible for pruning after 7 days; the job doc is eligible for deletion after 30 days. |
| Compact retained batch job | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Daily retention cleanup | Daily capped cleanup | 1 per eligible job | Deletes `itemsList`, clears `itemsExpiresAt`, records bounded cleanup counts | `finished` and `cancelled` jobs keep accepted image files safe by pruning metadata only; `completed`, `failed`, and `discarded` jobs also attempt generated-image Storage cleanup first. |
| Write prompt-cache source doc | `aiImagePromptCache/{cacheKey}` | Batch worker receives a cache-eligible provider result | Per first cache miss | 1 | `sourcePath`, image shape, `expiresAt`, `promptLength`, model/config metadata | Stores no raw prompt; key is a hash of model/config/prompt. |
| Record prompt-cache hit | `aiImagePromptCache/{cacheKey}` | Batch worker cache hit | Per hit | 1 merge update | `hitCount`, `lastHitAt`, `updatedAt` | Cache hit still copies source bytes into the requesting store's own media path. |
| Save generated image URL to project | `projects/{tId}/{sId}/{projectId}` | User accepts image | Per accepted image | 1 | files[].extractedData.data.items[].image | Merge update with new image URL after Storage upload. |
| AI accounting | AI operation/accounting collections + subscription doc | Successful provider response | Per generated/edited image request | 1-2 | operation ledger, balance | Response/provider image bytes are summarized, not stored. |

July 5 local route-log and accounting-input hardening is Firebase-cost neutral. `/api/image-generation`, `/api/image-editing`, `/api/image-generation/batch-trigger`, and the batch worker now write bounded local request, response, and transaction summaries plus validation attempted-data, task-start, and batch-start summaries instead of raw prompt/config/item payloads, generated base64 images, raw item ID arrays, raw project/file/job IDs, full provider responses, or full transaction objects. Batch-trigger prompt-block failures return `itemsWithoutPromptsCount` instead of raw item IDs or names. AI accounting writes keep the same finalizer, count/order, and credit consumption, but their operation rows use `itemSummary` and `generationConfigSummary` instead of raw item details or generation config payloads. This changes no Firestore read/write/delete count, Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 6 Batch image project/job ID boundary is Firebase-cost neutral for valid requests. `src/lib/ai/imageBatchIdBoundary.ts` now validates batch project IDs and Firestore auto-ID shaped batch job IDs before the batch trigger, Cloud Tasks worker, client image-batch DAL, or server image-batch DAL compose `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` refs. Malformed, reserved, whitespace-mutated, path-shaped, or nonnumeric batch scope fails before trigger status writes, worker job reads, capacity/accounting work, Storage upload, or job-progress writes. This adds no Firestore reads/writes/deletes for valid batch image generation, no Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| Delete expired terminal batch job | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Daily retention cleanup when `expiresAt <= now` | Daily capped cleanup | Up to 10 marker-matched docs per scanned store plus 5 legacy candidates | Hard delete | Deletes only terminal-status jobs after the 30-day retention window. |
| Delete expired prompt-cache source doc | `aiImagePromptCache/{cacheKey}` | Daily retention cleanup when `expiresAt <= now` | Daily capped cleanup | Up to 25 docs | Hard delete | Deletes the cache doc only after its private source object is deleted or already missing; source paths must stay under `system/aiImagePromptCache/`. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload accepted single image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | User accepts generated image | Profile-bounded | Shared `uploadFile()` media profile path. Public-read image URL is saved only after owner acceptance. |
| Upload batch worker image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | Worker generates item image | Profile-prepared WebP: max 1200px, 500KB target | Admin SDK upload prepares provider bytes through `prepareMediaImageAdmin()` before Storage save and records original/prepared size metadata; no browser session required. |
| Upload prompt-cache source image | `system/aiImagePromptCache/v{version}/{cacheKey}.{ext}` | Batch worker cache-eligible first generation | Profile-prepared WebP: max 1200px, 500KB target | Private reusable source object. Cache hits copy bytes into the requesting store's own `media/menuItem/{tId}/{sId}/...` path instead of reusing a tenant URL. |
| Delete expired prompt-cache source image | `system/aiImagePromptCache/v{version}/{cacheKey}.{ext}` | Daily prompt-cache cleanup | Up to 25 expired sources per run | Scheduler deletes only paths that start with `system/aiImagePromptCache/`; store-owned accepted media is untouched. |
| Delete abandoned batch worker image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | Daily retention cleanup for old `completed`, `failed`, or `discarded` jobs | Capped by eligible jobs and generated URLs | Only URLs in the current tenant/store `media/menuItem/{tId}/{sId}/` prefix are deleted. `finished` and `cancelled` jobs skip Storage deletion to avoid removing owner-accepted project images. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `menulistMaintenanceScheduler` | Scheduled Firebase Function | Every 2 minutes wrapper; `image_batch_job_retention_cleanup` runs daily at 04:55 UTC and `ai_image_prompt_cache_cleanup` runs daily at 04:57 UTC | Capped retention passes | 1GiB shared scheduler | Reuses the consolidated maintenance scheduler with per-task cadence and lease. No standalone scheduled Function. |

## External Services

| Service | Trigger | Cost | Notes |
|---------|---------|------|-------|
| Gemini 2.5 Flash Image | Per generation request | ~$0.039/image estimate | Primary and only active image generation model |
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
- **Capacity before provider work**: Single and worker routes build deterministic prompts first, then check AI capacity using the actual prompt/image quantity before calling Gemini.
- **Batch preflight capacity check**: Batch trigger estimates deterministic prompt/image quantity before enqueuing tasks, so multi-prompt batches are blocked before Cloud Tasks are created when capacity is insufficient.
- **Batch via Cloud Tasks**: Items are queued independently; each worker validates job/project/item state before provider work.
- **Batch diagnostics bounded**: Batch trigger, Cloud Tasks enqueue helper, worker failure paths, client listener, and owner result-action failures log stable failure codes, bounded project/job/item/task/count metadata, and source error name/code/status only. Batch-trigger task-start logs store generation config shape and item counts only, and prompt-block responses return counts only. Raw Cloud Tasks/provider/browser exceptions, raw item/job/project identifiers, raw item ID arrays, and raw prompt/config payloads are not written into runtime diagnostics or local batch-trigger logs.
- **Single-image/edit debug cleanup**: `/api/image-generation` and `/api/image-editing` no longer emit redundant normal-path debug breadcrumbs for prompt counts, transaction IDs, provider start/finish counts, or generated edit-prompt length. This is cost-neutral and adds no Firestore reads/writes/deletes, Storage operations, provider calls, AI accounting writes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner settings, Firebase deploy requirement, or Vercel deploy action.
- **Batch worker debug cleanup**: The worker no longer emits redundant normal-path debug breadcrumbs for fetched job data, uploaded images, transaction IDs, capacity balance, or batch job updates. This is cost-neutral and adds no Firestore reads/writes/deletes, Storage operations, provider calls, AI accounting writes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner settings, Firebase deploy requirement, or Vercel deploy action.
- **Preference diagnostics bounded and browser-local**: Image-generation preference save/load/clear failures log stable `image_generation_preferences_*_failed` diagnostics with tenant/store/storage-key presence-length metadata, preference counts, serialized/stored payload presence-length metadata, and source error metadata only.
- **Bounded prompt/upload concurrency**: Multi-prompt image generation and worker Storage uploads run with small concurrency caps instead of unbounded parallelism.
- **Generated-image media preparation**: Accepted browser generated images use the shared `prepareMediaImage()` upload path, and batch worker images use `prepareMediaImageAdmin()` before Admin SDK Storage save.
- **Worker idempotency guard**: Replayed item tasks skip when an item already has generated images.
- **Batch job retention cleanup**: Terminal jobs receive `itemsExpiresAt` and `expiresAt`; the daily maintenance scheduler prunes heavy `itemsList` payloads after 7 days and deletes terminal job docs after 30 days.
- **Batch prompt-cache source cleanup**: Cache-eligible batch images write private source objects under `system/aiImagePromptCache/` with an `aiImagePromptCache.expiresAt` marker. `ai_image_prompt_cache_cleanup` deletes expired source objects and docs in a bounded daily pass.
- **Payload summaries**: Provider responses and reference-image data are summarized in logs/accounting instead of storing image bytes.
- **Reference-image response cap**: Persisted reference-image URLs are read through the app-server bounded response helper after Storage path, DNS validation, and manual redirect handling, so redirected targets, oversized headers, or oversized streams are rejected before provider upload.
- **User review before save**: Single generated images are returned as base64 previews and uploaded to Storage only when the owner accepts them.

### Potential Optimizations
- **Single-image draft cache**: Remains intentionally off until there is a server-owned draft cleanup path; the current single-image route returns base64 previews and performs no Storage write until owner acceptance.
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
| `/api/image-generation/batch-generation` | POST | 2R + Storage uploads + 2-3W on success | Task secret + `BATCH_IMAGE_WORKER` limiter | Reads job + prompt-count capacity, uploads generated images via Admin SDK with bounded concurrency, writes accounting and transactional progress. |
| `/api/image-editing` | POST | 2-3R + 1-2W on success | Yes (5/min) | Project/outlet policy + AI capacity before provider; accounting write after success. Returns base64 preview. |

Reference-image fetch hardening is behavior-neutral for Firebase usage. Persisted reference images for single generation, batch generation, and image editing must already be in the configured MenuList Firebase Storage bucket and under `media/menuItem/{tId}/{sId}/` or legacy `projects/itemImages/{tId}/{sId}/`; the app server also validates the public DNS target before reading bytes for Gemini and uses manual redirect handling for the final fetch. This adds no Firestore reads/writes/deletes, no Storage writes/deletes, no Cloud Function logic, no rules/indexes/schema/tenant-shape changes, no cache invalidations, and no owner-facing settings. Valid data URL previews and valid scoped item-image download URLs remain supported.

Batch trigger, worker, client listener, owner result-action diagnostic hardening, and owner batch-job acknowledgement hardening are behavior-neutral for Firebase usage. They add no Firestore reads/writes/deletes beyond existing batch job registration/progress writes, owner accept/discard/cancel/retry writes, failed-start marking, and the existing bounded `useImageBatchJobListener` snapshot query; no Storage operations beyond existing worker uploads and existing owner accept/discard cleanup paths; no Firebase Auth operation changes; no Cloud Function logic changes; no extra Cloud Function calls; no indexes; no rules; no cache invalidations; no schema/tenant-shape changes; and no owner-facing settings. Cloud Tasks client initialization is lazy, enqueue/worker failures are logged with bounded metadata only, listener setup/snapshot/debug diagnostics log project/tenant/store/job presence-length metadata only, owner result-action failures log fixed `image_batch_result_*` codes with bounded project/job/count metadata, and owner UI state advances only after matching job/status acknowledgements. Batch image worker rate-limit boundary hardening is also Firebase-neutral for valid requests: the `BATCH_IMAGE_WORKER` limiter runs after worker secret/header admission, bounded request validation, and project/job scope normalization but before job reads, provider calls, Storage writes, AI accounting, or job-progress writes. The limiter key uses hashed tenant/store scope and a generous 600-per-minute per-store ceiling, so valid Cloud Tasks bursts keep the same Firestore/Storage/provider behavior while retry storms or worker-secret abuse are bounded before expensive work.

Batch image result stored-error display boundary hardening is Firebase-neutral. Failed batch result rendering now ignores stored `imageBatchProcessingJobs.error` / `activeJobData.error` text and uses fixed owner recovery copy from source. This adds no Firestore reads/writes/deletes, Storage operations, Auth operations, Cloud Function logic, provider calls, route calls, cache invalidations, rules, indexes, schema changes, tenant-shape changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

Image generation preference diagnostics are browser-local and Firebase-neutral. `src/lib/imageGenPreferences.ts` stores visual defaults in localStorage under `imgGenPrefs_{tId}_{sId}` and logs bounded save/load/clear failure diagnostics when browser storage is unavailable, full, malformed, or blocked. This adds no Firestore reads/writes/deletes, no Storage operations, no Firebase Auth operations, no Cloud Function logic, no provider calls, no indexes, no rules, no cache invalidations, no schema/tenant-shape changes, no owner-facing settings, and no Firebase deploy requirement.

July 1 retention hardening is intentionally not behavior-neutral for Firebase cleanup: terminal batch status writes now add `itemsExpiresAt` and `expiresAt`, and `menulistMaintenanceScheduler` runs `image_batch_job_retention_cleanup` inside the existing leased scheduler. It uses simple per-store marker queries, prunes `itemsList` after 7 days, deletes terminal job docs after 30 days, and attempts Storage deletion only for old `completed`, `failed`, and `discarded` generated-image jobs whose URLs parse to the same tenant/store `media/menuItem/{tId}/{sId}/` prefix. Prompt-cache source retention uses the same scheduler through `ai_image_prompt_cache_cleanup`, which scans up to 25 expired `aiImagePromptCache` docs per run, deletes only source objects under `system/aiImagePromptCache/`, and then deletes the cache docs. No new Firestore index, rule, cache invalidation, owner-facing setting, API route, or standalone scheduled Function is introduced.

July 1 generated-image media preparation changes the batch worker Storage bytes, not the Firestore contract: worker uploads now decode provider data URLs on the app server, apply the existing `menuItem` media profile through `prepareMediaImageAdmin()` (`image/webp`, max 1200px, 500KB target, profile aspect ratio), and save the prepared buffer with original/prepared size metadata. This adds no Firestore reads/writes/deletes, no Storage deletes, no Cloud Function logic, no rules/indexes, no cache invalidations, no owner-facing setting, and no standalone job; production effect waits for the app/Vercel deployment because the changed code is in the Next API/storage helper path.

Image editing prompt-helper diagnostics are bounded only. Missing business type, missing feature, and business-specific prompt failures record business/feature presence and length metadata plus small counts/booleans and source error metadata only. They do not add Firestore reads/writes, Storage operations, provider calls, indexes, cache invalidations, or owner-facing settings.

June 30 image-editing prompt-input normalization is cost-neutral. The active prompt router now strips control/template characters, normalizes whitespace, and applies existing schema-aligned caps to owner prompt text and item name/category/description placeholders before provider prompt construction. `/api/image-editing` also rejects missing generated prompts before Gemini work. This changes no Firestore read/write/delete count, Storage operations beyond existing valid scoped image reads, Cloud Function calls, provider calls beyond existing valid edit requests, cache invalidations, rules, indexes, project schema, owner settings, Firebase deploy requirement, or Vercel deploy action.
