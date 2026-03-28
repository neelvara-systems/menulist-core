# Menu Image Processing Flow - Complete Technical Documentation

## Overview

This document provides a **line-by-line deep analysis** of the menu image processing flow, from user file upload to extracted data appearing in the Editor. This is a prerequisite for understanding how multi-outlet features will integrate with this system.

**Architecture:** Job Queue (Firestore document triggers)
**AI Model:** Gemini 2.5 Flash
**Security:** Rate limiting (Upstash Redis), Zod validation, DOMPurify sanitization

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Next.js Dashboard)                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  User clicks "Continue" button (View 1 → processing)                                    │
│         │                                                                                │
│         ▼                                                                                │
│  handleUploadAndContinue()  [index.tsx:599-662]                                         │
│         │                                                                                │
│         ├── 1. Filter files needing processing (base64 URLs)                            │
│         │                                                                                │
│         ├── 2. uploadAndCreateJob() [index.tsx:536-587]                                 │
│         │      ├── Upload files to Firebase Storage (parallel)                          │
│         │      └── createProcessingJob() [getProcessedFile.ts:37-83]                    │
│         │           └── createMenuProcessingJob() [menuProcessing.ts:98-168]            │
│         │                ├── Creates job document in menuImageProcessingJobs            │
│         │                └── DEV: Calls dev_triggerProcessMenuImages callable           │
│         │                                                                                │
│         ├── 3. Update project with uploaded URLs                                        │
│         │                                                                                │
│         └── 4. setActiveProcessingJobId(jobId) → triggers useMenuProcessingJob hook     │
│                                                                                          │
│  useMenuProcessingJob(jobId)  [hooks/useMenuProcessingJob.ts:58-130]                    │
│         │  • Real-time onSnapshot listener on job document                              │
│         │  • Returns: isProcessing, isCompleted, isFailed, progress, currentStep        │
│         │                                                                                │
│         ▼                                                                                │
│  useEffect in index.tsx [L195-221] handles job completion                               │
│         │  • jobIsCompleted → mutateProject() refetch → setCurrentView(2) → Editor      │
│         │  • jobIsFailed → show error message                                           │
│         │  • jobIsCancelled → show info message                                         │
│                                                                                          │
└───────────────────────────────────┬─────────────────────────────────────────────────────┘
                                    │ Job document created
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         FIREBASE (Firestore + Cloud Functions)                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                          │
│  Collection: menuImageProcessingJobs/{jobId}                                            │
│         │                                                                                │
│         ├── PROD: onCreate trigger → processMenuImagesJob [index.ts:92-108]             │
│         │                                                                                │
│         └── DEV: dev_triggerProcessMenuImages callable [dev-triggers.ts:69-82]          │
│                                                                                          │
│                        ▼                                                                 │
│  processMenuImagesJobLogic(jobId, job)  [processMenuImagesJob.ts:41-256]               │
│         │                                                                                │
│         ├── Step 1: Transaction to set status="processing" (idempotency)                │
│         │                                                                                │
│         ├── Step 2: processMenuImagesLogic(request) [processMenuImages.ts:616-885]     │
│         │      ├── Rate limit check (Upstash)                                           │
│         │      ├── Upload files to Gemini (parallel)                                    │
│         │      ├── Batch processing (max 10 images/batch)                               │
│         │      ├── AI extraction with circuit breaker + retry                           │
│         │      └── Quality scoring                                                       │
│         │                                                                                │
│         ├── Step 3: Check for cancellation (post-AI)                                    │
│         │                                                                                │
│         ├── Step 4: processParallelResponse() [redistributeUtils.ts:428-455]           │
│         │      ├── redistributeExtractedData() - Split by sourceFileIndex              │
│         │      └── transformIdsForFile() - Add file UID prefix to IDs                  │
│         │                                                                                │
│         ├── Step 5: saveFilesToProject() [saveFilesToProject.ts:119-259]               │
│         │      ├── Append file entries to project.files[]                               │
│         │      ├── Auto-merge items (same name in same category → replace)             │
│         │      └── Merge languages                                                       │
│         │                                                                                │
│         └── Step 6: Update job status="completed" with result                           │
│                                                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Client-Side Flow (Detailed)

### 2.1 Entry Point: handleUploadAndContinue()

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** 599-662

```typescript
// index.tsx:599-662
const handleUploadAndContinue = async (activeProject: Project | null) => {
  if (!activeProject || !selectedProject) return;

  const projectDataCopy: Project = removeObjRef(activeProject);

  // Check 1: All files already processed?
  const allFilesProcessed =
    projectDataCopy.files?.length > 0 &&
    projectDataCopy.files.every((f) => f.extractedData); // L604-606

  if (allFilesProcessed) {
    setCurrentView(2); // Skip to editor
    return;
  }

  try {
    // Check 2: Filter files that need processing (base64 = not uploaded yet)
    const filesToProcess =
      projectDataCopy.files?.filter(
        (f) => f.url?.includes("base64"), // L616
      ) || [];

    if (filesToProcess.length === 0) {
      setCurrentView(2); // Go to editor with existing data
      return;
    }

    setFileProcessingId(filesToProcess[0].uid); // L627 - Show loading state

    // Core: Upload and create job
    const { jobId, uploadedUrls } = await withTimeout(
      uploadAndCreateJob(filesToProcess, projectDataCopy),
      PROCESSING_TIMEOUT * filesToProcess.length,
    ); // L630-633

    // Update file URLs in local project copy
    filesToProcess.forEach((file) => {
      const fileIndex = projectDataCopy.files.findIndex(
        (f) => f.uid === file.uid,
      );
      if (fileIndex !== -1) {
        projectDataCopy.files[fileIndex] = {
          ...projectDataCopy.files[fileIndex],
          url:
            uploadedUrls.get(file.uid) || projectDataCopy.files[fileIndex].url,
        };
      }
    }); // L638-646

    // Save project with uploaded URLs (extractedData comes from server later)
    await updateProject({
      ...projectDataCopy,
      projectId: selectedProject.projectId,
    });
    mutateProject(removeObjRef(projectDataCopy), false); // L648-650

    // Trigger job tracking - useEffect will handle completion
    setActiveProcessingJobId(jobId); // L653
  } catch (error: any) {
    setFileProcessingId(null);
    message.error(`Processing failed: ${error.message || "Unknown error"}`);
  }
};
```

### 2.2 File Upload & Job Creation: uploadAndCreateJob()

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** 536-587

```typescript
// index.tsx:536-587
const uploadAndCreateJob = async (
  filesToProcess: any[],
  projectDataCopy: Project,
): Promise<{ jobId: string; uploadedUrls: Map<string, string> }> => {
  const startTime = Date.now();

  // STEP 1: Upload ALL files to Firebase Storage in PARALLEL
  const uploadPromises = filesToProcess.map((file) =>
    uploadFile({ url: file.url, type: file.type, uid: file.uid })
      .then((url) => ({ uid: file.uid, url, file }))
      .catch((err) => ({ uid: file.uid, url: null, file, error: err })),
  ); // L544-548

  const uploadResults = await Promise.all(uploadPromises); // L550

  // Collect successful uploads
  const uploadedUrls = new Map<string, string>();
  const successfulUploads: any[] = [];

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
  }); // L554-567

  if (successfulUploads.length === 0) {
    throw new Error("All file uploads failed");
  }

  // STEP 2: Create job with uploaded files
  const targetLanguages = GlobalLanguagesList.filter((lang) =>
    projectDataCopy.languages.includes(lang.code),
  ); // L576

  const { jobId } = await createProcessingJob({
    files: successfulUploads,
    targetLanguages,
    projectId: projectDataCopy.projectId,
  }); // L579-583

  return { jobId, uploadedUrls };
};
```

### 2.3 Job Creation: createProcessingJob()

**File:** `src/components/templates/main-app/projects/getProcessedFile.ts`
**Lines:** 37-83

```typescript
// getProcessedFile.ts:37-83
async function createProcessingJob({
  files,
  targetLanguages,
  projectId,
  action = AI_ACTIONS_TYPES.IMAGE_PROCESSING,
}: ProcessedFileAPIParams): Promise<CreateJobResult> {
  // Check for existing active job (prevent duplicates)
  const existingJobId = await checkExistingActiveJob(projectId); // L51
  if (existingJobId) {
    return { jobId: existingJobId }; // Return existing job
  }

  // Create new job document
  const jobId = await createMenuProcessingJob({
    projectId,
    files: files.map((f) => ({
      uid: f.uid,
      name: f.name,
      size: f.size,
      type: f.type,
      url: f.url,
    })) as MenuFileToProcess[],
    targetLanguages: targetLanguages.map((l) => ({
      code: l.code,
      name: l.name,
    })) as TargetLanguage[],
    action,
  }); // L58-72

  return { jobId };
}
```

### 2.4 Firestore Job Document Creation: createMenuProcessingJob()

**File:** `src/lib/firebase/menuProcessing.ts`
**Lines:** 98-168

```typescript
// menuProcessing.ts:98-168
export async function createMenuProcessingJob(
  params: CreateJobParams,
): Promise<string> {
  const {
    projectId,
    files,
    targetLanguages,
    action = "IMAGE_PROCESSING",
  } = params;

  // Get session for tenant context
  const session = await getActiveSession(); // L107
  if (!session) {
    throw new Error("User not authenticated");
  }

  // Build job document with all required fields
  const jobData = {
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
    status: "pending",
    progress: 0,
    currentStep: "Queued",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Tenant context (CRITICAL for isolation)
    sId: String(session.sId),
    tId: String(session.tId),
    uId: session.uId || session.uid,
  }; // L113-136

  // Create document in Firestore
  const jobRef = await addDoc(
    collection(firebaseClient, "menuImageProcessingJobs"),
    jobData,
  ); // L139
  const jobId = jobRef.id;

  // DEV ONLY: Manually trigger function (emulator doesn't auto-trigger)
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true"
  ) {
    const functions = getFunctions();
    const triggerFn = httpsCallable(functions, "dev_triggerProcessMenuImages");
    await triggerFn({ jobId, jobData: { ...jobData, id: jobId } });
  } // L149-165

  return jobId;
}
```

### 2.5 Job Status Listener: useMenuProcessingJob Hook

**File:** `src/hooks/useMenuProcessingJob.ts`
**Lines:** 58-130

```typescript
// useMenuProcessingJob.ts:58-130
export function useMenuProcessingJob(
  jobId: string | null,
): UseMenuProcessingJobReturn {
  const [job, setJob] = useState<MenuProcessingJobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Real-time listener on job document
    const unsubscribe = onSnapshot(
      doc(firebaseClient, "menuImageProcessingJobs", jobId),
      (snapshot) => {
        if (snapshot.exists()) {
          setJob({
            id: snapshot.id,
            ...snapshot.data(),
          } as MenuProcessingJobStatus);
        } else {
          setJob(null);
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("[useMenuProcessingJob] Listener error:", error);
        setIsLoading(false);
      },
    ); // L71-88

    return () => unsubscribe();
  }, [jobId]);

  // Cancel function
  const cancel = useCallback(async () => {
    if (!jobId) return;
    await cancelMenuProcessingJob(jobId);
  }, [jobId]);

  // Compute derived states
  const status = job?.status;
  const isPending = status === "pending";
  const isProcessing = status === "processing";
  const isCancelling = status === "cancelling";
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isTerminal = isCompleted || isFailed || isCancelled;

  return {
    job,
    isLoading,
    isPending,
    isProcessing,
    isCancelling,
    isCancelled,
    isCompleted,
    isFailed,
    isTerminal,
    progress: job?.progress ?? 0,
    currentStep: job?.currentStep ?? "",
    result: job?.result ?? null,
    error: job?.error ?? null,
    fileResults: job?.fileResults ?? null,
    cancel,
  };
}
```

### 2.6 Job Completion Handler

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** 195-221

```typescript
// index.tsx:195-221
useEffect(() => {
  if (!activeProcessingJobId) return;

  if (jobIsCompleted) {
    console.log("[JobQueue] Job completed, refetching project data");
    // Server has already saved extractedData to project.files[]
    mutateProject(); // SWR refetch to get updated data
    setActiveProcessingJobId(null);
    setFileProcessingId(null);
    setCurrentView(2); // Navigate to Editor (View 2)
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

---

## 3. Server-Side Flow (Detailed)

### 3.1 Production Trigger: processMenuImagesJob

**File:** `functions/src/index.ts`
**Lines:** 92-108

```typescript
// index.ts:92-108 (PRODUCTION ONLY)
exports.processMenuImagesJob = onDocumentCreated(
  {
    ...ParallelProcessingOptions, // 9 min timeout, 2GB RAM
    document: `${MENU_IMAGE_PROCESSING_JOBS_COLLECTION}/{jobId}`,
  },
  async (event) => {
    const snap = event.data;
    const { jobId } = event.params;

    logger.info(`[processMenuImagesJob] Job created: ${jobId}`);
    if (!snap) {
      logger.error(`No data for job ${jobId}`);
      return;
    }

    const job = snap.data() as MenuImageProcessingJob;
    await processMenuImagesJobLogic(jobId, job); // Main processing
  },
);
```

### 3.2 Development Trigger: dev_triggerProcessMenuImages

**File:** `functions/src/dev-triggers.ts`
**Lines:** 69-82

```typescript
// dev-triggers.ts:69-82
export const dev_triggerProcessMenuImages = onCall(
  ParallelProcessingOptions, // Same options as prod
  async (request) => {
    ensureDevEnvironment(); // Blocks in production

    const { jobId, jobData } = request.data;
    if (!jobId || !jobData) {
      throw new HttpsError("invalid-argument", "jobId and jobData required");
    }

    functions.logger.info(`[DEV_TRIGGER] Processing job ${jobId}`);
    await processMenuImagesJobLogic(jobId, jobData as MenuImageProcessingJob);
    return { success: true };
  },
);
```

### 3.3 Main Job Logic: processMenuImagesJobLogic()

**File:** `functions/src/logic/processMenuImagesJob.ts`
**Lines:** 41-256

```typescript
// processMenuImagesJob.ts:41-256
export async function processMenuImagesJobLogic(
  jobId: string,
  job: MenuImageProcessingJob,
): Promise<void> {
  const jobRef = firestoreAdmin
    .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
    .doc(jobId);

  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Set status to "processing" (with idempotency check)
    // Uses transaction to prevent duplicate processing
    // ═══════════════════════════════════════════════════════════════
    const updated = await firestoreAdmin.runTransaction(async (transaction) => {
      const jobDoc = await transaction.get(jobRef);

      if (jobDoc.data()?.status !== MENU_PROCESSING_STATUS.PENDING) {
        // Already being processed - skip
        return false;
      }

      // Set timeout to 10 minutes from now
      const timeoutMs = 10 * 60 * 1000;
      transaction.update(jobRef, {
        status: MENU_PROCESSING_STATUS.PROCESSING,
        startedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        timeoutAt: Timestamp.fromMillis(Date.now() + timeoutMs),
        currentStep: "Starting...",
        progress: 0,
      });
      return true;
    }); // L62-82

    if (!updated) return; // Job already processing

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Call AI processing logic
    // ═══════════════════════════════════════════════════════════════
    const request: ProcessMenuImagesRequest = {
      files: job.files.map((f) => ({
        uid: f.uid,
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.url,
      })),
      targetLanguages: job.targetLanguages,
      projectId: job.projectId,
      action: job.action || "IMAGE_PROCESSING",
    }; // L96-107

    // This is where Gemini AI is called
    const result = await processMenuImagesLogic(request); // L111

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Check for cancellation after AI (saves reads)
    // ═══════════════════════════════════════════════════════════════
    const postProcessJob = await jobRef.get();
    if (postProcessJob.data()?.status === MENU_PROCESSING_STATUS.CANCELLING) {
      await jobRef.update({
        status: MENU_PROCESSING_STATUS.CANCELLED,
        completedAt: Timestamp.now(),
        result: {
          /* partial results */
        },
      });
      return;
    } // L117-134

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Update progress
    // ═══════════════════════════════════════════════════════════════
    await jobRef.update({
      currentStep: "Processing complete, saving to project...",
      progress: 50,
      updatedAt: Timestamp.now(),
    }); // L140-144

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Redistribute data to individual files
    // AI returns combined data with sourceFileIndex on each item
    // This splits it back per-file and transforms IDs
    // ═══════════════════════════════════════════════════════════════

    // Fetch existing project for cross-file category matching
    const existingProject = await getProject(job.projectId); // L153
    const primaryLang = job.targetLanguages[0]?.code || "en";
    const existingCategories = existingProject?.files
      ? buildExistingCategoriesMap(existingProject.files, primaryLang)
      : undefined; // L154-157

    // Redistribute and transform IDs
    const redistributedData = processParallelResponse(
      combinedResponse,
      job.files,
      existingCategories, // For cross-file category refs
    ); // L168

    // Calculate per-file statistics
    const fileResults: {
      [uid: string]: { categoriesCount: number; itemsCount: number };
    } = {};
    redistributedData.forEach((extractedData, fileUid) => {
      fileResults[fileUid] = {
        categoriesCount: extractedData?.data?.categories?.length || 0,
        itemsCount: extractedData?.data?.items?.length || 0,
      };
    }); // L171-181

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Save files to project document
    // ═══════════════════════════════════════════════════════════════
    await saveFilesToProject(
      job.projectId,
      redistributedData,
      job.files,
      result.data.data.languages || [],
      true, // enableAutoMerge
      existingProject, // Avoid duplicate read
    ); // L187-194

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Update job as completed
    // ═══════════════════════════════════════════════════════════════
    await jobRef.update({
      status: MENU_PROCESSING_STATUS.COMPLETED,
      completedAt: Timestamp.now(),
      progress: 100,
      currentStep: "Completed",
      result: {
        combinedData: result.data.data,
        qualityScore: result.data.qualityScore,
        qualityDetails: result.data.qualityDetails,
        processingTime: result.transaction.processingTime,
      },
      fileResults,
      transaction: {
        /* token usage stats */
      },
    }); // L200-224
  } catch (error: any) {
    // Mark job as failed
    await jobRef.update({
      status: MENU_PROCESSING_STATUS.FAILED,
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

### 3.4 AI Processing: processMenuImagesLogic()

**File:** `functions/src/logic/processMenuImages.ts`
**Lines:** 616-885

```typescript
// processMenuImages.ts:616-885
export async function processMenuImagesLogic(
  request: ProcessMenuImagesRequest,
): Promise<ProcessMenuImagesResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const { files, targetLanguages, projectId, action } = request;

  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 0: Check rate limit (Upstash Redis)
    // ═══════════════════════════════════════════════════════════════
    const rateLimit = await checkExpensiveAIRateLimit(projectId); // L651
    if (!rateLimit.allowed) {
      const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      throw new Error(`Rate limit exceeded. Wait ${waitSeconds}s.`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: Upload all files to Gemini in parallel
    // ═══════════════════════════════════════════════════════════════
    const uploadedFiles = await uploadFilesInParallel(files); // L659
    if (uploadedFiles.length === 0) {
      throw new Error("No files uploaded successfully");
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: Chunk files into batches (max 10 per batch)
    // ═══════════════════════════════════════════════════════════════
    const fileBatches = chunkArray(uploadedFiles, MAX_IMAGES_PER_BATCH); // L668
    const totalBatches = fileBatches.length;

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: Process batches SEQUENTIALLY with category continuation
    // ═══════════════════════════════════════════════════════════════
    let accumulatedData: ExtractedMenuData = {
      languages: [],
      categories: [],
      items: [],
    }; // L679-683

    let totalTokenUsage = {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };
    const batchResults: BatchResult[] = [];
    let sourceFileOffset = 0;

    for (let batchIndex = 0; batchIndex < fileBatches.length; batchIndex++) {
      const batch = fileBatches[batchIndex];

      // Exponential backoff between batches (rate limit protection)
      if (batchIndex > 0) {
        const delayMs = calculateBatchDelay(batchIndex - 1);
        await sleep(delayMs); // 1s, 2s, 4s, 8s (capped)
      } // L700-708

      // Build context from previous batches (category continuation)
      const existingContext =
        batchIndex > 0 && accumulatedData.categories.length > 0
          ? buildExistingCategoriesContext(
              accumulatedData.categories,
              accumulatedData.items,
            )
          : undefined; // L711-713

      // Process single batch
      const batchResult = await processSingleBatch(
        batch,
        targetLanguages,
        existingContext,
        batchIndex,
        requestId,
        totalBatches,
      ); // L715-722

      // Accumulate results
      totalTokenUsage.promptTokenCount +=
        batchResult.tokenUsage.promptTokenCount;
      totalTokenUsage.candidatesTokenCount +=
        batchResult.tokenUsage.candidatesTokenCount;
      totalTokenUsage.totalTokenCount += batchResult.tokenUsage.totalTokenCount;

      if (batchResult.success && batchResult.data) {
        accumulatedData = mergeExtractedData(
          accumulatedData,
          batchResult.data,
          sourceFileOffset,
        ); // L733
      }

      sourceFileOffset += batch.length; // L749
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: Score quality
    // ═══════════════════════════════════════════════════════════════
    const quality = scoreExtractionQuality(accumulatedData); // L768

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: Build client response
    // ═══════════════════════════════════════════════════════════════
    const clientResponse = {
      message: combinedMessage,
      data: accumulatedData,
      qualityScore: quality.score,
      qualityDetails: quality.details,
    }; // L783-788

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: Record AI operation transaction
    // ═══════════════════════════════════════════════════════════════
    const transactionObject: TransactionObject = {
      transactionId: null,
      files,
      targetLanguages,
      projectId,
      action,
      clientResponse,
      model: AI_MODEL,
      promptTokenCount: totalTokenUsage.promptTokenCount,
      candidatesTokenCount: totalTokenUsage.candidatesTokenCount,
      totalTokenCount: totalTokenUsage.totalTokenCount,
      processingTime: Date.now() - startTime,
      totalCredits: totalTokenUsage.totalTokenCount / TOKENS_PER_CREDIT,
      totalCharge:
        CHARGE_PER_CREDIT *
        (totalTokenUsage.totalTokenCount / TOKENS_PER_CREDIT),
    }; // L791-810

    transactionObject.transactionId = await addAiOperation(transactionObject); // L815

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: Return response
    // ═══════════════════════════════════════════════════════════════
    return {
      data: {
        message: clientResponse.message,
        data: accumulatedData,
        qualityScore: quality.score,
        qualityDetails: quality.details,
      },
      transaction: {
        requestId,
        totalCharge: transactionObject.totalCharge,
        totalCredits: transactionObject.totalCredits,
        processingTime: transactionObject.processingTime,
        transactionId: transactionObject.transactionId,
      },
    }; // L855-870
  } catch (error) {
    throw error;
  }
}
```

### 3.5 Single Batch Processing: processSingleBatch()

**File:** `functions/src/logic/processMenuImages.ts`
**Lines:** 451-573

```typescript
// processMenuImages.ts:451-573
async function processSingleBatch(
  uploadedFiles: UploadedFile[],
  targetLanguages: TargetLanguage[],
  existingContext: ExistingCategoriesContext | undefined,
  batchIndex: number,
  requestId: string,
  totalBatches: number,
): Promise<BatchResult> {
  try {
    // Build content for Gemini
    const contentParts = [
      ...uploadedFiles.map((file) =>
        createPartFromUri(file.uri, file.mimeType),
      ),
      `Extract and translate menu data into ${languageString}`,
    ]; // L464-467

    // Execute AI call with circuit breaker + retry protection
    const response = await executeWithCircuitBreaker(
      () =>
        retryWithBackoff<GenerateContentResponse>(
          async () => {
            return await genAIClient.models.generateContent({
              model: AI_MODEL, // Gemini 2.5 Flash
              contents: [createUserContent(contentParts)],
              config: {
                ...GENERATION_CONFIG,
                systemInstruction: getParallelProcessingPrompt(existingContext),
                safetySettings: SAFETY_SETTINGS,
              },
            });
          },
          2,
          2000,
        ), // 2 retries, 2s base delay
      geminiCircuitBreaker,
    ); // L485-498

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    // Parse and validate response
    const parsedData = processAIResponseForFirebase(responseText); // L507

    return {
      success: true,
      data: parsedData.data,
      message: parsedData.message || "",
      batchIndex,
      filesProcessed: uploadedFiles.length,
      tokenUsage: {
        promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
      },
      failedFileIndices: [],
    };
  } catch (error: any) {
    return {
      success: false,
      data: null,
      message: `Batch ${batchIndex + 1} failed: ${error.message}`,
      batchIndex,
      filesProcessed: 0,
      tokenUsage: {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      },
      failedFileIndices: uploadedFiles.map(
        (_, i) => batchIndex * MAX_IMAGES_PER_BATCH + i,
      ),
    };
  }
}
```

### 3.6 AI Response Processing: processAIResponseForFirebase()

**File:** `functions/src/logic/aiResponseUtils.ts`
**Lines:** 247-265

```typescript
// aiResponseUtils.ts:247-265
export function processAIResponseForFirebase(rawText: string | object): {
  message: string;
  data: ExtractedMenuData | null;
} {
  // Step 1: Parse JSON (handles BOM, markdown fences)
  const parsed = parseAIResponseText(rawText); // L252

  // Step 2: Validate structure (basic checks)
  const validation = validateResponseStructure(parsed); // L255
  if (!validation.valid) {
    console.warn("Validation warnings:", validation.errors);
    // Continue anyway - normalize what we can
  }

  // Step 3: Normalize data (ensure consistent types)
  const normalized = normalizeResponseData(parsed); // L262

  return normalized;
}
```

### 3.7 Data Redistribution: processParallelResponse()

**File:** `functions/src/logic/redistributeUtils.ts`
**Lines:** 428-455

```typescript
// redistributeUtils.ts:428-455
export function processParallelResponse(
  combinedResponse: CombinedAIResponse,
  files: Array<{ uid: string; [key: string]: any }>,
  existingCategories?: Map<string, string>,
): Map<string, ExtractedData> {
  // Create file mappings (index = order files were sent to AI)
  const fileMappings: FileMapping[] = files.map((file, index) => ({
    uid: file.uid,
    index,
  })); // L434-437

  // STEP 1: Redistribute data to individual files by sourceFileIndex
  const redistributedData = redistributeExtractedData(
    combinedResponse,
    fileMappings,
  );
  // L440

  // STEP 2: Transform IDs for each file
  const result = new Map<string, ExtractedData>();

  redistributedData.forEach((extractedData, fileUid) => {
    const transformed = transformIdsForFile(
      extractedData,
      fileUid,
      existingCategories,
    ); // L446

    result.set(fileUid, {
      ...transformed,
      qualityScore: combinedResponse.qualityScore,
      qualityDetails: combinedResponse.qualityDetails,
    });
  }); // L445-452

  return result;
}
```

### 3.8 ID Transformation: transformIdsForFile()

**File:** `functions/src/logic/redistributeUtils.ts`
**Lines:** 318-403

**ID Format Pattern:**

- **Category ID:** `{fileUid}c{sequentialNumber}` (e.g., `abc123c1`, `abc123c2`)
- **Item ID:** `{fileUid}i{originalId}` (e.g., `abc123i1`, `abc123i2`)
- **Attribute ID:** `{itemId}a{originalId}` (e.g., `abc123i1a1`)

```typescript
// redistributeUtils.ts:318-403
export function transformIdsForFile(
  extractedData: ExtractedData,
  fileUid: string,
  existingCategories?: Map<string, string>, // categoryName -> existingId
): ExtractedData {
  if (!extractedData?.data) return extractedData;

  const categoryIdMap: Record<string | number, string> = {};
  const primaryLang =
    Object.keys(extractedData.data.categories?.[0]?.name || {})[0] || "en";
  const existingCategoryIds = new Set<string>();

  // Process categories - check existing first
  let newCategoryCounter = 1;
  extractedData.data.categories?.forEach((cat) => {
    const oldId = cat.id;
    const categoryName = cat.name[primaryLang]?.toLowerCase().trim();

    if (existingCategories?.has(categoryName)) {
      // USE existing category ID (cross-file category reference)
      const existingId = existingCategories.get(categoryName)!;
      categoryIdMap[oldId] = existingId;
      existingCategoryIds.add(String(oldId));
    } else {
      // NEW category - transform with file UID prefix
      categoryIdMap[oldId] = `${fileUid}c${newCategoryCounter++}`;
    }
  }); // L336-350

  // Filter out categories that already exist
  const transformedCategories =
    extractedData.data.categories
      ?.filter((cat) => {
        return !existingCategoryIds.has(String(cat.id));
      })
      .map((cat) => ({
        ...cat,
        id: categoryIdMap[cat.id],
        active: true,
      })) || []; // L353-359

  // Transform item IDs and category references
  const transformedItems =
    extractedData.data.items?.map((item) => {
      const newItemId = `${fileUid}i${item.id}`;
      const newCategoryId = categoryIdMap[item.category] || item.category;

      // Transform attribute IDs
      const transformedAttributes = Array.isArray(item.attributes)
        ? item.attributes.map((attr) => ({
            ...attr,
            id: `${newItemId}a${attr.id}`,
            active: true,
          }))
        : [];

      return {
        ...item,
        id: newItemId,
        category: newCategoryId,
        active: true,
        available: true,
        attributes: transformedAttributes,
      };
    }) || []; // L362-393

  return {
    ...extractedData,
    data: {
      ...extractedData.data,
      categories: transformedCategories,
      items: transformedItems,
    },
  };
}
```

### 3.9 Save to Project: saveFilesToProject()

**File:** `functions/src/logic/saveFilesToProject.ts`
**Lines:** 119-259

```typescript
// saveFilesToProject.ts:119-259
export async function saveFilesToProject(
  projectId: string,
  redistributedData: Map<string, ExtractedData>,
  jobFiles: JobFileInput[],
  languages: LanguageInput[],
  enableAutoMerge: boolean = true,
  existingProjectData?: any,
): Promise<MergeStats> {
  const projectRef = getProjectRef(projectId); // L136

  try {
    // 1. Use existing project if passed (optimization)
    let existingProject = existingProjectData;
    if (!existingProject) {
      const projectDoc = await projectRef.get();
      existingProject = projectDoc.exists ? projectDoc.data() : null;
    }
    const existingFiles: ProjectFileEntry[] = existingProject?.files || [];
    const existingLanguages: string[] = existingProject?.languages || [];

    // 2. Get primary language for auto-merge
    const primaryLang = existingLanguages[0] || languages[0]?.code || "en";

    // 3. Auto-merge items if enabled
    let replacedCount = 0;
    let addedCount = 0;

    if (enableAutoMerge && existingFiles.length > 0) {
      const existingItems = existingFiles.flatMap(
        (file) => file.extractedData?.data?.items || [],
      );
      const allNewItems: ExtractedDataItem[] = [];
      redistributedData.forEach((data) => {
        if (data?.data?.items) {
          allNewItems.push(...data.data.items);
        }
      });

      if (existingItems.length > 0 && allNewItems.length > 0) {
        const mergeResult = autoMergeItems(
          existingItems,
          allNewItems,
          primaryLang,
        );
        replacedCount = mergeResult.replacedCount;
        addedCount = mergeResult.addedCount;
      }
    } // L161-191

    // 4. Build new file entries
    const startIndex = existingFiles.length;
    const newFiles: ProjectFileEntry[] = jobFiles.map((file, idx) => {
      const extractedData = redistributedData.get(file.uid) || null;

      return {
        uid: file.uid,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.url,
        active: true,
        deleted: false,
        index: startIndex + idx,
        extractedData: extractedData
          ? {
              message: extractedData.message || "",
              data: extractedData.data,
            }
          : null,
        qualityScore: extractedData?.qualityScore,
      };
    }); // L194-217

    // 5. Merge languages
    const languageCodeSet = new Set(existingLanguages);
    const newLanguageCodes: string[] = [];
    languages.forEach((lang) => {
      if (!languageCodeSet.has(lang.code)) {
        languageCodeSet.add(lang.code);
        newLanguageCodes.push(lang.code);
      }
    });
    const mergedLanguages =
      existingLanguages.length > 0
        ? [...existingLanguages, ...newLanguageCodes]
        : languages.map((l) => l.code); // L220-233

    // 6. Save to Firestore
    const updateData = {
      projectId,
      files: [...existingFiles, ...newFiles],
      languages: mergedLanguages,
    };
    await projectRef.set(updateData, { merge: true }); // L243

    return { replacedCount, addedCount, newFilesCount: newFiles.length };
  } catch (error) {
    throw error;
  }
}
```

---

## 4. Cleanup Schedulers

### 4.1 Stuck Jobs Cleanup (Every 15 min)

**File:** `functions/src/schedulers/menuJobCleanup.ts`
**Lines:** 28-64

```typescript
// menuJobCleanup.ts:28-64
export async function cleanupStuckJobsLogic(): Promise<{ cleaned: number }> {
  // Find jobs stuck in "processing" past their timeout
  const stuckJobs = await firestoreAdmin
    .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
    .where("status", "==", MENU_PROCESSING_STATUS.PROCESSING)
    .where("timeoutAt", "<", Timestamp.now())
    .get(); // L33-37

  if (stuckJobs.empty) return { cleaned: 0 };

  const batch = firestoreAdmin.batch();
  stuckJobs.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: MENU_PROCESSING_STATUS.FAILED,
      completedAt: Timestamp.now(),
      error: {
        code: "TIMEOUT",
        message: "Job timed out during processing",
        retryable: true,
      },
    });
  });
  await batch.commit();

  return { cleaned: stuckJobs.size };
}
```

### 4.2 Old Jobs Cleanup (Every 24 hours)

**File:** `functions/src/schedulers/menuJobCleanup.ts`
**Lines:** 75-106

```typescript
// menuJobCleanup.ts:75-106
export async function cleanupOldJobsLogic(): Promise<{ deleted: number }> {
  // Delete jobs older than 7 days in terminal state
  const cutoff = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const oldJobs = await firestoreAdmin
    .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
    .where("status", "in", [
      MENU_PROCESSING_STATUS.COMPLETED,
      MENU_PROCESSING_STATUS.FAILED,
      MENU_PROCESSING_STATUS.CANCELLED,
    ])
    .where("completedAt", "<", cutoff)
    .limit(500)
    .get(); // L83-92

  if (oldJobs.empty) return { deleted: 0 };

  const batch = firestoreAdmin.batch();
  oldJobs.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return { deleted: oldJobs.size };
}
```

---

## 5. Data Structures

### 5.1 Job Document Schema

```typescript
// Collection: menuImageProcessingJobs/{jobId}
interface MenuImageProcessingJob {
  // Identifiers
  projectId: string;
  sId: string; // Store ID (tenant isolation)
  tId: string; // Tenant ID
  uId: string; // User ID

  // Input
  files: Array<{
    uid: string;
    name: string;
    size: number;
    type: string;
    url: string; // Firebase Storage URL
  }>;
  targetLanguages: Array<{
    code: string; // ISO 639-1
    name: string;
  }>;
  action: string; // "IMAGE_PROCESSING"

  // Status
  status:
    | "pending"
    | "processing"
    | "cancelling"
    | "cancelled"
    | "completed"
    | "failed";
  progress: number; // 0-100
  currentStep: string;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  timeoutAt?: Timestamp; // 10 min from start

  // Result (on completion)
  result?: {
    combinedData: ExtractedMenuData;
    qualityScore: number;
    qualityDetails: QualityDetails;
    processingTime: number;
  };

  // Error (on failure)
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };

  // Per-file results
  fileResults?: {
    [fileUid: string]: {
      categoriesCount: number;
      itemsCount: number;
    };
  };
}
```

### 5.2 Extracted Data Structure

```typescript
interface ExtractedData {
  message?: string;
  data?: {
    languages?: Array<{
      name: string;
      code: string;
      isPrimary?: boolean;
    }>;
    categories?: Array<{
      id: string; // Format: {fileUid}c{seq}
      name: Record<string, string>; // { "en": "Appetizers", "hi": "स्टार्टर्स" }
      active?: boolean;
    }>;
    items?: Array<{
      id: string; // Format: {fileUid}i{originalId}
      name: Record<string, string>;
      category: string; // Reference to category ID
      description?: Record<string, string>;
      price?: string;
      attributes?: Array<{
        id: string; // Format: {itemId}a{originalId}
        name: Record<string, string>;
        price?: string;
      }>;
      tags?: string[];
      active?: boolean;
      available?: boolean;
    }>;
  };
  qualityScore?: number;
  qualityDetails?: {
    categoryQuality: number; // Max 25
    itemQuality: number; // Max 10
    priceQuality: number; // Max 50
    descriptionQuality: number; // Max 25
  };
}
```

---

## 6. File Reference Summary

| File                      | Purpose                           | Key Lines       |
| ------------------------- | --------------------------------- | --------------- |
| **CLIENT**                |                                   |                 |
| `index.tsx`               | Main projects page, upload flow   | 536-662         |
| `getProcessedFile.ts`     | Job creation wrapper              | 37-83           |
| `menuProcessing.ts`       | Firestore job operations          | 98-168          |
| `useMenuProcessingJob.ts` | Real-time status hook             | 58-130          |
| **SERVER**                |                                   |                 |
| `index.ts`                | Function exports, triggers        | 92-108, 164-209 |
| `dev-triggers.ts`         | Dev callable triggers             | 69-82           |
| `processMenuImagesJob.ts` | Main job logic                    | 41-256          |
| `processMenuImages.ts`    | AI processing logic               | 616-885         |
| `aiResponseUtils.ts`      | Response parsing                  | 247-265         |
| `redistributeUtils.ts`    | Data redistribution, ID transform | 318-455         |
| `saveFilesToProject.ts`   | Save to Firestore                 | 119-259         |
| `menuJobCleanup.ts`       | Scheduled cleanup                 | 28-106          |

---

## 7. Key Points for Multi-Outlet Integration

1. **ID Generation is File-Based:** IDs use `{fileUid}c{seq}` and `{fileUid}i{seq}` pattern, not tied to store/tenant.

2. **Data Saved Directly to Project:** Server saves extractedData to `project.files[].extractedData` - no intermediate step.

3. **Client Refetches After Completion:** `mutateProject()` SWR refetch gets updated data from Firestore.

4. **Cross-File Category Matching:** `existingCategories` map enables category deduplication across files.

5. **Tenant Isolation:** Job documents include `sId`, `tId`, `uId` for security.

6. **No Multi-Outlet Awareness:** Current flow has no awareness of `masterProjectId` or linked stores.

**For Multi-Outlet:**

- New files uploaded to linked store need local IDs (`L_I_`, `L_C_` prefixes)
- Server should check if project is linked before ID transformation
- Master project data should NOT be modified by linked store uploads
- Consider whether extracted data flows to master or stays local
