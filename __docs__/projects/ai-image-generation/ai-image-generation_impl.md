# AI Image Generation — Implementation

**Feature:** Menu Image Generation & Editing
**Status:** Source/emulator hardened; QA Firestore-rules deployment blocked by IAM
**Last Updated:** July 13, 2026
**Audience:** Developers, Future Maintainers

---

July 6 follow-up: Batch image project/job ID boundary. `/api/image-generation/batch-trigger`, `/api/image-generation/batch-generation`, and `src/database/imageBatchProcessing/server.ts` now use `src/lib/ai/imageBatchIdBoundary.ts` before composing `imageBatchProcessingJobs/{tId}/{sId}/{jobId}` refs. Batch project IDs must remain simple Firestore document IDs with exact positive numeric tenant/store scope in the existing first/third segments, and batch job IDs must remain Firestore auto-ID shaped. Malformed, reserved, whitespace-mutated, path-shaped, or nonnumeric batch scope fails before trigger status writes, worker job reads, capacity/accounting work, Storage upload, or job-progress writes. Valid batch trigger, Cloud Tasks worker, prompt-cache, provider, accounting, and owner result flows remain unchanged.

July 13 durability/security follow-up: Each registered job/item now has a deterministic Cloud Task ID, accounting operation ID and media identity plus one transactional UUID execution lease. The worker stages exact-claim output/accounting, finalizes credits idempotently, and appends progress transactionally; execution transitions replace the complete top-level map so Firestore recursive merge cannot retain retired claim/lease/staged fields, and a charged append failure persists `requiresFinalization` instead of deleting output or exhausting the normal attempt ceiling. Persisted jobs are runtime-projected before worker use. The browser listener independently projects an exact owner DTO and requires the row's project-encoded tenant/store/project to match the active scope. Browser rules require explicit store membership and owner/manager authority, permit only bounded queued creation plus cancel/finish/discard transitions, and deny client writes to results, counts, leases and accounting state. The QA rules-only deploy is still blocked by Firebase Rules API HTTP 403.

July 13 project-selection follow-up: accepting reviewed batch images no longer clones and merges the browser's complete `project.files` snapshot. `BatchImageGenerationResultView` emits a bounded `ImageBatchProjectSelection[]`; the shared project DAL validates project/session scope plus the exact configured Firebase Storage bucket and same-store generated-media path, then appends by URL against current persisted truth. Standalone projects use a browser Firestore transaction and resolve the bucket from the active Firebase app. Linked outlets call the authenticated outlet-save operation `append_image_batch_selection`, whose Admin transaction resolves the server bucket, reads current outlet and master projects, enforces `imageOverride` for inherited items, writes local files or item overrides, and returns the complete latest outlet state. A same-path URL from another Firebase bucket is rejected before persistence. Desktop and mobile drain active/pending saves before this append so an older autosave cannot remove accepted images. Fabric/editor state is unaffected, no second image collection is introduced, and the owner action remains idempotent on repeated URLs.

July 13 credit-reservation follow-up: single generation, image editing, and non-cache batch workers now atomically reserve exact positive integer units before provider work. The existing operation document is a hidden `reserved` shell until successful accounting promotes it to `consumed`; provider or non-retry failure restores the exact charged recurring/top-up buckets once. Batch workers use the deterministic job/item operation ID, retain that reservation only while staged output remains retryable, and recover it on terminal/cancelled/max-attempt acknowledgement. An expired third-attempt execution now transactionally records the item/job failure and retention markers instead of leaving a permanent `processing` row. Prompt-cache hits remain zero-unit and do not reserve.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Contracts](#api-contracts)
4. [File Inventory](#file-inventory)
5. [Implementation Patterns](#implementation-patterns)
6. [Security Checklist](#security-checklist)
7. [Testing Guide](#testing-guide)
8. [Recommendations & Technical Debt](#recommendations--technical-debt)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI IMAGE GENERATION SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ SINGLE IMAGE GENERATION (Synchronous)                                │    │
│  │                                                                      │    │
│  │  ImageUploadModal → AiImageGenerator → generateImageViaApi          │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-generation                                         │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Gemini 2.5 Flash Image                                             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Base64 Image → Preview → Select → Upload to Storage                │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ BULK IMAGE GENERATION (Asynchronous)                                 │    │
│  │                                                                      │    │
│  │  ImageUploadModal → BatchSetupView → BatchImageGenerationView       │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  addImageBatchProcessingJob (Firestore)                             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-generation/batch-trigger                           │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Google Cloud Tasks (one task per item)                             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-generation/batch-generation (Worker)               │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  useImageBatchJobListener (Real-time Firestore updates)             │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  BatchImageGenerationResultView → Review → Upload/Discard           │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ IMAGE EDITING                                                        │    │
│  │                                                                      │    │
│  │  EditImageModal → editImageViaApi                                   │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  POST /api/image-editing                                            │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Gemini 2.5 Flash Image (with reference image)                      │    │
│  │       │                                                              │    │
│  │       ▼                                                              │    │
│  │  Preview → Select → Upload                                          │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### AI Models Used

| Model                                       | Use Case                    | Notes                       |
| ------------------------------------------- | --------------------------- | --------------------------- |
| `gemini-2.5-flash-image`                    | Primary generation, editing | Supports text prompts and reference images |

### Reference Image Fetch Guard

`src/lib/apiUtils/index.ts` is the shared app-server helper that converts owner reference images into base64 provider parts for single generation, batch generation, and image editing.

For local owner previews, `data:image/jpeg|png|webp;base64,...` inputs remain accepted under the existing 10 MB decoded-byte cap.

For persisted Firebase Storage references, the helper now fails closed unless all of these checks pass before `fetch()`:

- URL host is `firebasestorage.googleapis.com` and bucket equals `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `FIREBASE_STORAGE_BUCKET`, or the MenuList QA default.
- Decoded object path starts with `media/menuItem/{tId}/{sId}/` or the legacy `projects/itemImages/{tId}/{sId}/` prefix.
- The app-server network target validator accepts the HTTPS URL and DNS result as public, non-local, non-private, non-link-local, and non-metadata-style.
- The app-server fetch uses manual redirect handling so a Storage 3xx response is rejected instead of reading bytes from an unvalidated redirected target.

After target validation, persisted references are read through `src/lib/security/boundedResponseBody.ts`, which rejects oversized `content-length` headers and cancels response streams that cross the 10 MB reference-image cap. The scope is passed from the authenticated session for `/api/image-generation` and `/api/image-editing`, and from the validated `projectId` tenant/store tuple in the Cloud Tasks batch worker. This preserves existing valid item-image references while rejecting cross-tenant Storage objects, malformed/unsafe fetch targets, and oversized source responses before provider upload.

---

## Multi-Outlet Governance

Image generation follows the same multi-outlet governance rules as translations and descriptions:

| Store Type     | Can Generate Images For                   |
| -------------- | ----------------------------------------- |
| **Standalone** | All items (whole menu)                    |
| **Master**     | All items (whole menu)                    |
| **Outlet**     | **ONLY local-only items** (`L_I_` prefix) |

### Implementation

**Files Modified:**

| File                                                          | Change                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/components/.../ImageUploadModal.tsx:12,36-39,54,127-138` | Added governance props, filter items by `local-only` state |
| `src/components/.../editor.tsx:972-974`                       | Pass `itemStates` and `isMasterLinked` to ImageUploadModal |

**Governance Flow:**

```
Outlet opens Image Upload Modal →
  ├── ImageUploadModal receives itemStates + isMasterLinked
  ├── items useMemo filters by governance
  │   ├── inherited items → EXCLUDED (images from master)
  │   ├── overridden items → EXCLUDED (images from master)
  │   └── local-only items → INCLUDED ✓
  ├── Single image generation: Only local-only items in dropdown
  └── Batch image generation: Only local-only items available for selection
```

**Why Outlets Can't Generate Images for Inherited/Overridden Items:**

- `inherited` items: Master owns the item content, including images
- `overridden` items: Outlet only overrides price/availability, not content
- `local-only` items: Outlet owns these entirely, can generate images

---

## Database Schema

### Firestore Collection: `IMAGE_BATCH_PROCESSING_JOBS`

**Path:** `IMAGE_BATCH_PROCESSING_JOBS/{tenantId}/{storeId}/{jobId}`

```typescript
interface BatchImageGenerationJobType {
  id?: string;
  status:
    | "queued"
    | "processing"
    | "completed"
    | "failed"
    | "cancelled"
    | "finished"
    | "discarded";
  totalImages: number;
  generatedCount: number;
  generationConfig: {
    prompt?: string;
    referanceImage?: UserUploadedFileType | null;
    stylesCategory?: string;
    styles?: string[];
    aspectRatio?: string;
    environments?: string[];
    lighting?: string[];
    colors?: string[];
    moods?: string[];
    compositions?: string[];
    backgroundColor?: string;
    transparentBg?: boolean;
    negativePrompt?: string;
    foregroundColor?: string;
    selectedImageTypes?: string[];
    isMultiMode?: boolean;
    agreeToTerms?: boolean;
  };
  projectId: string;
  requestedItemIds?: string[];
  itemsList: Array<{
    id: string;
    name: string;
    images: UserUploadedFileType[];
  }>;
  statusHistory: Array<{
    status: string;
    reason?: string;
    createdOn: string | number | Date;
  }>;
  itemsExpiresAt?: string | number | Date;
  expiresAt?: string | number | Date;
  itemsPrunedAt?: string | number | Date;
  itemsPrunedReason?: string;
  generatedImageUrlCountBeforePrune?: number;
  error?: string;
  modifiedOn?: string | number | Date;
  createdOn?: string | number | Date;
}
```

### Status Lifecycle

```
┌─────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐
│ QUEUED  │ → │ PROCESSING │ → │ COMPLETED │ → │ FINISHED │
└─────────┘    └────────────┘    └───────────┘    └──────────┘
     │              │                  │
     │              │                  ▼
     │              │           ┌───────────┐
     │              │           │ DISCARDED │
     │              │           └───────────┘
     │              │
     ▼              ▼
┌───────────┐  ┌────────┐
│ CANCELLED │  │ FAILED │
└───────────┘  └────────┘
```

Terminal status writes set retention markers on the job document. `itemsExpiresAt` is seven days after the terminal transition and is used by `menulistMaintenanceScheduler` to prune the heavy `itemsList` payload; `expiresAt` is 30 days after the terminal transition and is used to delete the terminal job document. For old `completed`, `failed`, and `discarded` jobs, the scheduler attempts same-tenant/store generated-image Storage cleanup before pruning item URLs. `finished` and `cancelled` jobs skip Storage deletion because those statuses can include owner-accepted project images.

---

## API Contracts

### 1. Single Image Generation

**Endpoint:** `POST /api/image-generation`

The route rejects request bodies above 16MB after auth/Safe Mode/rate limit and before schema validation, AI capacity checks, or provider work. This preserves the existing single-reference-image data URL support while preventing unbounded JSON parsing.

**Request Schema (Zod):**

```typescript
const ImageGenerationRequestSchema = z.object({
  generationConfig: z.object({
    prompt: z.string().optional(),
    referanceImage: UserUploadedFileSchema.nullable().optional(),
    stylesCategory: z.string().optional(),
    styles: z.array(z.string()).optional(),
    aspectRatio: z.string().optional(),
    environments: z.array(z.string()).optional(),
    lighting: z.array(z.string()).optional(),
    colors: z.array(z.string()).optional(),
    moods: z.array(z.string()).optional(),
    compositions: z.array(z.string()).optional(),
    backgroundColor: z.string().optional(),
    transparentBg: z.boolean().optional(),
    negativePrompt: z.string().optional(),
    foregroundColor: z.string().optional(),
    selectedImageTypes: z.array(z.string()).optional(),
    isMultiMode: z.boolean().optional(),
  }),
  projectId: z.string(),
  fileId: z.string().optional(),
  businessType: z.string(),
  itemDetails: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    attributes: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
});
```

**Response:**

```typescript
{
  data: Array<{
    base64: string; // Base64-encoded image
    mimeType: string; // e.g., "image/png"
  }>;
  message: string;
  transaction: {
    totalCharge: number;
    totalCredits: number;
    processingTime: number;
    transactionId: string;
  }
}
```

### 2. Batch Trigger

**Endpoint:** `POST /api/image-generation/batch-trigger`

The batch trigger route rejects request bodies above 16MB after auth/Safe Mode/batch rate limit and before schema validation, linked-outlet policy checks, capacity preflight, job updates, or Cloud Task fanout.

Batch trigger failure responses, job status reasons, per-task enqueue failure summaries, and runtime diagnostics use owner-safe text, stable local failure codes, source error name/code/status metadata, and bounded project/job/item presence/length metadata only. Prompt-block failures return `itemsWithoutPromptsCount` instead of raw item IDs or names, and task-start local logs record generation config shape plus item counts instead of sanitized config payloads or raw item ID arrays. Raw Cloud Tasks/provider exceptions, task names, project IDs, item IDs, item names, and prompt/config payloads are not returned to the browser or written into batch-trigger diagnostics/logs.

**Request:**

```typescript
{
  generationConfig: GenerateImageViaApiPayloadGenerationConfiType;
  projectId: string;
  businessType: string;
  itemsList: Array<{
    id: string;
    name: string;
    description?: string;
    attributes?: string[];
    category?: string;
  }>;
  jobId: string;
}
```

**Response:**

```typescript
{
  data: {
    jobId: string;
  }
  message: string;
}
```

### 3. Batch Generation Worker

**Endpoint:** `POST /api/image-generation/batch-generation`

Called by Google Cloud Tasks for each item. Same request structure as batch trigger but with single `itemDetails`.

Worker requirements:

- `project-id` header must match `FIREBASE_PROJECT_ID`.
- `x-menulist-task-secret` must match `BATCH_IMAGE_GENERATION_WORKER_SECRET`.
- Worker request bodies are capped at 16MB after the secret/header check and before job reads or provider work.
- Payload is validated with `BatchImageGenerationWorkerRequestSchema`.
- Batch image worker rate-limit boundary: after secret/header admission, bounded body parsing, worker schema validation, and project/job scope normalization, the worker applies the shared `BATCH_IMAGE_WORKER` limiter with a hashed tenant/store key before reading the batch job, checking capacity, calling the provider, uploading Storage objects, writing AI accounting, or updating job progress. The 600-per-minute per-store ceiling preserves normal Cloud Tasks bursts from valid 50-item batches and retries while bounding retry storms or worker-secret abuse.
- Worker reads the batch job through Admin SDK, verifies project/job match and requested item ID, then transactionally claims one lease; active duplicates retry later and completed/failed/terminal deliveries acknowledge without provider work.
- Worker builds deterministic prompts before provider work and checks AI capacity using the prompt/image quantity.
- Shared `runImageGenerationPrompts()` executes one prompt directly and caps multi-prompt execution at a small concurrency limit.
- Worker prepares generated item images through `uploadBase64MediaImageAdmin()` / `prepareMediaImageAdmin()` before uploading to public `media/menuItem/{tId}/{sId}/...` paths without relying on an owner browser session.
- Worker uploads generated images with bounded concurrency and deterministic media IDs, stages the exact-claim result, completes deterministic AI accounting, and calls `appendImageBatchItemResultAdmin()` so generated count/status are computed transactionally from the latest job state.
- Provider responses and reference-image data are summarized in operation logs/accounting; image bytes are not stored in Firestore logs.
- Worker catch paths persist generic item failure text in the batch job, return generic task success/failure text to Cloud Tasks, and log stable worker failure codes with bounded project/job/item metadata plus source error name/code/status only.
- The client listener keeps the existing bounded Firestore query and logs setup/snapshot failures and normal debug breadcrumbs through shared hook diagnostics with project/tenant/store/job presence-length metadata only.
- The batch results view keeps the existing accept, discard, cancel, and retry flows, but action failures log fixed `image_batch_result_*` codes with bounded project/job/count/status metadata instead of raw browser exception objects.
- Batch job create/update writes use explicit acknowledgement guards in `src/database/imageBatchProcessing/index.tsx`. Batch start requires a persisted job ID before triggering work; cancel, upload/finish, discard, retry, and failed-start marking require a matching job/status acknowledgement before owner success copy or completion callbacks advance.

### 4. Image Editing

**Endpoint:** `POST /api/image-editing`

The route rejects request bodies above 64MB after auth/Safe Mode/rate limit and before schema validation, capacity checks, or provider work. The larger cap preserves the current multi-reference-image schema while preventing unbounded JSON parsing.

June 30 prompt-input boundary: `src/app/api/image-editing/promptsList/promptInput.ts` is the shared sanitizer for the active edit-prompt router. `generateImageEditingPrompt()` normalizes owner prompt text before feature-specific helper calls, normalizes item name/category/description placeholders before business-specific template interpolation, and keeps the existing feature switch and template instructions intact. `/api/image-editing` now stores the generated prompt in a local variable and returns fixed 400 copy when no prompt can be generated, so missing business/feature matches do not reach Gemini as a `"null"` prompt.

**Request:**

```typescript
{
    generationConfig: {
        prompt: string;
        referanceImage: UserUploadedFileType;
        feature?: string;
        promptImages?: UserUploadedFileType[];
    };
    businessType: string;
    projectId: string;
    fileId: string;
    itemDetails: {
        id?: string;
        name?: string;
        description?: string;
        attributes?: string[];
        category?: string;
    };
}
```

---

## File Inventory

### Frontend Components

| File                                                                                                                             | LOC  | Purpose                             |
| -------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------- |
| `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx`                                                     | 619  | Main modal container                |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx`                                               | 527  | Single generation UI                |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx`                                      | 478  | Image editing UI                    |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx`                          | 255  | BatchSetupView                      |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx`       | 265  | Batch config UI                     |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx` | 520  | Batch results UI                    |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/StyleSelector.tsx`                                       | 113  | Style selection modal               |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/AspectRatioSelector.tsx`                                 | 70   | Aspect ratio picker                 |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/ChatWidgetUi.tsx`                                        | 130  | Prompt input UI                     |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/MultiSelectAttributeSelector.tsx`                        | 73   | Attribute selection                 |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/GenerationHistory.tsx`                                   | 135  | History [NOT INTEGRATED]            |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/PromptEnhancer.tsx`                                      | 173  | Prompt enhancement [NOT INTEGRATED] |
| `src/components/templates/main-app/projects/editorView/AiImageGenerator/imageViewType.ts`                                        | 6723 | Business-specific features          |

### Backend API Routes

| File                                                     | LOC | Purpose               |
| -------------------------------------------------------- | --- | --------------------- |
| `src/app/api/image-generation/route.ts`                  | 300 | Single generation API |
| `src/app/api/image-generation/prompt.ts`                 | 279 | Prompt construction   |
| `src/app/api/image-generation/batch-trigger/route.ts`    | 339 | Batch trigger API     |
| `src/app/api/image-generation/batch-generation/route.ts` | 469 | Cloud Task worker     |
| `src/app/api/image-editing/route.ts`                     | 162 | Image editing API     |
| `src/app/api/image-editing/promptsList/index.ts`         | 67  | Editing prompt router |
| `src/app/api/image-editing/promptsList/diagnostics.ts`   | 27  | Bounded editing prompt diagnostics |

### Services & Hooks

| File                                                      | LOC | Purpose                      |
| --------------------------------------------------------- | --- | ---------------------------- |
| `src/services/ai/image/generateImageViaApi.ts`            | 108 | Single generation service    |
| `src/services/ai/image/triggerBatchImageGenerationApi.ts` | 53  | Batch trigger service        |
| `src/services/ai/image/editImageViaApi.ts`                | 73  | Image editing service        |
| `src/hooks/useImageBatchJobListener.ts`                   | 94  | Firestore real-time listener |
| `src/lib/imageGenPreferences.ts`                          | 120 | Browser-local preference persistence |

June 29 response diagnostics: the single-image and edit-image clients parse successful image responses through bounded 24MB readers because valid payloads can include base64 image data. The batch-trigger client parses its acknowledgement through a 64KB reader. Malformed, oversized, empty, or non-object responses log `ai_image_generation_response_parse_failed` / `ai_image_generation_response_invalid`, `ai_image_edit_response_parse_failed` / `ai_image_edit_response_invalid`, or `ai_batch_image_trigger_response_parse_failed` / `ai_batch_image_trigger_response_invalid` before the existing owner fallback behavior runs.

July 5 preference diagnostics: `src/lib/imageGenPreferences.ts` persists owner visual preferences under `imgGenPrefs_{tId}_{sId}` in browser localStorage only. Save, load, and clear failures now log bounded `image_generation_preferences_save_failed`, `image_generation_preferences_load_failed`, and `image_generation_preferences_clear_failed` diagnostics through shared hook diagnostics with tenant/store/storage-key presence-length metadata, preference counts, serialized/stored payload presence-length metadata, and source error metadata only. The helper still falls back to defaults/null without blocking image generation, still stores no prompts or images, and still creates no Firestore, Storage, provider, or AI accounting work.

July 5 local route-log and accounting-input boundary: `/api/image-generation`, `/api/image-editing`, `/api/image-generation/batch-trigger`, and the `/api/image-generation/batch-generation` worker write bounded local request, response, and transaction summaries plus bounded task-start and batch-start summaries. AI operation rows use `itemSummary` and `generationConfigSummary`; raw prompts, item copy, reference URLs, base64 images, full provider responses, full transaction objects, raw batch item IDs, and raw image accounting input are not written. Redundant debug breadcrumbs are also removed. The July 13 reservation contract supersedes this paragraph's original accounting-order/write-count statement; preview, editing, owner acceptance, provider, and Storage behavior remain unchanged.

### Database & Infrastructure

| File                                            | LOC | Purpose                            |
| ----------------------------------------------- | --- | ---------------------------------- |
| `src/database/imageBatchProcessing/index.tsx`   | 119 | Batch job DAL                      |
| `src/database/storage/uploadBase64ToStorage.ts` | 219 | Upload base64 to Firebase Storage  |
| `src/database/storage/deleteFromStorage.ts`     | 67  | Delete files from Firebase Storage |
| `src/lib/google/cloudTask/index.ts`             | 97  | Cloud Task client                  |

### Types & Constants

| File                                                                        | LOC | Purpose                            |
| --------------------------------------------------------------------------- | --- | ---------------------------------- |
| `src/components/templates/main-app/projects/types/imageGeneration.types.ts` | 98  | Generation types                   |
| `src/components/templates/main-app/projects/types/batchJob.types.ts`        | 32  | Batch job types                    |
| `src/constants/AI/index.tsx`                                                | 207 | AI constants, styles               |
| `src/constants/AI/models.ts`                                                | 245 | Centralized AI model configuration |

### Image Utilities (Constitutional Compliance)

| File                             | LOC | Purpose                                                             |
| -------------------------------- | --- | ------------------------------------------------------------------- |
| `src/lib/imageQualityGuard.ts`   | 105 | Image quality validation (Law 5: Public Surfaces Demand Perfection) |
| `src/lib/image/optimizeImage.ts` | 254 | Image optimization before upload                                    |
| `src/utils/imageToBase64.ts`     | 14  | Convert HTMLImageElement to base64                                  |

---

## Implementation Patterns

### Prompt Construction

```typescript
// src/app/api/image-generation/prompt.ts

// 1. Sanitize all user inputs to prevent prompt injection
const itemName = sanitizeAIPromptInput(details.name ?? "Subject");

// 2. Build prompt based on reference image presence
if (referanceImage) {
  prompt = `Using the provided reference image as the primary visual foundation...`;
} else {
  prompt = `A ${styleCategory} image of a ${itemName}...`;
}

// 3. Add configuration options
if (styles.length > 0) {
  prompt += `Captured in the style of ${styles.join(" and ")}. `;
}

// 4. Generate multiple prompts for image types if selected
if (config.selectedImageTypes?.length > 0) {
  for (const typeName of config.selectedImageTypes) {
    generatedPrompts.push(specificPrompt);
  }
}
```

### Cloud Task Integration

```typescript
// src/lib/google/cloudTask/index.ts

export async function enqueueImageGenerationTask(data) {
  const cloudTasksClient = getCloudTasksClient();
  const parent = cloudTasksClient.queuePath(PROJECT_ID, QUEUE_LOCATION, QUEUE_ID);

  const task = {
    httpRequest: {
      httpMethod: "POST",
      url: IMAGE_GENERATION_WORKER_URL,
      headers: {
        "project-id": process.env.FIREBASE_PROJECT_ID,
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(data)).toString("base64"),
    },
  };

  const [response] = await cloudTasksClient.createTask({ parent, task });
  return response.name;
}
```

The Cloud Tasks client is initialized lazily. Client initialization failures and task creation failures use `cloud_tasks_client_initialization_failed` and `cloud_tasks_batch_image_task_create_failed` diagnostics with configuration booleans, bounded project/job/item/task-name metadata, and source error name/code/status only.

### Real-time Listener

```typescript
// src/hooks/useImageBatchJobListener.ts

useEffect(() => {
  const jobsCollectionRef = getBatchImageJobCollectionRef(session, projectId);

  const unsubscribe = onSnapshot(jobsCollectionRef, (querySnapshot) => {
    const jobsList = [];
    querySnapshot.forEach((doc) => {
      jobsList.push({ id: doc.id, ...doc.data() });
    });

    if (jobsList.length > 0) {
      setActiveBatchImageJob(jobsList[0]);
    }
  });

  return () => unsubscribe();
}, [projectId, session]);
```

### DAL Pattern

```typescript
// src/database/imageBatchProcessing/index.tsx

// Collection reference with tenant isolation
export const getBatchImageJobCollectionRef = (session, projectId) => {
  const collectionRef = collection(
    firebaseClient,
    `${COLLECTION}/${session.tId}/${session.sId}`,
  );
  return query(
    collectionRef,
    where("projectId", "==", projectId),
    where("status", "in", ["queued", "processing", "completed", "failed"]),
  );
};

// Update with special field handling
export const updateImageBatchProcessingJob = async (data, projectId) => {
  // Handle statusHistory with arrayUnion
  if ("statusHistory" in data) {
    specialFields.statusHistory = arrayUnion(latestStatusEntry);
  }

  // Handle generatedCount with increment
  if ("generatedCount" in data) {
    specialFields.generatedCount = increment(1);
  }

  await setDoc(docRef, finalUpdateData, { merge: true });
};
```

---

## Security Checklist

| Requirement                     | Implementation                   | Status |
| ------------------------------- | -------------------------------- | ------ |
| **Authentication**              | `withAuth()` middleware          | ✅     |
| **Rate Limiting**               | 5 req/min single, 3/5min batch   | ✅     |
| **Input Validation**            | Zod schemas                      | ✅     |
| **Prompt Injection Prevention** | `sanitizeAIPromptInput()`        | ✅     |
| **AI Safety Settings**          | Gemini HarmCategory blocks       | ✅     |
| **Content Policy Agreement**    | Required for batch               | ✅     |
| **Tenant Isolation**            | Collection path includes tId/sId | ✅     |
| **Security Logging**            | `logger.security()` on failures  | ✅     |

### Prompt Injection Prevention

```typescript
// Dangerous patterns removed
const dangerousPatterns = [
  /ignore\s+(previous|above|all)\s+(instructions?|prompts?)/gi,
  /forget\s+(previous|above|all)\s+(instructions?|prompts?)/gi,
  /system\s+(prompt|instruction|command)/gi,
  /you\s+are\s+(now|a|an)\s+/gi,
  /act\s+as\s+(a|an)?\s*/gi,
];

// Special characters removed
sanitized = sanitized.replace(/[<>{}\[\]\\|`~@#$%^&*()+=;:"]/g, "");
```

### AI Safety Settings

```typescript
safetySettings: [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];
```

---

## Testing Guide

### Single Generation Testing

1. **Basic Generation**
   - Select item without image
   - Click "Generate with AI"
   - Verify image generated
   - Verify can upload

2. **With Reference Image**
   - Upload reference image
   - Generate
   - Verify style influence

3. **With Custom Prompt**
   - Add specific instructions
   - Verify output matches

### Batch Generation Testing

1. **Job Creation**
   - Select multiple items
   - Configure settings
   - Accept policy
   - Start generation
   - Verify Firestore job created

2. **Progress Tracking**
   - Monitor real-time updates
   - Verify count increments
   - Verify status transitions

3. **Actions**
   - Cancel mid-job → Verify cancellation
   - Retry failed → Verify retry
   - Upload selected → Verify storage
   - Discard → Verify cleanup

### Image Editing Testing

1. **Each Feature**
   - Test each editing feature
   - Verify prompt generation
   - Verify output quality

2. **Multi-Edit Flow**
   - Apply edit
   - Use edited image as source
   - Apply another edit

### Preference Persistence Testing

1. **Browser Storage Failure**
   - Simulate unavailable or quota-limited localStorage
   - Save, load, and clear image-generation preferences
   - Verify image generation still falls back to defaults
   - Verify bounded `image_generation_preferences_*_failed` diagnostics omit raw preference payloads

---

## Recommendations & Technical Debt

### Critical Issues (P0) — Must Fix

| Issue                            | Location                        | Impact                                  | Fix                               |
| -------------------------------- | ------------------------------- | --------------------------------------- | --------------------------------- |
| Transaction recording disabled   | `route.ts:264`                  | Token usage not tracked, billing broken | Uncomment `logTransaction()` call |
| Debugger statement in production | `batch-generation/route.ts:164` | Breaks production execution             | Remove `debugger` statement       |
| Console.log statements           | Multiple files                  | Performance, security                   | Replace with `logger` utility     |

### High Priority (P1) — Security & Cost

| Improvement               | Current State      | Recommendation                                        | Effort |
| ------------------------- | ------------------ | ----------------------------------------------------- | ------ |
| Cloud Task Authentication | Header-based only  | Add OIDC token verification per Google best practices | Medium |
| Cost Estimation           | Post-generation    | Show estimated cost before batch start                | Low    |
| Batch Size Limit          | No limit           | Add max 50 items to prevent runaway costs             | Low    |
| Rate Limit Bypass         | No Cloud Task auth | Validate task origin with service account             | Medium |

### Medium Priority (P2) — Code Quality

| Improvement            | Recommendation                                                    | Effort                |
| ---------------------- | ----------------------------------------------------------------- | --------------------- |
| Typo: `referanceImage` | Rename to `referenceImage` across codebase                        | Low (breaking change) |
| Duplicate Gemini code  | Extract shared `generateImage()` function for single/batch routes | Medium                |
| No unit tests          | Add tests for prompt generation and sanitization                  | High                  |
| Model names hardcoded  | Use `AI_MODELS` from `@constant/AI/models.ts`                     | Low                   |

---

## Suggestions & Improvements (From Codebase Cross-Check & Web Research)

### 1. Missing Integrations Found in Codebase

| Component               | Status                    | Purpose                                    | Recommendation                                                    |
| ----------------------- | ------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `GenerationHistory.tsx` | Built, NOT integrated     | Track and reuse generation settings        | Integrate to improve UX - users can regenerate with same settings |
| `PromptEnhancer.tsx`    | Built, NOT integrated     | Enhance prompts with quality tags          | Integrate with API call for AI-enhanced prompts                   |
| `imageQualityGuard.ts`  | Built, NOT used in AI gen | Validates image quality (min 400×300px)    | Apply to generated images before upload                           |
| `optimizeImage.ts`      | Legacy helper; AI upload path uses media profiles | Optimizes images (max 1500px, 70% quality) | ✅ AI upload storage cost risk is resolved through `prepareMediaImage()` and `prepareMediaImageAdmin()` |

### 2. Google Best Practices (From Official Docs - Jul 2026)

#### Prompt Engineering Improvements

Based on Google image-generation prompt guidance and the current Gemini image model path:

| Current Implementation     | Google Recommendation                                                           | Action                             |
| -------------------------- | ------------------------------------------------------------------------------- | ---------------------------------- |
| Basic prompts              | Use **photography modifiers**: camera proximity, position, lighting, lens types | Enhance `prompt.ts` with modifiers |
| No quality modifiers       | Add **quality modifiers**: "4K", "HDR", "Studio Photo", "high-quality"          | Add to default prompt suffix       |
| Negative prompts with "no" | Use **plain descriptions** without "no" or "don't"                              | Update `sanitizeAIPromptInput()`   |
| Fixed aspect ratios        | Support all 5 ratios: 1:1, 4:3, 3:4, 16:9, 9:16                                 | Verify all supported in UI         |

#### Recommended Prompt Template

```typescript
// Enhanced prompt structure per Google guidelines
const enhancedPrompt = `
  ${subject}, ${context}, ${style}
  Photography: ${cameraProximity}, ${lighting}, ${lensType}
  Quality: 4K, HDR, professional studio photo, high detail
  ${negativePrompt ? `Avoid: ${negativePromptClean}` : ""}
`;
```

### 3. Cost Optimization Opportunities

| Optimization            | Current                | Recommended                                              | Savings Est.    |
| ----------------------- | ---------------------- | -------------------------------------------------------- | --------------- |
| **Context Caching**     | Not used               | Use Gemini explicit context caching for repeated prompts | 20-40%          |
| **Batch Inference**     | Cloud Tasks (per-item) | Use Vertex AI Batch Prediction for 50+ items             | 50% per request |
| **Image Deduplication** | None                   | Hash prompts, cache results for identical requests       | Variable        |
| **Model Selection**     | Always Gemini image model | Keep `gemini-2.5-flash-image` as default until `gemini-3.1-flash-image` passes output and billing regression checks | Risk control |

#### Vertex AI Batch Prediction (Alternative to Cloud Tasks)

```typescript
// For large batches (50+ items), consider Vertex AI Batch Prediction
// Source: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/batch-prediction-gemini

// Benefits:
// - 50% cost reduction vs real-time
// - No Cloud Tasks management
// - Built-in retry and error handling
// - Results in BigQuery or Cloud Storage
```

### 4. Doctrine Alignment (MenuList Constitution)

| Doctrine Law                                 | Current State                 | Alignment                   | Recommendation                                |
| -------------------------------------------- | ----------------------------- | --------------------------- | --------------------------------------------- |
| **Law 5: Public Surfaces Demand Perfection** | `imageQualityGuard.ts` exists | ⚠️ NOT applied to AI images | Apply quality guard to generated images       |
| **Law 6: No Cognitive Load**                 | Multiple style options        | ✅ Good - presets available | Add "Quick Generate" with sensible defaults   |
| **Law 8: Trust > Engagement**                | Quality over quantity         | ✅ Good                     | Consider reducing options, more automation    |
| **Law 2: Silence Is a Feature**              | Shows all generated images    | ⚠️ Consider                 | Auto-select best image, show others on expand |

#### Constitutional Compliance Fix

```typescript
// Apply imageQualityGuard to AI-generated images
import { validateImageQuality } from "@lib/imageQualityGuard";

// Before uploading generated image:
const qualityResult = await validateImageQuality(generatedImageBlob);
if (!qualityResult.allowed) {
  // Regenerate or reject - don't show low-quality to public
  console.warn("Generated image failed quality check:", qualityResult.reason);
}
```

### 5. Performance Improvements

| Area                  | Current                      | Recommendation                            | Impact                 |
| --------------------- | ---------------------------- | ----------------------------------------- | ---------------------- |
| **Single Generation** | Sequential prompts           | Parallel prompt execution when multi-mode | 2-3x faster            |
| **Batch Job Polling** | Real-time listener always on | Disconnect after 5 min inactivity         | Reduce Firestore reads |
| **Image Upload**      | Full resolution              | Resize to max 2048px before upload        | 50% storage reduction  |
| **Base64 Handling**   | Full image in memory         | Stream to storage directly                | Memory efficiency      |

### 6. Feature Enhancements (Per Project Context)

| Enhancement                         | Value                                            | Effort | Priority |
| ----------------------------------- | ------------------------------------------------ | ------ | -------- |
| **Style Presets per Business Type** | Auto-select best styles for restaurants vs cafes | Medium | P2       |
| **Image Variations**                | Generate 3 variations, user picks best           | Low    | P2       |
| **Partial Batch Retry**             | Retry only failed items, not entire batch        | Medium | P1       |
| **Progress Estimation**             | Show ETA based on batch size                     | Low    | P3       |
| **Favorite Styles**                 | Save user's preferred generation settings        | Medium | P3       |

### 7. Technical Debt Inventory

| Item                                      | Location                                | Effort | Risk if Unaddressed                       |
| ----------------------------------------- | --------------------------------------- | ------ | ----------------------------------------- |
| Remaining model constant cleanup | `generators.ts`, image routes | Low | Model upgrades still need a focused constant pass |
| No input validation on worker             | `batch-generation/route.ts`             | Low    | Security vulnerability                    |
| Hardcoded model names                     | Multiple files                          | Low    | Upgrade friction                          |
| Missing error boundaries                  | UI components                           | Medium | Poor UX on failures                       |
| No retry logic for transient failures     | API routes                              | Medium | Failed generations not recovered          |

---

## Implementation Priority Matrix

| Priority             | Items                                                              | Timeline |
| -------------------- | ------------------------------------------------------------------ | -------- |
| **P0 - This Week**   | Remove debugger, enable transaction logging, add batch size limit  | 1-2 days |
| **P1 - This Sprint** | Cloud Task auth, cost estimation, partial retry                    | 1 week   |
| **P2 - Next Sprint** | Prompt enhancements, quality guard integration, model constant cleanup | 2 weeks  |
| **P3 - Backlog**     | Batch inference migration, style presets, image variations         | Future   |

---

## Environment Variables Required

```env
# AI Models
GOOGLE_AI_API_KEY=your-api-key

# Cloud Tasks
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PROJECT_LOCATION=us-central1
BATCH_IMAGE_GENERATION_QUEUE_ID=image-generation-queue
BATCH_IMAGE_GENERATION_WORKER_URL=https://your-domain.com/api/image-generation/batch-generation
BATCH_IMAGE_GENERATION_WORKER_SECRET=generate-a-long-random-secret
```

---

## Development Checklist (Pending Implementation)

> **Source**: Cross-check of codebase + external review validation (Jan 2026)
> **Validation**: Each item verified against actual code before inclusion

### Critical Fixes (P0) — Must Complete Before Next Release

| #   | Task                                | Location                                                     | Verified Issue                                            | Status                            |
| --- | ----------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------- |
| 1   | **Remove debugger statement**       | `src/app/api/image-generation/batch-generation/route.ts:164` | `debugger` statement breaks production execution          | ✅ Done (Jan 30, 2026)            |
| 2   | **Enable transaction logging**      | `src/app/api/image-generation/route.ts`                      | Image generation usage was not reliably accounted         | ✅ Done (June 11, 2026)           |
| 3   | **Add batch size limit**            | `src/lib/validation/apiSchemas.ts`                           | No max item count validation, risk of runaway costs       | ✅ Done (max 50)                  |
| 4   | **Replace console.log with logger** | `src/lib/google/cloudTask/index.ts`, `src/lib/apiUtils`      | Security & performance issue                              | ✅ Done for audited API path      |
| 5   | **Add feature flag**                | `src/config/features.ts`                                     | Missing ENABLE_AI_IMAGE_GENERATION flag                   | ✅ Done (Jan 30, 2026)            |

### Security Hardening (P1) — This Sprint

| #   | Task                                 | Location                    | Issue                                                 | Status     |
| --- | ------------------------------------ | --------------------------- | ----------------------------------------------------- | ---------- |
| 5   | **Add worker authentication**        | `batch-generation/route.ts` | Header-based project id only, no secret validation    | ✅ Done with shared secret |
| 6   | **Add input validation to worker**   | `batch-generation/route.ts` | Worker accepts payload without Zod validation         | ✅ Done |
| 7   | **Validate task origin**             | `batch-generation/route.ts` | No verification that request comes from task enqueue  | ✅ Done with project header + shared secret |

### Code Quality (P2) — Next Sprint

| #   | Task                                          | Location                                | Issue                                                       | Status     |
| --- | --------------------------------------------- | --------------------------------------- | ----------------------------------------------------------- | ---------- |
| 8   | **Fix typo: `referanceImage`**                | Multiple files                          | Typo in variable name, breaking change if fixed             | ⬜ Pending |
| 9   | **Extract shared `generateImage()` function** | `route.ts`, `batch-generation/route.ts`, `generators.ts` | Duplicate route/worker model execution code | ✅ Done with shared prompt runner |
| 10  | **Use centralized model constants**           | Multiple files                          | Hardcoded model names instead of `AI_MODELS`                | ⬜ Pending |
| 11  | **Integrate `imageQualityGuard.ts`**          | Generation flow                         | Quality guard exists but not applied to AI-generated images | ⬜ Pending |
| 12  | **Prepare generated images before upload**    | Upload flow                             | Browser accepted images and batch worker saves must not persist raw provider bytes | ✅ Done via media-profile preparation (`prepareMediaImage()` and `prepareMediaImageAdmin()`) |

### UX Improvements (P2) — Next Sprint

| #   | Task                                  | Location                             | Issue                                                    | Status     |
| --- | ------------------------------------- | ------------------------------------ | -------------------------------------------------------- | ---------- |
| 13  | **Add cost estimation before batch**  | `BatchImageGenerationView.tsx`       | Users don't see estimated cost before starting           | ⬜ Pending |
| 14  | **Add partial batch retry**           | `BatchImageGenerationResultView.tsx` | Can only retry entire batch, not individual failed items | ⬜ Pending |
| 15  | **Integrate `GenerationHistory.tsx`** | `AiImageGenerator/index.tsx`         | Component built but not integrated                       | ⬜ Pending |

### Testing (P2) — Next Sprint

| #   | Task                                       | Status     |
| --- | ------------------------------------------ | ---------- |
| 16  | **Add unit tests for prompt sanitization** | ⬜ Pending |
| 17  | **Add unit tests for prompt construction** | ⬜ Pending |
| 18  | **Add integration tests for batch flow**   | ⬜ Pending |

---

## Feature Guardrails (Scope Freeze)

> **Purpose**: Protect USP and prevent feature drift
> **Authority**: Product/CEO — locked until doctrine revision

### USP Definition (Locked)

**Inline Menu Image Creation**: Images are created inside the menu item, for that item, with its context, and without any asset workflow.

**Three Non-Negotiable Pillars**:

1. **Item-Native**: Images born inside item, reviewed inside item, stored for item
2. **Zero Asset Workflow**: No upload/download, no media library, no asset management
3. **One-Click Completion**: Optimize for "item is done", not "explore options"

### Explicitly OUT OF SCOPE (Forever)

These capabilities are **permanently forbidden** to protect the USP:

| Category             | Forbidden Features                                               | Reason                                    |
| -------------------- | ---------------------------------------------------------------- | ----------------------------------------- |
| **Analytics**        | Image performance metrics, CTR tracking, "best performing image" | Creates authority where none should exist |
| **Optimization**     | A/B testing, variant testing, auto-optimization                  | Learning implies decision-making          |
| **Ranking**          | Image ranking, image-based menu ordering                         | Ranking is decision logic                 |
| **Automation**       | Auto-apply images, auto-replace, silent changes                  | Breaks trust boundaries                   |
| **Personalization**  | Different images per customer, dynamic swapping                  | Fragments single-source reality           |
| **Asset Management** | Image libraries, galleries, folders, tagging                     | Creates asset workflow                    |

### Owner Control (Intentional)

Image selection is **explicitly owner-controlled** because:

- Images influence persuasion, not correctness
- Persuasion is subjective
- Subjective choices must remain human

The system may **assist** but must **never decide** which image represents an item.

---

## Future Migration Path (Design Only — No Implementation Commitment)

> **Status**: DESIGN-ONLY — No timelines, no promises
> **Purpose**: Enable future evolution without blocking current USP

### Phase 1: Manual (Current State) ✅

| Dimension  | State           |
| ---------- | --------------- |
| Trigger    | Owner-initiated |
| Control    | High            |
| Automation | None            |
| Authority  | Owner           |

This phase must remain **fully supported forever**.

### Phase 2: Guided (Future, Optional)

System may:

- Pre-select defaults
- Highlight recommended preset
- Reduce visible choices by default

System must NOT:

- Hide controls permanently
- Block manual override
- Explain reasoning

### Phase 3: Silent (Future, Very Careful)

"Ready when you are" — images prepared but never auto-applied.

**Non-negotiable rule**: No image ever appears publicly without owner review.

---

## UI Language Guidelines

### Allowed Language

| Category                | Examples                                                         |
| ----------------------- | ---------------------------------------------------------------- |
| **Action verbs**        | Generate, Create, Try, Edit, Preview, Choose, Apply, Discard     |
| **Neutral descriptors** | Style, Look, Appearance, Variation, Version                      |
| **Optional guidance**   | Recommended (for presets only), Common, Suggested starting point |

### Forbidden Language

| Category             | Forbidden Words                                   | Reason                        |
| -------------------- | ------------------------------------------------- | ----------------------------- |
| **Authority**        | Best, Optimal, Correct, Perfect, Ideal            | Never imply correctness       |
| **Intelligence**     | Smart, Learns, Improves, Adapts, Optimizes        | Never imply thinking          |
| **Performance**      | High-performing, Converts better, Proven, Winning | Never imply results           |
| **System Authority** | MenuList decided, System chose, AI selected       | Images never chosen by system |

---

## ChatGPT Feedback Audit Summary

> **Validation Date**: Jan 29, 2026
> **Methodology**: Each point verified against codebase before acceptance

| #   | ChatGPT Claim                      | Valid?     | Evidence                                      | Action                |
| --- | ---------------------------------- | ---------- | --------------------------------------------- | --------------------- |
| 1   | "Too many choices exposed"         | ⚠️ Partial | UI shows ~6 options, not 12+ as claimed       | No change needed      |
| 2   | "No batch size limit"              | ✅ Valid   | `batch-trigger/route.ts` lacks max count      | Added to P0 checklist |
| 3   | "Transaction recording disabled"   | ✅ Valid   | `route.ts:264` commented out                  | Added to P0 checklist |
| 4   | "Debugger in production"           | ✅ Valid   | `batch-generation/route.ts:164`               | Added to P0 checklist |
| 5   | "USP = Inline Menu Image Creation" | ✅ Valid   | Code confirms item-scoped, no asset workflow  | Added to Guardrails   |
| 6   | "Scope freeze rules"               | ✅ Valid   | These features don't exist, good to document  | Added to Guardrails   |
| 7   | "Future migration path"            | ✅ Valid   | Design-only, no implementation                | Added as design doc   |
| 8   | "UI language rules"                | ✅ Valid   | Marketing/UX guidance                         | Added as guidelines   |
| 9   | "Image editing is dangerous"       | ❌ Invalid | Feature is owner-triggered, scoped, not risky | Rejected              |
| 10  | "Batch mode too powerful"          | ⚠️ Partial | Needs limit, but architecture is sound        | Added limit to P0     |

**Summary**: 8 valid points integrated, 1 rejected, 1 partially valid with nuance added.

---

## Default Confidence & Designing for Inaction

> **Source**: ChatGPT feedback loop reconciliation (Jan 29, 2026)
> **Status**: PRODUCT QUESTION — Requires founder decision
> **Priority**: Strategic (affects product positioning)

### The Critical Product Question

> **"If a user generates 100 images using defaults only, will you confidently stand behind every one of them?"**

This question exposes the gap between:

- **Technical capability** (system can generate images)
- **Product confidence** (system produces results worth shipping)

### Why This Matters

**Current state**: The system assumes active user participation.

- User clicks "Generate"
- User reviews options
- User tweaks if needed
- User approves

**Ideal state**: User can be passive and still get good results.

- User clicks "Generate"
- User ships immediately
- System handled everything worth handling

### The Psychological Responsibility Gap

Cognitive load is **not** caused by the number of controls.
It's caused by **decision responsibility**.

Even with minimal UI, the user is forced to ask:

- "Should I change the style?"
- "Is default lighting good enough?"
- "Am I doing this right?"

This is **creative anxiety**, not UI clutter.

**The goal**: Eliminate the question "Am I doing this right?" from the user's mind.

### Design Principles for Inaction

| Principle                              | Implementation                                             | Status              |
| -------------------------------------- | ---------------------------------------------------------- | ------------------- |
| **Defaults should be shippable**       | Default style produces professional, brand-safe results    | ⬜ Needs validation |
| **First result should be good enough** | No regeneration needed in 80%+ of cases                    | ⬜ Needs metrics    |
| **Quality guard as safety net**        | `imageQualityGuard.ts` catches bad outputs                 | ⬜ Not integrated   |
| **No explanation needed**              | User shouldn't need to know "why" the image looks this way | ✅ Current behavior |
| **Presets over parameters**            | Business-type presets pre-configure optimal settings       | ✅ Implemented      |

### What "Default Confidence" Requires

To answer "yes" to the critical question, the system must:

1. **Validate default outputs systematically**
   - Test 100+ items across business types with defaults only
   - Measure: How many are "shippable" without edits?
   - Target: 80%+ first-generation acceptance rate

2. **Apply quality guard to AI-generated images**
   - Currently: `imageQualityGuard.ts` exists but not applied
   - Action: Integrate into generation flow (P2 checklist item #11)

3. **Optimize default prompt for reliability**
   - Current: Prompts optimized for variety
   - Needed: Prompts optimized for consistency + safety

4. **Track default vs customized usage**
   - Metric: What % of users change settings?
   - Goal: If most users customize, defaults aren't good enough

### Founder Decision Required

**Question to answer**:

> "Do we optimize for **creative exploration** or **reliable completion**?"

| Path                     | Trade-off                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| **Creative exploration** | More options, more user control, higher engagement, higher anxiety |
| **Reliable completion**  | Fewer options, better defaults, lower engagement, higher trust     |

**Current positioning**: Leans toward exploration (many style options exposed).

**USP positioning**: Should lean toward completion ("one-click item completion").

**Recommendation**: Shift toward reliable completion without removing options.

- Keep options available but collapsed by default
- Make defaults so good that expansion is rarely needed
- Measure and optimize default acceptance rate

### Success Metric (Proposed)

> **Default Acceptance Rate**: % of generated images uploaded without any setting changes.

**Target**: 80%+

If this metric is below 60%, the system is asking users to do the system's job.

---

## Final Feedback Loop Summary

| Source             | Valid Points        | Rejected | Action Taken                   |
| ------------------ | ------------------- | -------- | ------------------------------ |
| ChatGPT (Round 1)  | 8                   | 2        | Integrated into guardrails     |
| Cascade validation | N/A                 | N/A      | Cross-checked against codebase |
| ChatGPT (Round 2)  | 1 (inaction design) | 0        | Added this section             |

**Net result**: Product documentation is stronger. Technical debt is inventoried. Strategic gaps are surfaced.

---

## UX Audit: SMB Owner Perspective

> **Audit Date**: Jan 29, 2026
> **Perspective**: Non-technical small/medium business owner (e.g., restaurant owner, cafe manager)
> **Goal**: Identify friction points that prevent quick, confident image generation

---

### Component-by-Component Analysis

#### 1. Main Generation UI (`index.tsx`)

**File**: `src/components/.../AiImageGenerator/index.tsx` (~527 lines)

| What Works                             | What Doesn't                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------- |
| ✅ Clear "Generate Image" button       | ❌ **Information overload** - 10+ controls visible at once                                  |
| ✅ Loading state with skeleton preview | ❌ **No visible defaults** - user doesn't know what happens if they just click Generate     |
| ✅ Image selection for upload          | ❌ **Technical jargon** - "Negative Prompt", "Aspect Ratio", "Compositions"                 |
|                                        | ❌ **Reference image label confusing** - "(only one can be selected)" buried in parentheses |
|                                        | ❌ **Multi-mode toggle** - purpose unclear for single-item generation                       |

**SMB Owner Thought**: _"I just want a picture of my burger. Why do I need to choose environments, lighting, moods, AND compositions?"_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-01 | Too many options visible | Collapse advanced options by default, show only: Style + Generate button | P1 | **DONE** |
| ✅ UX-02 | No guidance for prompt | Add placeholder: "Describe any special details (optional - we'll use your item info)" | P2 | **DONE** |
| UX-03 | Multi-mode toggle confusing | Rename to "Generate Multiple Angles" with tooltip showing examples | P3 |
| ✅ UX-04 | Reference image label | Change to "Reference Image (select one)" with visual indicator | P2 | **DONE** |

---

#### 2. Style Selector (`StyleSelector.tsx`)

**File**: `src/components/.../AiImageGenerator/StyleSelector.tsx` (~113 lines)

| What Works                                          | What Doesn't                                                             |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| ✅ Modal interface - doesn't clutter main view      | ❌ **No visual previews** - just text descriptions of styles             |
| ✅ Category tabs (Photorealism, Illustration, etc.) | ❌ **No "recommended" indicator** - which style is best for restaurants? |
| ✅ Multi-select capability                          | ❌ **No default pre-selection** - user must choose from scratch          |

**SMB Owner Thought**: _"What does 'Warm Soft Focus' look like? I don't want to guess and waste a generation."_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-05 | No visual style previews | Add thumbnail examples for each style | P1 | **DONE** |
| ✅ UX-06 | No business-type recommendation | Auto-highlight "Recommended for Restaurants" styles | P1 | **DONE** |
| ✅ UX-07 | No default selection | Pre-select "Natural Light" for food businesses | P2 | **DONE** |

---

#### 3. Aspect Ratio Selector (`AspectRatioSelector.tsx`)

**File**: `src/components/.../AiImageGenerator/AspectRatioSelector.tsx` (~70 lines)

| What Works                     | What Doesn't                                                          |
| ------------------------------ | --------------------------------------------------------------------- |
| ✅ Visual shape representation | ❌ **No use-case guidance** - when to use 1:1 vs 16:9?                |
| ✅ Clear selection state       | ❌ **Missing context labels** - "Best for Instagram", "Best for Menu" |
| ✅ Card-based selection        |                                                                       |

**SMB Owner Thought**: _"Is 1:1 for my menu or my Instagram? I don't know which to pick."_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-08 | No use-case labels | Add subtitle: "1:1 Square - Best for Instagram, Menu Cards" | P2 | **DONE** |
| UX-09 | No smart default | Default to 1:1 for food items (most versatile) | P3 |

---

#### 4. Chat Widget UI (`ChatWidgetUi.tsx`)

**File**: `src/components/.../AiImageGenerator/ChatWidgetUi.tsx` (~130 lines)

| What Works                              | What Doesn't                                                    |
| --------------------------------------- | --------------------------------------------------------------- |
| ✅ Sticky at bottom - always accessible | ❌ **Generic prompt placeholder** - "Enter your prompt here..." |
| ✅ Shows selected style as tag          | ❌ **No example prompts** - SMB owners don't know what to write |
| ✅ Shows reference image thumbnail      | ❌ **No "Generate with defaults" shortcut**                     |
| ✅ Large, clear Generate button         |                                                                 |

**SMB Owner Thought**: _"What prompt should I write? Can't the system just figure it out from my item name?"_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-10 | Unhelpful placeholder | Change to "Add special instructions (optional)" | P1 | **DONE** |
| ✅ UX-11 | No prompt examples | Add rotating examples: "e.g., 'on a rustic wooden table'" | P2 | **DONE** |
| UX-12 | No quick generate | Add "Quick Generate" button that skips all options | P1 |

---

#### 5. Multi-Select Attribute Selector (`MultiSelectAttributeSelector.tsx`)

**File**: `src/components/.../AiImageGenerator/MultiSelectAttributeSelector.tsx` (~73 lines)

| What Works                            | What Doesn't                                                             |
| ------------------------------------- | ------------------------------------------------------------------------ |
| ✅ Chip-based selection - clear state | ❌ **Technical labels** - "Environments (The Setting) (Optional)"        |
| ✅ Supports single and multi-select   | ❌ **No visual previews** - what does "Warm Ambient" lighting look like? |
|                                       | ❌ **Too many options** - 10+ chips per category                         |

**SMB Owner Thought**: _"Is 'Golden Hour' the same as 'Warm Ambient'? I don't know photography terms."_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-13 | Technical labels | Simplify: "Setting" instead of "Environments (The Setting) (Optional)" | P2 | **DONE** |
| ✅ UX-14 | No visual previews | Show small preview on hover/tap | P2 | **DONE** |
| UX-15 | Too many options | Show top 4 options + "More" expander | P1 |

---

#### 6. Edit Image Modal (`EditImageModal.tsx`)

**File**: `src/components/.../AiImageGenerator/EditImageModal.tsx` (~478 lines)

| What Works                                | What Doesn't                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| ✅ Clear Original vs Generated comparison | ❌ **Green border system confusing** - "Changes will be applied to the green border image" |
| ✅ Feature cards with descriptions        | ❌ **No preview of what each enhancement does**                                            |
| ✅ Generated edits thumbnail strip        | ❌ **Nested modals** - EditModal → Upload Selection Modal                                  |
|                                           | ❌ **Feature names are technical** - "Regenerate Background"                               |

**SMB Owner Thought**: _"What does 'Enhance Food Vibrancy' actually do to my image? Can I see before I commit?"_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-16 | Green border confusing | Use clear labels: "Editing This Image →" with arrow | P1 | **DONE** |
| ✅ UX-17 | No enhancement previews | Show before/after thumbnail for each feature | P1 | **DONE** |
| ✅ UX-18 | Nested modals | Inline upload confirmation instead of second modal | P2 | **DONE** |
| ✅ UX-19 | Technical feature names | Rename: "Make Colors Pop", "Change Background", "Add Steam Effect" | P2 | **DONE** |

---

#### 7. Batch Setup View (`batchImageGeneration/index.tsx`)

**File**: `src/components/.../batchImageGeneration/index.tsx` (~255 lines)

| What Works                            | What Doesn't                                                 |
| ------------------------------------- | ------------------------------------------------------------ |
| ✅ Search and filter functionality    | ❌ **No estimated time/cost** - how long will 50 items take? |
| ✅ "Only items without images" filter | ❌ **No visual preview of batch output**                     |
| ✅ Category grouping with checkboxes  | ❌ **No "Generate All Missing" shortcut**                    |
| ✅ Sticky action buttons              |                                                              |

**SMB Owner Thought**: _"If I select all 50 items, how long will this take? Will it cost me extra?"_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-20 | No time estimate | Show "Estimated: ~5 minutes for 20 items" | P1 | **DONE** |
| ✅ UX-21 | No cost indicator | Show credit/cost estimate before starting | P1 | **DONE** |
| ✅ UX-22 | No quick action | Add "Generate All Missing Images" one-click button | P2 | **DONE** |

---

#### 8. Batch Configuration View (`BatchImageGenerationView.tsx`)

**File**: `src/components/.../batchImageGeneration/BatchImageGenerationView.tsx` (~265 lines)

| What Works                                    | What Doesn't                                            |
| --------------------------------------------- | ------------------------------------------------------- |
| ✅ Same controls as single mode - consistency | ❌ **Same overwhelming options** - even worse for batch |
| ✅ Content Policy Agreement                   | ❌ **No "just use defaults" option**                    |
|                                               | ❌ **Agreement checkbox feels legal/scary**             |

**SMB Owner Thought**: _"I'm generating 50 images - do I really need to pick lighting for each one? Can't you just make them look good?"_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| UX-23 | Same overwhelming options | For batch: show only Style + Aspect Ratio, hide rest | P1 |
| ✅ UX-24 | No defaults button | Add "Use Smart Defaults" toggle that hides all options | P1 | **DONE** |
| UX-25 | Scary agreement | Soften: "I understand images are AI-generated" with info icon | P3 |

---

#### 9. Batch Results View (`BatchImageGenerationResultView.tsx`)

**File**: `src/components/.../batchImageGeneration/BatchImageGenerationResultView.tsx` (~520 lines)

June 29 follow-up: accept/upload, discard, cancel, and retry failure diagnostics now route through `logRuntimeFailure()` with fixed `image_batch_result_*` codes, source error name/code/status metadata, and bounded job/project/count/status context. Owner-visible messages, batch job writes, project image writes, Storage cleanup, selection defaults, and confirmation behavior are unchanged.

June 30 follow-up: batch job create and owner result-action updates now require explicit acknowledgement before the UI advances. `ImageUploadModal` fails closed when `addImageBatchProcessingJob()` does not return a job ID and requires failed-start status marking to acknowledge `failed`. `BatchImageGenerationResultView` requires matching `cancelled`, `finished`, `discarded`, or `queued` acknowledgements before success copy or `onComplete()` runs. Rejected acknowledgement codes are `image_upload_batch_job_create_rejected`, `image_upload_batch_job_mark_failed_rejected`, `image_batch_result_cancel_update_rejected`, `image_batch_result_upload_update_rejected`, `image_batch_result_discard_update_rejected`, and `image_batch_result_retry_update_rejected`.

July 1 follow-up: terminal batch jobs now receive `itemsExpiresAt` and `expiresAt` retention markers from both browser and Admin SDK status-update paths. `menulistMaintenanceScheduler` runs `image_batch_job_retention_cleanup` inside the existing leased scheduler, pruning `itemsList` after seven days and deleting terminal job docs after 30 days. Old `completed`, `failed`, and `discarded` jobs attempt same-tenant/store `media/menuItem/{tId}/{sId}/` Storage cleanup before item URL pruning; `finished` and `cancelled` jobs skip Storage deletion to avoid deleting owner-accepted project images.

July 5 follow-up: Batch image result stored-error display boundary. Failed batch result owner copy no longer renders stored `imageBatchProcessingJobs.error` / `activeJobData.error` text. `BatchImageGenerationResultView` uses fixed recovery copy from source so legacy or raw stored job-error strings cannot become owner-visible, while worker/trigger writes, result actions, listener reads, and diagnostics remain unchanged.

| What Works                                            | What Doesn't                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| ✅ Clear status indicators (Queued, Processing, etc.) | ❌ **Multiple confirmation modals** - Cancel, Discard, Upload      |
| ✅ Progress tracking with counts                      | ❌ **Consequences not clear** - what happens to unselected images? |
| ✅ Select all / individual selection                  | ❌ **Decision fatigue** - too many choices at completion           |
| ✅ Visual status cards (color-coded)                  |                                                                    |

**SMB Owner Thought**: _"Job completed - do I click Upload or Discard? What happens to the ones I didn't select?"_

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-26 | Multiple modals | Single confirmation with clear consequences | P2 | **DONE** |
| ✅ UX-27 | Unclear consequences | Add: "3 selected → will be added. 2 unselected → will be deleted." | P1 | **DONE** |
| ✅ UX-28 | Decision fatigue | Default to "Upload All" with option to review | P2 | **DONE** |

---

#### 10. Generation History (`GenerationHistory.tsx`)

**File**: `src/components/.../AiImageGenerator/GenerationHistory.tsx` (~135 lines)

| What Works                           | What Doesn't                                                 |
| ------------------------------------ | ------------------------------------------------------------ |
| ✅ Popover interface - non-intrusive | ❌ **Hidden in small button** - SMB owners may never find it |
| ✅ Shows timestamp and prompt        | ❌ **No settings preview** - what style was used?            |
| ✅ "Regenerate with these settings"  |                                                              |

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| UX-29 | Hidden feature | Show "Recent" pill/badge when history exists | P3 |
| UX-30 | No settings preview | Show style/config summary in history card | P3 |

---

#### 11. Prompt Enhancer (`PromptEnhancer.tsx`)

**File**: `src/components/.../AiImageGenerator/PromptEnhancer.tsx` (~173 lines)

| What Works               | What Doesn't                                         |
| ------------------------ | ---------------------------------------------------- |
| ✅ Quality enhancer tags | ❌ **Not integrated** - separate modal, easy to miss |
| ✅ Custom tag addition   | ❌ **Technical term** - "Quality Enhancers"          |
|                          | ❌ **Simulated API** - not actually enhancing yet    |

**Improvement Opportunities**:
| ID | Issue | Suggested Fix | Priority |
|----|-------|---------------|----------|
| ✅ UX-31 | Not integrated | Move tags inline below prompt input | P2 | **DONE** |
| UX-32 | Technical term | Rename to "Quick Boost" or "Make it Better" | P3 |

---

### Priority Summary

| Priority | Count | Completed | Remaining | Description                       |
| -------- | ----- | --------- | --------- | --------------------------------- |
| **P1**   | 12    | **12**    | **0**     | ✅ All Critical UX blockers done! |
| **P2**   | 13    | **13**    | **0**     | ✅ All P2 items complete!         |
| **P3**   | 7     | 0         | 7         | Nice-to-have polish               |

### UX Improvements — ✅ IMPLEMENTED (Jan 29, 2026)

| ID        | Issue                      | Fix Applied                                                                    | File Changed                                     |
| --------- | -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ |
| **UX-01** | Too many options visible   | Wrapped in collapsible "Customize Image (Optional)" section                    | `index.tsx`                                      |
| **UX-05** | No visual style previews   | Added emoji indicators + "Best for" labels (🍔 Food, 💎 Products, etc.)        | `StyleSelector.tsx`                              |
| **UX-06** | No business recommendation | Auto-highlights "⭐ Recommended" styles based on business type                 | `StyleSelector.tsx`                              |
| **UX-08** | No use-case labels         | Added "Best for Instagram, Menu Cards" etc. to each aspect ratio               | `constants/common.ts`, `AspectRatioSelector.tsx` |
| **UX-10** | Unhelpful placeholder      | Changed to "Add special instructions (optional - we'll use your item details)" | `ChatWidgetUi.tsx`                               |
| **UX-16** | Green border confusing     | Added clear visual indicator: "Editing this image → Click another to switch"   | `EditImageModal.tsx`                             |
| **UX-17** | No enhancement previews    | Added friendly names, icons, "what it does" + before/after examples            | `EditImageModal.tsx`                             |
| **UX-20** | No time estimate           | Added "~X min • Y images" estimate on batch selection                          | `batchImageGeneration/index.tsx`                 |
| **UX-21** | No cost indicator          | Added credit cost estimate (e.g., "15 credits")                                | `batchImageGeneration/index.tsx`                 |
| **UX-22** | No quick action            | Added "Quick Select: All Items Without Images" button                          | `batchImageGeneration/index.tsx`                 |
| **UX-24** | No defaults button         | Added "Use Smart Defaults" toggle card (ON by default, hides all options)      | `BatchImageGenerationView.tsx`                   |
| **UX-27** | Unclear consequences       | Shows "X images will be added, Y images will be deleted" with color coding     | `BatchImageGenerationResultView.tsx`             |
| **UX-28** | Decision fatigue           | Default to "Upload All" (all images pre-selected)                              | `BatchImageGenerationResultView.tsx`             |
| **UX-11** | No prompt examples         | Added rotating examples: "e.g., on a rustic wooden table"                      | `ChatWidgetUi.tsx`                               |
| **UX-14** | No visual previews         | Added emoji + description tooltips on hover for attributes                     | `MultiSelectAttributeSelector.tsx`               |
| **UX-31** | Tags not integrated        | Added quick enhancer tags inline below prompt (✨ HD, 📸 Professional, etc.)   | `ChatWidgetUi.tsx`                               |
| **UX-04** | Reference image confusing  | Changed to "📷 Reference Image (Optional - AI will match this style)"          | `index.tsx`                                      |
| **UX-07** | No default style           | Auto-selects first recommended style when modal opens                          | `StyleSelector.tsx`                              |
| **UX-13** | Technical labels           | Already simplified: "Setting", "Lighting", "Camera Angle"                      | `index.tsx`                                      |
| **UX-18** | Nested modals              | Inline upload selection with checkboxes, auto-select new images                | `EditImageModal.tsx`                             |
| **UX-19** | Technical feature names    | Friendly names: "Make it Better", "Change Background", "Cut Out Subject"       | `EditImageModal.tsx`                             |
| **UX-26** | Multiple modals            | Simplified: Direct upload button, single discard confirmation                  | `BatchImageGenerationResultView.tsx`             |

**Bonus fixes during implementation:**

- Simplified all attribute labels (removed technical jargon):
  - "Environments (The Setting) (Optional)" → "Setting"
  - "Lighting (The Atmosphere | How it's lit) (Optional)" → "Lighting"
  - "Compositions (The Camera Angle/Framing) (Optional)" → "Camera Angle"
  - "Negative Prompt" → "Exclude from image"
  - "Prompt" → "Special Instructions"

- StyleSelector modal improvements:
  - Tab switching no longer clears selections (users can select from multiple categories)
  - Added selection count badge + "Clear all" button
  - Disabled submit until at least one style selected
  - Dynamic button label: "Select a Style" → "Apply 2 Styles"

- EditImageModal improvements:
  - Default to "Enhance Image" (most common action) instead of "Custom Prompt"
  - Friendlier modal title: "Enhance: [Item Name]"
  - Dynamic button: "Enhance Now" vs "Apply Edit" based on feature

- ChatWidgetUi improvements:
  - Rotating prompt examples every 4 seconds to inspire users

### Top 5 High Impact (Requires More Effort)

1. **UX-05**: Add visual style previews (thumbnails)
2. **UX-06**: Auto-recommend styles based on business type
3. **UX-17**: Show before/after previews for editing features
4. **UX-20**: Show time/cost estimates for batch jobs
5. **UX-12**: Add "Quick Generate" button that skips all options

---

### The "Zero-Click" Goal

**Current state**: User must make 5+ decisions before generating.
**Ideal state**: User can generate with 0 decisions (just click Generate).

**Recommended approach**:

1. Smart defaults based on business type + item category
2. All options collapsed by default
3. "Quick Generate" prominent, "Customize" secondary
4. Results should be "shippable" 80%+ of the time with defaults

---

**Net result**: Product documentation is stronger. Technical debt is inventoried. Strategic gaps are surfaced.

---

_Document follows `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` impl template._
