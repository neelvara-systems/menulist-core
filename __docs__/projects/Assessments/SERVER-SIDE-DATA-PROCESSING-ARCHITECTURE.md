# Server-Side Data Processing Architecture Assessment

> **Document Type:** Architecture Decision Record (ADR)  
> **Created:** December 5, 2025  
> **Status:** Under Discussion  
> **Author:** Development Team

> **Launch Boundary:** This ADR is architecture discussion evidence, not production launch certification. Current release approval still requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, queue/runtime QA, Cloud Function/deploy evidence where server processing changes, provider smoke, and target-environment smoke.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture](#2-current-architecture)
3. [Proposed Architecture (User's Approach)](#3-proposed-architecture-users-approach)
4. [Recommended Architecture](#4-recommended-architecture)
5. [Detailed Comparison](#5-detailed-comparison)
6. [Implementation Strategy](#6-implementation-strategy)
7. [Risk Analysis](#7-risk-analysis)
8. [Decision Matrix](#8-decision-matrix)
9. [Recommendation](#9-recommendation)

---

## 1. Executive Summary

### The Question

Should we move data saving from client-side to Firebase Functions, using real-time status updates (`created` → `processing` → `completed`) instead of the current request-response pattern?

### Quick Answer

**Yes, but with modifications.** The proposed event-driven architecture is more scalable and reliable than the current approach. However, we recommend a hybrid pattern that combines the best of both worlds.

### Key Insight

The current architecture has a **single point of failure**: if the client disconnects during the response, all processing work is lost. Moving to server-side saves with real-time status updates eliminates this risk.

---

## 2. Current Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CURRENT ARCHITECTURE                             │
│                     (Request-Response Pattern)                           │
└─────────────────────────────────────────────────────────────────────────┘

     CLIENT                                      SERVER
       │                                           │
       │  1. httpsCallable(processMenuImages)      │
       │ ─────────────────────────────────────────►│
       │                                           │
       │         [WAITING 30-120 seconds]          │
       │                                           │  2. Upload to Gemini
       │                                           │  3. AI Processing
       │                                           │  4. Parse Response
       │                                           │
       │  5. Return extracted data                 │
       │ ◄─────────────────────────────────────────│
       │                                           │
       │  6. Transform/Normalize data              │
       │  7. Save to Firestore                     │
       │  8. Update UI                             │
       ▼                                           ▼
```

### Problems with Current Approach

| Problem                           | Impact                                                       | Severity  |
| --------------------------------- | ------------------------------------------------------------ | --------- |
| **Client disconnect = data loss** | If user closes browser during processing, everything is lost | 🔴 High   |
| **Long HTTP response**            | 30-120 second responses are fragile (timeouts, proxies)      | 🔴 High   |
| **No progress visibility**        | User sees spinner, no idea what's happening                  | 🟡 Medium |
| **Client-side transformation**    | Business logic split between client and server               | 🟡 Medium |
| **Retry complexity**              | If save fails, user must re-process (expensive AI call)      | 🔴 High   |
| **Mobile/slow networks**          | Long responses more likely to fail                           | 🟡 Medium |

### What Works Well

| Aspect              | Benefit                               |
| ------------------- | ------------------------------------- |
| Simple mental model | Request → Response → Done             |
| Easy debugging      | Can see full flow in browser DevTools |
| Client control      | Can transform data before save        |
| Immediate feedback  | Know instantly if it worked           |

---

## 3. Proposed Architecture (User's Approach)

### User's Idea

> "Maintain status in project document: `created` → `processing` → `completed`. Client listens via real-time listener."

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       USER'S PROPOSED ARCHITECTURE                       │
│                    (Server-Side Save + Status Updates)                   │
└─────────────────────────────────────────────────────────────────────────┘

     CLIENT                                      SERVER
       │                                           │
       │  1. Call processMenuImages                │
       │ ─────────────────────────────────────────►│
       │                                           │  Update status: "processing"
       │  2. Start listening to project doc        │
       │ ◄ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
       │                                           │
       │         [Real-time listener active]       │  3. Upload to Gemini
       │                                           │  4. AI Processing
       │  ← status: "processing" (received)        │  5. Parse Response
       │                                           │  6. Save to Firestore
       │                                           │  7. Update status: "completed"
       │                                           │
       │  ← status: "completed" (received)         │
       │                                           │
       │  8. Read saved data                       │
       │  9. Update UI                             │
       ▼                                           ▼
```

### Benefits of This Approach

| Benefit                  | Impact                                      |
| ------------------------ | ------------------------------------------- |
| **Server-side saves**    | Data persisted regardless of client state   |
| **Real-time updates**    | User sees progress (processing → completed) |
| **Disconnect resilient** | Close browser, come back, data is there     |
| **Simpler client**       | No transformation logic needed              |
| **Atomic operations**    | All data saved together or not at all       |

### Potential Issues

| Issue                         | Concern                                      |
| ----------------------------- | -------------------------------------------- |
| **Where to store status?**    | Project document? Separate collection?       |
| **Multiple concurrent jobs?** | What if user uploads again while processing? |
| **Error states**              | How to communicate failures?                 |
| **Partial failures**          | What if AI succeeds but save fails?          |
| **Function timeout**          | 540s max - what if job takes longer?         |

---

## 4. Recommended Architecture

### The "Job Queue" Pattern

A more robust version of the user's idea, commonly used in production systems (like Stripe, Twilio, AWS).

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     RECOMMENDED ARCHITECTURE                             │
│                   (Job Queue with Real-Time Status)                      │
└─────────────────────────────────────────────────────────────────────────┘

                           FIRESTORE
                    ┌─────────────────────┐
                    │  processingJobs/{id}│
                    │  ─────────────────  │
                    │  status: "pending"  │
                    │  projectId: "..."   │
                    │  files: [...]       │
                    │  createdAt: ...     │
                    └──────────┬──────────┘
                               │
     ┌─────────────────────────┼─────────────────────────┐
     │                         │                         │
     ▼                         ▼                         ▼
  CLIENT                   FUNCTION                  FIRESTORE
     │                         │                         │
     │  1. Create job doc      │                         │
     │ ────────────────────────┼────────────────────────►│
     │     (status: pending)   │                         │
     │                         │                         │
     │  2. Listen to job doc   │  3. Trigger: onCreate   │
     │ ◄─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│◄────────────────────────│
     │                         │                         │
     │                         │  4. Update: processing  │
     │  ← status: processing   │ ───────────────────────►│
     │                         │                         │
     │                         │  5. AI Processing       │
     │                         │  6. Save extracted data │
     │                         │ ───────────────────────►│
     │                         │                         │
     │                         │  7. Update: completed   │
     │  ← status: completed    │ ───────────────────────►│
     │                         │                         │
     │  8. Read data, update UI│                         │
     ▼                         ▼                         ▼
```

### Data Model

```typescript
// Collection: processingJobs/{jobId}
interface ProcessingJob {
  // Identity
  jobId: string;
  projectId: string;
  fileId: string;
  tenantId: string;

  // Status
  status: "pending" | "processing" | "completed" | "failed";
  progress?: number; // 0-100 for progress bar
  currentStep?: string; // "Uploading files", "Processing batch 2/5"

  // Input
  files: FileToProcess[];
  targetLanguages: TargetLanguage[];

  // Output (populated on completion)
  result?: {
    extractedData: ExtractedMenuData;
    qualityScore: number;
    processingTime: number;
  };

  // Error (populated on failure)
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;

  // Cost tracking
  transaction?: {
    totalCredits: number;
    totalCharge: number;
    transactionId: string;
  };
}
```

### Status Flow

```
┌──────────┐     ┌────────────┐     ┌───────────┐
│ pending  │ ──► │ processing │ ──► │ completed │
└──────────┘     └────────────┘     └───────────┘
                       │
                       │ (on error)
                       ▼
                 ┌──────────┐
                 │  failed  │
                 └──────────┘
```

### Why This Is Better

| Feature               | User's Approach       | Recommended Approach                     |
| --------------------- | --------------------- | ---------------------------------------- |
| **Trigger mechanism** | httpsCallable         | Firestore onCreate trigger               |
| **Job tracking**      | Status in project doc | Dedicated jobs collection                |
| **Concurrent jobs**   | Unclear               | Each job is independent                  |
| **Retry support**     | Manual                | Built-in (change status back to pending) |
| **Progress tracking** | Basic                 | Detailed (step, percentage)              |
| **Audit trail**       | No                    | Full history in job doc                  |
| **Cleanup**           | Manual                | Auto-delete after 7 days                 |

---

## 5. Detailed Comparison

### Architecture Comparison Matrix

| Aspect                  | Current (Client Save) | User's Proposal | Recommended (Job Queue) |
| ----------------------- | --------------------- | --------------- | ----------------------- |
| **Complexity**          | Simple                | Medium          | Medium-High             |
| **Reliability**         | Low                   | High            | Very High               |
| **Scalability**         | Medium                | High            | Very High               |
| **Progress visibility** | None                  | Basic           | Detailed                |
| **Error recovery**      | Poor                  | Good            | Excellent               |
| **Disconnect handling** | Data lost             | Data saved      | Data saved              |
| **Concurrent jobs**     | N/A                   | Unclear         | Supported               |
| **Cost**                | Same                  | Same            | Same                    |
| **Migration effort**    | N/A                   | Medium          | Medium-High             |

### Client Code Comparison

**Current Approach:**

```typescript
// Client waits for entire response
const result = await processMenuImages(data);
// Transform data
const normalized = redistributeExtractedData(result.data);
// Save to Firestore
await saveToFirestore(normalized);
// Update UI
setData(normalized);
```

**User's Proposed Approach:**

```typescript
// Start processing
await processMenuImages(data);

// Listen for completion
onSnapshot(projectDoc, (doc) => {
  if (doc.data().status === "completed") {
    setData(doc.data().extractedData);
  }
});
```

**Recommended Approach:**

```typescript
// Create job
const jobRef = await createProcessingJob({
  projectId,
  files,
  targetLanguages,
});

// Listen to job status
onSnapshot(jobRef, (doc) => {
  const job = doc.data();

  switch (job.status) {
    case "pending":
      setStatus("Queued...");
      break;
    case "processing":
      setStatus(job.currentStep);
      setProgress(job.progress);
      break;
    case "completed":
      setData(job.result.extractedData);
      setStatus("Done!");
      break;
    case "failed":
      setError(job.error.message);
      if (job.error.retryable) {
        showRetryButton();
      }
      break;
  }
});
```

---

## 6. Implementation Strategy

### Phase 1: Minimal Change (Quick Win)

Keep httpsCallable but move saves to server:

```typescript
// processMenuImages.ts - Modified
export async function processMenuImagesLogic(request) {
  // ... existing processing code ...

  // NEW: Save to Firestore inside function
  await saveExtractedData(projectId, fileId, extractedData);

  // Return minimal response
  return {
    success: true,
    qualityScore: quality.score,
    itemsCount: extractedData.items.length,
  };
}
```

**Effort:** Low (2-4 hours)  
**Benefit:** Data saved even if client disconnects

### Phase 2: Add Status Updates

Add real-time status to project document:

```typescript
// processMenuImages.ts - With status
export async function processMenuImagesLogic(request) {
  const { projectId, fileId } = request;

  // Update status: processing
  await updateProjectStatus(projectId, "processing", { fileId });

  try {
    // ... processing code ...

    // Save data
    await saveExtractedData(projectId, fileId, extractedData);

    // Update status: completed
    await updateProjectStatus(projectId, "completed", {
      fileId,
      itemsCount: extractedData.items.length,
    });
  } catch (error) {
    // Update status: failed
    await updateProjectStatus(projectId, "failed", {
      fileId,
      error: error.message,
    });
    throw error;
  }
}
```

**Effort:** Medium (4-8 hours)  
**Benefit:** Real-time progress, error visibility

### Phase 3: Full Job Queue (Recommended Long-term)

Move to Firestore-triggered architecture:

1. Create `processingJobs` collection
2. Add Firestore onCreate trigger
3. Migrate processing logic to trigger
4. Add detailed progress tracking
5. Implement retry mechanism
6. Add job cleanup (TTL)

**Effort:** High (2-3 days)  
**Benefit:** Full reliability, scalability, retry support

---

## 7. Risk Analysis

### Risks of Staying with Current Architecture

| Risk                           | Probability | Impact | Mitigation                 |
| ------------------------------ | ----------- | ------ | -------------------------- |
| Data loss on disconnect        | Medium      | High   | Move to server-side saves  |
| Long response timeouts         | Medium      | Medium | Add status updates         |
| User frustration (no progress) | High        | Low    | Add progress indicators    |
| Expensive re-processing        | Medium      | High   | Cache intermediate results |

### Risks of Migrating

| Risk                 | Probability | Impact | Mitigation                     |
| -------------------- | ----------- | ------ | ------------------------------ |
| Migration bugs       | Medium      | Medium | Thorough testing, feature flag |
| Increased complexity | Low         | Low    | Good documentation             |
| Firestore costs      | Low         | Low    | Same number of writes          |
| Learning curve       | Low         | Low    | Familiar patterns              |

### Risks of Job Queue Pattern

| Risk                     | Probability | Impact | Mitigation                 |
| ------------------------ | ----------- | ------ | -------------------------- |
| Orphaned jobs            | Low         | Low    | Auto-cleanup after 7 days  |
| Concurrent job conflicts | Low         | Medium | Job isolation by fileId    |
| Function cold starts     | Low         | Low    | Already have this          |
| Status race conditions   | Low         | Low    | Use Firestore transactions |

---

## 8. Decision Matrix

### Scoring Criteria

| Criteria              | Weight | Current  | User's   | Recommended |
| --------------------- | ------ | -------- | -------- | ----------- |
| Reliability           | 30%    | 2/5      | 4/5      | 5/5         |
| User Experience       | 25%    | 2/5      | 4/5      | 5/5         |
| Implementation Effort | 20%    | 5/5      | 4/5      | 3/5         |
| Maintainability       | 15%    | 4/5      | 4/5      | 4/5         |
| Scalability           | 10%    | 3/5      | 4/5      | 5/5         |
| **Weighted Score**    | 100%   | **2.85** | **4.00** | **4.35**    |

### Verdict

1. **Current Architecture**: 2.85/5 - Not recommended for production scale
2. **User's Proposal**: 4.00/5 - Good improvement, worth doing
3. **Recommended (Job Queue)**: 4.35/5 - Best long-term solution

---

## 9. Recommendation

### Short-term (This Week)

**Do Phase 1: Move saves to server-side**

- Keep existing httpsCallable pattern
- Move `saveExtractedData` inside Firebase Function
- Return success/failure, not full data
- Client reads saved data from Firestore

**Why:** Quick win, eliminates biggest risk (data loss)

### Medium-term (Next Sprint)

**Do Phase 2: Add status updates**

- Add `processingStatus` field to project document
- Update status at key points (processing, completed, failed)
- Client shows real-time progress
- Add error details for failed jobs

**Why:** Better UX, easier debugging

### Long-term (When Scaling)

**Consider Phase 3: Full job queue**

- Move to Firestore trigger pattern
- Dedicated `processingJobs` collection
- Detailed progress tracking
- Automatic retry support

**Why:** Scale-oriented reliability; release still depends on the active launch gates above

---

## Summary

| Question                        | Answer                                                 |
| ------------------------------- | ------------------------------------------------------ |
| **Is user's approach correct?** | Yes, the core idea is sound                            |
| **Should we implement it?**     | Yes, in phases                                         |
| **What pattern to use?**        | Start with Phase 1 (server saves), evolve to job queue |
| **Biggest benefit?**            | Data never lost, even if client disconnects            |
| **Biggest risk?**               | None significant - this is standard practice           |

### Final Thought

> The user's intuition is correct: **server-side processing with real-time status updates is the right pattern** for long-running AI operations. The recommended approach adds queue structure, but release approval still depends on the active launch gates above.

---

_Document created for architecture discussion. Implementation details to be refined after approval._
