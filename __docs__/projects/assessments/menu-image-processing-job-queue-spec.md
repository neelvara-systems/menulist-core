# Menu Image Processing - Job Queue Implementation Specification

> **Document Type:** Implementation Specification  
> **Created:** December 5, 2025  
> **Last Updated:** December 10, 2025  
> **Status:** Implementation Complete (Pending Testing)  
> **Approach:** Recommended Job Queue Pattern

---

## Table of Contents

1. [Overview](#1-overview)
2. [Your Questions Answered](#2-your-questions-answered)
3. [Architecture Design](#3-architecture-design)
4. [Data Models](#4-data-models)
5. [Function Design](#5-function-design)
6. [Client Integration](#6-client-integration)
7. [Data Architecture & Processing Flow](#7-data-architecture--processing-flow-critical)
   - 7.1 [Batch Processing Deep Dive (15 Images Example)](#71-batch-processing-deep-dive-15-images-example)
   - 7.2 [Per-File Message Handling](#72-per-file-message-handling-gap-identified)
8. [Edge Cases & Corner Case Handling](#8-edge-cases--corner-case-handling)
   - 8.12 [Cross-File Category References (transformIdsForFile Fix)](#812-cross-file-category-references-transformidsforfile-fix)
   - 8.13 [Menu Update: Auto-Replace Same-Name Items](#813-menu-update-auto-replace-same-name-items)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Overview

### What We're Building

A job queue system for menu image processing that:

- ✅ Creates a job document when user initiates processing
- ✅ Triggers processing automatically (prod) or manually (dev)
- ✅ Updates status in real-time (`pending` → `processing` → `completed` / `failed`)
- ✅ Saves extracted data server-side (no data loss on disconnect)
- ✅ Client listens for status changes and reacts to completion

### Collection Name

```
menuImageProcessingJobs/{jobId}
```

---

## 2. Your Questions Answered

### Question 1: Dev/Emulator Environment

> "Firestore onCreate trigger does not work in emulator. Can we create two ways like I did for `startGeneration`?"

**Answer: Yes! We'll follow your existing pattern exactly.**

```typescript
// functions/src/index.ts

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  // PRODUCTION: Firestore onCreate trigger
  exports.processMenuImagesJob = onDocumentCreated(
    { document: `menuImageProcessingJobs/{jobId}`, ...options },
    async (event) => {
      await processMenuImagesJobLogic(event.params.jobId, event.data);
    },
  );
} else {
  // DEVELOPMENT: Callable function (manual trigger)
  const devTriggers = require("./dev-triggers");
  exports.dev_triggerProcessMenuImages =
    devTriggers.dev_triggerProcessMenuImages;
}
```

**Dev trigger implementation:**

```typescript
// functions/src/dev-triggers.ts

export const dev_triggerProcessMenuImages = onCall(
  functionOptions,
  async (request) => {
    ensureDevEnvironment();
    const { jobId, jobData } = request.data;
    if (!jobId || !jobData) {
      throw new HttpsError(
        "invalid-argument",
        "jobId and jobData are required.",
      );
    }

    functions.logger.info(
      `[DEV_TRIGGER] Processing menu images for job ${jobId}`,
    );
    await processMenuImagesJobLogic(jobId, jobData);
    return {
      success: true,
      message: `Successfully triggered processing for ${jobId}`,
    };
  },
);
```

**Why this works:**

- Same pattern as `startGeneration` / `dev_triggerStartGeneration`
- Production uses automatic trigger (reliable, scalable)
- Development uses callable (easy testing, no emulator trigger issues)
- Both call the same logic function

---

### Question 2: Collection Name

> "Instead of `processingJobs`, call it `menuImageProcessingJobs`"

**Answer: Done!**

```typescript
// functions/src/constants/collections.ts
export const MENU_IMAGE_PROCESSING_JOBS_COLLECTION = "menuImageProcessingJobs";
```

This name is:

- ✅ Clear and specific
- ✅ Doesn't conflict with other job collections (`kb_generation_jobs`)
- ✅ Easy to find in Firebase Console

---

### Question 3: Status Handling - Where to Maintain Status?

> "If we are maintaining status in projects collection, what is the handling for client?"

**Answer: You have TWO options. Here's the comparison:**

#### Option A: Status in Job Document Only (Recommended)

```
Client listens to: menuImageProcessingJobs/{jobId}

Flow:
1. Client creates job document
2. Client listens to job document for status changes
3. On completion, client reads extractedData from job document
4. Client saves to project file (or function does this)
```

**Pros:**

- Job is self-contained (status + result in one place)
- Easy to track multiple concurrent jobs
- No pollution of project document
- Clean separation of concerns

**Cons:**

- Client needs new listener for jobs
- Need to link job → project/file

#### Option B: Status in Project Document (Alternative)

```
Client listens to: projects/{projectId} (existing listener)

Flow:
1. Client creates job document
2. Function updates project.processingStatus during processing
3. Client's existing project listener catches status changes
4. On completion, function saves extractedData to project file
```

**Pros:**

- Uses existing project listener (no new listener)
- Status visible alongside project data
- Simpler client code

**Cons:**

- Project document gets processing fields (mixing concerns)
- Only one processing status per project at a time
- Need to clear status after completion

---

### My Recommendation: Option A (Status in Job Document)

**Why:**

1. **Clean separation** - Jobs are transient, projects are permanent
2. **Concurrent support** - Can process multiple files simultaneously
3. **Audit trail** - Job history preserved even after completion
4. **Industry standard** - This is how Stripe, AWS, etc. handle async jobs

**But I can implement Option B if you prefer!**

---

## 3. Architecture Design

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MENU IMAGE PROCESSING JOB QUEUE                      │
└─────────────────────────────────────────────────────────────────────────┘

     CLIENT                           FIRESTORE                    FUNCTION
       │                                  │                           │
       │  1. Create job document          │                           │
       │     status: "pending"            │                           │
       │ ────────────────────────────────►│                           │
       │                                  │                           │
       │  2. Start listening to job doc   │  3. onCreate trigger      │
       │ ◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│──────────────────────────►│
       │                                  │                           │
       │                                  │  4. Update: "processing"  │
       │  ← status: "processing"          │◄──────────────────────────│
       │  ← progress: 10%                 │                           │
       │  ← currentStep: "Uploading..."   │                           │
       │                                  │                           │
       │                                  │  5. AI Processing         │
       │  ← progress: 50%                 │◄──────────────────────────│
       │  ← currentStep: "Batch 1/2..."   │                           │
       │                                  │                           │
       │                                  │  6. Save extracted data   │
       │                                  │  7. Update: "completed"   │
       │  ← status: "completed"           │◄──────────────────────────│
       │  ← result: { extractedData }     │                           │
       │                                  │                           │
       │  8. Read result, update UI       │                           │
       ▼                                  ▼                           ▼
```

### Environment Handling

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Job Created ──► Firestore onCreate ──► processMenuImagesJob (auto)    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPMENT (Emulator)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Job Created ──► Client calls dev_triggerProcessMenuImages (manual)    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Models

### Job Document Schema

```typescript
// functions/src/types.ts

export const MENU_IMAGE_PROCESSING_JOBS_COLLECTION = "menuImageProcessingJobs";

export const MENU_PROCESSING_STATUS = {
  PENDING: "pending", // Job created, waiting to start
  PROCESSING: "processing", // AI processing in progress
  COMPLETED: "completed", // Successfully completed
  FAILED: "failed", // Error occurred
} as const;

export type MenuProcessingStatusType =
  (typeof MENU_PROCESSING_STATUS)[keyof typeof MENU_PROCESSING_STATUS];

export interface MenuImageProcessingJob {
  // ─────────────────────────────────────────────────────────────
  // IDENTITY
  // ─────────────────────────────────────────────────────────────
  id: string; // Auto-generated job ID
  projectId: string; // Target project

  // ─────────────────────────────────────────────────────────────
  // STATUS & PROGRESS
  // ─────────────────────────────────────────────────────────────
  status: MenuProcessingStatusType;
  progress?: number; // 0-100 percentage
  currentStep?: string; // Human-readable step ("Uploading files...", "Processing batch 2/3...")

  // ─────────────────────────────────────────────────────────────
  // INPUT (What to process)
  // NOTE: uid is REQUIRED (not optional like MenuFileToProcess)
  // because we need it to map data back to files via sourceFileIndex
  // ─────────────────────────────────────────────────────────────
  files: {
    uid: string; // REQUIRED: Used to prefix IDs (e.g., "14VA215c1")
    name: string;
    size: number;
    type: string;
    url: string; // HTTPS URL or data:base64 URI
  }[];
  targetLanguages: {
    code: string;
    name: string;
  }[];
  action?: string; // e.g., "IMAGE_PROCESSING" (optional, defaults to IMAGE_PROCESSING)

  // ─────────────────────────────────────────────────────────────
  // OUTPUT (Populated on completion)
  // NOTE: This is the COMBINED AI response with sourceFileIndex
  // Client will redistribute this to individual files
  // ─────────────────────────────────────────────────────────────
  result?: {
    // Combined data from AI (has sourceFileIndex on each category/item)
    combinedData: {
      categories: Array<{
        id: string | number;
        sourceFileIndex: number; // 0-based index mapping to files[]
        name: Record<string, string>;
        active?: boolean;
      }>;
      items: Array<{
        id: string | number;
        sourceFileIndex: number; // 0-based index mapping to files[]
        name: Record<string, string>;
        category: string | number;
        description?: Record<string, string>;
        price?: string;
        attributes?: Array<{
          id: string;
          name: Record<string, string>;
          price?: string;
        }>;
        tags?: string[] | Record<string, string>;
        active?: boolean;
      }>;
      languages: Array<{
        name: string;
        code: string;
        isPrimary?: boolean;
      }>;
    };
    qualityScore: number; // 0-100 based on extraction quality
    qualityDetails: {
      categoryQuality: number; // 0-25 points
      itemQuality: number; // 0-10 points
      priceQuality: number; // 0-50 points
      descriptionQuality: number; // 0-25 points
    };
    processingTime: number; // ms
    batchResults?: {
      batchIndex: number;
      success: boolean;
      filesProcessed: number;
    }[];
  };

  // Per-file results (after redistribution by sourceFileIndex)
  fileResults?: {
    [fileUid: string]: {
      categoriesCount: number;
      itemsCount: number;
    };
  };

  // ─────────────────────────────────────────────────────────────
  // ERROR (Populated on failure)
  // ─────────────────────────────────────────────────────────────
  error?: {
    code: string; // e.g., "RATE_LIMIT", "AI_ERROR", "TIMEOUT"
    message: string;
    retryable: boolean;
    failedBatches?: number[]; // Which batches failed (for partial failures)
  };

  // ─────────────────────────────────────────────────────────────
  // TRANSACTION (Cost tracking)
  // ─────────────────────────────────────────────────────────────
  transaction?: {
    transactionId: string;
    totalCredits: number;
    totalCharge: number;
    tokenUsage: {
      promptTokenCount: number;
      candidatesTokenCount: number;
      totalTokenCount: number;
    };
  };

  // ─────────────────────────────────────────────────────────────
  // TIMESTAMPS
  // ─────────────────────────────────────────────────────────────
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp; // When processing started
  completedAt?: Timestamp; // When processing finished

  // ─────────────────────────────────────────────────────────────
  // TENANT ISOLATION
  // ─────────────────────────────────────────────────────────────
  sId: string; // Store ID
  tId: string; // Tenant ID
  uId: string; // User ID
}
```

### Example Job Document

**During Processing:**

```json
{
  "id": "job_abc123",
  "projectId": "14-default-15",
  "status": "processing",
  "progress": 45,
  "currentStep": "Processing batch 2 of 3...",

  "files": [
    {
      "uid": "14VA215",
      "name": "menu-page-1.jpg",
      "size": 104301,
      "type": "image/jpeg",
      "url": "https://..."
    },
    {
      "uid": "14K1715",
      "name": "menu-page-2.jpg",
      "size": 107210,
      "type": "image/jpeg",
      "url": "https://..."
    }
  ],
  "targetLanguages": [{ "code": "en", "name": "English" }],
  "action": "IMAGE_PROCESSING",

  "createdAt": { "seconds": 1733380200, "nanoseconds": 0 },
  "updatedAt": { "seconds": 1733380245, "nanoseconds": 0 },
  "startedAt": { "seconds": 1733380202, "nanoseconds": 0 },

  "sId": "15",
  "tId": "14",
  "uId": "bGtB7K2rFUI6abPrZhZ8"
}
```

**After Completion:**

```json
{
  "id": "job_abc123",
  "projectId": "14-default-15",
  "status": "completed",
  "progress": 100,
  "currentStep": "Completed",

  "files": [...],
  "targetLanguages": [...],

  "result": {
    "combinedData": {
      "categories": [
        { "id": 1, "sourceFileIndex": 0, "name": { "en": "Gel Polish Applications" } },
        { "id": 2, "sourceFileIndex": 1, "name": { "en": "Waxing Strip Less" } }
      ],
      "items": [
        { "id": 1, "sourceFileIndex": 0, "category": 1, "name": { "en": "Hand & Feet" }, "price": "1000" },
        { "id": 2, "sourceFileIndex": 1, "category": 2, "name": { "en": "test for the nails" }, "price": "100" }
      ],
      "languages": [{ "name": "English", "code": "en", "isPrimary": true }]
    },
    "qualityScore": 110,
    "qualityDetails": {
      "categoryQuality": 25,
      "itemQuality": 10,
      "descriptionQuality": 25,
      "priceQuality": 50
    },
    "processingTime": 88231
  },

  "fileResults": {
    "14VA215": { "categoriesCount": 1, "itemsCount": 3 },
    "14K1715": { "categoriesCount": 1, "itemsCount": 3 }
  },

  "transaction": {
    "transactionId": "txn_xyz789",
    "totalCredits": 0.5,
    "totalCharge": 0.025,
    "tokenUsage": {
      "promptTokenCount": 12500,
      "candidatesTokenCount": 2500,
      "totalTokenCount": 15000
    }
  },

  "completedAt": { "seconds": 1733380290, "nanoseconds": 0 },
  "sId": "15",
  "tId": "14",
  "uId": "bGtB7K2rFUI6abPrZhZ8"
}
```

---

## 5. Function Design

### File Structure

```
functions/src/
├── constants/
│   └── collections.ts          # Add MENU_IMAGE_PROCESSING_JOBS_COLLECTION
│
├── types.ts                    # Add MenuImageProcessingJob interface
│
├── logic/
│   ├── processMenuImages.ts    # Existing logic (to be refactored)
│   └── processMenuImagesJob.ts # NEW: Job-based processing logic
│
├── dev-triggers.ts             # ADD: dev_triggerProcessMenuImages
│
└── index.ts                    # Register trigger + dev callable
```

### Function Signatures

```typescript
// ═══════════════════════════════════════════════════════════════
// PRODUCTION: Firestore onCreate Trigger
// ═══════════════════════════════════════════════════════════════

// Triggered automatically when job document is created
exports.processMenuImagesJob = onDocumentCreated(
  {
    document: `${MENU_IMAGE_PROCESSING_JOBS_COLLECTION}/{jobId}`,
    ...ParallelProcessingOptions,
  },
  async (event) => {
    const jobId = event.params.jobId;
    const jobData = event.data?.data() as MenuImageProcessingJob;
    await processMenuImagesJobLogic(jobId, jobData);
  },
);

// ═══════════════════════════════════════════════════════════════
// DEVELOPMENT: Callable Trigger (Manual)
// ═══════════════════════════════════════════════════════════════

// Called by client after creating job document in emulator
export const dev_triggerProcessMenuImages = onCall(options, async (request) => {
  ensureDevEnvironment();
  const { jobId, jobData } = request.data;
  await processMenuImagesJobLogic(jobId, jobData);
  return { success: true };
});

// ═══════════════════════════════════════════════════════════════
// SHARED LOGIC
// ═══════════════════════════════════════════════════════════════

async function processMenuImagesJobLogic(
  jobId: string,
  job: MenuImageProcessingJob,
): Promise<void> {
  const jobRef = db
    .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
    .doc(jobId);

  try {
    // 1. Update status to processing
    await jobRef.update({
      status: "processing",
      startedAt: Timestamp.now(),
      currentStep: "Starting...",
      progress: 0,
    });

    // 2. Process images (existing logic from processMenuImages.ts)
    // Returns COMBINED data with sourceFileIndex on each category/item
    const result = await processMenuImagesLogic({
      files: job.files,
      targetLanguages: job.targetLanguages,
      projectId: job.projectId,
      action: job.action || "IMAGE_PROCESSING",
    });
    // result.data.data = { categories: [...], items: [...], languages: [...] }
    // Each category/item has sourceFileIndex: 0, 1, 2, etc.

    await jobRef.update({
      currentStep: "Redistributing data...",
      progress: 80,
    });

    // 3. Redistribute combined data to individual files by sourceFileIndex
    // Port from: src/components/templates/main-app/projects/utils/redistributeExtractedData.ts
    const fileMappings = job.files.map((file, index) => ({
      uid: file.uid,
      index,
    }));
    const redistributedData = redistributeAndTransformData(
      result.data,
      fileMappings,
    );
    // redistributedData = Map { "file1Uid" => ExtractedData, "file2Uid" => ExtractedData, ... }

    // 4. Save each file's extractedData to project + update languages
    await saveFilesToProject(
      job.projectId,
      redistributedData,
      job.files,
      result.data.data.languages || [],
    );

    // 5. Calculate per-file results for the job document
    const fileResults: {
      [uid: string]: { categoriesCount: number; itemsCount: number };
    } = {};
    redistributedData.forEach((data, fileUid) => {
      fileResults[fileUid] = {
        categoriesCount: data?.data?.categories?.length || 0,
        itemsCount: data?.data?.items?.length || 0,
      };
    });

    // 6. Update job as completed
    await jobRef.update({
      status: "completed",
      completedAt: Timestamp.now(),
      progress: 100,
      currentStep: "Completed",
      result: {
        combinedData: result.data.data, // Original combined data with sourceFileIndex
        qualityScore: result.data.qualityScore,
        qualityDetails: result.data.qualityDetails,
        processingTime: result.transaction.processingTime,
        batchResults: result.batchResults,
      },
      fileResults, // Per-file breakdown
      transaction: {
        transactionId: result.transaction.transactionId,
        totalCredits: result.transaction.totalCredits,
        totalCharge: result.transaction.totalCharge,
        tokenUsage: {
          promptTokenCount: result.transaction.promptTokenCount || 0,
          candidatesTokenCount: result.transaction.candidatesTokenCount || 0,
          totalTokenCount: result.transaction.totalTokenCount || 0,
        },
      },
    });
  } catch (error) {
    // 7. Update job as failed
    await jobRef.update({
      status: "failed",
      completedAt: Timestamp.now(),
      error: {
        code: getErrorCode(error),
        message: error.message,
        retryable: isRetryable(error),
      },
    });
  }
}
```

---

## 6. Client Integration

### Creating a Job

```typescript
// src/lib/firebase/menuProcessing.ts

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

const COLLECTION = "menuImageProcessingJobs";

export async function createMenuProcessingJob(params: {
  projectId: string;
  fileId: string;
  files: FileToProcess[];
  targetLanguages: LanguageType[];
  action?: string;
}): Promise<string> {
  const {
    projectId,
    fileId,
    files,
    targetLanguages,
    action = "IMAGE_PROCESSING",
  } = params;

  // Create job document with pending status
  const jobRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    fileId,
    files,
    targetLanguages,
    action,
    status: "pending",
    progress: 0,
    currentStep: "Queued",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Add tenant context
    sId: getCurrentStoreId(),
    tId: getCurrentTenantId(),
    uId: getCurrentUserId(),
  });

  // In development, manually trigger the function
  if (process.env.NODE_ENV === "development") {
    const triggerFn = httpsCallable(functions, "dev_triggerProcessMenuImages");
    await triggerFn({
      jobId: jobRef.id,
      jobData: {
        /* job data */
      },
    });
  }
  // In production, the onCreate trigger fires automatically

  return jobRef.id;
}
```

### Listening to Job Status

```typescript
// src/hooks/useMenuProcessingJob.ts

import { doc, onSnapshot } from "firebase/firestore";
import { useState, useEffect } from "react";

export function useMenuProcessingJob(jobId: string | null) {
  const [job, setJob] = useState<MenuImageProcessingJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "menuImageProcessingJobs", jobId),
      (snapshot) => {
        if (snapshot.exists()) {
          setJob(snapshot.data() as MenuImageProcessingJob);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Job listener error:", error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, [jobId]);

  return {
    job,
    isLoading,
    isPending: job?.status === "pending",
    isProcessing: job?.status === "processing",
    isCompleted: job?.status === "completed",
    isFailed: job?.status === "failed",
    progress: job?.progress ?? 0,
    currentStep: job?.currentStep ?? "",
    result: job?.result,
    error: job?.error,
  };
}
```

### UI Integration Example

```tsx
// Component usage example

function MenuProcessingStatus({ jobId }: { jobId: string }) {
  const {
    isProcessing,
    isCompleted,
    isFailed,
    progress,
    currentStep,
    result,
    error,
  } = useMenuProcessingJob(jobId);

  if (isProcessing) {
    return (
      <div>
        <Progress value={progress} />
        <p>{currentStep}</p>
      </div>
    );
  }

  if (isCompleted) {
    return <div>✅ Extracted {result.extractedData.items.length} items!</div>;
  }

  if (isFailed) {
    return (
      <div>
        ❌ {error.message}
        {error.retryable && <Button onClick={retry}>Retry</Button>}
      </div>
    );
  }

  return <Spinner />;
}
```

---

## 7. Data Architecture & Processing Flow (CRITICAL)

### Understanding the ACTUAL Data Model

**Key Principle: 1 Image = 1 File Entry**

```
Project (projectsData/{projectId})
├── files[]                           ← Array of file entries
│   ├── files[0] (uid: "14VA215")     ← Image 1
│   │   ├── name: "3.jpeg"
│   │   ├── url: "https://..."
│   │   ├── extractedData: {          ← ONLY data from THIS image
│   │   │   categories: [{ id: "14VA215c1", name: {...} }],
│   │   │   items: [{ id: "14VA215i1", category: "14VA215c1", ... }]
│   │   │ }
│   │   └── processingTime, type, size, etc.
│   │
│   ├── files[1] (uid: "14K1715")     ← Image 2 (SEPARATE file entry)
│   │   ├── name: "4.jpeg"
│   │   ├── url: "https://..."
│   │   └── extractedData: {          ← ONLY data from THIS image
│   │       categories: [{ id: "14K1715c3", name: {...} }],
│   │       items: [{ id: "14K1715i21", category: "14K1715c3", ... }]
│   │     }
│   │
│   └── files[2] (uid: "XYZ123")      ← Image 3 (added 1 month later)
│       └── extractedData: {...}       ← ONLY data from THIS image
│
└── config, languages, etc.
```

**Each file has:**

- Its own `uid` (e.g., `14VA215`)
- Its own `extractedData` with categories/items **specific to that image**
- IDs prefixed with file uid (e.g., `14VA215c1`, `14VA215i1`)

---

### How sourceFileIndex Works (AI → Client Redistribution)

When user uploads 6 images in one job:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PROCESSING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

1. CLIENT: User uploads 6 images
   ├── Image 0: menu-page-1.jpg (uid: "ABC001")
   ├── Image 1: menu-page-2.jpg (uid: "ABC002")
   ├── Image 2: menu-page-3.jpg (uid: "ABC003")
   ├── Image 3: menu-page-4.jpg (uid: "ABC004")
   ├── Image 4: menu-page-5.jpg (uid: "ABC005")
   └── Image 5: menu-page-6.jpg (uid: "ABC006")

2. FUNCTION: AI processes all 6 images together
   Returns COMBINED data with sourceFileIndex:
   {
     "categories": [
       { "id": 1, "sourceFileIndex": 0, "name": {"en": "Starters"} },
       { "id": 2, "sourceFileIndex": 1, "name": {"en": "Main Course"} },
       { "id": 3, "sourceFileIndex": 2, "name": {"en": "Desserts"} },
       ...
     ],
     "items": [
       { "id": 1, "sourceFileIndex": 0, "category": 1, "name": {...} },  ← From image 0
       { "id": 2, "sourceFileIndex": 0, "category": 1, "name": {...} },  ← From image 0
       { "id": 3, "sourceFileIndex": 1, "category": 2, "name": {...} },  ← From image 1
       { "id": 4, "sourceFileIndex": 2, "category": 3, "name": {...} },  ← From image 2
       ...
     ]
   }

3. CLIENT: redistributeExtractedData() splits by sourceFileIndex
   ├── File ABC001 gets: categories/items with sourceFileIndex: 0
   ├── File ABC002 gets: categories/items with sourceFileIndex: 1
   ├── File ABC003 gets: categories/items with sourceFileIndex: 2
   └── ... and so on

4. CLIENT: transformIdsForFile() prefixes IDs with file uid
   ├── File ABC001: category "1" → "ABC001c1", item "1" → "ABC001i1"
   ├── File ABC002: category "2" → "ABC002c2", item "3" → "ABC002i3"
   └── ...

5. CLIENT: Saves to Firestore
   Project.files = [
     { uid: "ABC001", extractedData: { categories: [...], items: [...] } },
     { uid: "ABC002", extractedData: { categories: [...], items: [...] } },
     { uid: "ABC003", extractedData: { categories: [...], items: [...] } },
     { uid: "ABC004", extractedData: { categories: [...], items: [...] } },
     { uid: "ABC005", extractedData: { categories: [...], items: [...] } },
     { uid: "ABC006", extractedData: { categories: [...], items: [...] } }
   ]
```

---

### Your Scenario: Job 1 (6 images) + Job 2 (1 image later)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    JOB 1: First Time - 6 Images                          │
└─────────────────────────────────────────────────────────────────────────┘

User uploads: img1, img2, img3, img4, img5, img6
Result: Project.files = [
  { uid: "14VA215", extractedData: { ... } },  ← 1 category, 3 items
  { uid: "14K1715", extractedData: { ... } },  ← 1 category, 3 items
  { uid: "...", extractedData: { ... } },
  { uid: "...", extractedData: { ... } },
  { uid: "...", extractedData: { ... } },
  { uid: "...", extractedData: { ... } }
]
Total: 6 files, each with its own data


┌─────────────────────────────────────────────────────────────────────────┐
│                    JOB 2: One Month Later - 1 Image                      │
└─────────────────────────────────────────────────────────────────────────┘

User uploads: new_menu_img
Result: Project.files = [
  { uid: "14VA215", extractedData: { ... } },  ← UNTOUCHED
  { uid: "14K1715", extractedData: { ... } },  ← UNTOUCHED
  { uid: "...", extractedData: { ... } },       ← UNTOUCHED
  { uid: "...", extractedData: { ... } },       ← UNTOUCHED
  { uid: "...", extractedData: { ... } },       ← UNTOUCHED
  { uid: "...", extractedData: { ... } },       ← UNTOUCHED
  { uid: "NEW123", extractedData: { ... } }    ← NEW FILE ADDED (Job 2)
]
Total: 7 files, old 6 preserved, 1 new added


CLIENT DISPLAYS: All items from all 7 files combined in Editor UI
```

**There is NO merging.** Each job adds new file entries to the array. Old files are never touched.

---

### sourceFileIndex is Always Required

The AI prompt in `parallelProcessingPrompt.ts` **enforces** `sourceFileIndex` on every category and item. This is not optional.

If AI fails to include `sourceFileIndex`, the job should **fail** rather than silently degrade. The server validates this during redistribution.

> **Note:** The legacy `combinedWithFileId` field in `ProjectFileType` is deprecated and not used by the job queue implementation.

---

## 7.1 Batch Processing Deep Dive (15 Images Example)

### Overview: How Batches Work

When a user uploads **15 images**, the system splits them into **2 batches**:

- **Batch 1**: Images 0-9 (10 images)
- **Batch 2**: Images 10-14 (5 images)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    15 IMAGES UPLOAD WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User uploads 15 images                                             │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────┐                    │
│  │ Step 1: Upload ALL 15 files to Gemini       │                    │
│  │         (Promise.all - parallel)            │                    │
│  └─────────────────────────────────────────────┘                    │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────┐                    │
│  │ Step 2: Chunk into batches                  │                    │
│  │         MAX_IMAGES_PER_BATCH = 10           │                    │
│  │         Batch 1: [0-9]   Batch 2: [10-14]   │                    │
│  └─────────────────────────────────────────────┘                    │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────┐                    │
│  │ Step 3: Process batches SEQUENTIALLY        │                    │
│  │                                             │                    │
│  │  Batch 1 (10 images) ────────────────────►  │                    │
│  │     │                                       │                    │
│  │     ├── AI returns: categories + items      │                    │
│  │     │   with sourceFileIndex: 0-9           │                    │
│  │     │                                       │                    │
│  │     ▼                                       │                    │
│  │  (wait 1000ms exponential backoff)          │                    │
│  │     │                                       │                    │
│  │     ▼                                       │                    │
│  │  Batch 2 (5 images) ─────────────────────►  │                    │
│  │     │                                       │                    │
│  │     ├── Gets "existing categories" context  │                    │
│  │     │   from Batch 1 (category continuation)│                    │
│  │     │                                       │                    │
│  │     ├── AI returns: categories + items      │                    │
│  │     │   with sourceFileIndex: 0-4           │                    │
│  │     │                                       │                    │
│  │     ▼                                       │                    │
│  │  mergeExtractedData() adjusts offset        │                    │
│  │     │                                       │                    │
│  │     ├── Batch 2 sourceFileIndex += 10       │                    │
│  │     │   (becomes 10-14)                     │                    │
│  │     │                                       │                    │
│  │     ▼                                       │                    │
│  │  Combined result: 15 files worth of data    │                    │
│  └─────────────────────────────────────────────┘                    │
│           │                                                         │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────┐                    │
│  │ Step 4: Return combined data                │                    │
│  │         with sourceFileIndex: 0-14          │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Key Questions Answered

#### Q1: When is a job marked as COMPLETE?

**After ALL batches finish processing**, regardless of individual batch success/failure.

```typescript
// processMenuImages.ts:L670-726
for (let batchIndex = 0; batchIndex < fileBatches.length; batchIndex++) {
  // ... process batch ...

  if (batchResult.success && batchResult.data) {
    // Merge successful batch data
    accumulatedData = mergeExtractedData(
      accumulatedData,
      batchResult.data,
      sourceFileOffset,
    );
  } else {
    // Track failed batch - BUT CONTINUE TO NEXT BATCH
    allFailedFileIndices.push(...batchResult.failedFileIndices);
    logger.warn(
      `Batch ${batchIndex + 1} failed, continuing with remaining batches`,
    );
  }

  sourceFileOffset += batch.length;
}
// After loop completes → Job is "complete"
```

| Scenario     | Batch 1 | Batch 2 | Job Status  | Result                                |
| ------------ | ------- | ------- | ----------- | ------------------------------------- |
| Both succeed | ✅      | ✅      | `completed` | Full data (15 images)                 |
| First fails  | ❌      | ✅      | `completed` | Partial data (5 images from batch 2)  |
| Second fails | ✅      | ❌      | `completed` | Partial data (10 images from batch 1) |
| Both fail    | ❌      | ❌      | `completed` | Empty data, failedFileIndices: [0-14] |

**Note:** Job only goes to `failed` status if a CRITICAL error occurs (rate limit, no files uploaded, exception thrown).

---

#### Q2: Error Handling

```typescript
// processMenuImages.ts:L714-723
} else {
    // Track failed batch - does NOT throw, does NOT stop
    allFailedFileIndices.push(...batchResult.failedFileIndices);
    batchMessages.push(batchResult.message);
    logger.warn(`[processMenuImages] Batch ${batchIndex + 1} failed, continuing with remaining batches`, {
        requestId,
        batchIndex,
        failedIndices: batchResult.failedFileIndices,
    });
}
```

**Error tracking includes:**

- `failedFileIndices: number[]` - Which file indices failed
- `batchMessages: string[]` - Error messages from each batch
- `batchResults[]` - Complete record of each batch's success/failure

**In the final response:**

```typescript
// processMenuImages.ts:L746-756
if (allFailedFileIndices.length > 0) {
  combinedMessage = `Some images failed to process (indices: ${allFailedFileIndices.join(
    ", ",
  )}). `;
}
```

---

#### Q3: Does job FAIL if first batch fails?

**NO!** Processing CONTINUES to the next batch.

```typescript
// processMenuImages.ts:L718-722
logger.warn(
  `[processMenuImages] Batch ${
    batchIndex + 1
  } failed, continuing with remaining batches`,
  {
    requestId,
    batchIndex,
    failedIndices: batchResult.failedFileIndices,
  },
);
// Loop continues to next batch...
```

**The loop does NOT break on failure.** It logs a warning and continues.

---

#### Q4: Does combined data have BOTH batches?

**YES!** The `mergeExtractedData()` function combines data from all successful batches.

```typescript
// processMenuImages.ts:L377-408
function mergeExtractedData(
  accumulated: ExtractedMenuData,
  newData: ExtractedMenuData,
  sourceFileOffset: number, // For batch 2, this is 10
): ExtractedMenuData {
  // Adjust sourceFileIndex for batch 2 items (add offset)
  const adjustedItems = newData.items.map((item) => ({
    ...item,
    sourceFileIndex: (item as any).sourceFileIndex + sourceFileOffset,
    // Batch 2 item with sourceFileIndex: 2 becomes sourceFileIndex: 12
  }));

  // Merge categories (deduplicate by ID for category continuation)
  const uniqueNewCategories = adjustedCategories.filter(
    (c) => !existingCategoryIds.has(String(c.id)),
  );

  return {
    languages:
      accumulated.languages.length > 0
        ? accumulated.languages
        : newData.languages,
    categories: [...accumulated.categories, ...uniqueNewCategories],
    items: [...accumulated.items, ...adjustedItems],
  };
}
```

**Example result after both batches:**

```json
{
  "combinedData": {
    "categories": [
      { "id": 1, "sourceFileIndex": 0, "name": { "en": "Appetizers" } },
      { "id": 2, "sourceFileIndex": 5, "name": { "en": "Main Course" } },
      { "id": 3, "sourceFileIndex": 12, "name": { "en": "Desserts" } }
    ],
    "items": [
      {
        "id": 1,
        "sourceFileIndex": 0,
        "category": 1,
        "name": { "en": "Spring Rolls" }
      },
      {
        "id": 2,
        "sourceFileIndex": 3,
        "category": 1,
        "name": { "en": "Soup" }
      },
      {
        "id": 3,
        "sourceFileIndex": 10,
        "category": 3,
        "name": { "en": "Ice Cream" }
      },
      {
        "id": 4,
        "sourceFileIndex": 14,
        "category": 3,
        "name": { "en": "Cake" }
      }
    ]
  }
}
```

Note how `sourceFileIndex` ranges from 0-14 across both batches.

---

### Category Continuation Between Batches

When batch 2 starts, it receives context from batch 1:

```typescript
// processMenuImages.ts:L686-689
const existingContext =
  batchIndex > 0 && accumulatedData.categories.length > 0
    ? buildExistingCategoriesContext(
        accumulatedData.categories,
        accumulatedData.items,
      )
    : undefined;
```

This allows AI to:

- **Reuse existing category IDs** if the same category appears in batch 2
- **Avoid duplicate categories** across batches
- **Maintain consistent naming**

---

### Batch Processing Constants

```typescript
// constants/ai.ts
export const MAX_IMAGES_PER_BATCH = 10;
export const BASE_DELAY_BETWEEN_BATCHES_MS = 1000;
export const MAX_DELAY_BETWEEN_BATCHES_MS = 8000;
```

**Delay pattern (exponential backoff):**

- Before batch 1: 0ms
- Before batch 2: 1000ms
- Before batch 3: 2000ms
- Before batch 4: 4000ms
- Before batch 5+: 8000ms (capped)

---

### Job Document Structure for Batch Results

```typescript
// In completed job document
{
  "result": {
    "combinedData": { /* merged data from all batches */ },
    "batchResults": [
      { "batchIndex": 0, "success": true, "filesProcessed": 10 },
      { "batchIndex": 1, "success": true, "filesProcessed": 5 }
    ]
  },
  "error": {
    "failedBatches": [0],  // If batch 1 failed
    "message": "Batch 1 failed: AI returned empty response"
  }
}
```

---

## 7.2 Per-File Message Handling (⚠️ GAP IDENTIFIED)

### Current Problem

The current AI prompt treats `message` as a **batch-level** field with no granularity:

```typescript
// Current AI response structure
{
  "message": "Some items unclear...",  // ONE message for entire batch!
  "data": { categories: [...], items: [...] }
}
```

**Problems with Current Approach:**

| Scenario                   | Current Behavior        | User Experience             |
| -------------------------- | ----------------------- | --------------------------- |
| 1 of 10 images blurry      | `"One image is blurry"` | "Which one??" 🤷            |
| 2 items unclear in image 3 | `"Some items omitted"`  | "Which items? Which file??" |
| Price unclear for 1 item   | `"Some values unclear"` | No idea which item          |
| Category name unreadable   | Generic message         | Can't identify issue        |

**Reference from AI Prompt** (`parallelProcessingPrompt.ts:L82-83`):

> "Unclear Text: If an item name, category, or any value is not clearly visible, it should be completely omitted; do not guess and add it to message field with clear detailed description."

Currently this "clear detailed description" has **no structure** for per-file or per-item tracking.

---

### All Possible Message Scenarios

#### Level 1: File-Level Issues (Entire Image)

| Status    | Scenario                    | Example Message                                                      |
| --------- | --------------------------- | -------------------------------------------------------------------- |
| `error`   | Image completely unreadable | "Image is too blurry or low resolution. Unable to extract any data." |
| `error`   | Image corrupted/invalid     | "Unable to process image. File may be corrupted."                    |
| `error`   | Image contains no menu data | "No menu content detected in this image."                            |
| `warning` | Image partially readable    | "Bottom portion of image is cut off. Some items may be missing."     |
| `warning` | Low quality but extracted   | "Low image quality. Extracted data may contain inaccuracies."        |
| `warning` | Handwritten menu            | "Handwritten text detected. Please verify extracted items."          |

#### Level 2: Content-Level Issues (Specific Values Omitted)

When specific items/values are **omitted** (not extracted) due to unclear text:

| Type           | Scenario                  | What AI Does                   | Message Detail                                                         |
| -------------- | ------------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Item name      | "Spring R\*\*\*s" unclear | Item omitted entirely          | "Omitted 1 item: name unclear (row 3, appears to start with 'Spring')" |
| Item price     | Price text smudged        | Item extracted, price empty    | "Item 'Butter Chicken': price unclear, omitted"                        |
| Category name  | Header text blurry        | Category as "Uncategorized"    | "1 category name unclear, items grouped under 'Uncategorized'"         |
| Description    | Description faded         | Item extracted, no description | "Item 'Biryani': description unclear, omitted"                         |
| Multiple items | 2 of 10 items unclear     | 8 items extracted              | "Omitted 2 items due to unclear text (rows 5, 8)"                      |
| Attributes     | Variant text unclear      | Attribute omitted              | "Item 'Pizza': 1 size variant unclear, omitted"                        |

#### Level 3: Data Quality Warnings (Extracted but Uncertain)

| Scenario                 | What AI Does             | Message Detail                                                    |
| ------------------------ | ------------------------ | ----------------------------------------------------------------- |
| Possible OCR error       | Extracted with warning   | "Item 'Chicken Tikka': price '1S0' may be OCR error for '150'"    |
| Ambiguous text           | Best guess extracted     | "Category 'Slarters' may be 'Starters' - please verify"           |
| Multiple languages mixed | Extracted primary        | "Mixed language detected. Extracted primary language only."       |
| Currency ambiguous       | Extracted without symbol | "Prices extracted without currency symbol. Please verify format." |

---

### Proposed Solution: Enhanced `fileMessages` Structure

```typescript
// NEW AI Response Structure
{
  "message": "",  // Keep for critical all-fail scenarios only
  "fileMessages": [
    {
      "sourceFileIndex": number,      // Which image (0-indexed)
      "status": "error" | "warning",  // Severity level
      "type": string,                 // Issue category
      "message": string,              // Human-readable description
      "details": {                    // Optional: Specific items affected
        "omittedItems": [...],        // Items that couldn't be extracted
        "affectedFields": [...]       // Specific fields with issues
      }
    }
  ],
  "data": { categories: [...], items: [...] }
}
```

---

### Complete Type Definition

```typescript
// FileMessage Types
type FileMessageStatus = "error" | "warning";

type FileMessageType =
  // File-level issues
  | "image_unreadable" // Entire image too blurry/corrupted
  | "no_menu_content" // Image doesn't contain menu data
  | "image_partial" // Part of image cut off or unclear
  | "low_quality" // Low quality but extracted
  // Content-level issues
  | "items_omitted" // Some items couldn't be extracted
  | "category_unclear" // Category name unclear
  | "values_omitted" // Specific values (price, desc) omitted
  // Quality warnings
  | "ocr_uncertain" // Possible OCR errors
  | "verify_required"; // Manual verification recommended

interface OmittedItemDetail {
  position?: string; // "row 3", "bottom-left section"
  partialName?: string; // What AI could read: "Spring R***"
  reason: string; // "name unclear", "price smudged"
}

interface AffectedFieldDetail {
  itemId?: number; // If item was extracted but field missing
  itemName?: string; // For reference: "Butter Chicken"
  field: string; // "price" | "description" | "attributes"
  reason: string; // "text faded", "overlapping text"
}

interface FileMessageDetails {
  omittedItems?: OmittedItemDetail[];
  affectedFields?: AffectedFieldDetail[];
  omittedCount?: number; // Quick count: "3 items omitted"
  extractedCount?: number; // "8 of 11 items extracted"
}

interface FileMessage {
  sourceFileIndex: number;
  status: FileMessageStatus;
  type: FileMessageType;
  message: string; // Human-readable summary
  details?: FileMessageDetails;
}
```

---

### Scenario Examples with Full Response Structure

#### Scenario 1: One Image Completely Blurry (Error)

**Input:** 10 images, image 9 is blurry

```json
{
  "message": "",
  "fileMessages": [
    {
      "sourceFileIndex": 9,
      "status": "error",
      "type": "image_unreadable",
      "message": "Image is too blurry or low resolution. Unable to extract any data."
    }
  ],
  "data": {
    "languages": [...],
    "categories": [/* from images 0-8 */],
    "items": [/* from images 0-8 */]
  }
}
```

#### Scenario 2: Partial Extraction - 2 of 10 Items Unclear (Warning)

**Input:** 1 image with 10 menu items, 2 item names unclear

```json
{
  "message": "",
  "fileMessages": [
    {
      "sourceFileIndex": 0,
      "status": "warning",
      "type": "items_omitted",
      "message": "2 items omitted due to unclear text.",
      "details": {
        "omittedCount": 2,
        "extractedCount": 8,
        "omittedItems": [
          {
            "position": "row 5",
            "partialName": "Spr*** R***s",
            "reason": "Item name partially obscured"
          },
          {
            "position": "row 8",
            "partialName": null,
            "reason": "Item text completely illegible"
          }
        ]
      }
    }
  ],
  "data": {
    "categories": [...],
    "items": [/* 8 successfully extracted items */]
  }
}
```

#### Scenario 3: Item Extracted but Price Unclear (Warning)

**Input:** 1 image, item "Butter Chicken" has smudged price

```json
{
  "message": "",
  "fileMessages": [
    {
      "sourceFileIndex": 0,
      "status": "warning",
      "type": "values_omitted",
      "message": "1 item extracted with missing price.",
      "details": {
        "affectedFields": [
          {
            "itemId": 4,
            "itemName": "Butter Chicken",
            "field": "price",
            "reason": "Price text smudged/unclear"
          }
        ]
      }
    }
  ],
  "data": {
    "items": [
      {
        "id": 4,
        "name": { "en": "Butter Chicken" },
        "category": 2,
        "price": ""
      }
    ]
  }
}
```

#### Scenario 4: Category Name Unclear (Warning)

**Input:** Image has 3 categories, 1 header is blurry

```json
{
  "message": "",
  "fileMessages": [
    {
      "sourceFileIndex": 0,
      "status": "warning",
      "type": "category_unclear",
      "message": "1 category name unclear. Items grouped under 'Uncategorized'.",
      "details": {
        "affectedFields": [
          {
            "field": "category_name",
            "reason": "Category header text blurry (appears to be 'M*** C***')"
          }
        ]
      }
    }
  ],
  "data": {
    "categories": [
      { "id": 1, "name": { "en": "Starters" }, "sourceFileIndex": 0 },
      { "id": 2, "name": { "en": "Uncategorized" }, "sourceFileIndex": 0 },
      { "id": 3, "name": { "en": "Desserts" }, "sourceFileIndex": 0 }
    ]
  }
}
```

#### Scenario 5: Multiple Issues in Multiple Files (Complex)

**Input:** 10 images with various issues

```json
{
  "message": "",
  "fileMessages": [
    {
      "sourceFileIndex": 2,
      "status": "warning",
      "type": "items_omitted",
      "message": "3 items omitted due to unclear text.",
      "details": { "omittedCount": 3, "extractedCount": 7 }
    },
    {
      "sourceFileIndex": 5,
      "status": "warning",
      "type": "values_omitted",
      "message": "2 items have missing prices.",
      "details": {
        "affectedFields": [
          { "itemName": "Soup", "field": "price", "reason": "unclear" },
          { "itemName": "Salad", "field": "price", "reason": "cut off" }
        ]
      }
    },
    {
      "sourceFileIndex": 9,
      "status": "error",
      "type": "image_unreadable",
      "message": "Image too blurry. No data extracted."
    }
  ],
  "data": {
    /* data from images 0-8 excluding omitted items */
  }
}
```

#### Scenario 6: All Images Failed (Critical Error)

**Input:** 5 images, all unreadable

```json
{
  "message": "Unable to extract menu data from any image. All images are too blurry or low resolution.",
  "fileMessages": [
    {
      "sourceFileIndex": 0,
      "status": "error",
      "type": "image_unreadable",
      "message": "Image too blurry"
    },
    {
      "sourceFileIndex": 1,
      "status": "error",
      "type": "image_unreadable",
      "message": "Image too dark"
    },
    {
      "sourceFileIndex": 2,
      "status": "error",
      "type": "image_unreadable",
      "message": "Image corrupted"
    },
    {
      "sourceFileIndex": 3,
      "status": "error",
      "type": "image_unreadable",
      "message": "Image too blurry"
    },
    {
      "sourceFileIndex": 4,
      "status": "error",
      "type": "no_menu_content",
      "message": "No menu content detected"
    }
  ],
  "data": {}
}
```

---

### Scalability & Reliability Analysis

#### Why This Approach Scales

| Aspect               | How It Scales                                                  |
| -------------------- | -------------------------------------------------------------- |
| **Batch Processing** | `sourceFileIndex` + offset adjustment works for any batch size |
| **Multiple Batches** | `mergeExtractedData()` combines fileMessages with offset       |
| **Sparse Messages**  | Only files with issues get entries (not 100 success entries)   |
| **Flexible Detail**  | `details` is optional - AI includes only when relevant         |
| **Type Safety**      | Enum types prevent invalid status/type combinations            |

#### Reliability Guarantees

```typescript
// 1. Always have fallback if fileMessages missing
const messages = response.fileMessages || [];

// 2. Always have fallback if details missing
const omittedCount = msg.details?.omittedCount || 0;

// 3. Detect files with no data even without messages
const filesWithNoData = detectFilesWithNoExtractedData(response, files);

// 4. Merge handles undefined gracefully
const merged = [
  ...(accumulated.fileMessages || []),
  ...(adjustedFileMessages || []),
];
```

#### Message Size Consideration

```
Typical message size:
- Simple error: ~100 bytes
- Warning with 3 omitted items: ~300 bytes
- Complex warning with 10 affected fields: ~800 bytes

Worst case (10 files, all with complex warnings):
- 10 × 800 bytes = 8KB additional payload
- Negligible compared to extracted data (typically 50-500KB)
```

---

### Implementation Changes Required

#### 1. Update AI Prompt (`parallelProcessingPrompt.ts`)

Add to MESSAGE FIELD section:

```
# MESSAGE FIELD RULES

## Top-Level "message" Field
- Empty string ("") if ANY data was extracted successfully
- Non-empty ONLY if ALL images failed completely

## "fileMessages" Array (REQUIRED for issues)
Track per-file issues using sourceFileIndex. Only include entries for files WITH issues.

STATUS TYPES:
- "error": No data could be extracted from this file
- "warning": Partial data extracted, some issues detected

TYPE VALUES:
- "image_unreadable": Entire image too blurry/corrupted
- "no_menu_content": Image doesn't contain menu data
- "items_omitted": Some items couldn't be extracted
- "values_omitted": Specific values (price, description) missing
- "category_unclear": Category name couldn't be read
- "ocr_uncertain": Possible OCR errors, verify recommended

RULES FOR OMITTED ITEMS:
When omitting items due to unclear text:
1. DO NOT guess or include uncertain data
2. MUST add fileMessage with type "items_omitted"
3. MUST include details.omittedCount
4. SHOULD include details.omittedItems with position/partialName when possible

EXAMPLE - 10 items visible, 2 unclear:
{
  "message": "",
  "fileMessages": [{
    "sourceFileIndex": 0,
    "status": "warning",
    "type": "items_omitted",
    "message": "2 items omitted due to unclear text.",
    "details": {
      "omittedCount": 2,
      "extractedCount": 8,
      "omittedItems": [
        { "position": "row 5", "partialName": "Spr***", "reason": "name unclear" },
        { "position": "row 8", "reason": "text illegible" }
      ]
    }
  }],
  "data": { /* 8 extracted items */ }
}
```

#### 2. Update Types

##### A. Server Types (`functions/src/types.ts`)

```typescript
// File Message Types - Used in AI response and batch processing
export type FileMessageStatus = "error" | "warning";

export type FileMessageType =
  | "image_unreadable"
  | "no_menu_content"
  | "image_partial"
  | "low_quality"
  | "items_omitted"
  | "category_unclear"
  | "values_omitted"
  | "ocr_uncertain"
  | "verify_required";

export interface OmittedItemDetail {
  position?: string;
  partialName?: string;
  reason: string;
}

export interface AffectedFieldDetail {
  itemId?: number;
  itemName?: string;
  field: string;
  reason: string;
}

export interface FileMessageDetails {
  omittedItems?: OmittedItemDetail[];
  affectedFields?: AffectedFieldDetail[];
  omittedCount?: number;
  extractedCount?: number;
}

export interface FileMessage {
  sourceFileIndex: number;
  status: FileMessageStatus;
  type: FileMessageType;
  message: string;
  details?: FileMessageDetails;
}

// AI Response structure (combined for batch)
export interface ExtractedMenuData {
  languages: Language[];
  categories: MenuCategory[];
  items: MenuItem[];
  fileMessages?: FileMessage[]; // NEW: Combined messages for all files in batch
}
```

##### B. Client Types (`src/components/templates/main-app/projects/type.ts`)

**Updated Implementation (New Approach - No Backwards Compatibility):**

```typescript
// FileMessage type for detailed per-file messages
export interface FileMessage {
  sourceFileIndex: number;
  status: "error" | "warning";
  type: FileMessageType;
  message: string;
  details?: {
    omittedItems?: {
      position?: string;
      partialName?: string;
      reason: string;
    }[];
    affectedFields?: {
      itemId?: number;
      itemName?: string;
      field: string;
      reason: string;
    }[];
    omittedCount?: number;
    extractedCount?: number;
  };
}

// Updated ExtractedData - NEW APPROACH (replace old message field)
export interface ExtractedData {
  processingMessages?: FileMessage[]; // NEW: Replaces old message string
  data: {
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
    languages: ExtractedDataLanguage[];
  };
}
```

**Migration Note:**

- The old `message: string` field is deprecated and removed
- All existing projects with empty `message: ""` are unaffected
- Projects with non-empty messages will need migration (rare edge case)

#### 3. Update `mergeExtractedData()` in `processMenuImages.ts`

```typescript
function mergeExtractedData(
  accumulated: ExtractedMenuData,
  newData: ExtractedMenuData,
  sourceFileOffset: number,
): ExtractedMenuData {
  // ... existing merge logic for categories, items ...

  // NEW: Merge file messages with offset adjustment
  const adjustedFileMessages = (newData.fileMessages || []).map((msg) => ({
    ...msg,
    sourceFileIndex: msg.sourceFileIndex + sourceFileOffset,
    // Adjust itemIds in details if present
    details: msg.details
      ? {
          ...msg.details,
          affectedFields: msg.details.affectedFields?.map((field) => ({
            ...field,
            itemId:
              field.itemId !== undefined
                ? field.itemId + itemIdOffset // Need to track item ID offset too
                : undefined,
          })),
        }
      : undefined,
  }));

  return {
    languages: mergedLanguages,
    categories: mergedCategories,
    items: mergedItems,
    fileMessages: [
      ...(accumulated.fileMessages || []),
      ...adjustedFileMessages,
    ],
  };
}
```

#### 4. Update `redistributeExtractedData.ts`

The key is to populate **both** `message` (string) and `processingMessages` (array) during redistribution for backwards compatibility.

```typescript
import { FileMessage } from "./type"; // Or shared types

/**
 * Redistribute file messages from combined AI response to per-file storage
 * Returns a Map of file UID to array of messages for that file
 */
export function redistributeFileMessages(
  fileMessages: FileMessage[] | undefined,
  files: Array<{ uid: string; index: number }>,
): Map<string, FileMessage[]> {
  const messageMap = new Map<string, FileMessage[]>();

  // Initialize empty arrays for all files
  files.forEach((f) => messageMap.set(f.uid, []));

  if (!fileMessages) return messageMap;

  fileMessages.forEach((msg) => {
    const file = files.find((f) => f.index === msg.sourceFileIndex);
    if (file) {
      const existing = messageMap.get(file.uid) || [];
      messageMap.set(file.uid, [...existing, msg]);
    }
  });

  return messageMap;
}

/**
 * Generate a simple summary string from detailed messages
 * This populates the backwards-compatible `message` field
 */
export function getFileSummary(messages: FileMessage[]): {
  hasError: boolean;
  hasWarning: boolean;
  summary: string; // ← This becomes file.extractedData.message
} {
  const hasError = messages.some((m) => m.status === "error");
  const hasWarning = messages.some((m) => m.status === "warning");

  if (hasError) {
    const errorMsg = messages.find((m) => m.status === "error");
    return {
      hasError: true,
      hasWarning,
      summary: errorMsg?.message || "Error processing file",
    };
  }

  if (hasWarning) {
    const warnings = messages.filter((m) => m.status === "warning");
    const totalOmitted = warnings.reduce(
      (sum, w) => sum + (w.details?.omittedCount || 0),
      0,
    );
    return {
      hasError: false,
      hasWarning: true,
      summary:
        totalOmitted > 0
          ? `${totalOmitted} items omitted due to unclear text`
          : warnings[0]?.message || "Some values unclear",
    };
  }

  return {
    hasError: false,
    hasWarning: false,
    summary: "", // Empty string = no issues (backwards compatible)
  };
}

/**
 * Assign messages to redistributed file data
 * Populates processingMessages array only (no backwards-compatible message field)
 */
export function assignMessagesToExtractedData(
  redistributedData: Map<string, ExtractedData>,
  fileMessagesMap: Map<string, FileMessage[]>,
): void {
  redistributedData.forEach((extractedData, fileUid) => {
    const messages = fileMessagesMap.get(fileUid) || [];

    // Only populate processingMessages if there are messages
    extractedData.processingMessages =
      messages.length > 0 ? messages : undefined;
  });
}
```

#### 5. Client-Side Integration (`index.tsx`)

**Data Flow:**

```
AI Response (batch)          Client Redistribution           Per-File Storage
─────────────────────────    ────────────────────────        ──────────────────
{                            redistributeFileMessages()      file.extractedData = {
  fileMessages: [            assignMessagesToExtractedData()   processingMessages: [...],
    {sourceFileIndex: 0,     ────────────────────────────►     data: {...}
     message: "2 items..."}                                  }
  ],
  data: {...}
}
```

```typescript
// In index.tsx - processFilesInParallel or handleUploadAndContinue

// Step 1: Get combined AI response (already has fileMessages from job)
const combinedResponse = jobResult.extractedData;

// Step 2: Redistribute menu data to individual files (existing logic)
const redistributedData = redistributeExtractedData(
  combinedResponse,
  filesToProcess.map((f, i) => ({ uid: f.uid, index: i })),
);

// Step 3: Redistribute file messages
const fileMessagesMap = redistributeFileMessages(
  combinedResponse.fileMessages,
  filesToProcess.map((f, i) => ({ uid: f.uid, index: i })),
);

// Step 4: Assign messages to each file's extractedData
assignMessagesToExtractedData(redistributedData, fileMessagesMap);

// Step 5: Update project files (existing logic, now includes processingMessages)
filesToProcess.forEach((file, index) => {
  const fileIndex = projectDataCopy.files.findIndex((f) => f.uid === file.uid);
  if (fileIndex !== -1) {
    const fileExtractedData = redistributedData.get(file.uid);

    projectDataCopy.files[fileIndex] = {
      ...projectDataCopy.files[fileIndex],
      extractedData: fileExtractedData, // Now includes processingMessages
    };
  }
});
```

#### 6. Storage Structure (Final)

```json
// projectSampleData.json - Per-file storage
{
  "files": [
    {
      "uid": "14VA215",
      "extractedData": {
        "qualityScore": 110,
        "processingMessages": [  // NEW: Only this array, no old message field
          {
            "sourceFileIndex": 0,
            "status": "warning",
            "type": "items_omitted",
            "message": "2 items omitted due to unclear text.",
            "details": {
              "omittedCount": 2,
              "extractedCount": 8,
              "omittedItems": [
                { "position": "row 5", "partialName": "Spr***", "reason": "name unclear" }
              ]
            }
          }
        ],
        "data": {
          "categories": [...],
          "items": [...],
          "languages": [...]
        }
      }
    }
  ]
}
```

#### 7. UI Display (`EditorContent.tsx`)

**Updated UI (Uses processingMessages only):**

```tsx
{
  file.extractedData?.processingMessages?.length > 0 && (
    <Alert
      message={file.extractedData.processingMessages[0].message}
      type={
        file.extractedData.processingMessages.some((m) => m.status === "error")
          ? "error"
          : "warning"
      }
      description={
        file.extractedData.processingMessages[0]?.details && (
          <div>
            {file.extractedData.processingMessages[0].details.extractedCount} of{" "}
            {(file.extractedData.processingMessages[0].details.extractedCount ||
              0) +
              (file.extractedData.processingMessages[0].details.omittedCount ||
                0)}{" "}
            items extracted
            <ul style={{ marginTop: 8, paddingLeft: 16 }}>
              {file.extractedData.processingMessages[0].details.omittedItems?.map(
                (item, idx) => (
                  <li key={idx}>
                    {item.position}:{" "}
                    {item.partialName ? `"${item.partialName}"` : ""} -{" "}
                    {item.reason}
                  </li>
                ),
              )}
            </ul>
          </div>
        )
      }
    />
  );
}
```

**Helper function for UI:**

```tsx
// Get summary message from processingMessages array
function getProcessingSummary(messages: FileMessage[] | undefined): string | null {
  if (!messages || messages.length === 0) return null;

  const errorMsg = messages.find(m => m.status === "error");
  if (errorMsg) return errorMsg.message;

  const warnings = messages.filter(m => m.status === "warning");
  const totalOmitted = warnings.reduce((sum, w) => sum + (w.details?.omittedCount || 0), 0);

  if (totalOmitted > 0) {
    return `${totalOmitted} items omitted due to unclear text`;
  }

  return warnings[0]?.message || null;
}

---

### User-Facing Display (Enhanced)

```

┌────────────────────────────────────────────────────────────────────┐
│ Processing Complete │
│ ✅ 12 files extracted successfully │
│ ⚠️ 2 files with warnings │
│ ❌ 1 file failed │
├────────────────────────────────────────────────────────────────────┤
│ │
│ ❌ menu-page-10.jpg │
│ Image is too blurry or low resolution. │
│ Unable to extract any data. │
│ [Re-upload] [Remove] │
│ │
│ ⚠️ menu-page-3.jpg │
│ 2 items omitted due to unclear text │
│ ├─ Row 5: "Spr\*\*\*" - name unclear │
│ └─ Row 8: text illegible │
│ 8 of 10 items extracted successfully │
│ [Review Data] [Re-upload] │
│ │
│ ⚠️ menu-page-7.jpg │
│ Missing values: │
│ ├─ "Butter Chicken" - price unclear │
│ └─ "Biryani" - description unclear │
│ [Review Data] │
│ │
└────────────────────────────────────────────────────────────────────┘

````

---

### Firebase Document Size Limits & Storage Strategy

#### Firestore Document Size Limit: 1 MB (1,048,576 bytes)

##### Size Analysis

| Menu Size | Items | With Descriptions | Estimated Size | Status |
|-----------|-------|-------------------|----------------|--------|
| Small | 50 | Yes | ~30KB | ✅ Safe |
| Medium | 200 | Yes | ~170KB | ✅ Safe |
| Large | 500 | Yes + Multi-lang | ~500KB | ⚠️ Approaching |
| Extreme | 1000+ | Yes + Multi-lang | ~1.5MB | ❌ Over limit |

##### fileMessages Overhead (Negligible)

| Scenario | Size |
|----------|------|
| 10 simple messages | ~1KB |
| 10 complex messages with details | ~10KB |
| 50 complex messages | ~50KB |

**Conclusion:** `fileMessages` is NOT a size concern. The menu data itself is the larger factor.

#### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORAGE FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

  JOB DOCUMENT (Temporary)              PROJECT DOCUMENT (Permanent)
  ─────────────────────────             ────────────────────────────
  menuImageProcessingJobs/{jobId}       projectsData/{tId}/{sId}/{projectId}

  ┌─────────────────────────┐           ┌─────────────────────────────────┐
  │ result: {               │           │ files: [                        │
  │   combinedData: {       │           │   {                             │
  │     categories: [...],  │  Client   │     uid: "14VA215",             │
  │     items: [...],       │ ────────► │     extractedData: {            │
  │     languages: [...]    │ redistrib │       processingMessages: [...],│
  │   },                    │           │       data: {                   │
  │   fileMessages: [...]   │           │         categories: [...],      │
  │ }                       │           │         items: [...]            │
  └─────────────────────────┘           │       }                         │
                                        │     }                           │
  Size: Combined data                   │   },                            │
  (all files in one response)           │   { uid: "14VA216", ... }       │
                                        │ ]                               │
                                        └─────────────────────────────────┘

                                        Size: Per-file data
                                        (redistributed from combined)
```

#### Why This Works

| Aspect | Job Document | Project Document |
|--------|--------------|------------------|
| **Purpose** | Temporary processing state | Permanent storage |
| **Contains** | Combined AI response | Redistributed per-file data |
| **Size** | Same total data | Same total data (just structured differently) |
| **Lifetime** | Can be cleaned up after processing | Permanent |

#### Size Mitigation Strategies (For Very Large Menus)

##### Option 1: Clean Up Job Document After Processing

```typescript
// After client successfully retrieves and processes job result
await updateDoc(doc(db, 'menuImageProcessingJobs', jobId), {
  result: null,  // Clear large result field
  status: 'archived',
  archivedAt: serverTimestamp()
});
```

##### Option 2: TTL for Job Documents

```typescript
// Cloud Function to clean old jobs (run daily)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const oldJobs = await getDocs(
  query(
    collection(db, 'menuImageProcessingJobs'),
    where('completedAt', '<', thirtyDaysAgo)
  )
);
// Delete or archive old jobs
```

##### Option 3: For Extreme Cases (1000+ items) - Future Enhancement

```typescript
// Split very large projects across multiple documents
// projectsData/{projectId}/chunks/{chunkId}
// Each chunk contains subset of files
// NOT needed for typical use cases
```

#### Practical Reality

For most restaurants:
- 50-200 menu items is typical
- Document size: 50-200KB
- Well within 1MB limit
- No special handling needed

---

### Implementation Checklist

```markdown
## Per-File Message Handling Implementation (New Approach - No Backwards Compatibility)

### Backend (Cloud Function)

- [ ] Add `FileMessage` types to `functions/src/types.ts`
      - FileMessageStatus ("error" | "warning")
      - FileMessageType (enum of all message types)
      - FileMessageDetails (omittedItems, affectedFields, counts)
      - FileMessage interface
- [ ] Update AI prompt in `parallelProcessingPrompt.ts`
      - Add MESSAGE FIELD RULES section
      - Include fileMessages array structure
      - Add examples for items_omitted, values_omitted, image_unreadable
- [ ] Update `mergeExtractedData()` in `processMenuImages.ts`
      - Merge fileMessages arrays from batches
      - Adjust sourceFileIndex by batch offset
      - Handle undefined fileMessages gracefully
- [ ] Update `processAIResponseForFirebase()` to pass fileMessages to job result

### Client (Frontend) - Types

- [ ] Add `FileMessage` interface to `type.ts`
- [ ] Update `ExtractedData` interface in `type.ts`
      - REMOVE: `message: string` (old field)
      - ADD: `processingMessages?: FileMessage[]` (new field)

### Client (Frontend) - Logic

- [ ] Add `redistributeFileMessages()` to `redistributeExtractedData.ts`
      - Map sourceFileIndex → file UID
      - Returns Map<string, FileMessage[]>
- [ ] Add `getFileSummary()` helper function
      - Returns { hasError, hasWarning, summary }
      - Used for UI display
- [ ] Add `assignMessagesToExtractedData()` function
      - Populates processingMessages array only
- [ ] Update `processFilesInParallel()` in `index.tsx`
      - Call redistributeFileMessages() after data redistribution
      - Call assignMessagesToExtractedData()

### Client (Frontend) - UI

- [ ] Update `EditorContent.tsx` Alert component
      - Change from `file.extractedData?.message` to `file.extractedData?.processingMessages`
      - Use getProcessingSummary() helper for display text
      - Differentiate error vs warning styling
- [ ] Add helper function `getProcessingSummary(messages)`

### Storage

- [ ] Verify Firestore storage works with new structure
      - processingMessages: array (new field, optional)
- [ ] Clean up old `message` field from type (migration)

### Testing

- [ ] Test scenario: Single file with omitted items (warning)
- [ ] Test scenario: Single file completely unreadable (error)
- [ ] Test scenario: Multiple files with mixed errors/warnings
- [ ] Test scenario: All files failed (critical error)
- [ ] Test scenario: All files successful (no processingMessages)
- [ ] Test batch merging with offset adjustment (25 images, 3 batches)
- [ ] Test UI displays correctly with new data structure
```

---

### What mergeExtractedData() in processMenuImages.ts Actually Does

**This is for BATCH processing within a SINGLE JOB, NOT across jobs!**

```
Scenario: User uploads 25 images in one job
├── Batch size: 10 images
├── Batch 1: images 0-9   → AI returns combined data
├── Batch 2: images 10-19 → AI returns combined data (with category continuation)
├── Batch 3: images 20-24 → AI returns combined data (with category continuation)
│
└── mergeExtractedData() combines all 3 batch results into ONE response
    Then client redistributes by sourceFileIndex to 25 individual files
```

The `existingContext` in the prompt ensures:

- Category IDs continue across batches (don't restart at 1)
- Same category appearing in multiple batches uses same ID
- Items at start of batch 2 can belong to category from batch 1

---

### Job Queue Implementation: What the Function Does

```typescript
// Job document contains:
{
    projectId: "proj_123",
    files: [                              // Array of images to process
        { uid: "NEW001", name: "img1.jpg", url: "..." },
        { uid: "NEW002", name: "img2.jpg", url: "..." }
    ],
    targetLanguages: [{ code: "en", name: "English" }],
    status: "pending"
}

// Function logic:
async function processMenuImagesJobLogic(jobId: string, job: MenuImageProcessingJob) {
    // 1. Update status to processing
    await updateJobStatus(jobId, 'processing');

    // 2. Process all images (may involve batching if >10 images)
    const combinedResult = await processMenuImagesLogic({
        files: job.files,
        targetLanguages: job.targetLanguages,
        projectId: job.projectId
    });
    // combinedResult has ALL data with sourceFileIndex

    // 3. Redistribute data by sourceFileIndex to individual files
    const redistributedData = redistributeAndTransformData(
        combinedResult,
        job.files  // Maps sourceFileIndex to file uid
    );

    // 4. Save each file's extractedData to project
    await saveFilesToProject(job.projectId, redistributedData);
    // This ADDS new file entries to Project.files array
    // Does NOT modify existing files

    // 5. Update job status to completed
    await updateJobStatus(jobId, 'completed', { result: combinedResult });
}
```

---

### Correct Job Data Model

```typescript
interface MenuImageProcessingJob {
  // Identity
  id: string;
  projectId: string;

  // Status
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number;
  currentStep?: string;

  // Input: Array of images to process (each becomes a file entry)
  files: {
    uid: string; // File UID (will be used to prefix IDs)
    name: string;
    size: number;
    type: string;
    url: string;
  }[];
  targetLanguages: { code: string; name: string }[];

  // Output: Combined AI response (before redistribution)
  result?: {
    combinedData: ExtractedMenuData; // With sourceFileIndex
    qualityScore: number;
    processingTime: number;
  };

  // Output: Individual file results (after redistribution)
  fileResults?: {
    [fileUid: string]: {
      categoriesCount: number;
      itemsCount: number;
    };
  };

  // Error handling
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };

  // Timestamps
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;

  // Tenant context
  sId: string;
  tId: string;
  uId: string;
}
```

---

### Key Functions Needed for Job Queue

```typescript
// 1. redistributeAndTransformData - Splits combined AI response to files
// Port from: src/components/templates/main-app/projects/utils/redistributeExtractedData.ts
function redistributeAndTransformData(
  combinedResult: ProcessMenuImagesResponse,
  files: { uid: string; index: number }[]
): Map<
  string,
  ExtractedData & { qualityScore?: number; qualityDetails?: any }
> {
  // Step 1: Check if sourceFileIndex exists
  const hasIndex = hasSourceFileIndex(combinedResult);

  if (hasIndex) {
    // Step 2a: Redistribute by sourceFileIndex
    const redistributed = redistributeExtractedData(combinedResult, files);

    // Step 3: Transform IDs for each file (prefix with file uid)
    const result = new Map();
    redistributed.forEach((data, fileUid) => {
      const transformed = transformIdsForFile(data, fileUid);
      result.set(fileUid, {
        ...transformed,
        // qualityScore is added per-file during redistribution
        qualityScore: combinedResult.qualityScore,
        qualityDetails: combinedResult.qualityDetails,
      });
    });
    return result;
  } else {
    // sourceFileIndex is REQUIRED - fail if missing
    throw new Error('AI response missing sourceFileIndex. Cannot redistribute data.');
  }
}

// 2. saveFilesToProject - Adds new file entries to project
async function saveFilesToProject(
  projectId: string,
  redistributedData: Map<string, ExtractedData>,
  originalFiles: {
    uid: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[],
  detectedLanguages: { code: string; name: string; isPrimary?: boolean }[]
): Promise<void> {
  const projectRef = db.collection("projectsData").doc(projectId);

  // Get existing project
  const projectDoc = await projectRef.get();
  const existingFiles = projectDoc.data()?.files || [];
  const existingLanguages: string[] = projectDoc.data()?.languages || [];

  // Create new file entries (one per image processed)
  const newFileEntries = originalFiles.map((file, index) => {
    const fileData = redistributedData.get(file.uid);
    return {
      uid: file.uid,
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size,
      active: true,
      deleted: false,
      deletedAt: {},
      index: existingFiles.length + index,
      processingTime: Date.now(),
      extractedData: fileData?.extractedData || fileData || null,
    };
  });

  // Update languages array (matches client behavior in index.tsx:L609-620)
  const updatedLanguages = [...existingLanguages];
  const primaryLang = detectedLanguages.find((lang) => lang.isPrimary);

  // Primary language goes first
  if (primaryLang && !updatedLanguages.includes(primaryLang.code)) {
    updatedLanguages.unshift(primaryLang.code);
  }

  // Add other languages
  detectedLanguages.forEach((lang) => {
    if (!updatedLanguages.includes(lang.code)) {
      updatedLanguages.push(lang.code);
    }
  });

  // Append new files to existing array + update languages
  await projectRef.update({
    files: [...existingFiles, ...newFileEntries],
    languages: updatedLanguages,
  });
}

// 3. hasSourceFileIndex - Check if AI response has sourceFileIndex
function hasSourceFileIndex(response: CombinedAIResponse): boolean {
  const categories = response?.data?.categories || [];
  const items = response?.data?.items || [];
  return (
    categories.some((cat) => cat.sourceFileIndex !== undefined) ||
    items.some((item) => item.sourceFileIndex !== undefined)
  );
}
```

---

### Summary: No Merging Needed

| Scenario            | What Happens               | Files Affected                    |
| ------------------- | -------------------------- | --------------------------------- |
| **Job 1: 6 images** | 6 new file entries created | files[0-5] created                |
| **Job 2: 1 image**  | 1 new file entry added     | files[6] created, 0-5 untouched   |
| **Job 3: 3 images** | 3 new file entries added   | files[7-9] created, 0-6 untouched |

**Your concern is addressed:**

- ✅ **Old data stays** - Each job adds new files, never modifies old files
- ✅ **No merging needed** - 1 image = 1 file entry, independent
- ✅ **sourceFileIndex** - Used to redistribute combined AI response back to individual files
- ✅ **ID prefixing** - Each file's IDs are prefixed with file uid for uniqueness

---

## 8. Edge Cases & Corner Case Handling

### 8.1 Concurrent Jobs for Same File

**Problem:** User clicks "Process" twice quickly, creating two jobs for the same file.

**Solution:** Check for existing pending/processing jobs before creating new one.

```typescript
// Before creating job
const existingJob = await db
  .collection("menuImageProcessingJobs")
  .where("projectId", "==", projectId)
  .where("fileId", "==", fileId)
  .where("status", "in", ["pending", "processing"])
  .limit(1)
  .get();

if (!existingJob.empty) {
  throw new Error("A job is already processing this file");
  // OR: Return existing job ID for client to listen to
}
```

---

### 8.2 Job Timeout / Stuck Jobs

**Problem:** Function times out mid-processing, job stuck in "processing" forever.

**Solution:** Add `timeoutAt` field and scheduled cleanup.

```typescript
// In job document
{
    status: 'processing',
    startedAt: Timestamp.now(),
    timeoutAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), // 10 min timeout
}

// Scheduled cleanup function (runs every 15 min)
exports.cleanupStuckJobs = onSchedule('every 15 minutes', async () => {
    const stuckJobs = await db.collection('menuImageProcessingJobs')
        .where('status', '==', 'processing')
        .where('timeoutAt', '<', Timestamp.now())
        .get();

    for (const doc of stuckJobs.docs) {
        await doc.ref.update({
            status: 'failed',
            error: {
                code: 'TIMEOUT',
                message: 'Job timed out during processing',
                retryable: true,
            },
            completedAt: Timestamp.now(),
        });
    }
});
```

---

### 8.3 Job Retry Mechanism

**Problem:** Job fails due to transient error (rate limit, network). User wants to retry.

**Solution:** Allow creating retry job from failed job.

```typescript
// Client-side retry
async function retryJob(failedJobId: string) {
  const failedJob = await getDoc(
    doc(db, "menuImageProcessingJobs", failedJobId)
  );
  const jobData = failedJob.data();

  // Create new job with same parameters
  const newJobId = await createMenuProcessingJob({
    projectId: jobData.projectId,
    fileId: jobData.fileId,
    files: jobData.files,
    targetLanguages: jobData.targetLanguages,
    action: jobData.action,
    retriedFromJobId: failedJobId, // Track retry chain
  });

  return newJobId;
}
```

**Job document addition:**

```typescript
interface MenuImageProcessingJob {
  // ... existing fields ...
  retriedFromJobId?: string; // Link to original failed job
  retryCount?: number; // How many times retried
}
```

---

### 8.4 Job Cancellation

**Problem:** User starts processing 50 images, realizes mistake, wants to cancel.

**Solution:** Add "cancelling" status and check during processing.

```typescript
// Add to status enum
export const MENU_PROCESSING_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  CANCELLING: "cancelling", // NEW
  CANCELLED: "cancelled", // NEW
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

// In processMenuImagesJobLogic - check before each batch
for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
  // Check if job was cancelled
  const currentJob = await jobRef.get();
  if (currentJob.data()?.status === "cancelling") {
    await jobRef.update({
      status: "cancelled",
      completedAt: Timestamp.now(),
      result: {
        extractedData: accumulatedData, // Save partial results
        batchesCompleted: batchIndex,
        batchesTotal: batches.length,
      },
    });
    return; // Exit early
  }

  // Process batch...
}

// Client-side cancel
async function cancelJob(jobId: string) {
  await updateDoc(doc(db, "menuImageProcessingJobs", jobId), {
    status: "cancelling",
  });
}
```

---

### 8.5 File URL Expiration

**Problem:** Firebase Storage signed URLs expire (default 1 hour). Long processing may fail.

**Solution:** Use non-expiring download URLs or refresh URLs.

```typescript
// Option 1: Use getDownloadURL (no expiration for Firebase Storage)
const downloadUrl = await getDownloadURL(ref(storage, filePath));

// Option 2: Generate URL just before processing in function
async function processMenuImagesJobLogic(jobId, job) {
  // Refresh URLs at start of processing
  const refreshedFiles = await Promise.all(
    job.files.map(async (file) => ({
      ...file,
      url: await getDownloadURL(ref(storageAdmin, file.storagePath)),
    }))
  );

  // Use refreshedFiles for processing
}
```

**Job document addition:**

```typescript
interface MenuImageProcessingJob {
  files: {
    uid: string;
    name: string;
    url: string;
    storagePath?: string; // Add storage path for URL refresh
  }[];
}
```

---

### 8.6 Idempotency (Duplicate Triggers)

**Problem:** Firestore onCreate might trigger twice due to retries.

**Solution:** Check if job already started before processing.

```typescript
async function processMenuImagesJobLogic(jobId, job) {
  const jobRef = db.collection("menuImageProcessingJobs").doc(jobId);

  // Atomic check-and-update to prevent double processing
  const updated = await db.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef);

    if (jobDoc.data()?.status !== "pending") {
      // Job already picked up by another instance
      return false;
    }

    transaction.update(jobRef, {
      status: "processing",
      startedAt: Timestamp.now(),
    });
    return true;
  });

  if (!updated) {
    console.log(`Job ${jobId} already being processed, skipping`);
    return;
  }

  // Continue with processing...
}
```

---

### 8.7 Job Cleanup (TTL)

**Problem:** Old completed/failed jobs pile up in Firestore.

**Solution:** Auto-delete jobs older than 7 days.

```typescript
// Scheduled cleanup (runs daily)
exports.cleanupOldJobs = onSchedule("every 24 hours", async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const oldJobs = await db
    .collection("menuImageProcessingJobs")
    .where("status", "in", ["completed", "failed", "cancelled"])
    .where("completedAt", "<", cutoff)
    .limit(500) // Batch delete
    .get();

  const batch = db.batch();
  oldJobs.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  console.log(`Cleaned up ${oldJobs.size} old jobs`);
});
```

---

### 8.8 Security Rules

**Problem:** Need proper Firestore rules for new collection.

**Solution:**

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /menuImageProcessingJobs/{jobId} {
      // Users can only read/write their own jobs
      allow read: if request.auth != null
                  && resource.data.uId == request.auth.uid;

      // Create: Must include tenant context
      allow create: if request.auth != null
                    && request.resource.data.uId == request.auth.uid
                    && request.resource.data.status == 'pending';

      // Update: Only allow cancellation from client
      allow update: if request.auth != null
                    && resource.data.uId == request.auth.uid
                    && request.resource.data.status == 'cancelling'
                    && resource.data.status == 'processing';

      // Delete: Not allowed from client
      allow delete: if false;
    }
  }
}
```

---

### 8.9 Progress Update Throttling

**Problem:** Too many progress updates = too many Firestore writes = cost.

**Solution:** Throttle progress updates.

```typescript
// Only update progress every 5 seconds or significant change
let lastProgressUpdate = 0;
let lastProgressValue = 0;

async function updateProgress(
  jobRef: DocumentReference,
  progress: number,
  step: string
) {
  const now = Date.now();
  const timeSinceLastUpdate = now - lastProgressUpdate;
  const progressDelta = Math.abs(progress - lastProgressValue);

  // Update if: 5+ seconds passed OR progress changed by 10+ OR it's completion
  if (timeSinceLastUpdate > 5000 || progressDelta >= 10 || progress === 100) {
    await jobRef.update({
      progress,
      currentStep: step,
      updatedAt: Timestamp.now(),
    });
    lastProgressUpdate = now;
    lastProgressValue = progress;
  }
}
```

---

### 8.10 Backwards Compatibility

**Problem:** Existing clients use old `processMenuImages` callable function.

**Solution:** Keep old function working during migration, use feature flag.

```typescript
// index.ts - Keep both functions during migration

// OLD: Direct callable (deprecated but working)
export const processMenuImages = onCall(options, async (request) => {
    // ... existing implementation ...
});

// NEW: Job-based (feature flagged)
if (isProduction) {
    exports.processMenuImagesJob = onDocumentCreated(...);
}

// Client-side feature flag
const USE_JOB_QUEUE = process.env.NEXT_PUBLIC_USE_JOB_QUEUE === 'true';

async function processImages(params) {
    if (USE_JOB_QUEUE) {
        return await createMenuProcessingJob(params);
    } else {
        return await processMenuImages(params); // Old way
    }
}
```

---

### 8.11 Partial Success Handling

**Problem:** 5 batches, batch 3 fails. What happens to batches 1-2 data?

**Solution:** Save partial results on failure.

```typescript
catch (error) {
    await jobRef.update({
        status: 'failed',
        completedAt: Timestamp.now(),
        error: {
            code: getErrorCode(error),
            message: error.message,
            retryable: true,
            failedAtBatch: currentBatchIndex,
        },
        // Save partial results!
        result: accumulatedData.items.length > 0 ? {
            extractedData: accumulatedData,
            partialSuccess: true,
            batchesCompleted: currentBatchIndex,
            batchesTotal: totalBatches,
        } : undefined,
    });
}
```

---

### 8.12 Cross-File Category References (transformIdsForFile Fix)

**Problem:** When a user uploads new images after some time (e.g., 1 month later), the AI may return items that reference existing categories by name. However, `transformIdsForFile()` currently transforms ALL IDs with the new file's UID, breaking the category reference.

**Scenario:**

```
Initial Upload (1 month ago):
├── Image 1 → Category "Appetizers" (ID: "14VA215c1") + Items 1-5

New Upload (today):
├── Image 6 → Items 6-10 for "Appetizers" category
│
│   AI Response: Items with category reference to existing "Appetizers"
│
│   Current transformIdsForFile():
│   └── Transforms ALL IDs → "98XY123c1" (NEW file UID) ❌
│   └── Items now reference non-existent category!
│
│   Fixed transformIdsForFile():
│   └── Checks existing categories first
│   └── Preserves reference to "14VA215c1" (EXISTING) ✅
│   └── Only transforms truly NEW categories
```

**Root Cause Analysis:**

```typescript
// Current transformIdsForFile() - PROBLEM
export function transformIdsForFile(extractedData, fileUid) {
    // Creates mapping for ALL categories in extractedData
    extractedData.data.categories.forEach((cat, index) => {
        categoryIdMap.set(cat.id, `${fileUid}c${index + 1}`);  // ❌ Transforms ALL
    });

    // All item.category references get transformed too
    extractedData.data.items.forEach(item => {
        item.category = categoryIdMap.get(item.category);  // ❌ Loses existing refs
    });
}
```

**Solution: Pass Existing Category Context**

```typescript
// Fixed transformIdsForFile() - SOLUTION
export function transformIdsForFile(
    extractedData: ExtractedData,
    fileUid: string,
    existingCategories?: Map<string, string>  // NEW: Map<categoryName, existingCategoryId>
): ExtractedData {
    if (!extractedData?.data) return extractedData;

    const categoryIdMap = new Map<string, string>();
    const primaryLang = Object.keys(extractedData.data.categories[0]?.name || {})[0] || 'en';

    // Process categories
    let newCategoryCounter = 1;
    extractedData.data.categories.forEach(cat => {
        const categoryName = cat.name[primaryLang]?.toLowerCase().trim();

        // Check if this category already exists in project
        if (existingCategories?.has(categoryName)) {
            // USE existing category ID (don't transform)
            categoryIdMap.set(String(cat.id), existingCategories.get(categoryName)!);
        } else {
            // NEW category - transform with file UID
            categoryIdMap.set(String(cat.id), `${fileUid}c${newCategoryCounter++}`);
        }
    });

    // Filter out categories that already exist (they don't need to be created again)
    const newCategories = extractedData.data.categories.filter(cat => {
        const categoryName = cat.name[primaryLang]?.toLowerCase().trim();
        return !existingCategories?.has(categoryName);
    });

    // Transform new category IDs
    const transformedCategories = newCategories.map(cat => ({
        ...cat,
        id: categoryIdMap.get(String(cat.id))!,
        active: true
    }));

    // Transform items - preserve existing category refs, transform new ones
    const transformedItems = extractedData.data.items.map((item, index) => ({
        ...item,
        id: `${fileUid}i${index + 1}`,
        category: categoryIdMap.get(String(item.category)) || item.category,
        active: true
    }));

    return {
        ...extractedData,
        data: {
            ...extractedData.data,
            categories: transformedCategories,
            items: transformedItems
        }
    };
}
```

**Helper Function to Build Existing Categories Map:**

```typescript
// Build map of existing categories from project
export function buildExistingCategoriesMap(
    project: Project,
    primaryLang: string
): Map<string, string> {
    const existingCategories = new Map<string, string>();

    project.files?.forEach(file => {
        file.extractedData?.data?.categories?.forEach(cat => {
            const categoryName = cat.name[primaryLang]?.toLowerCase().trim();
            if (categoryName && !existingCategories.has(categoryName)) {
                existingCategories.set(categoryName, cat.id);
            }
        });
    });

    return existingCategories;
}
```

**Updated Flow in Job Processing:**

```typescript
// In processMenuImagesJobLogic
async function processAndSaveToProject(
    jobData: MenuImageProcessingJob,
    combinedData: ExtractedData,
    project: Project
) {
    const primaryLang = jobData.targetLanguages[0] || 'en';

    // Step 1: Build existing categories map
    const existingCategories = buildExistingCategoriesMap(project, primaryLang);

    // Step 2: Redistribute data by sourceFileIndex
    const redistributedData = redistributeExtractedData(
        combinedData,
        jobData.files
    );

    // Step 3: Transform IDs with existing category context
    const transformedFiles = jobData.files.map(file => {
        const fileData = redistributedData.get(file.uid);
        if (!fileData) return null;

        return {
            ...file,
            extractedData: transformIdsForFile(
                fileData,
                file.uid,
                existingCategories  // Pass existing categories!
            )
        };
    }).filter(Boolean);

    // Step 4: Save to project (new files appended)
    await saveFilesToProject(project.projectId, transformedFiles);
}
```

**Why This Works:**

1. **AI already handles category deduplication** - Prompt instructs AI not to create duplicate categories
2. **Function preserves references** - Items point to existing category IDs
3. **Only new categories get new IDs** - Truly new categories get file-prefixed IDs
4. **No breaking changes** - Same ID format, just smarter assignment

---

### 8.13 Menu Update: Auto-Replace Same-Name Items

**Problem:** When user uploads new images to update their menu, items with the same name in the same category should be REPLACED, not duplicated.

**User Requirement:** "For items with same name in same category then we must replace it"

**Scenario:**

```
Existing Menu:
├── Appetizers
│   ├── "Spring Rolls" - $5.99 (ID: 14VA215i1)
│   └── "Samosa" - $4.99 (ID: 14VA215i2)

New Upload:
├── "Spring Rolls" - $6.99 (price update)
├── "Crispy Wontons" - $5.49 (new item)

Expected Result (auto-merge):
├── Appetizers
│   ├── "Spring Rolls" - $6.99 ✅ REPLACED (keeps old ID)
│   ├── "Samosa" - $4.99 ✅ UNCHANGED
│   └── "Crispy Wontons" - $5.49 ✅ ADDED (new ID)
```

**Solution: Auto-Merge Function**

```typescript
/**
 * Auto-merge new items with existing items in a category.
 * Items with same name in same category are REPLACED.
 *
 * @param existingItems - Items already in the project
 * @param newItems - Items from new upload (after ID transformation)
 * @param primaryLang - Primary language for name comparison
 * @returns Merged items array
 */
export function autoMergeItems(
    existingItems: ExtractedDataItem[],
    newItems: ExtractedDataItem[],
    primaryLang: string
): {
    mergedItems: ExtractedDataItem[];
    replacedCount: number;
    addedCount: number;
} {
    // Create a map of existing items by category + name
    const existingItemsMap = new Map<string, ExtractedDataItem>();
    existingItems.forEach(item => {
        const key = `${item.category}|${item.name[primaryLang]?.toLowerCase().trim()}`;
        existingItemsMap.set(key, item);
    });

    let replacedCount = 0;
    let addedCount = 0;

    // Process new items
    newItems.forEach(newItem => {
        const itemName = newItem.name[primaryLang]?.toLowerCase().trim();
        const key = `${newItem.category}|${itemName}`;

        if (existingItemsMap.has(key)) {
            // REPLACE: Keep existing ID, update all other fields
            const existingItem = existingItemsMap.get(key)!;
            existingItemsMap.set(key, {
                ...newItem,
                id: existingItem.id,  // Preserve existing ID for stability
                active: true
            });
            replacedCount++;
        } else {
            // ADD: New item
            existingItemsMap.set(key, newItem);
            addedCount++;
        }
    });

    return {
        mergedItems: Array.from(existingItemsMap.values()),
        replacedCount,
        addedCount
    };
}
```

**Integration with Save Flow:**

```typescript
// In saveFilesToProject()
async function saveFilesToProject(
    projectId: string,
    newFiles: ProjectFileType[],
    autoMergeEnabled: boolean = true  // Default: auto-merge ON
) {
    const project = await getProject(projectId);
    const primaryLang = project.languages[0] || 'en';

    // Get all existing items across all files
    const existingItems = project.files?.flatMap(
        file => file.extractedData?.data?.items || []
    ) || [];

    if (autoMergeEnabled && existingItems.length > 0) {
        // Collect all new items from all new files
        const allNewItems = newFiles.flatMap(
            file => file.extractedData?.data?.items || []
        );

        // Auto-merge
        const { mergedItems, replacedCount, addedCount } = autoMergeItems(
            existingItems,
            allNewItems,
            primaryLang
        );

        // Log for debugging
        console.log(`Auto-merge: ${replacedCount} replaced, ${addedCount} added`);

        // Update existing files with merged items
        // (This is handled by redistributing merged items back to their files)
    }

    // Append new files to project
    await updateProject({
        ...project,
        files: [...project.files, ...newFiles]
    });
}
```

**UI Feedback (Optional Enhancement):**

```typescript
// Job result can include merge stats
interface JobResult {
    extractedData: ExtractedData;
    fileMessages?: FileMessage[];
    mergeStats?: {
        replacedCount: number;
        addedCount: number;
        unchangedCount: number;
    };
}
```

**Why Auto-Merge by Default:**

1. **User expectation** - When updating a menu, same items should update
2. **No duplicate confusion** - "Spring Rolls" won't appear twice
3. **ID stability** - Replaced items keep original IDs (important for any external references)
4. **Intelligent behavior** - System "knows" what user wants without asking

---

### Summary: Edge Cases

| Edge Case               | Solution                              | Priority  |
| ----------------------- | ------------------------------------- | --------- |
| Concurrent jobs         | Check before create                   | 🔴 High   |
| Stuck jobs              | Timeout + scheduled cleanup           | 🔴 High   |
| Retry mechanism         | Create new job from failed            | 🟡 Medium |
| Cancellation            | "cancelling" status + check in loop   | 🟡 Medium |
| URL expiration          | Store storagePath, refresh on process | 🟡 Medium |
| Duplicate triggers      | Transaction for status update         | 🔴 High   |
| Job cleanup             | Scheduled delete after 7 days         | 🟢 Low    |
| Security rules          | Tenant-isolated rules                 | 🔴 High   |
| Progress throttling     | **✅ Implemented: 3 writes (0%, 50%, 100%)** | 🟢 Low    |
| Backwards compatibility | Feature flag for rollout              | 🟡 Medium |
| Partial success         | Save accumulated data on fail         | 🟡 Medium |
| **Cross-file category refs** | **transformIdsForFile fix** | **🔴 High** |
| **Auto-replace same items** | **autoMergeItems function** | **🔴 High** |

---

## 9. Implementation Checklist

### Phase 1: Backend Setup (Core)

- [x] Add `MENU_IMAGE_PROCESSING_JOBS_COLLECTION` constant to `functions/src/types.ts` ✅ (Dec 9, 2025)
- [x] Add `MenuImageProcessingJob` type definition to `functions/src/types.ts` ✅ (Dec 9, 2025)
- [x] Add `MENU_PROCESSING_STATUS` enum (including `cancelling`, `cancelled`) ✅ (Dec 9, 2025)
- [x] Create `functions/src/logic/processMenuImagesJob.ts` with job logic ✅ (Dec 9, 2025)
- [x] Add `dev_triggerProcessMenuImages` to `functions/src/dev-triggers.ts` ✅ (Dec 9, 2025)
- [x] Register functions in `functions/src/index.ts` (prod trigger + dev callable) ✅ (Dec 9, 2025)
- [x] **Port from client** `redistributeExtractedData()` → `functions/src/logic/redistributeUtils.ts` ✅ (Dec 9, 2025)
- [x] **Port from client** `transformIdsForFile()` → same file ✅ (Dec 9, 2025)
- [x] **Port from client** `hasSourceFileIndex()` → same file ✅ (Dec 9, 2025)
- [x] Create `saveFilesToProject()` → `functions/src/logic/saveFilesToProject.ts` ✅ (Dec 9, 2025)
- [x] Integrate utilities into `processMenuImagesJob.ts` ✅ (Dec 9, 2025)

### Phase 1.5: Edge Case Handling (High Priority)

- [x] Implement idempotency check (transaction for pending → processing) ✅ (Dec 9, 2025) - In processMenuImagesJob.ts
- [x] Add concurrent job check → `checkExistingActiveJob()` in `schedulers/menuJobCleanup.ts` ✅ (Dec 9, 2025)
- [x] Add `timeoutAt` field to job document + set in processMenuImagesJob.ts ✅ (Dec 9, 2025)
- [x] Add `retriedFromJobId` and `retryCount` fields to type ✅ (Dec 9, 2025)
- [x] Implement scheduled `cleanupStuckMenuJobs` function (every 15 min) ✅ (Dec 9, 2025)
- [x] Implement scheduled `cleanupOldMenuJobs` function (daily, 7-day TTL) ✅ (Dec 9, 2025)
- [x] Add Firestore security rules for `menuImageProcessingJobs` ✅ (Dec 9, 2025)

### Phase 1.6: Cross-File Category & Auto-Merge (🔴 Critical)

- [x] Create `buildExistingCategoriesMap()` helper function → `redistributeUtils.ts` ✅ (Dec 9, 2025)
- [x] **Update** `transformIdsForFile()` to accept `existingCategories` parameter ✅ (Dec 9, 2025)
- [x] Update `transformIdsForFile()` to preserve existing category references ✅ (Dec 9, 2025)
- [x] Update `transformIdsForFile()` to filter out duplicate categories ✅ (Dec 9, 2025)
- [x] Create `autoMergeItems()` function → `redistributeUtils.ts` ✅ (Dec 9, 2025)
- [x] Integrate `autoMergeItems()` into `saveFilesToProject()` flow ✅ (Dec 9, 2025)
- [x] Add `MergeStats` return type to `saveFilesToProject()` ✅ (Dec 9, 2025)

### Phase 2: Client Setup

- [x] Create `createMenuProcessingJob` function → `src/lib/firebase/menuProcessing.ts` ✅ (Dec 9, 2025)
- [x] Create `cancelMenuProcessingJob` function → same file ✅ (Dec 9, 2025)
- [x] Create `checkExistingActiveJob` function → same file ✅ (Dec 9, 2025)
- [x] Create `useMenuProcessingJob` hook → `src/hooks/useMenuProcessingJob.ts` ✅ (Dec 9, 2025)
- [x] Update `getProcessedFile.ts` to use job queue (with feature flag) ✅ (Dec 10, 2025)
- [x] Add progress UI components (`LoadingMessage` enhanced) ✅ (Dec 10, 2025)
- [x] Integrate `useMenuProcessingJob` hook in `index.tsx` ✅ (Dec 10, 2025)

### Phase 3: Migration

- [x] Feature flag for gradual rollout (`NEXT_PUBLIC_USE_JOB_QUEUE`) ✅ (Dec 10, 2025)
- [ ] Test in emulator with dev trigger
- [ ] Deploy and test with Firestore trigger
- [ ] Monitor and verify

### Phase 4: Cost Optimization ✅ (Dec 10, 2025)

- [x] Reduced progress updates (6→3 writes per job)
- [x] Removed pre-AI cancellation check (1 read saved)
- [x] Pass existing project to `saveFilesToProject` (1 read saved)
- [x] **Total savings: ~35% fewer Firebase operations per job**

See: `menu-job-queue-firebase-operations.md` for detailed analysis.

---

## Summary

### Decisions Made

| Question             | Answer                                              |
| -------------------- | --------------------------------------------------- |
| **Collection name**  | `menuImageProcessingJobs` ✅                        |
| **Dev environment**  | Callable function `dev_triggerProcessMenuImages` ✅ |
| **Prod environment** | Firestore `onCreate` trigger ✅                     |
| **Status location**  | **Option A: Job document** ✅ (User confirmed)      |
| **Client listening** | `onSnapshot` on job document                        |

### Data Architecture (CORRECTED)

**Key Principle: 1 Image = 1 File Entry**

| Scenario                   | What Happens                                | Result                                |
| -------------------------- | ------------------------------------------- | ------------------------------------- |
| **Job 1: 6 images**        | 6 file entries created in `Project.files[]` | Each file has its own `extractedData` |
| **Job 2: 1 image (later)** | 1 new file entry **ADDED** to array         | Old 6 files **UNTOUCHED**             |
| **Job 3: 3 images**        | 3 new file entries **ADDED**                | Now 10 files total                    |

### Processing Flow

```
1. Client uploads images → Each gets unique uid
2. Job created with files[] array
3. Function processes all images → AI returns combined data with sourceFileIndex
4. Function redistributes data by sourceFileIndex to individual files
5. Function saves new file entries to Project.files[] (appends, never modifies existing)
6. Client displays all items from all files combined
```

### Key Points

1. ✅ **1 Image = 1 File** - Each image becomes a separate file entry
2. ✅ **No merging across jobs** - Jobs add new files, never touch existing
3. ✅ **sourceFileIndex** - AI tracks which image each item came from
4. ✅ **ID prefixing** - IDs prefixed with file uid (e.g., `14VA215c1`, `14VA215i1`)
5. ✅ **Batch merging is internal** - Only for combining batches within single job (>10 images)
6. ✅ **Cross-file category refs** - New items can reference existing categories (transformIdsForFile fix)
7. ✅ **Auto-replace items** - Same name + same category = REPLACE (not duplicate)

### Important Functions to Port (from Client to Functions)

| Function                      | Source File                                          | Purpose                                    |
| ----------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `redistributeExtractedData()` | `src/.../utils/redistributeExtractedData.ts:L98-213` | Split AI response by sourceFileIndex       |
| `transformIdsForFile()`       | Same file, L228-292                                  | Prefix IDs with file uid **(+ existing category support)** |
| `hasSourceFileIndex()`        | Same file, L297-306                                  | Check if AI response has sourceFileIndex   |
| `saveFilesToProject()`        | **NEW** (create in functions)                        | Append new file entries + update languages |
| `buildExistingCategoriesMap()` | **NEW** (create in functions)                       | Build Map of existing category names → IDs |
| `autoMergeItems()`            | **NEW** (create in functions)                        | Replace same-name items in same category   |

### Alignment with Current Implementation

| Aspect                        | Current Client                                          | New Job Queue          | Status  |
| ----------------------------- | ------------------------------------------------------- | ---------------------- | ------- |
| 1 Image = 1 File              | ✅ `ProjectFileType` per image                          | ✅ Same structure      | Aligned |
| sourceFileIndex               | ✅ AI prompt includes it                                | ✅ Function handles it | Aligned |
| ID prefixing                  | ✅ `{fileUid}c1`, `{fileUid}i1`                         | ✅ Same pattern        | Aligned |
| sourceFileIndex validation    | N/A (client fallback existed)                           | ✅ Fail if missing     | **Enhanced** |
| Languages update              | ✅ Primary first, then others                           | ✅ Same logic          | Aligned |
| qualityScore per file         | ✅ Added during redistribution                          | ✅ Same approach       | Aligned |
| Batch merging (>10 images)    | ✅ `mergeExtractedData()`                               | ✅ Reuse existing      | Aligned |
| Cross-file category refs      | ❌ Not handled (transforms all IDs)                     | ✅ **NEW: Fixed**      | **Enhanced** |
| Auto-replace same items       | ❌ Not handled (duplicates created)                     | ✅ **NEW: Added**      | **Enhanced** |

---

**Document is 100% aligned with current implementation + 2 new enhancements.**

### New Enhancements (Section 8.12 & 8.13)

| Enhancement | Problem Solved | Implementation |
|-------------|----------------|----------------|
| **Cross-file category refs** | New uploads broke existing category references | `transformIdsForFile()` now accepts existing categories map |
| **Auto-replace items** | Duplicate items created on menu updates | `autoMergeItems()` replaces same-name items in same category |

**Awaiting your approval to start implementation.**

_Ready when you say "start coding"!_
````
