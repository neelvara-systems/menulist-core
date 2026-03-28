# Menu Image Processing Job Queue - Firebase Operations Analysis

> **Document Type:** Technical Analysis  
> **Created:** December 10, 2025  
> **Last Updated:** December 10, 2025  
> **Status:** ✅ Optimizations Implemented  
> **Purpose:** Identify all Firebase read/write operations for cost optimization

---

## Table of Contents

1. [Summary](#1-summary)
2. [Server-Side Operations](#2-server-side-operations)
3. [Client-Side Operations](#3-client-side-operations)
4. [Operations Per Job Lifecycle](#4-operations-per-job-lifecycle)
5. [Optimization Opportunities](#5-optimization-opportunities)
6. [Recommended Changes](#6-recommended-changes)

---

## 1. Summary

### Total Firebase Operations Per Successful Job

| Category                     | Reads           | Writes | Collection                     |
| ---------------------------- | --------------- | ------ | ------------------------------ |
| **Server: Job Processing**   | 4               | 7      | `menuImageProcessingJobs`      |
| **Server: Project Save**     | 1               | 2      | `projects`, `projectsMetadata` |
| **Server: Existing Project** | 1               | 0      | `projects`                     |
| **Client: Job Create**       | 0               | 1      | `menuImageProcessingJobs`      |
| **Client: Job Listen**       | 1+ (continuous) | 0      | `menuImageProcessingJobs`      |
| **TOTAL (per job)**          | **7+**          | **10** | -                              |

### Scheduled Cleanup Operations (Background)

| Function           | Frequency    | Reads   | Writes      |
| ------------------ | ------------ | ------- | ----------- |
| `cleanupStuckJobs` | Every 15 min | 1 query | 0-N batch   |
| `cleanupOldJobs`   | Daily        | 1 query | 0-500 batch |

---

## 2. Server-Side Operations

### 2.1 processMenuImagesJob.ts

| Line    | Operation         | Type       | Collection                | Purpose                                    | Frequency    |
| ------- | ----------------- | ---------- | ------------------------- | ------------------------------------------ | ------------ |
| 67-87   | `runTransaction`  | READ+WRITE | `menuImageProcessingJobs` | Idempotency check + status to PROCESSING   | 1x per job   |
| 97      | `jobRef.get()`    | READ       | `menuImageProcessingJobs` | Check cancellation before AI               | 1x per job   |
| 99-104  | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Set CANCELLED (if cancelled)               | 0-1x per job |
| 113-117 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Progress: "Uploading files to AI..." (10%) | 1x per job   |
| 140     | `jobRef.get()`    | READ       | `menuImageProcessingJobs` | Check cancellation after AI                | 1x per job   |
| 142-154 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Set CANCELLED with partial results         | 0-1x per job |
| 159-163 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Progress: "Redistributing..." (70%)        | 1x per job   |
| 171     | `getProject()`    | READ       | `projects`                | Fetch existing project for categories      | 1x per job   |
| 197-201 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Progress: "Saving to project..." (80%)     | 1x per job   |
| 214-218 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Progress: "Finalizing..." (90%)            | 1x per job   |
| 224-248 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Set COMPLETED with full results            | 1x per job   |
| 270-279 | `jobRef.update()` | WRITE      | `menuImageProcessingJobs` | Set FAILED with error (catch block)        | 0-1x per job |

**Summary for processMenuImagesJob.ts:**

- **Reads:** 4 (1 transaction read + 2 cancellation checks + 1 project fetch)
- **Writes:** 7 (1 transaction update + 6 progress/status updates)

### 2.2 saveFilesToProject.ts

| Line    | Operation           | Type  | Collection         | Purpose                                                  |
| ------- | ------------------- | ----- | ------------------ | -------------------------------------------------------- |
| 148     | `projectRef.get()`  | READ  | `projects`         | Fetch existing project data                              |
| 244     | `projectRef.set()`  | WRITE | `projects`         | Save updated project with new files                      |
| 247-253 | `metadataRef.set()` | WRITE | `projectsMetadata` | Update modifiedOn timestamp                              |
| 285     | `projectRef.get()`  | READ  | `projects`         | `getProject()` helper (called from processMenuImagesJob) |

**Summary for saveFilesToProject.ts:**

- **Reads:** 2 (but `getProject()` is called separately from processMenuImagesJob)
- **Writes:** 2 (project data + metadata)

### 2.3 menuJobCleanup.ts (Scheduled)

| Function                 | Line    | Operation        | Type  | Collection                | Purpose                 |
| ------------------------ | ------- | ---------------- | ----- | ------------------------- | ----------------------- |
| `cleanupStuckJobsLogic`  | 33-37   | `.where().get()` | READ  | `menuImageProcessingJobs` | Query stuck jobs        |
| `cleanupStuckJobsLogic`  | 44-59   | `batch.update()` | WRITE | `menuImageProcessingJobs` | Mark as FAILED (batch)  |
| `cleanupOldJobsLogic`    | 83-92   | `.where().get()` | READ  | `menuImageProcessingJobs` | Query old jobs          |
| `cleanupOldJobsLogic`    | 99-101  | `batch.delete()` | WRITE | `menuImageProcessingJobs` | Delete old jobs (batch) |
| `checkExistingActiveJob` | 125-133 | `.where().get()` | READ  | `menuImageProcessingJobs` | Check duplicate jobs    |

---

## 3. Client-Side Operations

### 3.1 menuProcessing.ts

| Function                  | Line    | Operation     | Type  | Collection                | Purpose                       |
| ------------------------- | ------- | ------------- | ----- | ------------------------- | ----------------------------- |
| `createMenuProcessingJob` | 126     | `addDoc()`    | WRITE | `menuImageProcessingJobs` | Create new job document       |
| `cancelMenuProcessingJob` | 169     | `getDoc()`    | READ  | `menuImageProcessingJobs` | Check current status          |
| `cancelMenuProcessingJob` | 179-182 | `updateDoc()` | WRITE | `menuImageProcessingJobs` | Set status to CANCELLING      |
| `getMenuProcessingJob`    | 195     | `getDoc()`    | READ  | `menuImageProcessingJobs` | Fetch job by ID               |
| `checkExistingActiveJob`  | 216-223 | `getDocs()`   | READ  | `menuImageProcessingJobs` | Query active jobs for project |

### 3.2 useMenuProcessingJob.ts (Hook)

| Line  | Operation      | Type            | Collection                | Purpose                |
| ----- | -------------- | --------------- | ------------------------- | ---------------------- |
| 71-88 | `onSnapshot()` | READ (REALTIME) | `menuImageProcessingJobs` | Listen for job updates |

**Note:** `onSnapshot` creates a persistent listener. Reads are charged:

- 1 read on initial subscription
- 1 read for each server-side update to the document

---

## 4. Operations Per Job Lifecycle

### 4.1 Happy Path (Successful Job)

```
CLIENT                                  SERVER
──────────────────────────────────────────────────────────────────────
1. addDoc() [WRITE]
   └─ Creates job with status=pending
                                        2. Transaction [READ+WRITE]
                                           └─ Check pending, set processing
onSnapshot [READ] ←──────────────────────┘
                                        3. jobRef.get() [READ]
                                           └─ Check cancellation
                                        4. jobRef.update() [WRITE]
                                           └─ Progress 10%
onSnapshot [READ] ←──────────────────────┘

                                        ... AI Processing (no Firebase) ...

                                        5. jobRef.get() [READ]
                                           └─ Check cancellation
                                        6. jobRef.update() [WRITE]
                                           └─ Progress 70%
onSnapshot [READ] ←──────────────────────┘
                                        7. getProject() [READ]
                                           └─ Fetch existing project
                                        8. jobRef.update() [WRITE]
                                           └─ Progress 80%
onSnapshot [READ] ←──────────────────────┘
                                        9. projectRef.get() [READ]
                                           └─ In saveFilesToProject
                                        10. projectRef.set() [WRITE]
                                           └─ Save project data
                                        11. metadataRef.set() [WRITE]
                                           └─ Update metadata
                                        12. jobRef.update() [WRITE]
                                           └─ Progress 90%
onSnapshot [READ] ←──────────────────────┘
                                        13. jobRef.update() [WRITE]
                                           └─ Status completed + results
onSnapshot [READ] ←──────────────────────┘
```

### Total for Happy Path:

- **Writes:** 10 (1 client create + 9 server updates)
- **Reads:** 13 (5 server + 8 client onSnapshot triggers)

### 4.2 Failed Job

Same as happy path until step 5, then:

```
                                        5. jobRef.update() [WRITE]
                                           └─ Status failed + error
onSnapshot [READ] ←──────────────────────┘
```

**Saves:** ~5 writes compared to happy path

### 4.3 Cancelled Job (Before AI)

```
                                        3. jobRef.get() [READ]
                                           └─ Detects status=cancelling
                                        4. jobRef.update() [WRITE]
                                           └─ Status cancelled
onSnapshot [READ] ←──────────────────────┘
```

**Total:** 3 writes, 4 reads

---

## 5. Optimization Opportunities

### 5.1 🔴 High Impact: Excessive Progress Updates

**Problem:** 6 separate `jobRef.update()` calls for progress tracking.

**Current Flow:**

```
update(status: processing, progress: 0)   → onSnapshot READ
update(progress: 10%)                     → onSnapshot READ
update(progress: 70%)                     → onSnapshot READ
update(progress: 80%)                     → onSnapshot READ
update(progress: 90%)                     → onSnapshot READ
update(status: completed, progress: 100%) → onSnapshot READ
```

**Impact:**

- 6 writes + 6 client reads = **12 operations per job**
- At 1000 jobs/month = **12,000 operations/month just for progress**

**Solution:** Batch progress updates or use fewer checkpoints.

---

### 5.2 🔴 High Impact: Duplicate Project Reads

**Problem:** Project is read twice during processing.

| Call                                                | Purpose                   |
| --------------------------------------------------- | ------------------------- |
| `getProject()` (line 171)                           | Fetch existing categories |
| `projectRef.get()` (line 148 in saveFilesToProject) | Fetch existing files      |

**Impact:** 2 reads of same document per job

**Solution:** Pass project data to `saveFilesToProject` instead of re-fetching.

---

### 5.3 🟡 Medium Impact: Cancellation Checks

**Problem:** 2 separate reads to check for cancellation.

| Line | Purpose                      |
| ---- | ---------------------------- |
| 97   | Check cancellation before AI |
| 140  | Check cancellation after AI  |

**Consideration:** These are necessary for UX but could be batched if AI processing is fast.

---

### 5.4 🟢 Low Impact: Metadata Update

**Problem:** Separate write for metadata timestamp.

**Current:**

```typescript
await projectRef.set(updateData, { merge: true });
await metadataRef.set({ modifiedOn: Timestamp.now() }, { merge: true });
```

**Alternative:** Use batch write (but complicates error handling).

---

## 6. Recommended Changes

### 6.1 Reduce Progress Updates (Priority: HIGH)

**Before (6 writes):**

```typescript
// Line 78-85: Transaction update
// Line 113-117: Progress 10%
// Line 159-163: Progress 70%
// Line 197-201: Progress 80%
// Line 214-218: Progress 90%
// Line 224-248: Completed
```

**After (3 writes):**

```typescript
// Step 1: Transaction - status=processing, progress=0
// Step 2: After AI - progress=50, currentStep="Processing complete"
// Step 3: Completed - status=completed, progress=100, results
```

**Savings:** 3 writes + 3 reads = **6 operations per job saved**

---

### 6.2 Pass Project Data (Priority: HIGH)

**Before:**

```typescript
// In processMenuImagesJob.ts
const existingProject = await getProject(job.projectId); // READ #1
// ...
await saveFilesToProject(projectId, redistributedData, files, languages);
// Inside saveFilesToProject:
const projectDoc = await projectRef.get(); // READ #2 (duplicate!)
```

**After:**

```typescript
// In processMenuImagesJob.ts
const existingProject = await getProject(job.projectId); // READ #1
// ...
await saveFilesToProject(
  projectId,
  redistributedData,
  files,
  languages,
  existingProject
);
// Inside saveFilesToProject:
// Use existingProject directly, no second read
```

**Savings:** 1 read per job

---

### 6.3 Optional: Throttle onSnapshot Updates

**Concept:** Client can debounce UI updates from onSnapshot.

```typescript
// In useMenuProcessingJob.ts
const debouncedSetJob = useMemo(
  () => debounce((data) => setJob(data), 500),
  []
);
```

**Note:** Doesn't reduce Firebase reads, but reduces React re-renders.

---

### 6.4 Combine Cancellation Checks (Priority: LOW)

**Before:**

```typescript
const currentJob = await jobRef.get(); // Before AI
// ... AI Processing ...
const postProcessJob = await jobRef.get(); // After AI
```

**Alternative:** Only check after AI (acceptable since AI is the expensive part).

**Risk:** User has to wait longer if they cancelled early.

---

## 7. Summary of Potential Savings

| Optimization                  | Writes Saved | Reads Saved | Per Job        |
| ----------------------------- | ------------ | ----------- | -------------- |
| Reduce progress updates (6→3) | 3            | 3           | ✅             |
| Pass project data             | 0            | 1           | ✅             |
| Single cancellation check     | 0            | 1           | ⚠️ UX tradeoff |
| **TOTAL**                     | **3**        | **4-5**     | **7-8 ops**    |

**At 1000 jobs/month:**

- Current: ~23,000 operations
- Optimized: ~16,000 operations
- **Savings: ~30%**

---

## 8. Implementation Status

### ✅ Completed Optimizations (Dec 10, 2025)

1. [x] **Reduced progress updates (6→3 writes)** - Priority 1

   - Removed: Pre-AI cancellation check (1 read saved)
   - Removed: Progress 10% update
   - Removed: Progress 70% update
   - Removed: Progress 80% update
   - Removed: Progress 90% update
   - Kept: Transaction (status=processing), Progress 50% (after AI), Completed

2. [x] **Refactored `saveFilesToProject` to accept existing project data** - Priority 2

   - Added optional `existingProjectData` parameter
   - `processMenuImagesJob.ts` now passes existing project
   - Saves 1 read per job

3. [x] **Removed pre-AI cancellation check** - Priority 3
   - Only check after AI processing (AI is the expensive part)
   - Saves 1 read per job

### Updated Operation Counts

| Category                  | Before | After | Saved |
| ------------------------- | ------ | ----- | ----- |
| **Server: Job Writes**    | 7      | 4     | 3     |
| **Server: Job Reads**     | 4      | 2     | 2     |
| **Server: Project Reads** | 2      | 1     | 1     |
| **TOTAL per job**         | 17     | 11    | **6** |

### New Progress Flow

```
Transaction: status=processing, progress=0 → WRITE 1
    ↓
AI Processing (no Firebase)
    ↓
Check cancellation → READ 1
    ↓
Progress 50% "Processing complete, saving..." → WRITE 2
    ↓
Fetch project (for categories + passed to save) → READ 2
    ↓
Save to project → WRITE (projects collection)
    ↓
Completed: progress=100, status=completed → WRITE 3
```

### Cost Impact

**At 1000 jobs/month:**

- Before: ~17,000 operations
- After: ~11,000 operations
- **Savings: ~35%**
