# AI Image Generation — Firebase Cost Tracking

**Feature:** Menu Image Generation & Editing
**Status:** Source/emulator hardened; QA rules and scheduler deployment blocked by IAM
**Last Updated:** July 16, 2026
**Priority:** HIGH — Most expensive AI feature. Direct Gemini API + Storage costs per generation.

---

## Summary

- **Collections Used:** `imageBatchProcessingJobs/{tId}/{sId}`, `aiImagePromptCache`, `projects/{tId}/{sId}` (projectsData)
- **Storage Buckets:** `media/menuItem/{tId}/{sId}/{entityId}/{fileId}` for item images; `system/aiImagePromptCache/...` for private reusable batch prompt-cache source objects; `media/menuBackground/...` and `media/projectImage/...` for design/project media through shared media profiles
- **Cloud Functions:** `menulistMaintenanceScheduler` prunes bounded job metadata; generation itself uses API routes + Google Cloud Tasks for batch. Public generated-media deletion is intentionally disabled without global exclusive-reference proof.
- **Estimated Monthly Cost:** **HIGH** — Gemini image-generation API costs dominate

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Linked-outlet policy check | `projects/{tId}/{sId}/{projectId}`, `stores/{masterStoreId}` | Image generation/editing and batch trigger | Per request | 1-2 | Direct doc | Project read always runs for project-scoped requests; master store read runs only for linked outlets. |
| AI capacity check | `subscriptions/{subscriptionId}` | Before Gemini/provider work | Per request or worker item | 1 | Query/direct helper | Prevents provider spend when credits are unavailable. |
| Batch job status listener | `imageBatchProcessingJobs/{tId}/{sId}` | Batch generation started | Real-time (`onSnapshot`) | Up to 5 current rows; up to 5 only on legacy fallback | Current `projectJobKey` range/order query, limit 5; legacy project/status query, limit 5 | The listener validates exact active tenant/store/project, projects allow-listed owner DTOs, then selects the newest owner-visible row. This keeps an older active cross-tab job visible when a newer overlapping job is already finished/discarded/cancelled. The legacy query is subscribed only when the current-key query is empty. |
| Batch worker job read | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Cloud Tasks worker | Per item task | 1 | Direct doc | Verifies job, project, requested item, terminal/idempotent state. |
| Batch retention cleanup scan | `platformSummary/storesSummary`, `imageBatchProcessingJobs/{tId}/{sId}` | `menulistMaintenanceScheduler` | Daily | One summary read, then a rotating page capped at 200 active stores and up to 25 job docs per scanned store | Single-field marker queries: `expiresAt`, `itemsExpiresAt`; bounded legacy status scan | Sorted UTC-day page rotation covers stores beyond the first 200 without another cursor document. Deletes expired terminal jobs and prunes expired `itemsList`. |
| Prompt-cache source cleanup scan | `aiImagePromptCache` | `menulistMaintenanceScheduler` | Hourly | Up to 26 expired docs returned; at most 25 processed | Single-field ordered query: `expiresAt` | Oldest-first cleanup deletes expired private source objects before conditionally deleting cache docs and records whether backlog remains. No tenant/store media URLs are reused. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Create batch job | `imageBatchProcessingJobs/{tId}/{sId}` | User starts batch gen | Per batch request | 1 | Full job doc | Client creates the visible job before trigger call and requires a returned job ID acknowledgement before calling the batch trigger route. |
| Register requested item IDs | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Batch trigger validated | Per batch request | 1 | requestedItemIds | Admin SDK write used by worker authorization/idempotency. |
| Claim/stage/update batch item | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Per item delivery | Usually 3 transaction writes | 1 document each | itemExecutions, staged result/accounting/Storage paths, itemsList, generatedCount, status | One UUID lease admits a delivery; deterministic operation/media IDs make retries safe. Each transaction replaces the complete top-level execution map so omitted transient fields are deleted rather than recursively retained. Failure settlement reports transaction-current staged-media retention, so route-local cleanup cannot delete a staged result after acknowledgement loss. Staging plus final append keeps charged output recoverable without an item subcollection. |
| Resolve owner batch outcome | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Owner accepts, discards, or cancels | Per owner action | Normal: 1 transaction read + 1 write. Exact lost-ack retry: 1 transaction read + 0 writes. | `status`, `selectedImagesPersisted`, bounded `statusHistory`, retention fields | Exact status plus exact persisted-selection outcome is acknowledgement-idempotent. Mismatched terminal retries remain rejected and cannot rewrite history. |
| Mark terminal batch job retention | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Worker or owner action sets `completed`, `failed`, `cancelled`, `finished`, or `discarded` | Per terminal transition | Included in the existing status write | `itemsExpiresAt`, `expiresAt` | `itemsList` is eligible for pruning after 7 days; the job doc is eligible for deletion after 30 days. |
| Compact retained batch job | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Daily retention cleanup | Daily capped cleanup | 1 job update per eligible unpruned job; no project-reference read and no public-media delete | Deletes `itemsList`, clears `itemsExpiresAt`, records zero cleanup counts | A job row and one project cannot prove a generated URL is absent from duplicates or outlet projections, so cleanup remains metadata-only. |
| Write prompt-cache source doc | `aiImagePromptCache/{cacheKey}` | Batch worker receives a cache-eligible provider result | Per first cache miss | 1 | `sourcePath`, image shape, `expiresAt`, `promptLength`, model/config metadata | Stores no raw prompt; key is a hash of model/config/prompt. |
| Record prompt-cache hit | `aiImagePromptCache/{cacheKey}` | Batch worker cache hit | Per hit | 1 merge update | `hitCount`, `lastHitAt`, `updatedAt` | Cache hit still copies source bytes into the requesting store's own media path. |
| Save reviewed batch image selections to standalone project | `projects/{tId}/{sId}/{projectId}` | Owner accepts one or more generated batch images | Per accept action | 1 transaction read + 1 transaction write | `files[].extractedData.data.items[].images[]` | One bounded item/image append operation reads current project truth, deduplicates by URL, preserves concurrent fields, and writes the files projection once. It is not one write per image. |
| Save reviewed batch image selections to linked outlet | stores, tenant, outlet project, master project | Owner accepts one or more generated batch images | Per accept action | 4 admission reads + 2 transaction reads + 1 project write | Local item images or `overrides.items.{itemId}.images` | Reuses the guarded outlet-save route. The transaction enforces current master/outlet identity and image-override policy. No item subcollection or per-image write is added. |
| Reserve paid image capacity | `menulistAiOperations/{tId}/{sId}/{operationId}` + subscription doc | Admitted paid request before provider work | Per generated/edited image request | 2 transaction reads + 2 writes | hidden reservation shell, debited balance | Exact positive integer units only; the operation ID is the idempotency key. |
| Settle paid image capacity | Same operation row | Usable provider result | Per successful request | 1 transaction read + 1 write | consumed operation ledger row | Response/provider image bytes are summarized, not stored. |
| Refund unsettled image capacity | Same operation row + subscription doc | Terminal provider/route failure | Per failed reservation, idempotent | 2 transaction reads + 2 writes | refunded shell, restored exact charged buckets | Durable batch reservations are retained only while deterministic staged work remains retryable. |

Reservation/debit unit values are safe integers. The daily shared maintenance task rechecks the current deadline transactionally, counts malformed rows without aborting later reservation recovery, and isolates a failed store cleanup from later stores. This preserves exact refund behavior without adding a collection, query fanout, or standalone scheduler.

July 5 local route-log and accounting-input hardening was Firebase-cost neutral when introduced. `/api/image-generation`, `/api/image-editing`, `/api/image-generation/batch-trigger`, and the batch worker write bounded local request, response, and transaction summaries plus validation attempted-data, task-start, and batch-start summaries instead of raw prompt/config/item payloads, generated base64 images, raw item ID arrays, raw project/file/job IDs, full provider responses, or full transaction objects. Batch-trigger prompt-block failures return `itemsWithoutPromptsCount` instead of raw item IDs or names. Operation rows use `itemSummary` and `generationConfigSummary` instead of raw item details or generation config payloads. The July 13 reservation state machine supersedes the former same-count/order statement and its current read/write cost is recorded in the table above; Storage, provider, cache, rule, index, owner-setting, and Vercel boundaries remain unchanged.

July 6 Batch image project/job ID boundary is Firebase-cost neutral for valid requests. `src/lib/ai/imageBatchIdBoundary.ts` now validates batch project IDs and Firestore auto-ID shaped batch job IDs before the batch trigger, Cloud Tasks worker, client image-batch DAL, or server image-batch DAL compose `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` refs. Malformed, reserved, whitespace-mutated, path-shaped, or nonnumeric batch scope fails before trigger status writes, worker job reads, capacity/accounting work, Storage upload, or job-progress writes. This adds no Firestore reads/writes/deletes for valid batch image generation, no Storage operations, provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 13 reviewed-selection persistence removes the stale full-project merge without adding Firebase objects. Standalone acceptance costs one current-project transaction read and one merge write regardless of how many selected images are included within the bounded request. Linked-outlet acceptance retains the route's four current store/tenant admission reads, then performs one transaction read for the outlet project, one for the master project, and one outlet-project merge write. Repeated URLs are idempotent, malformed scope or a Firebase URL from a bucket other than the configured app/Admin bucket fails before persistence, image limits fail before commit, and cache/screen/assistant invalidations occur only after commit. The generated Storage objects already exist; acceptance performs no Storage upload or copy. Exact-bucket admission is local validation and adds no Firebase operation. No new collection, subcollection, summary document, index, rules change, Function, or scheduled task is introduced.

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| Delete expired terminal batch job | `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` | Daily retention cleanup when `expiresAt <= now` | Daily capped cleanup | Up to 10 marker-matched docs per scanned store plus 5 legacy candidates | Hard delete | Deletes only terminal-status jobs after the 30-day retention window. |
| Delete expired prompt-cache source doc | `aiImagePromptCache/{cacheKey}` | Hourly retention cleanup when `expiresAt <= now` | Hourly capped cleanup | Up to 25 docs | Hard delete | Deletes the cache doc only after its private source object is deleted or already missing. A transient source-delete failure retains the row for the next hourly retry. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload accepted single image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | User accepts generated image | Profile-bounded | Shared `uploadFile()` media profile path. Public-read image URL is saved only after owner acceptance. |
| Upload batch worker image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | Worker generates item image | Profile-prepared WebP: max 1200px, 500KB target | Admin SDK upload prepares provider bytes through `prepareMediaImageAdmin()` before Storage save and records original/prepared size metadata; no browser session required. |
| Upload prompt-cache source image | `system/aiImagePromptCache/v{version}/{cacheKey}/{sourceVersion}.{ext}` | Batch worker cache-eligible first generation | Profile-prepared WebP: max 1200px, 500KB target | Private immutable reusable source object. Cache hits copy bytes into the requesting store's own `media/menuItem/{tId}/{sId}/...` path instead of reusing a tenant URL. |
| Delete expired prompt-cache source image | `system/aiImagePromptCache/v{version}/{cacheKey}/{sourceVersion}.{ext}` | Hourly prompt-cache cleanup | Up to 25 expired sources per run | Scheduler deletes only the row's exact cache-key source path. A transient delete failure retains the cache row for retry; store-owned accepted media is untouched. |
| Retain terminal batch worker image | `media/menuItem/{tId}/{sId}/{entityId}/{mediaId}_{variant}.{ext}` | Owner discard/cancel or daily job retention | No delete | Public generated media can be shared by acknowledgement retries, duplicated menus, or outlet projection. Browser and scheduler deletion remain disabled until a global reference ledger or equivalent exclusive-reference proof exists. |

---

## Cloud Functions

| Function | Trigger | Frequency | Duration | Memory | Notes |
|----------|---------|-----------|----------|--------|-------|
| `menulistMaintenanceScheduler` | Scheduled Firebase Function | Every 2 minutes wrapper; `image_batch_job_retention_cleanup` runs daily at 04:55 UTC and `ai_image_prompt_cache_cleanup` runs once per 60-minute bucket | Capped retention passes | 1GiB shared scheduler | Reuses the consolidated maintenance scheduler with per-task cadence and lease. No standalone scheduled Function. |

## External Services

| Service | Trigger | Cost | Notes |
|---------|---------|------|-------|
| Gemini 2.5 Flash Image | Per generation request | ~$0.039/image estimate | Primary and only active image generation model |
| Google Cloud Tasks | Batch generation | $0.40/million | Queues individual item tasks for batch processing |

---

## Security Rules Impact

- `imageBatchProcessingJobs`: Browser reads require exact tenant/store membership. Creates and terminal owner actions additionally require owner/manager authority and bounded shapes/transitions. Results, counts, requested-item registration, execution leases and accounting fields are Admin-only after task secret and project/job/item validation. Missing `storeIds` never means access to every store.
- Storage upload: browser uploads require auth + tenant/store path; worker uploads use Admin SDK only after authenticated Cloud Task secret validation.
- Rate limiting: `checkExpensiveAILimit()` — 5 requests per minute per user.
- Owner API routes use `withAuth()`; the worker route is Cloud Tasks-only and requires `project-id` plus `x-menulist-task-secret`.

---

## Cost Optimization Notes

### Current Optimizations
- **Rate limiting**: 5/min prevents runaway costs
- **Capacity before provider work**: Single and worker routes build deterministic prompts first, then check AI capacity using the actual prompt/image quantity before calling Gemini.
- **Transactional paid reservation**: Single generation/editing and non-cache batch workers reserve exact integer units before Gemini. Settlement promotes the same hidden operation shell; non-retry failure restores the exact charged buckets idempotently.
- **Batch preflight capacity check**: Batch trigger estimates deterministic prompt/image quantity before enqueuing tasks, so multi-prompt batches are blocked before Cloud Tasks are created when capacity is insufficient.
- **Batch via Cloud Tasks**: Items are queued independently; each worker validates job/project/item state before provider work.
- **Batch diagnostics bounded**: Batch trigger, Cloud Tasks enqueue helper, worker failure paths, client listener, and owner result-action failures log stable failure codes, bounded project/job/item/task/count metadata, and source error name/code/status only. Batch-trigger task-start logs store generation config shape and item counts only, and prompt-block responses return counts only. Raw Cloud Tasks/provider/browser exceptions, raw item/job/project identifiers, raw item ID arrays, and raw prompt/config payloads are not written into runtime diagnostics or local batch-trigger logs.
- **Single-image/edit debug cleanup**: `/api/image-generation` and `/api/image-editing` no longer emit redundant normal-path debug breadcrumbs for prompt counts, transaction IDs, provider start/finish counts, or generated edit-prompt length. This is cost-neutral and adds no Firestore reads/writes/deletes, Storage operations, provider calls, AI accounting writes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner settings, Firebase deploy requirement, or Vercel deploy action.
- **Batch worker debug cleanup**: The worker no longer emits redundant normal-path debug breadcrumbs for fetched job data, uploaded images, transaction IDs, capacity balance, or batch job updates. This is cost-neutral and adds no Firestore reads/writes/deletes, Storage operations, provider calls, AI accounting writes, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner settings, Firebase deploy requirement, or Vercel deploy action.
- **Preference diagnostics bounded and browser-local**: Image-generation preference save/load/clear failures log stable `image_generation_preferences_*_failed` diagnostics with tenant/store/storage-key presence-length metadata, preference counts, serialized/stored payload presence-length metadata, and source error metadata only.
- **Bounded prompt/upload concurrency**: Multi-prompt image generation and worker Storage uploads run with small concurrency caps instead of unbounded parallelism.
- **Generated-image media preparation**: Accepted browser generated images use the shared `prepareMediaImage()` upload path, and batch worker images use `prepareMediaImageAdmin()` before Admin SDK Storage save.
- **Worker idempotency guard**: Replayed item tasks skip when an item already has generated images.
- **Durable worker recovery**: Batch items use deterministic operation IDs. Staged output retains its reservation only while finalization remains retryable; terminal, cancelled, and max-attempt acknowledgements recover an unsettled reservation. A max-attempt lease expiry writes the failed execution/job state instead of leaving `processing` truth behind.
- **Owner outcome convergence**: A lost acknowledgement can repeat the owner action safely. Exact stored/requested terminal status and `selectedImagesPersisted` equality returns after the transaction read with no second write or duplicate history row; mismatched retries fail closed.
- **Batch job retention cleanup**: Terminal jobs receive `itemsExpiresAt` and `expiresAt`; the daily maintenance scheduler prunes heavy `itemsList` payloads after 7 days and deletes terminal job docs after 30 days.
- **Batch prompt-cache source cleanup**: Cache-eligible batch images write version-2 immutable private source objects under `system/aiImagePromptCache/v2/{cacheKey}/{sourceVersion}.{ext}` with an `aiImagePromptCache.expiresAt` marker. Writers transactionally replace the active row and may remove only the transaction-previous source. `ai_image_prompt_cache_cleanup` deletes the claimed expired source, then transactionally deletes the row only if current `sourcePath` and `expiresAt` still match, so a concurrent refresh cannot lose its new source or document.
- **Payload summaries**: Provider responses and reference-image data are summarized in logs/accounting instead of storing image bytes.
- **Reference-image response cap**: Persisted reference-image URLs are read through the app-server bounded response helper after Storage path, DNS validation, and manual redirect handling, so redirected targets, oversized headers, or oversized streams are rejected before provider upload.
- **User review before save**: Single generated images are returned as base64 previews and uploaded to Storage only when the owner accepts them.

### Potential Optimizations
- **Single-image draft cache**: Remains intentionally off until there is a server-owned draft cleanup path; the current single-image route returns base64 previews and performs no Storage write until owner acceptance.
- **Batch discount**: If Gemini offers batch pricing, migrate from individual calls
- **Quality tiers**: Offer "quick" (lower quality, cheaper) vs "premium" generation

### Warnings: Expensive Patterns
- **Maximum 50-item batch**: Each non-cache item normally produces one provider call; actual cost follows the current model price and successful output accounting, not the historical fixed dollar example.
- **Re-generation loops**: User doesn't like result → generates again → double cost
- **Image editing**: Each edit is another Gemini call on top of generation

---

## Cost Projection Boundary

Do not reuse the retired fixed-dollar or percentage-dominance examples. They were not derived from the current provider invoice, cache-hit rate, output mix, region, Storage retention, or current Firebase/Cloud Tasks pricing. The stable source-backed projection is operational:

- one non-cache generated or edited image normally means one provider call and one successful-output accounting settlement;
- a cache-eligible batch hit avoids provider spend but still creates a store-owned media copy and a zero-unit operation row;
- a batch has at most 50 items, with bounded per-item job/accounting work;
- accepted images remain stored as project media; unreferenced terminal batch images are candidates for protected cleanup;
- currency forecasts must be rebuilt from the target environment's current provider/Firebase price sheets and observed operation counts before budgeting or publication.

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

Batch trigger, worker, client listener, owner result-action diagnostic hardening, and owner batch-job acknowledgement hardening are behavior-neutral for normal Firebase usage. They add no Firestore reads/writes/deletes beyond existing batch job registration/progress writes, owner accept/discard/cancel/retry writes, failed-start marking, and the existing bounded `useImageBatchJobListener` snapshot query; no Storage operations beyond existing worker uploads and existing owner accept/discard cleanup paths; no Firebase Auth operation changes; no Cloud Function logic changes; no extra Cloud Function calls; no indexes; no rules; no cache invalidations; no schema/tenant-shape changes; and no owner-facing settings. A repeated owner terminal action after a lost acknowledgement necessarily performs one transaction read to confirm current truth, but exact status and `selectedImagesPersisted` equality now avoids the previous failing path and performs zero additional writes. Cloud Tasks client initialization is lazy, enqueue/worker failures are logged with bounded metadata only, listener setup/snapshot/debug diagnostics log project/tenant/store/job presence-length metadata only, owner result-action failures log fixed `image_batch_result_*` codes with bounded project/job/count metadata, and owner UI state advances only after matching job/status acknowledgements. Batch image worker rate-limit boundary hardening is also Firebase-neutral for valid requests: the `BATCH_IMAGE_WORKER` limiter runs after worker secret/header admission, bounded request validation, and project/job scope normalization but before job reads, provider calls, Storage writes, AI accounting, or job-progress writes. The limiter key uses hashed tenant/store scope and a generous 600-per-minute per-store ceiling, so valid Cloud Tasks bursts keep the same Firestore/Storage/provider behavior while retry storms or worker-secret abuse are bounded before expensive work.

Batch image result stored-error display boundary hardening is Firebase-neutral. Failed batch result rendering now ignores stored `imageBatchProcessingJobs.error` / `activeJobData.error` text and uses fixed owner recovery copy from source. This adds no Firestore reads/writes/deletes, Storage operations, Auth operations, Cloud Function logic, provider calls, route calls, cache invalidations, rules, indexes, schema changes, tenant-shape changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

Image generation preference diagnostics are browser-local and Firebase-neutral. `src/lib/imageGenPreferences.ts` stores visual defaults in localStorage under `imgGenPrefs_{tId}_{sId}` and logs bounded save/load/clear failure diagnostics when browser storage is unavailable, full, malformed, or blocked. This adds no Firestore reads/writes/deletes, no Storage operations, no Firebase Auth operations, no Cloud Function logic, no provider calls, no indexes, no rules, no cache invalidations, no schema/tenant-shape changes, no owner-facing settings, and no Firebase deploy requirement.

July 1 retention hardening, updated July 15, is intentionally not behavior-neutral for Firebase cleanup: terminal batch status writes add `itemsExpiresAt` and `expiresAt`, and `menulistMaintenanceScheduler` runs `image_batch_job_retention_cleanup` inside the existing leased scheduler. It uses simple per-store marker queries, prunes `itemsList` after 7 days, deletes terminal job docs after 30 days, and treats URLs from every old terminal job as candidates. Only URLs that parse to the same tenant/store `media/menuItem/{tId}/{sId}/` prefix and are absent from the bounded transaction-current project scan can be deleted; incomplete or failed project scans retain all candidates. The daily scan sorts active store IDs and selects one deterministic UTC-day page capped at 200, giving all pages eventual coverage without adding cursor state or reads. Prompt-cache source retention uses the same scheduler through `ai_image_prompt_cache_cleanup`, which runs hourly, returns at most 26 oldest expired rows, processes at most 25, records `hasMoreExpired`, deletes only exact cache-key source paths under `system/aiImagePromptCache/`, and conditionally deletes each cache doc in a transaction after rechecking current source/expiry truth. A transient source-delete failure retains the cache row for the next hourly retry. Version-2 immutable source paths prevent a stale cleanup from deleting refreshed bytes. No new Firestore index, rule, cache invalidation, owner-facing setting, API route, or standalone scheduled Function is introduced.

July 15 bounded task creation is Firebase-neutral. The authenticated batch trigger now creates at most eight Cloud Tasks concurrently using the existing shared concurrency helper; it performs the same Firestore reads and job writes and preserves the same deterministic task IDs and partial-enqueue failure projection. Cloud Tasks dispatch/retry settings remain target infrastructure evidence under Gate 7.

### July 15, 2026 deploy evidence

`firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive` passed the Functions lint/build predeploy, then stopped before upload with Cloud Resource Manager HTTP 403: the current caller does not have permission on `menulist-qa`. The retention rotation/hourly cleanup change is therefore source-complete but not live in QA from this pass.

The current workspace `.env` and `.env.prod` provide worker URL/queue values but do not define `BATCH_IMAGE_GENERATION_WORKER_SECRET`; only the staging/production example templates name it. A non-placeholder target-environment secret, matching worker deployment, and queue/URL/project-location verification remain owner/deployment work before configured batch smoke.

July 1 generated-image media preparation changes the batch worker Storage bytes, not the Firestore contract: worker uploads now decode provider data URLs on the app server, apply the existing `menuItem` media profile through `prepareMediaImageAdmin()` (`image/webp`, max 1200px, 500KB target, profile aspect ratio), and save the prepared buffer with original/prepared size metadata. This adds no Firestore reads/writes/deletes, no Storage deletes, no Cloud Function logic, no rules/indexes, no cache invalidations, no owner-facing setting, and no standalone job; production effect waits for the app/Vercel deployment because the changed code is in the Next API/storage helper path.

Image editing prompt-helper diagnostics are bounded only. Missing business type, missing feature, and business-specific prompt failures record business/feature presence and length metadata plus small counts/booleans and source error metadata only. They do not add Firestore reads/writes, Storage operations, provider calls, indexes, cache invalidations, or owner-facing settings.

June 30 image-editing prompt-input normalization is cost-neutral. The active prompt router now strips control/template characters, normalizes whitespace, and applies existing schema-aligned caps to owner prompt text and item name/category/description placeholders before provider prompt construction. `/api/image-editing` also rejects missing generated prompts before Gemini work. This changes no Firestore read/write/delete count, Storage operations beyond existing valid scoped image reads, Cloud Function calls, provider calls beyond existing valid edit requests, cache invalidations, rules, indexes, project schema, owner settings, Firebase deploy requirement, or Vercel deploy action.
