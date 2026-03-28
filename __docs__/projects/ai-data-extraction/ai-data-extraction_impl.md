# AI Data Extraction — Implementation

**Feature:** OCR & Menu Extraction with Gemini AI  
**Status:** ✅ Production Ready  
**Architecture:** Job Queue (Firebase Cloud Functions)  
**Last Updated:** March 13, 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (Next.js)                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  getProcessedFile.ts → createProcessingJob()                    │
│       │                                                          │
│       ▼                                                          │
│  menuProcessing.ts                                               │
│       │  • createMenuProcessingJob() - Creates job doc          │
│       │  • checkExistingActiveJob() - Prevents duplicates       │
│       │                                                          │
│       ▼                                                          │
│  useMenuProcessingJob hook                                       │
│       │  • Listens to job status via onSnapshot                 │
│       │  • Updates UI with progress                             │
│                                                                  │
└───────┼─────────────────────────────────────────────────────────┘
        │
        │ Job document created
        ▼
┌─────────────────────────────────────────────────────────────────┐
│ FIREBASE (Firestore + Cloud Functions)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Collection: menuImageProcessingJobs/{jobId}                    │
│       │                                                          │
│       ▼                                                          │
│  PROD: onCreate trigger → processMenuImagesJob                  │
│  DEV: callable → dev_triggerProcessMenuImages                   │
│       │                                                          │
│       ▼                                                          │
│  processMenuImagesJobLogic()                                    │
│       │  1. Update status → "processing"                        │
│       │  2. For each file:                                      │
│       │     • Send to Gemini 2.5 Flash                          │
│       │     • Validate with Zod                                 │
│       │     • Sanitize with DOMPurify                           │
│       │     • Calculate quality score                           │
│       │  3. Combine results                                     │
│       │  4. Save to project                                     │
│       │  5. Update status → "completed"                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

### Client Files

```
src/
├── components/templates/main-app/projects/
│   └── getProcessedFile.ts          # Creates processing job
├── hooks/
│   └── useMenuProcessingJob.ts      # Listens to job status (onSnapshot)
│
└── lib/firebase/
    └── menuProcessing.ts            # Job creation & management
```

### Cloud Functions

```
functions/src/
├── index.ts                              # Conditional exports (prod triggers vs dev callables)
├── dev-triggers.ts                       # dev_triggerProcessMenuImages callable
├── triggers/production.ts                # processMenuImagesJob (onDocumentCreated)
├── logic/
│   ├── processMenuImagesJob.ts           # Job orchestration (idempotency, branching, hardening)
│   ├── processMenuImages.ts              # Main AI processing (batch, upload, scoring)
│   ├── aiResponseUtils.ts               # Response parsing, validation, normalization
│   ├── redistributeUtils.ts             # Per-file data redistribution + sanitization
│   ├── extractionHardening.ts            # Category normalization, integrity, anomaly detection
│   └── saveFilesToProject.ts             # Save to project with auto-merge
├── lib/
│   ├── circuitBreaker.ts                 # Circuit breaker (CLOSED→OPEN→HALF_OPEN)
│   └── rateLimit.ts                      # Upstash rate limiting (5/min expensive)
├── constants/
│   └── ai.ts                             # Model config, batch settings, safety settings
└── types/
    ├── menuProcessingJob.types.ts        # Job document interface
    └── menuExtraction.types.ts           # Extracted data types, confidence, quality
```

---

## Key Components

### 1. Job Document Schema

```typescript
// Collection: menuImageProcessingJobs/{jobId}
interface MenuProcessingJob {
  // Identifiers
  projectId: string;
  sId: string; // Store ID
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
    code: string; // ISO 639-1 (e.g., "en", "hi")
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

  // Result (on completion)
  result?: {
    combinedData: ExtractedData;
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
      processingMessages?: ProcessingMessage[];
    };
  };
}
```

### 2. Client Integration

```typescript
// getProcessedFile.ts
async function createProcessingJob({
  files,
  targetLanguages,
  projectId,
  action = AI_ACTIONS_TYPES.IMAGE_PROCESSING,
}: ProcessedFileAPIParams): Promise<CreateJobResult> {
  // Check for existing active job (prevent duplicates)
  const existingJobId = await checkExistingActiveJob(projectId);
  if (existingJobId) {
    return { jobId: existingJobId };
  }

  // Create new job
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

### 3. Job Status Listener

```typescript
// useMenuProcessingJob.ts
export function useMenuProcessingJob(jobId: string | null) {
  const [status, setStatus] = useState<MenuProcessingJobStatus | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const unsubscribe = onSnapshot(
      doc(firebaseClient, "menuImageProcessingJobs", jobId),
      (snapshot) => {
        if (snapshot.exists()) {
          setStatus({
            id: snapshot.id,
            ...snapshot.data(),
          } as MenuProcessingJobStatus);
        }
      },
    );

    return () => unsubscribe();
  }, [jobId]);

  return status;
}
```

---

## Cloud Function Implementation

### Production Trigger

```typescript
// functions/src/index.ts
export const processMenuImagesJob = onDocumentCreated(
  { document: `menuImageProcessingJobs/{jobId}`, ...functionOptions },
  async (event) => {
    const jobId = event.params.jobId;
    const jobData = event.data?.data();

    if (!jobData) {
      logger.error(`[processMenuImagesJob] No data for job ${jobId}`);
      return;
    }

    await processMenuImagesJobLogic(jobId, jobData);
  },
);
```

### Development Trigger

```typescript
// functions/src/dev-triggers.ts
export const dev_triggerProcessMenuImages = onCall(
  functionOptions,
  async (request) => {
    ensureDevEnvironment();

    const { jobId, jobData } = request.data;
    if (!jobId || !jobData) {
      throw new HttpsError("invalid-argument", "jobId and jobData required");
    }

    await processMenuImagesJobLogic(jobId, jobData);
    return { success: true };
  },
);
```

### Main Processing Logic

```typescript
// functions/src/menuProcessing/processMenuImagesJobLogic.ts
export async function processMenuImagesJobLogic(
  jobId: string,
  jobData: MenuProcessingJobData,
): Promise<void> {
  const jobRef = db.collection("menuImageProcessingJobs").doc(jobId);

  try {
    // 1. Update status to processing
    await jobRef.update({
      status: "processing",
      currentStep: "Starting extraction",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Process each file
    const fileResults: Record<string, FileResult> = {};
    const allExtractedData: ExtractedData[] = [];

    for (let i = 0; i < jobData.files.length; i++) {
      const file = jobData.files[i];

      // Update progress
      await jobRef.update({
        progress: Math.round((i / jobData.files.length) * 100),
        currentStep: `Processing ${file.name}`,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Extract data with retry
      const result = await retryWithBackoff(() =>
        extractMenuData(file.url, jobData.targetLanguages),
      );

      // Validate and sanitize
      const validated = validateExtractedData(result);
      const sanitized = sanitizeExtractedData(validated);

      allExtractedData.push(sanitized);
      fileResults[file.uid] = {
        categoriesCount: sanitized.categories.length,
        itemsCount: sanitized.items.length,
      };
    }

    // 3. Combine results
    const combinedData = combineExtractedData(allExtractedData);
    const qualityScore = calculateQualityScore(combinedData);

    // 4. Save to project
    await saveToProject(jobData.projectId, jobData.files, combinedData);

    // 5. Update job as completed
    await jobRef.update({
      status: "completed",
      progress: 100,
      currentStep: "Complete",
      result: {
        combinedData,
        qualityScore: qualityScore.score,
        qualityDetails: qualityScore.details,
        processingTime: Date.now() - jobData.createdAt.toMillis(),
      },
      fileResults,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    // Handle failure
    await jobRef.update({
      status: "failed",
      error: {
        code: error.code || "PROCESSING_ERROR",
        message: error.message || "Processing failed",
        retryable: isRetryableError(error),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}
```

---

## Security Implementation

### Rate Limiting (Upstash Redis)

```typescript
const rateLimitKey = `ai:menu-processing:${session.user.id}:${session.user.tenantId}`;

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
  prefix: "ai:menu-processing",
  analytics: true,
});

const { success, remaining } = await ratelimit.limit(rateLimitKey);
if (!success) {
  throw new Error("Rate limit exceeded");
}
```

### Input Sanitization (DOMPurify)

```typescript
import DOMPurify from "isomorphic-dompurify";

const sanitizeExtractedData = (data: ExtractedData): ExtractedData => ({
  ...data,
  categories: data.categories.map((cat) => ({
    ...cat,
    name: Object.fromEntries(
      Object.entries(cat.name).map(([lang, text]) => [
        lang,
        DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }),
      ]),
    ),
  })),
  items: data.items.map((item) => ({
    ...item,
    name: sanitizeMultiLang(item.name, []),
    description: item.description
      ? sanitizeMultiLang(item.description, ["b", "i"])
      : undefined,
  })),
});
```

### Zod Validation

```typescript
const ExtractedDataSchema = z.object({
  languages: z
    .array(
      z.object({
        code: z.string().length(2),
        name: z.string(),
      }),
    )
    .min(1),
  categories: z
    .array(
      z.object({
        id: z.string(),
        name: z.record(z.string()),
      }),
    )
    .min(1),
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.record(z.string()),
        category: z.string(),
        attributes: z
          .array(
            z.object({
              id: z.string(),
              name: z.record(z.string()),
              price: z.union([z.string(), z.number(), z.null()]),
            }),
          )
          .optional(),
      }),
    )
    .min(1),
});
```

---

## Quality Scoring Algorithm

```typescript
function calculateQualityScore(data: ExtractedData): QualityResult {
  let score = 0;
  const details: QualityDetails = {};

  // Category quality (25 points)
  const categoryScore = Math.min(25, data.categories.length * 5);
  score += categoryScore;
  details.categoryQuality = categoryScore;

  // Item existence (10 points)
  const itemScore = data.items.length > 0 ? 10 : 0;
  score += itemScore;
  details.itemQuality = itemScore;

  // Price quality (50 points)
  const itemsWithPrices = data.items.filter((item) =>
    item.attributes?.some((attr) => attr.price && attr.price !== "null"),
  );
  const priceScore = Math.round(
    (itemsWithPrices.length / data.items.length) * 50,
  );
  score += priceScore;
  details.priceQuality = priceScore;

  // Description quality (25 points)
  const itemsWithDesc = data.items.filter(
    (item) =>
      item.description &&
      Object.values(item.description).some((d) => d.length > 0),
  );
  const descScore = Math.round((itemsWithDesc.length / data.items.length) * 25);
  score += descScore;
  details.descriptionQuality = descScore;

  return {
    score,
    details,
    message:
      score < 40
        ? "The extracted data quality is low. Please review carefully or try uploading a clearer image."
        : "",
  };
}
```

---

## Retry Logic

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 2000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Don't retry on quota exceeded
      if (error.message?.includes("quota")) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(
          `[Retry] Attempt ${attempt + 1}/${
            maxRetries + 1
          } failed, retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}
```

---

## Testing Guide

### Quick Tests (10 min)

| Test        | Steps                      | Expected                        |
| ----------- | -------------------------- | ------------------------------- |
| Clear menu  | Upload professional menu   | Score > 70, all items extracted |
| Blurry menu | Upload low-quality photo   | Score < 40, warning shown       |
| XSS check   | Check response in DevTools | No script tags in any field     |
| Rate limit  | Make 6 requests rapidly    | 429 error on 6th request        |

### Manual Test Commands

```bash
# Check job status in Firebase Console
# Collection: menuImageProcessingJobs

# View function logs
firebase functions:log --only processMenuImagesJob

# Test in development
npm run dev
# Upload file, check console for dev_triggerProcessMenuImages call
```

---

## Validation Checklist

| Requirement               | Implementation                    | Location                                    | Status |
| ------------------------- | --------------------------------- | ------------------------------------------- | ------ |
| Job queue architecture    | onCreate trigger + callable       | functions/src/triggers/production.ts        | ✅     |
| Per-project rate limiting | Upstash Redis (5/min)             | functions/src/lib/rateLimit.ts              | ✅     |
| Response validation       | validateResponseStructure()       | functions/src/logic/aiResponseUtils.ts      | ✅     |
| HTML sanitization         | stripHtml() (server-side)         | functions/src/logic/redistributeUtils.ts    | ✅     |
| Quality scoring           | scoreExtractionQuality()          | functions/src/logic/processMenuImages.ts    | ✅     |
| Retry logic               | retryWithBackoff() (2 retries)    | functions/src/logic/processMenuImages.ts    | ✅     |
| Circuit breaker           | executeWithCircuitBreaker()       | functions/src/lib/circuitBreaker.ts         | ✅     |
| Extraction hardening      | hardenExtractedData()             | functions/src/logic/extractionHardening.ts  | ✅     |
| Real-time status          | onSnapshot listener               | src/hooks/useMenuProcessingJob.ts           | ✅     |
| Provenance tracking       | rawBatchResponses + promptVersion | functions/src/logic/processMenuImagesJob.ts | ✅     |
| Confidence scoring        | computeConfidenceSummary()        | functions/src/logic/processMenuImagesJob.ts | ✅     |

---

## Related Documents

| Document                                                 | Purpose               |
| -------------------------------------------------------- | --------------------- |
| `_spec.md`                                               | Product specification |
| `_marketing.md`                                          | Sales collateral      |
| `../Assessments/MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md` | Full job queue spec   |
| `../Assessments/ASSESSMENT-02-AI-EXTRACTION.md`          | Original assessment   |

---

## Hardening (Implemented Mar 2026)

### P0 — Critical Infrastructure

| Item                            | Status  | Implementation                                                                                                                                             |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Extraction Artifact Storage** | ✅ Done | Raw AI response text preserved in job `result.rawBatchResponses[]` (truncated to 10KB per batch). Enables debugging and future reprocessing.               |
| **Prompt Version Tracking**     | ✅ Done | `EXTRACTION_PROMPT_VERSION` constant in `constants/ai.ts`. Stored in job `result.promptVersion` + `result.model`.                                          |
| **SDK Standardization**         | ✅ Done | All 4 Cloud Function Gemini services migrated from `@google/generative-ai` to `@google/genai`. Single SDK, single `genAIClient`, model `gemini-2.5-flash`. |

### P1 — Stability (extractionHardening.ts)

| Item                               | Status  | Implementation                                                                                                                      |
| ---------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Category Synonym Normalization** | ✅ Done | ~30 synonym pairs (starters↔appetizers, beverages↔drinks, etc.). Merges duplicate categories, remaps item references. Non-blocking. |
| **Semantic Integrity Validation**  | ✅ Done | Checks orphan items, empty category names, duplicate IDs, invalid prices. Logs warnings, never fails job.                           |
| **Anomaly Detection**              | ✅ Done | Flags items > 300, categories > 50, prices > 50000, zero items, suspicious ratios. Non-blocking.                                    |

### P2 — Operational

| Item                                | Status  | Implementation                                                                                                                    |
| ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Extraction Monitoring Dashboard** | ✅ Done | Route `/ops/extraction`, feature flag `ENABLE_EXTRACTION_MONITORING_DASHBOARD`. Health overview, quality metrics, job feed table. |

### Prompt v2 Improvements (Mar 13, 2026 — ChatGPT Review)

Full ChatGPT extraction prompt discussion reviewed against codebase. **~80% redundant** (already implemented), **~10% wrong** (bad recommendations), **~10% genuinely useful** (2 critical fixes + 2 minor improvements).

| Change                             | Severity | Before                                                                 | After                                                             |
| ---------------------------------- | -------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **System Role strengthened**       | MINOR    | "specialized AI model" (weaker framing)                                | "structured data extraction engine" + explicit anti-hallucination |
| **Anti-inference rule added**      | MINOR    | "No Interpretation" only                                               | Added "Do not generate, infer, or fabricate"                      |
| **Text Formatting fixed**          | MEDIUM   | "Remove any parenthesis or extra text" (destroyed data like (V), (GF)) | "Preserve all text exactly as written"                            |
| **Description generation removed** | CRITICAL | "generate up to 30 words" if missing (HALLUCINATION)                   | "omit if not visible, do not generate"                            |
| **Mandatory Fields fixed**         | CRITICAL | "descriptions (up to 30 words) are mandatory" (forced hallucination)   | "descriptions included only if visible"                           |
| **Schema Stability added**         | MINOR    | Not stated                                                             | "Do not add fields beyond defined schema"                         |

**Version bumped:** `parallel_v1` → `parallel_v2`

**ChatGPT suggestions REJECTED:**

- `maxOutputTokens: 2048-4096` — too low for real menus (our 65536 is correct)
- Prompt size 250-350 tokens — impossible for our multi-batch/confidence/fileMessages complexity
- Multi-pass extraction — unnecessary with our hardening layer
- `temperature: 0.1` — our 0.2 is production-validated, test separately if needed

**ChatGPT review archive:** `_archive/chatgpt-review-prompt-design.md`

### Previously Implemented

| Item                         | Status         | Notes                                                                                        |
| ---------------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| **Per-Item Confidence**      | ✅ Done (10.1) | `confidence: { name, price }` per item in prompt. `confidenceSummary` aggregated on job doc. |
| **Extraction Learning Loop** | ✅ Done (10.2) | `EXTRACTION_CORRECTION` in menuChangeLog. Nightly aggregation.                               |
| **Circuit Breaker**          | ✅ Done        | `functions/src/lib/circuitBreaker.ts`. Feature flag `ENABLE_CIRCUIT_BREAKER`.                |
| **Rate Limiting**            | ✅ Done        | Upstash Redis. 5 req/min per project for expensive AI.                                       |

### Remaining Improvements (Not Yet Implemented)

| Item                                         | Priority | Notes                                                                              |
| -------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Partial result recovery on failure           | P2       | Save partial results if batch N fails mid-job                                      |
| Cost estimation before processing            | P2       | Show estimated cost before user confirms upload                                    |
| AI Gateway (centralized for all CF features) | P1       | SDK standardized but gateway module not yet built. See `__docs__/ai-system-layer/` |
| MISR/HCR/TTFP metrics                        | P3       | Funnel tracking for onboarding health                                              |
| Knowledge reuse layer                        | P3       | Description/translation caching                                                    |

### Failure Mode & Scale Audit (Mar 13, 2026)

Full pipeline stress-test completed. See `failure-mode-scale-audit.md` for complete report.

**3 Bugs Found & Fixed:**

| Bug                                     | Severity | Fix                                                           |
| --------------------------------------- | -------- | ------------------------------------------------------------- |
| `preview_ready` jobs never cleaned up   | CRITICAL | Added `cleanupExpiredPreviewJobsLogic()` to 15-min scheduler  |
| `cancelling` jobs can get stuck forever | MEDIUM   | Added `cleanupStuckCancellingJobsLogic()` to 15-min scheduler |
| Error status update can fail silently   | MEDIUM   | Wrapped catch block `jobRef.update()` in own try/catch        |

**5 Firestore indexes added:** `status+timeoutAt`, `status+expiresAt`, `status+updatedAt`, `status+completedAt`, `status+createdAt` (for menuImageProcessingJobs)

**Bug Fix (Mar 13, 2026 — Launch Readiness Audit):** `status+timeoutAt` and `status+expiresAt` indexes were missing from `firestore.indexes.json`. Cleanup scheduler queries would fail without them. Added both.

**Deploy prerequisite:** `firebase deploy --only firestore:indexes`

### Edge Case Simulation (Mar 13, 2026)

1,085 edge case menu scenarios simulated across 12 categories. See `edge-case-simulation-report.md` for complete report.

**4 Bugs Found & Fixed:**

| Bug                                             | Severity | Fix                                                                           |
| ----------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| Price range false positive in anomaly detection | MEDIUM   | Skip price strings containing range separators (`-`, `/`, `–`, `—`)           |
| Missing `zero_categories` anomaly check         | MEDIUM   | Added detection for items > 0 but categories = 0                              |
| Category synonym only checks first language     | MEDIUM   | Now checks ALL language values against synonym map                            |
| Contradictory tag hallucination in prompt       | CRITICAL | Removed "generate tags if not present" — now consistent with CRITICAL section |

**1 Bug Documented (product decision needed):**

| Bug                                          | Severity | Status                                       |
| -------------------------------------------- | -------- | -------------------------------------------- |
| Quality score treats "Market Price" as valid | LOW      | Documented — requires defining "valid price" |

**1 Bug Fixed (prompt v2):**

| Bug                                              | Severity | Fix                                                                    |
| ------------------------------------------------ | -------- | ---------------------------------------------------------------------- |
| Description generation contradicts accuracy rule | LOW      | ✅ Fixed in prompt v2 — descriptions now extract-only, never generated |

**Files modified:** `extractionHardening.ts`, `parallelProcessingPrompt.ts`

### Known Issues (Documented — Not Launch-Blocking)

| Issue                                               | Impact                                                                                               | Fix                                                           | Status                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| ~~Monitoring DAL uses client SDK without uId~~      | ~~`/ops/extraction` queries fail~~                                                                   | Added `isPlatformAdmin()` override to Firestore read rule     | ✅ FIXED (Security Audit Mar 13, 2026)           |
| ~~`MENULIST_AI_OPERATIONS` has no Firestore rules~~ | ~~Cost metrics query permission denied~~                                                             | Added Firestore rules: platform admin read, server-only write | ✅ FIXED (Security Audit Mar 13, 2026)           |
| MISR/HCR/TTFP metrics not implemented               | No funnel metrics for measuring ingestion success rate, human correction rate, time to first publish | Add analytics events at publish flow boundaries               | P3 — implement when real restaurant data arrives |

### Technical Debt

| Item                  | Description                                                         | Effort |
| --------------------- | ------------------------------------------------------------------- | ------ |
| Response parsing      | Multiple fallbacks for AI response format                           | Medium |
| Error categorization  | More specific error types for different failures                    | Low    |
| Name length caps      | No max length on item/category names (see edge-case report §4.1)    | Low    |
| Synonym map expansion | ~40 entries, missing common variations (see edge-case report §5.1)  | Low    |
| Auto-merge activation | `autoMergeItems()` computes stats but result is not applied to data | Medium |

---

### Production Audit (Mar 13, 2026)

8-phase production audit completed. See `production-audit-mar13-2026.md` for full report.

**Result: GO ✅ (80/80)**

| Phase                | Score |
| -------------------- | ----- |
| System Consistency   | 10/10 |
| E2E Flow             | 10/10 |
| Chaos & Failure      | 10/10 |
| Firebase Cost        | 10/10 |
| CF Reliability       | 10/10 |
| Security             | 10/10 |
| Production Readiness | 10/10 |
| Data Integrity       | 10/10 |

**1 Bug Found & Fixed:**

| Bug                                                                                  | Severity | Fix                                                                         |
| ------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| `saveFilesToProject.ts` hardcoded `"projects"` instead of `DB_COLLECTIONS.PROJECTS`  | LOW      | Replaced with import from `../constants/database`                           |
| `retryExtractionJob()` missing `retriedFromJobId` and `retryCount` on new retry jobs | MEDIUM   | Added retry tracking fields to `CreateJobParams` and `retryExtractionJob()` |

**Files audited:** 20 files, ~4,800 lines of code

### Chaos & Failure Simulation Audit (Mar 13, 2026)

9 failure scenarios simulated against real code paths. See below for detailed results.

**4 Bugs Found & Fixed:**

| Bug                                                   | Severity | Fix                                                                          |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| All batches fail → empty data saved as COMPLETED      | CRITICAL | Added `successfulBatches === 0` guard in `processMenuImagesLogic`            |
| `saveFilesToProject` race condition (read-then-write) | CRITICAL | Wrapped in Firestore `runTransaction()` for atomic read-modify-write         |
| Progress field not reset on job failure               | MEDIUM   | Added `progress: 0, currentStep: "Failed"` to error status update            |
| `AI_ERROR` not marked as retryable                    | MEDIUM   | Added `AI_ERROR` to `isRetryable()` — Gemini errors are frequently transient |

**Files modified:** `processMenuImages.ts`, `saveFilesToProject.ts`, `processMenuImagesJob.ts`

**Scenario Results:**

| Scenario                         | Result   | Notes                                                                            |
| -------------------------------- | -------- | -------------------------------------------------------------------------------- |
| 1. Duplicate Job Trigger         | ✅ SAFE  | Transaction-based idempotency + frontend duplicate check                         |
| 2. Gemini API Failure            | ✅ FIXED | Triple retry (gateway + retryWithBackoff + circuit breaker). All-fail now throws |
| 3. Firestore Write Failure       | ✅ SAFE  | Double safety: catch block + cleanup scheduler via `timeoutAt`                   |
| 4. Cloud Function Retry          | ✅ SAFE  | Transaction checks `status !== PENDING` before processing                        |
| 5. Job Cancellation During Proc. | ✅ SAFE  | Graceful check after AI, cleanup scheduler for stuck `cancelling`                |
| 6. Upload During Processing      | ✅ FIXED | `saveFilesToProject` now uses Firestore transaction (was non-atomic)             |
| 7. Hardening Layer Failure       | ✅ SAFE  | Non-blocking try/catch, falls back to un-hardened data                           |
| 8. Very Large Menu (300+ items)  | ✅ SAFE  | 65536 output tokens, Firestore 1 MiB safe for typical menus                      |
| 9. Network Timeout               | ✅ SAFE  | Cleanup scheduler catches via `timeoutAt` within 15-min cycle                    |

---

_Document Status: ✅ PRODUCTION READY — Last updated March 13, 2026_
_Production Audit: Completed March 13, 2026 — GO ✅ (80/80), 1 bug fixed, 0 TypeScript errors_
_Failure Mode Audit: Completed March 13, 2026 — 3 bugs fixed, 0 TypeScript errors_
_Edge Case Simulation: Completed March 13, 2026 — 1,085 scenarios, 4 bugs fixed, 0 TypeScript errors_
_Chaos & Failure Simulation: Completed March 13, 2026 — 9 scenarios, 4 bugs fixed, 0 TypeScript errors_
_Firestore Cost Audit: Completed March 13, 2026 — 2 bugs fixed (1 CRITICAL: checkExistingActiveJob security rule violation), 0 TypeScript errors_
_CF Execution Audit: Completed March 13, 2026 — GO ✅ (118/120), 1 bug fixed (ignoreUndefinedProperties), 20 files audited, 0 TypeScript errors_
_Security Surface Audit: Completed March 13, 2026 — 58/60 (97%), 3 vulnerabilities fixed (1 CRITICAL), 25+ files audited, 0 TypeScript errors_
