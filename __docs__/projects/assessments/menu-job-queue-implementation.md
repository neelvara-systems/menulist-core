# Menu Image Processing - Job Queue Implementation Guide

> **Document Type:** Implementation Reference
> **Created:** December 10, 2025
> **Status:** Historical implementation reference; not current launch certification
> **Purpose:** Help developers understand the complete data flow

> **Launch Boundary:** Historical assessment result only; not current launch certification. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, upload/job processing QA, Cloud Function/deploy evidence where the queue worker changes, provider smoke, and target-environment smoke.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Client-Side Implementation](#3-client-side-implementation)
4. [Server-Side Implementation](#4-server-side-implementation)
5. [Data Flow Step-by-Step](#5-data-flow-step-by-step)
6. [Key Files Reference](#6-key-files-reference)
7. [Testing Guide](#7-testing-guide)

---

## 1. Overview

### What This System Does

When a user uploads menu images, this system:

1. **Uploads images** to Firebase Storage
2. **Creates a job document** in Firestore
3. **Triggers server processing** (auto in PROD, manual in DEV)
4. **Extracts menu data** using AI (categories, items, prices)
5. **Saves results** directly to the project
6. **Notifies client** via real-time Firestore listener

### Key Benefits

- ✅ **No timeout issues** - Server processes asynchronously
- ✅ **No data loss** - Server saves results, not client
- ✅ **Real-time progress** - Client sees status updates
- ✅ **Cancelable** - User can cancel processing
- ✅ **Resumable** - If page refreshes, job continues

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐    ┌───────────────────┐    ┌─────────────────────┐  │
│  │   User clicks    │───▶│ handleUploadAnd   │───▶│  uploadAndCreate    │  │
│  │   "Continue"     │    │ Continue()        │    │  Job()              │  │
│  └──────────────────┘    └───────────────────┘    └─────────┬───────────┘  │
│                                                              │              │
│                          ┌───────────────────────────────────┘              │
│                          ▼                                                  │
│  ┌───────────────────────────────────────┐                                  │
│  │  1. Upload files to Storage (parallel)│                                  │
│  │  2. createProcessingJob()             │──────────────────┐               │
│  │  3. setActiveProcessingJobId(jobId)   │                  │               │
│  └───────────────────────────────────────┘                  │               │
│                                                              │               │
│  ┌───────────────────────────────────────┐                  │               │
│  │  useMenuProcessingJob(jobId)          │◀─────────────────┼───────────┐   │
│  │  - Listens for status changes         │                  │           │   │
│  │  - Returns: progress, currentStep     │                  │           │   │
│  └───────────────────────────────────────┘                  │           │   │
│                          │                                   │           │   │
│                          ▼                                   │           │   │
│  ┌───────────────────────────────────────┐                  │           │   │
│  │  Job completed?                        │                  │           │   │
│  │  - mutateProject() → Refetch data     │                  │           │   │
│  │  - setCurrentView(2) → Show editor    │                  │           │   │
│  └───────────────────────────────────────┘                  │           │   │
│                                                              │           │   │
└──────────────────────────────────────────────────────────────┼───────────┼───┘
                                                               │           │
┌──────────────────────────────────────────────────────────────┼───────────┼───┐
│                           FIRESTORE                          │           │   │
├──────────────────────────────────────────────────────────────┼───────────┼───┤
│                                                              │           │   │
│  ┌─────────────────────────────────────────────────────────┐ │           │   │
│  │  menuImageProcessingJobs/{jobId}                        │◀┘           │   │
│  │  {                                                       │            │   │
│  │    status: "pending" → "processing" → "completed",      │────────────┘   │
│  │    progress: 0 → 25 → 50 → 75 → 100,                    │  (onSnapshot)  │
│  │    currentStep: "Extracting menu data...",              │                │
│  │    files: [...],                                         │                │
│  │    result: { combinedData, fileResults }                │                │
│  │  }                                                       │                │
│  └─────────────────────────────────────────────────────────┘                │
│                          │                                                   │
│                          │ onCreate trigger (PROD)                          │
│                          │ OR dev_trigger callable (DEV)                    │
│                          ▼                                                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                      FIREBASE FUNCTIONS (Server)                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  processMenuImagesJobLogic(jobId, jobData)                            │  │
│  │                                                                        │  │
│  │  1. Validate job (idempotency check)                                  │  │
│  │  2. Update status → "processing"                                      │  │
│  │  3. Call AI (processMenuImagesCore)                                   │  │
│  │  4. Redistribute data to files (redistributeExtractedData)            │  │
│  │  5. Save to project (saveFilesToProject)                              │  │
│  │  6. Update job status → "completed" with results                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Client-Side Implementation

### 3.1 Entry Point: Continue Button

**File:** `src/components/templates/main-app/projects/index.tsx`

```typescript
// Line ~1023 - The Continue button
<Button onClick={() => handleUploadAndContinue(activeProject)}>Continue</Button>
```

---

### 3.2 handleUploadAndContinue()

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** ~563-623

**Purpose:** Orchestrates the entire client-side flow when user clicks "Continue"

```typescript
const handleUploadAndContinue = async (activeProject: Project | null) => {
  if (!activeProject || !selectedProject) return;

  const projectDataCopy: Project = removeObjRef(activeProject);

  try {
    // Step 1: Find files that need processing (base64 = not uploaded yet)
    const filesToProcess =
      projectDataCopy.files?.filter((f) => f.url?.includes("base64")) || [];

    if (filesToProcess.length === 0) {
      message.info("No new files to process");
      return;
    }

    // Step 2: Show loading indicator
    setFileProcessingId(filesToProcess[0].uid);

    // Step 3: Upload files and create job
    const { jobId, uploadedUrls } = await withTimeout(
      uploadAndCreateJob(filesToProcess, projectDataCopy),
      PROCESSING_TIMEOUT * filesToProcess.length
    );

    // Step 4: Update project with uploaded URLs (Storage URLs, not base64)
    filesToProcess.forEach((file) => {
      const fileIndex = projectDataCopy.files.findIndex(
        (f) => f.uid === file.uid
      );
      if (fileIndex !== -1) {
        projectDataCopy.files[fileIndex].url = uploadedUrls.get(file.uid);
      }
    });

    // Step 5: Save project (without extracted data - server will add it)
    await updateProject({
      ...projectDataCopy,
      projectId: selectedProject.projectId,
    });
    mutateProject(removeObjRef(projectDataCopy), false);

    // Step 6: Start tracking job - useMenuProcessingJob hook will listen
    setActiveProcessingJobId(jobId);
  } catch (error: any) {
    setFileProcessingId(null);
    message.error(`Processing failed: ${error.message}`);
  }
};
```

**Data Flow:**

```
User clicks Continue
    │
    ▼
filesToProcess = files with base64 URLs (not yet uploaded)
    │
    ▼
uploadAndCreateJob() → { jobId, uploadedUrls }
    │
    ▼
Update project.files[].url with Storage URLs
    │
    ▼
setActiveProcessingJobId(jobId) → Triggers useMenuProcessingJob hook
```

---

### 3.3 uploadAndCreateJob()

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** ~497-561

**Purpose:** Upload files to Storage and create job document

```typescript
const uploadAndCreateJob = async (
  filesToProcess: any[],
  projectDataCopy: Project
): Promise<{ jobId: string; uploadedUrls: Map<string, string> }> => {
  // Step 1: Upload ALL files in parallel
  const uploadPromises = filesToProcess.map((file) =>
    uploadFile({ url: file.url, type: file.type, uid: file.uid })
      .then((url) => ({ uid: file.uid, url, file }))
      .catch((err) => ({ uid: file.uid, url: null, file, error: err }))
  );

  const uploadResults = await Promise.all(uploadPromises);
  const uploadedUrls = new Map<string, string>();
  const successfulUploads: any[] = [];

  // Collect successful uploads
  uploadResults.forEach((result) => {
    if (result.url) {
      uploadedUrls.set(result.uid, result.url);
      successfulUploads.push({
        url: result.url,
        type: result.file.type,
        uid: result.file.uid,
        name: result.file.name,
        size: result.file.size || 0,
      });
    }
  });

  if (successfulUploads.length === 0) {
    throw new Error("All file uploads failed");
  }

  // Step 2: Create job document
  const targetLanguages = GlobalLanguagesList.filter((lang) =>
    projectDataCopy.languages.includes(lang.code)
  );

  const { jobId } = await createProcessingJob({
    files: successfulUploads,
    targetLanguages,
    projectId: projectDataCopy.projectId,
  });

  return { jobId, uploadedUrls };
};
```

**Data Flow:**

```
filesToProcess (base64 URLs)
    │
    ▼
Promise.all(uploadFile()) → Parallel upload to Firebase Storage
    │
    ▼
uploadedUrls: Map<uid, storageUrl>
successfulUploads: [{ url, type, uid, name, size }]
    │
    ▼
createProcessingJob({ files, targetLanguages, projectId })
    │
    ▼
{ jobId, uploadedUrls }
```

---

### 3.4 createProcessingJob()

**File:** `src/components/templates/main-app/projects/getProcessedFile.ts`
**Lines:** 1-86

**Purpose:** Create job document in Firestore and trigger processing

```typescript
async function createProcessingJob({
  files,
  targetLanguages,
  projectId,
  action = AI_ACTIONS_TYPES.IMAGE_PROCESSING,
}: ProcessedFileAPIParams): Promise<CreateJobResult> {
  // Step 1: Check for existing active job (prevent duplicates)
  const existingJobId = await checkExistingActiveJob(projectId);
  if (existingJobId) {
    return { jobId: existingJobId };
  }

  // Step 2: Create new job (calls createMenuProcessingJob from menuProcessing.ts)
  const jobId = await createMenuProcessingJob({
    projectId,
    files: files.map((f) => ({
      uid: f.uid,
      name: f.name,
      size: f.size,
      type: f.type,
      url: f.url,
    })),
    targetLanguages: targetLanguages.map((l) => ({
      code: l.code,
      name: l.name,
    })),
    action,
  });

  return { jobId };
}
```

---

### 3.5 createMenuProcessingJob() (Firebase integration)

**File:** `src/lib/firebase/menuProcessing.ts`
**Lines:** ~75-144

**Purpose:** Create job document in Firestore and trigger dev function if needed

```typescript
export async function createMenuProcessingJob(
  params: CreateJobParams
): Promise<string> {
  const loggedInSession = await getClientAuthSession();

  // Build job document
  const jobData: Partial<MenuImageProcessingJob> = {
    status: MENU_PROCESSING_STATUS.PENDING,
    projectId: params.projectId,
    files: params.files,
    targetLanguages: params.targetLanguages,
    action: params.action || AI_ACTIONS_TYPES.IMAGE_PROCESSING,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    timeoutAt: Timestamp.fromMillis(Date.now() + 10 * 60 * 1000), // 10 min timeout
    progress: 0,
    currentStep: "Waiting to start...",
    tenantId: loggedInSession?.tId,
    storeId: loggedInSession?.sId,
    userId: loggedInSession?.uId,
  };

  // Create job document
  const docRef = await addDoc(
    collection(db, MENU_IMAGE_PROCESSING_JOBS_COLLECTION),
    jobData
  );

  // DEV ONLY: Manually trigger the processing function
  // In PROD, the onCreate trigger fires automatically
  if (process.env.NODE_ENV !== "production") {
    const devTrigger = httpsCallable(functions, "dev_triggerProcessMenuImages");
    await devTrigger({ jobId: docRef.id });
  }

  return docRef.id;
}
```

**Data Flow:**

```
createMenuProcessingJob(params)
    │
    ▼
Build jobData: {
    status: "pending",
    projectId,
    files: [{ uid, name, url, ... }],
    targetLanguages: [{ code, name }],
    ...
}
    │
    ▼
addDoc(menuImageProcessingJobs, jobData) → jobId
    │
    ├── PROD: onCreate trigger fires automatically
    │
    └── DEV: httpsCallable('dev_triggerProcessMenuImages', { jobId })
    │
    ▼
return jobId
```

---

### 3.6 useMenuProcessingJob() Hook

**File:** `src/hooks/useMenuProcessingJob.ts`
**Lines:** 1-133

**Purpose:** Real-time subscription to job status via Firestore onSnapshot

```typescript
export function useMenuProcessingJob(
  jobId: string | null
): UseMenuProcessingJobReturn {
  const [job, setJob] = useState<MenuImageProcessingJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setLoading(false);
      return;
    }

    // Subscribe to job document changes
    const unsubscribe = onSnapshot(
      doc(db, MENU_IMAGE_PROCESSING_JOBS_COLLECTION, jobId),
      (snapshot) => {
        if (snapshot.exists()) {
          setJob({
            id: snapshot.id,
            ...snapshot.data(),
          } as MenuImageProcessingJob);
        }
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId]);

  // Derived states for easy UI consumption
  const isPending = job?.status === MENU_PROCESSING_STATUS.PENDING;
  const isProcessing = job?.status === MENU_PROCESSING_STATUS.PROCESSING;
  const isCompleted = job?.status === MENU_PROCESSING_STATUS.COMPLETED;
  const isFailed = job?.status === MENU_PROCESSING_STATUS.FAILED;
  const isCancelled = job?.status === MENU_PROCESSING_STATUS.CANCELLED;

  // Cancel function
  const cancel = async () => {
    if (jobId) await cancelMenuProcessingJob(jobId);
  };

  return {
    job,
    loading,
    error,
    isPending,
    isProcessing,
    isCompleted,
    isFailed,
    isCancelled,
    progress: job?.progress || 0,
    currentStep: job?.currentStep || "",
    cancel,
  };
}
```

**Data Flow:**

```
useMenuProcessingJob(jobId)
    │
    ▼
onSnapshot(menuImageProcessingJobs/{jobId})
    │
    ▼ (real-time updates)

Server updates job.status: "pending" → "processing" → "completed"
Server updates job.progress: 0 → 25 → 50 → 75 → 100
Server updates job.currentStep: "Extracting..." → "Redistributing..." → "Saving..."
    │
    ▼
Hook returns: { isProcessing, isCompleted, progress, currentStep, ... }
    │
    ▼
UI shows LoadingMessage with progress
```

---

### 3.7 Job Completion Handler (useEffect)

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** ~147-174

**Purpose:** React to job completion and update UI

```typescript
// Handle job completion - refetch project data since server saved results
useEffect(() => {
  if (!activeProcessingJobId) return;

  if (jobIsCompleted) {
    console.log("[JobQueue] Job completed, refetching project data");
    // Server has already saved the data to the project
    mutateProject(); // Refetch to get updated data
    setActiveProcessingJobId(null);
    setFileProcessingId(null);
    setCurrentView(2); // Go to editor view
    message.success("Menu images processed successfully!");
  }

  if (jobIsFailed) {
    console.error("[JobQueue] Job failed:", jobError);
    setActiveProcessingJobId(null);
    setFileProcessingId(null);
    message.error(`Processing failed: ${jobError?.message || "Unknown error"}`);
  }

  if (jobIsCancelled) {
    console.log("[JobQueue] Job cancelled");
    setActiveProcessingJobId(null);
    setFileProcessingId(null);
    message.info("Processing was cancelled");
  }
}, [
  activeProcessingJobId,
  jobIsCompleted,
  jobIsFailed,
  jobIsCancelled,
  jobError,
  mutateProject,
]);
```

**Data Flow:**

```
useMenuProcessingJob returns jobIsCompleted = true
    │
    ▼
useEffect triggers
    │
    ▼
mutateProject() → SWR refetches project from Firestore
    │                (Server already saved extractedData to project.files[])
    ▼
setCurrentView(2) → Switch to Editor view
    │
    ▼
User sees extracted menu data in editor
```

---

## 4. Server-Side Implementation

### 4.1 Trigger Functions

**File:** `functions/src/index.ts`

```typescript
// PRODUCTION: Firestore onCreate trigger (automatic)
exports.processMenuImagesJob = onDocumentCreated(
  { document: `menuImageProcessingJobs/{jobId}`, ...options },
  async (event) => {
    await processMenuImagesJobLogic(event.params.jobId, event.data);
  }
);

// DEVELOPMENT: Manual callable trigger
exports.dev_triggerProcessMenuImages = onCall(async (request) => {
  const { jobId } = request.data;
  const jobSnapshot = await getDoc(doc(db, "menuImageProcessingJobs", jobId));
  await processMenuImagesJobLogic(jobId, jobSnapshot);
  return { success: true };
});
```

---

### 4.2 processMenuImagesJobLogic()

**File:** `functions/src/logic/processMenuImagesJob.ts`
**Lines:** 1-300

**Purpose:** Core server-side processing logic (OPTIMIZED for minimal Firebase operations)

**Optimization Notes:**

- Reduced from 6 progress writes to 3
- Single cancellation check (after AI, not before)
- Passes existing project to `saveFilesToProject` to avoid duplicate read
- **Saves 6 Firebase operations per job (~35% reduction)**

```typescript
export async function processMenuImagesJobLogic(
  jobId: string,
  job: MenuImageProcessingJob
): Promise<void> {
  const jobRef = db.collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION).doc(jobId);

  // Step 1: Idempotency check + set processing (WRITE 1)
  const updated = await db.runTransaction(async (transaction) => {
    const currentDoc = await transaction.get(jobRef);
    if (currentDoc.data()?.status !== MENU_PROCESSING_STATUS.PENDING) {
      return false; // Already processed
    }
    transaction.update(jobRef, {
      status: MENU_PROCESSING_STATUS.PROCESSING,
      startedAt: Timestamp.now(),
      progress: 0,
      currentStep: "Starting...",
    });
    return true;
  });

  if (!updated) return;

  try {
    // Step 2: Call AI processing (no progress update - saves writes)
    const result = await processMenuImagesLogic(request);

    // Step 3: Check for cancellation (single check after AI - READ 1)
    const postProcessJob = await jobRef.get();
    if (postProcessJob.data()?.status === MENU_PROCESSING_STATUS.CANCELLING) {
      await jobRef.update({ status: MENU_PROCESSING_STATUS.CANCELLED });
      return;
    }

    // Step 4: Progress update - AI complete (WRITE 2)
    await jobRef.update({
      currentStep: "Processing complete, saving to project...",
      progress: 50,
    });

    // Step 5: Fetch project (READ 2) - passed to saveFilesToProject
    const existingProject = await getProject(job.projectId);
    const existingCategories = buildExistingCategoriesMap(existingProject);

    // Step 6: Redistribute and save
    const redistributedData = processParallelResponse(result, job.files, existingCategories);

    // OPTIMIZATION: Pass existingProject to avoid duplicate read
    await saveFilesToProject(
      job.projectId, redistributedData, job.files, languages,
      true,           // enableAutoMerge
      existingProject // Passed to avoid duplicate read
    );

    // Step 7: Mark completed (WRITE 3)
    await jobRef.update({
      status: MENU_PROCESSING_STATUS.COMPLETED,
      progress: 100,
      currentStep: "Completed",
      result: { ... },
    });

  } catch (error) {
    await jobRef.update({
      status: MENU_PROCESSING_STATUS.FAILED,
      error: { code, message, retryable },
    });
  }
}
```

**Data Flow (Optimized):**

```
processMenuImagesJobLogic(jobId, job)
    │
    ▼
Transaction: status "pending" → "processing" (WRITE 1)
    │
    ▼
AI Processing (no Firebase operations)
    │
    ▼
Check cancellation (READ 1)
    │
    ▼
Progress 50% "Processing complete..." (WRITE 2)
    │
    ▼
Fetch project for categories (READ 2) ─┐
    │                                   │
    ▼                                   │
Redistribute data                       │
    │                                   │
    ▼                                   │
saveFilesToProject(existingProject) ←───┘ (no duplicate read)
    │
    ▼
Mark completed (WRITE 3)
```

**Firebase Operations Summary:**

- **3 writes** (transaction, progress 50%, completed)
- **2 reads** (cancellation check, project fetch)
- **Total: 5 operations per job** (down from 11)

---

## 5. Data Flow Step-by-Step

### Complete Flow (Happy Path)

```

1.  USER: Clicks "Continue" button
    └── File: index.tsx, Line ~1023

2.  CLIENT: handleUploadAndContinue() called
    └── File: index.tsx, Line ~563
    └── Gets files with base64 URLs (not yet uploaded)

3.  CLIENT: uploadAndCreateJob() called
    └── File: index.tsx, Line ~497

    3a. Upload files to Firebase Storage (parallel)
    └── uploadFile() for each file
    └── Returns: Map<uid, storageUrl>

    3b. createProcessingJob() called
    └── File: getProcessedFile.ts

        3b-i. checkExistingActiveJob() - prevent duplicates

        3b-ii. createMenuProcessingJob()
               └── File: menuProcessing.ts
               └── Creates job doc: { status: "pending", files, ... }
               └── DEV: Calls dev_triggerProcessMenuImages
               └── PROD: onCreate trigger fires automatically

4.  CLIENT: setActiveProcessingJobId(jobId)
    └── Activates useMenuProcessingJob hook

5.  SERVER: processMenuImagesJobLogic() runs
    └── File: processMenuImagesJob.ts

    5a. Idempotency check (transaction)
    5b. Update status → "processing"
    5c. AI processing (Gemini)
    5d. Redistribute data to files
    5e. Transform IDs (prefix with file UID)
    5f. Save to project (Firestore)
    5g. Update job → "completed"

6.  CLIENT: useMenuProcessingJob detects completion
    └── onSnapshot receives update
    └── isCompleted = true

7.  CLIENT: useEffect triggers
    └── mutateProject() - refetch project
    └── setCurrentView(2) - show editor
    └── message.success()

8.  USER: Sees extracted menu data in editor

```

---

## 6. Key Files Reference

| File                                                             | Purpose                                          |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `src/components/templates/main-app/projects/index.tsx`           | Main UI component, Continue button, job tracking |
| `src/components/templates/main-app/projects/getProcessedFile.ts` | `createProcessingJob()` - creates job document   |
| `src/lib/firebase/menuProcessing.ts`                             | Firebase integration - job CRUD, dev trigger     |
| `src/hooks/useMenuProcessingJob.ts`                              | Real-time job status subscription                |
| `functions/src/index.ts`                                         | Trigger registration (onCreate + dev callable)   |
| `functions/src/logic/processMenuImagesJob.ts`                    | Server-side processing logic                     |
| `functions/src/logic/redistributeUtils.ts`                       | Data redistribution, ID transformation           |
| `functions/src/logic/saveFilesToProject.ts`                      | Save file entries to project                     |

---

## 7. Testing Guide

### DEV Environment

1. **Start emulators:**

   ```bash
   cd functions && npm run serve
   ```

````

2. **Start Next.js:**

   ```bash
   npm run dev
   ```

3. **Test flow:**
   - Upload menu images
   - Click "Continue"
   - Watch console for `[JobQueue]` logs
   - Check Firestore Emulator for job document
   - Verify project.files[] is updated

### PROD Environment

1. **Deploy functions:**

   ```bash
   npm run verify:functions-deploy-preflight
   # Then use the scoped menulist-qa Gate 1 command from __docs__/production-readiness/external-certification-runbook.md
   ```

2. **Test flow:**
   - Same as DEV, but onCreate trigger fires automatically
   - No manual dev trigger needed

### Debugging

**Check job status:**

```javascript
// In browser console
const jobDoc = await firebase
  .firestore()
  .collection("menuImageProcessingJobs")
  .doc(jobId)
  .get();
console.log(jobDoc.data());
```

**Check project files:**

```javascript
const projectDoc = await firebase
  .firestore()
  .doc(`projectsData/{tId}/{sId}/{projectId}`)
  .get();
console.log(projectDoc.data().files);
```

---

## Summary

| Step | Location                          | What Happens                      |
| ---- | --------------------------------- | --------------------------------- |
| 1    | Client: `index.tsx`               | User clicks Continue              |
| 2    | Client: `uploadAndCreateJob()`    | Upload files + create job         |
| 3    | Client: `menuProcessing.ts`       | Job doc created in Firestore      |
| 4    | Server: `processMenuImagesJob.ts` | AI processing + save to project   |
| 5    | Client: `useMenuProcessingJob`    | Detects completion via onSnapshot |
| 6    | Client: `useEffect`               | Refetch project, show editor      |

**Key Principle:** Server does all heavy lifting, client just creates job and listens for completion.
````
