# Cascade Full Session Export — January 24, 2026

**Topic:** AI Extraction + Multi-Outlet Integration — Complete Documentation Session  
**Duration:** Full day session  
**Purpose:** Create comprehensive documentation for multi-outlet AI extraction compatibility

---

## Table of Contents

1. [Phase 1: Initial Request — Import ChatGPT Conversation](#phase-1-initial-request)
2. [Phase 2: Documentation Creation](#phase-2-documentation-creation)
3. [Phase 3: Cross-Check Existing Docs](#phase-3-cross-check)
4. [Phase 4: combinedWithFileId Clarification](#phase-4-combinedwithfileid)
5. [Phase 5: Review Screen & Client-Side Merge](#phase-5-review-screen)
6. [Final Outputs Summary](#final-outputs)

---

# Phase 1: Initial Request

## User Message 1

> since now we have completed evrything for this ai data extraction flow now we will move to making it compatible for the multi outlet flow and for this i will share my discussion/conversastion with the chatgpt so go through it prepare saperate doc (if needed create multipledoc or create folder then inside doc decision is all yours) in @**docs**/multi-outlet-consistency folder and add checklist at the end that need to do and make sure dont skip enything each thread each chat message is important ...

## User Shared: ChatGPT Conversation

The user shared a complete ChatGPT conversation analyzing multi-outlet AI extraction compatibility. Key threads included:

### Thread 1: Initial Context Sharing

- User shared current AI extraction flow documentation
- User shared 40 multi-outlet test cases and QA matrix
- User shared `PRODUCTION_REVIEW.md` from AI extraction work

### Thread 2: Gap Analysis

- ChatGPT identified missing "Merge + Match Layer"
- Current flow: Extract → Save
- Required flow: Extract → Resolve Identity → Save

### Thread 3: Core Cases Deep Dive

- Case A: Master price update (outlet override wins)
- Case B: Outlet creates local item (L*I* prefix)
- Case C: Outlet hides item (active=false override)
- Conflict case: Multiple master changes with outlet override

### Thread 4: Re-Upload Matching Logic

- 95% similarity matching to master items (exact match first)
- Price override write only if price differs
- Create local-only if no match
- Location: `saveFilesToProject.ts`

### Thread 5: Result Screen Specification

- 5 sections: matched, price overrides, new local, ambiguous, unchanged
- "This screen is your protection against silent merge mistakes"

### Thread 6: Zod Validation Requirement

- Skip for normal jobs (agreed)
- Required for multi-outlet writes (authority-sensitive)
- Only on write gates, not everywhere

### Thread 7: Review Flow Architecture

- User asked: "everything runs in firebase function in background... how do we break this flow for review screen"
- ChatGPT: "You don't break the flow. You insert a HOLD state"
- New status: `preview_ready`
- Job doc stores raw extracted data (not preview - preview is computed client-side)
- User approval triggers client to write directly to Firestore

### Thread 8: First Time vs Re-Upload Rule

- User asked: "So for the very first time we don't do this"
- ChatGPT: "Correct. For the very first extraction → DO NOT break the flow"
- New project → auto apply
- Existing project → preview + review + save

---

## Assistant Response 1

Created two documentation files:

### File 1: `ai-extraction-integration.md`

- **Purpose:** Complete implementation plan with ChatGPT analysis
- **Contains:** 12 parts covering architecture changes, use cases, comparison engine spec, implementation checklist

### File 2: `ai-extraction-workflow-explained.md`

- **Purpose:** Detailed step-by-step workflow explanation
- **Contains:** 5-step flow, data structures, matching algorithm, mode-specific behavior

Key decisions documented:

- D1: First extraction = auto-apply, re-upload = review
- D2: Outlet override NEVER auto-removed
- D3: 95% similarity threshold (more conservative than 90%)
- D4: 24-hour TTL for unapproved jobs
- D5: Block re-extract on master projects
- D6: Zod validation only on write gates
- D7: DEPRECATED - Server generates preview
- D8: Client-side comparison (NEW architecture)
- D9: ADD/UPDATE only, never delete
- D10: Preview ALWAYS for re-extraction (ALL modes)

---

# Phase 2: Documentation Cross-Check

## User Message 2

> read all documentation that i have shared with you ai data extraction folder menu-image-processing-job-queue-spec.md, menu-job-queue-firebase-operations.md, menu-job-queue-implementation.md and cross check with new docs

## Assistant Response 2

Read all existing documentation:

### `menu-image-processing-job-queue-spec.md`

- Main specification for job queue
- Contains data models, processing flows, edge cases
- Defines job statuses: pending, processing, completed, failed, cancelled

### `menu-job-queue-firebase-operations.md`

- Firebase operations analysis
- Cost optimization: reduced from 17 to 6 operations per job
- Progress updates reduced from 6 to 3

### `menu-job-queue-implementation.md`

- Implementation guide
- Client and server code references
- Testing guide

### Cross-Check Findings

Found inconsistencies that needed clarification:

1. `autoMergeItems` - documented as server-side but actually just computes stats
2. Multi-outlet docs were ADDITIONS, not replacements to existing flow
3. `combinedWithFileId` usage unclear

Updated both new docs to add "IMPORTANT CONTEXT" notes clarifying these are PROPOSED changes for multi-outlet, not replacements.

---

# Phase 3: First-Time Extraction Clarification

## User Message 3

> i read your comment about this : 1. autoMergeItems Implementation Status so i have last question that what happened to first time extraction does it exactly saves data structure to project tha we need in project shape @project.types.ts

## Assistant Response 3

Confirmed first-time extraction flow:

**Server does:**

1. AI extraction via Gemini
2. `redistributeExtractedData()` - split by `sourceFileIndex`
3. `transformIdsForFile()` - prefix IDs with file UID
4. `saveFilesToProject()` - write to Firestore

**Data saved matches `ProjectFileType`:**

```typescript
{
  uid: string;
  name: string;
  url: string;
  extractedData: {
    data: {
      categories: ExtractedDataCategory[];
      items: ExtractedDataItem[];
      languages: ExtractedDataLanguage[];
    };
    qualityScore: number;
  };
}
```

**Key insight:** `autoMergeItems()` computes stats only, doesn't actually merge items. Actual merging is "future enhancement" per code comment.

---

# Phase 4: combinedWithFileId Clarification

## User Message 4

> @menu-image-processing-job-queue-spec.md you found this combinedWithFileId related content here in this doc check it carefully and update doc accordingly if any changes needed for first time extraction flow @lines 2613-2614 this lines tells us everything so this field actually needed in case of our re extraction flow and not in first time flow

## Assistant Response 4

Searched for all `combinedWithFileId` references in SPEC doc. Found it was documented as a fallback pattern.

Updated SPEC doc to clarify:

- `combinedWithFileId` is CLIENT-SIDE fallback only
- Server-side job queue does NOT use this field
- AI prompt always includes `sourceFileIndex` instructions

## User Message 5

> no im saying whever comes in mind so you decide do we really need this key and why previously it has been added and decide in which flow first time or re extraction flow or both flow needed it

## Assistant Response 5

### Deep Analysis: Do We Need `combinedWithFileId`?

**Why It Was Originally Added:**
Defensive fallback for when AI doesn't return `sourceFileIndex`:

- Without fallback: All files would have NO data (broken)
- With fallback: First file gets all data, others reference it

**Analysis by Flow:**

| Flow                   | Has sourceFileIndex? | Needs combinedWithFileId? |
| ---------------------- | -------------------- | ------------------------- |
| First-time (server)    | ✅ YES               | ❌ NO                     |
| Re-extraction (client) | ✅ YES               | ❌ NO                     |
| Edge case: AI fails    | ❌ NO                | ⚠️ Maybe                  |

**Recommendation: REMOVE IT**

Reasons:

1. Dead code - never triggered
2. Adds complexity for scenario that doesn't happen
3. Actual implementation doesn't use it
4. If AI fails, should fail fast with error

## User Message 6

> okay then do it

## Assistant Response 6

Removed `combinedWithFileId` from SPEC doc:

| Change                         | Before                       | After                                                    |
| ------------------------------ | ---------------------------- | -------------------------------------------------------- |
| Fallback section               | 50+ lines of fallback code   | "sourceFileIndex is required, fail if missing"           |
| `redistributeAndTransformData` | Returns fallback             | Throws error                                             |
| Summary table                  | "Fallback: CLIENT-SIDE only" | "sourceFileIndex validation: Fail if missing (Enhanced)" |

---

# Phase 5: Final Cross-Check & Review Screen

## User Message 7

> now for the finally do cross check this both docs you have created @ai-extraction-integration.md @ai-extraction-workflow-explained.md line by line word by word and tell me are they correct and tell me what is exactly mentioned in this docs

## Assistant Response 7

### Complete Cross-Check Analysis

Read both documents completely (1557 + 708 lines).

**Cross-Check Results: Both Docs Consistent ✅**

| Item                  | integration.md  | workflow-explained.md | Match |
| --------------------- | --------------- | --------------------- | ----- |
| First extraction rule | Auto-save       | Auto-save             | ✅    |
| Re-extraction rule    | Always preview  | Always preview        | ✅    |
| New status            | `preview_ready` | `preview_ready`       | ✅    |
| Similarity threshold  | 95%             | 95%                   | ✅    |
| Category constraint   | Yes             | Yes                   | ✅    |
| ADD/UPDATE only       | Never delete    | Never delete          | ✅    |

**Fixed 1 inaccuracy:** `isMasterProject` field incorrectly shown in workflow doc - fixed to note master is identified via `storesSummary.stores[sId].isMaster`

## User Message 8

> also have you mentioned that what need to show in ui of review screen and what happened after review screen accept and press save so after press save we need that merging logic which is currently in server firebase function need to move to client side if needed on server keep but the client is also needed then rewrite to client too because i think we not able to write same shareable code for both firebase function and client code both are diff so check it

## Assistant Response 8

Added 3 new sections to `ai-extraction-workflow-explained.md` (v1.2):

### Section 7: Review Screen UI Specification

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back                    Review Changes                    [X]  │
├──────────────────────────────────────────────────────────────────┤
│  📊 Summary                                                       │
│  │ 3 new items • 2 updates • 4 price overrides • 15 unchanged  │ │
│                                                                   │
│  📦 NEW ITEMS (3)                                      [Collapse] │
│  │ [✓] Mango Lassi              ₹120    → Beverages            │ │
│                                                                   │
│  ✏️ UPDATED ITEMS (2)                                  [Collapse] │
│  💰 PRICE OVERRIDES (4)                                [Collapse] │
│  ⚠️ WARNINGS (1)                                       [Collapse] │
│                                                                   │
│           [ Cancel ]                    [ Save Changes ]          │
└──────────────────────────────────────────────────────────────────┘
```

### Section 8: After Save - Complete Merge Flow

5-step flow:

1. BUILD FINAL APPLY PLAN
2. VALIDATE (optional)
3. WRITE TO FIRESTORE
4. MARK JOB COMPLETED
5. REFRESH & NAVIGATE

Mode-specific writes documented with code examples.

### Section 9: Client-Side Functions to Create

**Key Finding: Code Cannot Be Shared**

| Environment                 | SDK                | Logger           |
| --------------------------- | ------------------ | ---------------- |
| Server (Firebase Functions) | firebase-admin     | functions.logger |
| Client (Next.js)            | firebase/firestore | console.log      |

**Functions to Port:**

- `redistributeExtractedData()` → `src/lib/extraction/redistribute.ts`
- `transformIdsForFile()` → `src/lib/extraction/redistribute.ts`

**New Functions:**

- `runComparisonEngine()` - Compare extracted vs existing
- `applyExtractionChanges()` - Write to Firestore
- `normalizeName()`, `similarity()` - Matching utilities

**But 90% of logic is pure JavaScript** - array filtering, object mapping. Only logging and SDK calls differ.

---

# Final Outputs

## Documents Created

| Document                              | Lines | Purpose                            |
| ------------------------------------- | ----- | ---------------------------------- |
| `ai-extraction-integration.md`        | 1557  | Implementation plan with checklist |
| `ai-extraction-workflow-explained.md` | 1011  | Detailed workflow explanation      |

## Documents Modified

| Document                                  | Changes                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| `menu-image-processing-job-queue-spec.md` | Removed `combinedWithFileId`, added sourceFileIndex validation |

## Key Decisions Made

| #   | Decision                       | Rationale                  |
| --- | ------------------------------ | -------------------------- |
| D1  | First extraction = auto-apply  | Fast onboarding            |
| D2  | Re-extraction = always preview | Safety                     |
| D3  | 95% similarity threshold       | Conservative               |
| D8  | Client-side comparison         | Data available, no timeout |
| D9  | ADD/UPDATE only, never delete  | Safety                     |
| D15 | Items merge INTO old file      | Advanced View UI needs     |

## Implementation Checklist (from integration.md)

### Phase 0: Core Types & Utilities

- [ ] Add `PREVIEW_READY` to `MENU_PROCESSING_STATUS`
- [ ] Add `isFirstExtraction` field to job doc
- [ ] Create `normalizeName()` utility
- [ ] Create `similarity()` function
- [ ] Port `redistributeExtractedData()` to client
- [ ] Port `transformIdsForFile()` to client

### Phase 1: Comparison Engine

- [ ] Create Comparison Engine types
- [ ] Create `runComparisonEngine()` function
- [ ] Implement category matching (95% threshold)
- [ ] Implement item matching with category constraint
- [ ] Implement deduplication
- [ ] Build `ApplyPlan` output

### Phase 2: Backend Changes

- [ ] Detect first extraction vs re-upload
- [ ] IF first: save directly (existing behavior)
- [ ] IF re-upload: write raw data, set `preview_ready`

### Phase 3: Client Review Screen

- [ ] Add `isPreviewReady` derived state
- [ ] Handle in job completion effect
- [ ] Create `ExtractionReviewScreen` component
- [ ] Display preview sections
- [ ] Implement item toggle

### Phase 4: Client Save Handler

- [ ] Create `saveExtractionReview()` function
- [ ] Implement `applyToProject()` for SINGLE/MASTER
- [ ] Implement `applyToOutletProject()` for OUTLET
- [ ] Mark job as completed
- [ ] Log MOL event

### Phase 5: Zod Validation

- [ ] Create Zod schemas
- [ ] Add validation to `applyItemOverride`
- [ ] Add validation to `linkStoreToMaster`

### Phase 6: Safety & Edge Cases

- [ ] Block re-extraction on master projects
- [ ] Add TTL check for unapproved jobs

---

**End of Full Session Export**

**Total Duration:** ~3 hours  
**Messages Exchanged:** 16+  
**Documents Created:** 2  
**Documents Modified:** 1  
**Lines of Documentation:** 2500+
