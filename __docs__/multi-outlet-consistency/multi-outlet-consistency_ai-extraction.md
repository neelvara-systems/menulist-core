# AI Data Extraction + Multi-Outlet Integration

**Feature:** AI Extraction Flow Enhancement for Multi-Outlet Compatibility  
**Document Type:** Technical Analysis & Implementation Plan  
**Status:** ✅ Production Ready  
**Original Date:** January 24, 2026  
**Last Reviewed:** February 13, 2026  
**Source:** ChatGPT Deep Analysis + Cascade Codebase Cross-Check

---

## Executive Summary

This document captures the complete analysis from a ChatGPT conversation regarding making the AI data extraction flow compatible with multi-outlet functionality. It includes:

1. **Architecture Changes** — New Merge + Match Layer
2. **Workflow Modifications** — Review Screen for re-uploads
3. **Core Use Cases** — How master/outlet extraction differs
4. **Result Screen Specification** — Post-extraction review UI
5. **Zod Validation Requirements** — Authority-sensitive write gates
6. **Implementation Checklist** — All action items

---

## ⚠️ CRITICAL RULES (UPDATED Jan 2026)

### Rule 1: First Extraction = Auto-Save, Re-Extraction = Preview

| Scenario                                | Action                               |
| --------------------------------------- | ------------------------------------ |
| **First extraction** (no existing menu) | Auto-save directly (fast onboarding) |
| **Re-extraction** (has existing menu)   | ALWAYS show preview (mandatory)      |

### Rule 2: ADD/UPDATE Only — Never Delete

- ✅ Add new items/categories from upload
- ✅ Update existing items if matched (exact match first, then ≥95% similarity)
- ❌ **NEVER delete** items just because upload didn't include them
- Reset Menu is the ONLY delete mechanism

### Rule 3: Client-Side Comparison (NEW Architecture)

**The Flow (for re-extraction):**

1. User uploads
2. Firebase Function runs extraction in background
3. Function writes raw extracted data to job doc, sets `status = "preview_ready"`
4. Client receives update → runs **Comparison Engine** locally
5. Client shows Review Screen with preview diff
6. User reviews and clicks Save
7. **Client writes** approved changes directly to Firestore
8. Client marks job as `completed`

**Key Change:** Merge/comparison happens on CLIENT, not server. No backend approval endpoint needed.

---

## Related Documentation (MUST READ)

| Document               | Location                                                                   | Purpose                           |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| **Workflow Explained** | `__docs__/multi-outlet-consistency/ai-extraction-workflow-explained.md`    | **Detailed workflow explanation** |
| AI Extraction Spec     | `__docs__/projects/ai-data-extraction/ai-data-extraction_spec.md`          | Product specification             |
| AI Extraction Impl     | `__docs__/projects/ai-data-extraction/ai-data-extraction_impl.md`          | Technical implementation          |
| Production Review      | `__docs__/projects/ai-data-extraction/production-review.md`                | Issue analysis & fixes            |
| Multi-Outlet Impl      | `__docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md`       | Multi-outlet architecture         |
| Multi-Outlet Tests     | `__docs__/multi-outlet-consistency/multi-outlet-consistency_test-cases.md` | 40 test scenarios                 |
| Image Processing Flow  | `__docs__/multi-outlet-consistency/image-processing-flow.md`               | Detailed extraction flow          |

---

## Part 1: Current State Analysis

> ⚠️ **IMPORTANT CONTEXT:** This document proposes ADDITIONS to the existing flow for multi-outlet compatibility. The current implementation (documented in `MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md`) works correctly for single-store. These changes add a "preview" path for re-extractions to preserve ID stability in multi-outlet chains.

### 1.1 Current AI Extraction Flow (Single-Store) - UNCHANGED FOR FIRST EXTRACTION

**Reference:** `__docs__/projects/assessments/menu-image-processing-job-queue-spec.md`, `menu-job-queue-implementation.md`

```
Current Flow (First Extraction - STAYS THE SAME):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Client Upload   │ →  │ Firebase Func   │ →  │ Save to Project │
│ Create Job Doc  │    │ AI Extraction   │    │ Job Complete    │
│                 │    │ Redistribute    │    │ Client Refetch  │
│                 │    │ Transform IDs   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Server does (from `processMenuImagesJob.ts`):**

1. AI extraction via Gemini
2. `redistributeExtractedData()` - split by `sourceFileIndex`
3. `transformIdsForFile()` - prefix IDs with file UID
4. `saveFilesToProject()` - write to Firestore
5. Mark job `completed`

**Client does:**

1. Create job doc
2. Listen via `useMenuProcessingJob` hook
3. On completion: `mutateProject()` to refetch

**Files Involved:**

- `src/components/templates/main-app/projects/index.tsx` — Client upload UI
- `src/lib/firebase/menuProcessing.ts` — Job creation
- `functions/src/logic/processMenuImagesJob.ts` — Cloud Function trigger
- `functions/src/logic/processMenuImages.ts` — AI extraction logic
- `functions/src/logic/saveFilesToProject.ts` — Save to Firestore

### 1.2 What's Already Implemented (Multi-Outlet Base)

**Reference:** `src/lib/multiOutlet/resolveProject.ts`, `src/database/multiOutlet/index.ts`

| Component                   | Status         | Evidence                                           |
| --------------------------- | -------------- | -------------------------------------------------- |
| Read-time resolver          | ✅ IMPLEMENTED | `resolveProject.ts:84-136`                         |
| Override precedence         | ✅ IMPLEMENTED | `resolveProject.ts:167-183` — outlet override wins |
| Local-only items            | ✅ IMPLEMENTED | `resolveProject.ts:186-189` — L*I* prefix          |
| Local-only categories       | ✅ IMPLEMENTED | `resolveProject.ts:203-207` — L*C* prefix          |
| Item inheritance states     | ✅ IMPLEMENTED | `resolveProject.ts:218-226`                        |
| Category ordering overrides | ✅ IMPLEMENTED | `resolveProject.ts:209-216`                        |
| Master project designation  | ✅ IMPLEMENTED | `multiOutlet/index.ts:56-129`                      |
| Link outlet to master       | ✅ IMPLEMENTED | `multiOutlet/index.ts:131-178`                     |
| Apply item override         | ✅ IMPLEMENTED | `multiOutlet/index.ts:305-365`                     |
| Remove item override        | ✅ IMPLEMENTED | `multiOutlet/index.ts:407-446`                     |
| MOL event logging           | ✅ IMPLEMENTED | `src/lib/multiOutlet/molEvents.ts`                 |

### 1.3 The Missing Piece: Merge + Match Layer

**ChatGPT Identified Gap:**

> "Your extraction workflow is solid. But for Multi-Outlet, your current flow has one missing piece that will break chains if you don't add it: You need a **Merge + Match Layer** that runs after extraction and before `saveFilesToProject` writes final data."

**Current:** Extract → Save  
**Required:** Extract → **Resolve Identity** → Save

---

## Part 2: Required Architecture Changes

### 2.1 Updated Flow for Chain-Safe Extraction

```
New Flow (Multi-Outlet Compatible):
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 1. Extract      │ →  │ 2. Match Items  │ →  │ 3. Build Preview│
│ (same as today) │    │ (95% similarity)│    │ (Result Screen) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ 6. Job Complete │ ←  │ 5. Apply Merge  │ ←  │ 4. User Approve │
│                 │    │ + Override Rules│    │ (Review Screen) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 New Job Statuses Required

**Current statuses:** `pending`, `processing`, `completed`, `failed`, `cancelled`

**New statuses to add:**

- `preview_ready` — Extraction complete, raw data written to job doc (client handles comparison)

> Note: With client-side comparison, we don't need `awaiting_review`. The job goes directly from `preview_ready` → `completed` (client marks it after user approves).

### 2.3 New Job Document Fields (Server-Side Only)

**File:** `functions/src/types/menuProcessingJob.types.ts`

> ⚠️ **IMPORTANT:** With client-side comparison, the job document only stores RAW extracted data.
> Preview/comparison is computed on CLIENT, not stored in job doc.

```typescript
// NEW fields for review workflow (JOB DOCUMENT - server writes these)
interface MenuProcessingJob {
  // Existing fields...

  // NEW: For re-extraction workflow
  isFirstExtraction?: boolean; // true = auto-save, false = needs review

  // EXISTING field - already contains combined AI response with sourceFileIndex
  // For re-extraction: server writes this, client reads and redistributes locally
  result?: {
    combinedData: {
      categories: Array<{ id, sourceFileIndex, name, ... }>;
      items: Array<{ id, sourceFileIndex, name, category, ... }>;
      languages: Array<{ name, code, isPrimary }>;
      fileMessages?: FileMessage[];
    };
    qualityScore: number;
    qualityDetails: { ... };
  };

  // TTL for cleanup
  expiresAt?: Timestamp; // 24 hours for unapproved jobs
}
```

> **Note:** We use the EXISTING `result.combinedData` field - no new field needed. For re-extraction, server writes to this field and sets `status = "preview_ready"`. Client reads `result.combinedData` and handles redistribution + comparison locally.

**What goes WHERE:**

| Data                        | Location                             | Why                                  |
| --------------------------- | ------------------------------------ | ------------------------------------ |
| Combined AI response        | Job document (`result.combinedData`) | Server writes once, client reads     |
| Comparison result (preview) | Client React state                   | Computed locally, not persisted      |
| Apply plan (what to write)  | Client React state                   | Built from comparison, not persisted |
| Final merged data           | Project document                     | Written on user approval             |

**Redistribution Logic Location:**

| Scenario             | Where `redistributeUtils` Logic Runs                           |
| -------------------- | -------------------------------------------------------------- |
| **First extraction** | SERVER - `functions/src/logic/redistributeUtils.ts` (existing) |
| **Re-extraction**    | CLIENT - needs ported version in `src/lib/extraction/`         |

> **Note:** For first extraction, server uses existing `redistributeExtractedData()` and `transformIdsForFile()` to save directly. For re-extraction, server writes combined AI response (with `sourceFileIndex`) to job doc, and CLIENT handles redistribution + comparison + review + save.

### 2.4 Client-Side Preview Types (NOT in job doc)

**File:** `src/lib/extraction/comparisonEngine.types.ts` (NEW - client-side only)

```typescript
// These types are for CLIENT-SIDE React state, NOT stored in Firebase
interface PreviewSummary {
  matchedCount: number;
  priceOverridesCount: number;
  newLocalOnlyCount: number;
  ambiguousCount: number;
  unchangedCount: number;
}

interface PreviewDiff {
  items: ItemDiff[];
  categories: CategoryDiff[];
}

interface ItemDiff {
  itemId: string;
  itemName: string;
  action:
    | "matched"
    | "price_override"
    | "new_local"
    | "ambiguous"
    | "unchanged";
  masterPrice?: string;
  extractedPrice?: string;
  matchConfidence?: number;
  ambiguousCandidates?: string[];
}
```

---

## Part 3: Core Use Cases — ChatGPT Analysis

### 3.1 Case A: Master Updates Price of Item X

**Owner Journey:** HQ edits item X price in master menu → Save.

**Internal Process (Exact):**

1. Master project item keeps same `itemId`
2. Master `item.price` changes
3. Outlets linked to this master:
   - If outlet has `override.price` → **override still wins**
   - If no override → **master price shows automatically** (read-time)
4. **No propagation writes needed**

**Already Implemented:**

- ✅ Read-time resolver (`resolveProject.ts:174`)
- ✅ Override precedence (`override.price ?? item.price`)
- ✅ MOL event: `MASTER_MENU_UPDATED` with `changedFields: ["items.price"]`

### 3.2 Case B: Outlet Creates Item Y Only for Its Store

**Owner Journey:** Outlet uploads menu / adds new item → wants it only locally.

**Internal Process:**

1. Outlet item created with ID: `L_I_${random}`
2. Stored inside outlet project `extractedData` (local-only list)
3. Resolver shows it only for that outlet
4. Master is untouched (no promotion)

**MOL Event:** `OUTLET_LOCAL_ITEM_CREATED`

**Already Implemented:**

- ✅ Local-only prefix: `L_I_` (`multiOutlet.types.ts:95`)
- ✅ Resolver filters local-only (`resolveProject.ts:186-189`)

### 3.3 Case C: Outlet Permanently Stops Selling Item Z

**Owner Journey:** Outlet says "we don't sell this anymore" → disable it.

**Internal Process:**

1. Outlet does NOT delete master item
2. It writes override: `overrides.items[zItemId] = { active: false }`
3. Resolver filters: `active === false` → item removed from outlet view
4. Other outlets still show it
5. Master still contains it

**MOL Event:** `OUTLET_OVERRIDE_APPLIED` with `{ itemId: z, active: false }`

**Already Implemented:**

- ✅ Active override (`resolveProject.ts:176`)
- ✅ Filter hidden items (`resolveProject.ts:183`)
- ✅ Apply override function (`multiOutlet/index.ts:305-365`)

### 3.4 Critical Conflict Case: Price Override vs Master Changes

**ChatGPT Identified Scenario:**

```
Master: 499 → 599
Outlet override: 699
Master again: 499
Final price shown = 699
```

**Rule:** Outlet override wins until explicitly removed.

**Do we remove outlet override automatically?**  
❌ **No. Never.**

> "Because that destroys local autonomy and causes silent pricing damage."

**How to track it?**  
Already solved via UI: `InheritanceBadge` state="overridden" + tooltip shows `masterPrice`

**Reference:** `src/components/molecules/InheritanceBadge/index.tsx`

---

## Part 4: Re-Upload / Re-Extraction Logic

### 4.1 The Problem

**ChatGPT Statement:**

> "outlet uploads same menu file again, we should not create duplicates. If it matches master item, only price override is valid."

### 4.2 Outlet Re-Upload Logic (Linked to Master)

For each extracted item:

**Step 1: Match to master items (exact match first, then 95% similarity)**

- If match found → use master `itemId`

**Step 2: Only allow price override write**

- If extracted price differs: `overrides.items[itemId].price = extractedPrice`

**Step 3: If no match → create local-only item**

- ID: `L_I_${random}`

### 4.3 Where This Logic Goes

**ChatGPT Identified Location:**

> "M5: Auto-merge stats computed but not actually applied"  
> "Location: `functions/src/logic/saveFilesToProject.ts`"

**Current State:** `saveFilesToProject.ts` computes auto-merge stats but doesn't actually merge items.

**D15 Decision (REVISED): Items Merge Into File Where Category Exists**

This decision was revised based on Advanced View UI requirements:

- Advanced View shows: Image (left) → Categories accordion with items (right)
- Each file panel shows categories FROM that file
- Items referencing categories from other files would be "orphaned" in the UI

**The Rule:**

| Item Type                       | Storage Location                                         |
| ------------------------------- | -------------------------------------------------------- |
| Item matches existing category  | **Merge INTO the file where category exists**            |
| Item has new category           | **Stay in new file**                                     |
| New file with no new categories | Contains only image URL (empty extractedData or minimal) |

**Reference:** `MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md` Section 8.12-8.13 - the `autoMergeItems()` function was designed for this, but actual redistribution back to existing files was noted as "future enhancement".

**What to add inside `saveFilesToProject.ts`:**

```typescript
function buildMergePlan({
  extractedMenu,
  existingProjectData,
  masterProjectData?
}): MergePlan {
  return {
    finalItems: [],
    finalCategories: [],
    overridesToWrite: {},
    resultScreenSummary: {}
  };
}
```

---

## Part 4A: ADD/UPDATE ONLY Rule (CRITICAL - NEW)

> ⚠️ **NON-NEGOTIABLE RULE** from ChatGPT conversation

### The Rule

**Every extraction cycle = "ADD / UPDATE only"**

- ✅ Add new categories/items found in upload
- ✅ Update existing items if matched (exact match first, then ≥95% similarity + category check)
- ❌ **NEVER delete** anything just because it wasn't in the new file

### Why No Deletions?

**ChatGPT Quote:**

> "If re-upload extraction doesn't include some old items, you must NOT auto-delete. Missing items simply mean 'this upload didn't mention them' not 'delete them'."

### Real-World Scenario

```
Upload 1: file1.jpg → extract → save (10 items created)
Upload 2: file2.jpg → extract → save (adds 5 more items)
Upload 3: file3.jpg → extract → save (adds 3 more items)

Result: 18 items total (never deletes previous items)
```

### Reset is the ONLY Delete Mechanism

If owner wants to replace everything:

1. Click "Reset Menu" → start fresh
2. Then upload again (fresh rebuild)

**This keeps MenuList safe, predictable, and prevents accidental destruction.**

---

## Part 4B: Extraction Rules by Mode (CLARIFIED)

### Single Store (non-chain)

- ✅ Extraction works exactly as today
- ✅ `upload → function extracts → auto-merge → save`
- ✅ First extraction = auto-save
- ✅ Re-extraction = preview screen

### Chain Master (HQ)

- ✅ Master is the ONLY place where "real extraction" happens
- ✅ `upload → extract → master becomes SSOT`
- ✅ Outlets inherit automatically via read-time resolver

### Chain Outlet (linked to master)

- ⚠️ **Outlets should NOT run full extraction** (by default)
- ❌ Would create duplicate items
- ❌ Would break ID stability
- ❌ Would destroy inheritance rules

**What outlets CAN do from extraction:**

- ✅ Create price overrides (if extracted price differs from master)
- ✅ Create local-only items/categories (`L_I_`, `L_C_`)
- ❌ Cannot update master item name/description/image/category

**Core rule:** Outlet upload can ONLY produce:

- overrides on inherited items
- new `L_I_` / `L_C_` local-only items/categories
- **NEVER edits master fields directly**

---

## Part 4C: Client-Side Comparison Architecture (UPDATED)

> ⚠️ **ARCHITECTURE CHANGE:** Merge happens on CLIENT, not server

### Previous Understanding (OUTDATED)

```
Server generates preview → stores in job doc → client shows review → backend applies
```

### NEW Architecture (CONFIRMED)

```
Firebase Function finishes extraction
        ↓
Writes raw extracted output to job doc (or returns it)
        ↓
Client receives update
        ↓
CLIENT builds comparison + preview UI (using comparison engine)
        ↓
User clicks Save
        ↓
CLIENT writes final changes into Firestore:
  - Single store/master: write to project menu data
  - Outlet: write only to overrides + local-only items/categories
```

**Key Points:**

- ✅ No "server merge" - no extra function needed
- ✅ Preview is stored in React state (client)
- ✅ Comparison engine runs on client
- ✅ Save writes directly to Firestore from client

### 3 Non-Negotiable Rules for Client-Side Preview

**Rule 1: Preview must be deterministic**

- Same extracted output + same current project state → same preview
- Store preview data in React state
- Don't recompute with random ordering
- **Generate local IDs once during preview build and keep them frozen until Save**

**Rule 2: Save must be idempotent**

- If user taps Save twice, or network retries → no duplicates
- Local-only items must have stable IDs (generated once)
- Overrides use map keys (`overrides.items[itemId]`) so rewrite is safe

**Rule 3: Save must validate against latest project**

- Between preview open and save: master may change, outlet may change
- On Save, client must:
  1. Re-fetch current project (and master if linked)
  2. Verify `masterRef` still same
  3. Verify matched items still exist
  4. If mismatch → show "Menu changed. Refresh preview."

### menuVersion Field (DEFERRED)

> ⚠️ **DECISION:** Skip menuVersion for now. Can be added later if needed.

The optimistic locking via menuVersion was proposed but **deferred** to reduce initial complexity. The current approach:

1. Preview is built from current React state
2. Save happens immediately after user approval
3. If conflicts arise in production, menuVersion can be added as enhancement

**If needed later, add:**

```typescript
projects/{tId}/{sId}/{projectId}.menuVersion = Timestamp.now()
// Update whenever menu is saved
```

---

## Part 4D: Comparison Engine Specification (FULL SPEC)

> ⚠️ **This is the brain of the preview system** — implements all matching rules

### Purpose

Create a deterministic engine that compares:

- **new extracted menu data** (from latest upload)
- vs **existing menu state** (project / master / overrides)

...and produces a **Preview Diff** that the UI shows before "Save".

### Engine Modes (must support)

| Mode             | Description                               |
| ---------------- | ----------------------------------------- |
| `SINGLE_STORE`   | Normal project (no chain master linkage)  |
| `MASTER_PROJECT` | HQ master project (chain SSOT)            |
| `OUTLET_LINKED`  | Outlet project linked to a master project |

### Data Contracts (TypeScript)

#### Input Types

```typescript
// Normalized extracted data from AI
type ExtractedCategoryInput = {
  name: string;
  orderIndex?: number;
};

type ExtractedItemInput = {
  name: string;
  categoryName: string;
  price?: string;
  description?: string;
  imageUrl?: string;
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
};

// Existing menu state
type ExistingCategory = {
  id: string;
  name: Record<string, string> | string;
  orderIndex?: number;
  active?: boolean;
};

type ExistingItem = {
  id: string;
  name: Record<string, string> | string;
  category: string; // categoryId
  price?: string;
  description?: Record<string, string> | string;
  image?: string;
  available?: boolean;
  active?: boolean;
};

// Override types (already implemented)
type ItemOverride = {
  itemId: string;
  price?: string;
  available?: boolean;
  active?: boolean;
};

type CategoryOverride = {
  categoryId: string;
  orderIndex?: number;
  active?: boolean;
};
```

#### Comparison Engine Input

```typescript
type ComparisonMode = "SINGLE_STORE" | "MASTER_PROJECT" | "OUTLET_LINKED";

type ComparisonEngineInput = {
  mode: ComparisonMode;

  // Always present
  extracted: {
    categories: ExtractedCategoryInput[];
    items: ExtractedItemInput[];
  };

  // Current store project state
  storeProject: {
    categories: ExistingCategory[];
    items: ExistingItem[];
    overrides?: {
      items?: Record<string, ItemOverride>;
      categories?: Record<string, CategoryOverride>;
    };
  };

  // Only required for OUTLET_LINKED
  masterProject?: {
    categories: ExistingCategory[];
    items: ExistingItem[];
  };

  // Matching rules
  matchConfig?: {
    similarityThreshold?: number; // default 0.95
    weakMatchThreshold?: number; // default 0.98 (warn if 0.95-0.98)
  };
};
```

#### Output Types

```typescript
type DiffEntityType = "CATEGORY" | "ITEM";
type DiffChangeType = "NEW" | "UPDATE" | "OVERRIDE" | "IGNORE" | "WARNING";

type PreviewCategoryRow = {
  changeType: "NEW" | "UPDATE";
  categoryName: string;
  existingCategoryId?: string;
  matchScore?: number;
  changes?: { nameChanged?: boolean; orderIndexChanged?: boolean };
  warnings?: string[];
};

type PreviewItemRow = {
  changeType: "NEW" | "UPDATE" | "OVERRIDE";
  itemName: string;
  categoryName: string;
  existingItemId?: string;
  masterItemId?: string; // OUTLET_LINKED only
  matchScore?: number;
  changes?: {
    price?: { from?: string; to?: string };
    description?: { from?: string; to?: string };
    image?: { from?: string; to?: string };
  };
  overridePatch?: Partial<ItemOverride>; // OUTLET_LINKED
  warnings?: string[];
};

type PreviewWarningRow = {
  entityType: DiffEntityType;
  name: string;
  reason: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

type PreviewIgnoredRow = {
  entityType: DiffEntityType;
  name: string;
  reason: string;
};
```

#### Apply Plan (what will be written on Save)

```typescript
type ApplyPlan = {
  // Only for SINGLE_STORE or MASTER_PROJECT
  projectMutations?: {
    upsertCategories: Array<{
      categoryId?: string;
      newCategory?: ExistingCategory;
      patch?: Partial<ExistingCategory>;
    }>;
    upsertItems: Array<{
      itemId?: string;
      newItem?: ExistingItem;
      patch?: Partial<ExistingItem>;
    }>;
  };

  // Only for OUTLET_LINKED
  outletMutations?: {
    upsertLocalCategories: ExistingCategory[]; // IDs start with L_C_
    upsertLocalItems: ExistingItem[]; // IDs start with L_I_
    applyOverrides: Array<{
      masterItemId: string;
      patch: Partial<ItemOverride>;
    }>;
    applyCategoryOverrides?: Array<{
      masterCategoryId: string;
      patch: Partial<CategoryOverride>;
    }>;
  };
};
```

#### Final Output

```typescript
type ComparisonEngineOutput = {
  preview: {
    newCategories: PreviewCategoryRow[];
    updatedCategories: PreviewCategoryRow[];
    newItems: PreviewItemRow[];
    updatedItems: PreviewItemRow[];
    overrideSuggestions: PreviewItemRow[]; // OUTLET_LINKED
    warnings: PreviewWarningRow[];
    ignored: PreviewIgnoredRow[];
  };

  applyPlan: ApplyPlan;

  stats: {
    extractedCategories: number;
    extractedItems: number;
    matchedItems: number;
    newItems: number;
    overrides: number;
    weakMatches: number;
    invalidPrices: number;
  };
};
```

### Matching Rules (Strict)

#### Normalization Function (MUST exist)

```typescript
function normalizeName(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // collapse spaces
    .replace(/[^\p{L}\p{N}\s]/gu, "") // remove punctuation/symbols
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ""); // remove emojis
}
```

#### Similarity Function

```typescript
// Must return score 0..1 (use Levenshtein/Jaro-Winkler)
type SimilarityFn = (a: string, b: string) => number;
```

#### Thresholds (FINALIZED)

| Threshold             | Value    | Purpose                       |
| --------------------- | -------- | ----------------------------- |
| `exactMatch`          | **1.0**  | Primary matching method       |
| `similarityThreshold` | **0.95** | Match allowed if score ≥ 0.95 |
| `weakMatchThreshold`  | **0.98** | Warn if score is 0.95-0.98    |

**Matching Priority:**

1. Try exact match first (normalized names)
2. If no exact match, try similarity match (≥0.95)
3. If similarity match found but <0.98, add warning to review screen

#### Category Matching

A category matches if:

```
normalizedExtractedName === normalizedExistingName (exact match)
OR
similarity(normalizedExtractedName, normalizedExistingName) >= 0.95
```

#### Item Matching (with Category Constraint)

An item matches if:

```
(item name exact match OR item name similarity >= 0.95)
AND
(category exact match OR category similarity >= 0.95)
```

**This prevents "Fries" in "Starters" merging with "Fries" in "Combos".**

#### Best Candidate Selection

```typescript
function pickBestMatch(matches: Array<{ id: string; score: number }>) {
  return matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // highest score
    return a.id.localeCompare(b.id); // deterministic tie-break
  })[0];
}
```

### Price Validation (Pre-Preview)

```typescript
function isValidPrice(price?: string): boolean {
  if (!price) return false;
  if (price.length > 20) return false; // max 20 chars
  if (/<[^>]*>/.test(price)) return false; // no HTML
  if (!/[0-9]/.test(price)) return false; // must contain digit
  if (/[\u{1F300}-\u{1FAFF}]/gu.test(price)) return false; // no emoji
  return true;
}
```

Invalid extracted price:

- Does NOT enter applyPlan
- Goes into `warnings` list
- Preview still shows item, but with warning

### Deduplication Inside Same Upload (MUST DO)

Before matching:

```typescript
// Key = normName + "::" + normCategoryName
const deduped: Record<string, ExtractedItem> = {};
const ignoredDuplicates: ExtractedItem[] = [];

for (const item of normalizedExtractedItems) {
  const key = item.normName + "::" + item.normCategoryName;

  if (!deduped[key]) {
    deduped[key] = item;
  } else {
    // Keep best candidate (more fields present)
    const best = pickMoreComplete(deduped[key], item);
    const loser = best === item ? deduped[key] : item;
    deduped[key] = best;
    ignoredDuplicates.push(loser);
  }
}
```

### Mode-Specific Write Rules

#### SINGLE_STORE Mode

**Allowed updates:** Everything

- name, category assignment, description, price, image, order

**Apply plan behavior:**

- Matched categories → UPDATE
- Unmatched categories → NEW
- Matched items → UPDATE
- Unmatched items → NEW
- **Never delete**

#### MASTER_PROJECT Mode

Same as SINGLE_STORE, plus:

- **ID stability requirement:** If match found, keep existing IDs, update fields only
- This protects chain linkage

#### OUTLET_LINKED Mode (Most Strict)

**Comparison target priority:**

1. Master project items/categories (primary)
2. Outlet local-only items/categories (secondary)

**Allowed changes from outlet extraction:**

| Scenario                               | Action                                                       |
| -------------------------------------- | ------------------------------------------------------------ |
| Extracted item matches MASTER item     | Only **override patch** allowed (price only from extraction) |
| Extracted item matches LOCAL-only item | Update local-only item fully (price/desc/image/name allowed) |
| Extracted item matches nothing         | Create local-only category/item (`L_C_`, `L_I_`)             |

**Forbidden:**

- ❌ Outlet cannot update master item fields (name/desc/image/category)
- ❌ Outlet cannot create master items
- ❌ Outlet cannot delete anything

### Engine Guarantees (MUST HOLD)

| #   | Guarantee                           | Description                               |
| --- | ----------------------------------- | ----------------------------------------- |
| 1   | No deletion                         | Engine never outputs delete operations    |
| 2   | Outlet never touches master         | No master doc writes in outlet applyPlan  |
| 3   | "Sandwich" vs "Sandwiches"          | Similarity ≥ 0.95 → match and preserve ID |
| 4   | Two "Fries" in different categories | Category constraint prevents wrong merge  |
| 5   | Upload duplicates                   | Dedup prevents double creation            |

---

## Part 5: Review Screen Architecture

### 5.1 When to Require Review vs Auto-Apply (UPDATED)

> ⚠️ **RULE CHANGED:** Based on latest ChatGPT conversation (Jan 2026)

**NEW RULE (Simplified & Safe):**

| Scenario                                    | Action                    |
| ------------------------------------------- | ------------------------- |
| **First extraction** (no existing menu)     | ✅ Auto-save (NO preview) |
| **Every re-extraction** (has existing menu) | ✅ ALWAYS show preview    |

**This applies to ALL modes:**

- Single store: first = auto, re-upload = preview
- Master project: first = auto, re-upload = preview
- Outlet project: first = auto, re-upload = preview

**Why this change?**

> "We do not show preview screen only for the first time otherwise for all other cases we should and must show so every time whenever there is extraction happened this process gated by the preview screen. It's fine if all data are overrides or all data new. We just need to show the preview screen to avoid any accidental changes."

~~**OLD RULES (DEPRECATED):**~~
~~- Single store = auto-save directly~~
~~- 90%+ match confidence = auto-save~~
~~- No ambiguous matches = auto-save~~

### 5.2 The Key Rule: First Time vs Re-Upload (CONFIRMED)

> ⚠️ **THIS IS THE MOST IMPORTANT RULE FOR IMPLEMENTATION**

**Final Rule (Locked):**

```
┌────────────────────────────────────────────────────────────────┐
│ FIRST TIME EXTRACTION (project has no extracted menu yet)     │
│                                                                │
│ ✅ Auto-save directly to projects/                             │
│ ✅ No review screen                                            │
│ ✅ No approval step                                            │
│ ✅ Keep it fast (onboarding must feel instant)                 │
│ ✅ Applies to: single store, master, AND outlet                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ RE-UPLOAD / RE-EXTRACTION (project already has menu data)     │
│                                                                │
│ ✅ Preview ALWAYS required (mandatory)                         │
│ ✅ Show review screen                                          │
│ ✅ Wait for user approval                                      │
│ ✅ Even if "0 overrides" or "only new items"                   │
│ ✅ Even for single-store SMB                                   │
│ ⚠️ Prevents silent drift + accidental overwrites              │
└────────────────────────────────────────────────────────────────┘
```

**Detection Logic:**

```typescript
const isFirstExtraction = !project.files?.some((f) => f.extractedData);
// OR
const isFirstExtraction = project.files?.length === 0;
```

**Why This Matters:**

- First extraction has NO existing IDs to preserve
- Re-upload must match to existing IDs (exact match or 95% similarity)
- Wrong merges on re-upload can orphan outlet overrides
- First extraction is the "happy path" - keep it fast
- **Safety > Speed** for re-uploads (premium trust surface)

### 5.3 Result Screen Sections

**ChatGPT Specification:**

| Section                    | Description                  | Example                                                                     |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| 1) Matched to existing     | Items matched, IDs preserved | "18 items matched"                                                          |
| 2) Price overrides applied | Outlet-only, shows diff      | "4 prices differ from master" → Master price → Outlet extracted price       |
| 3) New local-only items    | New items created            | "3 local-only items created"                                                |
| 4) Ambiguous items         | Need manual review           | "2 items need review" → Options: link to candidate A, B, or keep local-only |
| 5) No changes              | Items unchanged              | "22 items unchanged"                                                        |

### 5.4 Review Screen UI Flow

```
User uploads → sees "Processing…"
When preview ready → shows Review screen
Approve → "Applying…"
Done → redirect to editor

No extra mental load.
```

### 5.5 What Happens If User Does Nothing?

**TTL Rule:** After 24 hours, mark job `expired`. Don't apply anything.

---

## Part 6: Backend Workflow Changes (UPDATED)

> ⚠️ **ARCHITECTURE CHANGED:** Based on latest ChatGPT conversation - merge happens on CLIENT, not server

### 6.1 Before (Today)

```
Function does:
1. Extract
2. Merge
3. Save into projects/{tId}/{sId}/{projectId}
4. Mark job completed
```

### 6.2 After (With Client-Side Comparison) — NEW ARCHITECTURE

```
Firebase Function does:
1. Extract (AI processing)
2. Write raw extracted output to job doc
3. Check if first extraction:
   - IF first extraction → save directly to project, mark completed
   - IF re-extraction → write extracted data to job, set status = "preview_ready", STOP

Client does (for re-extraction):
4. Receives job update with raw extracted data
5. Runs Comparison Engine (client-side) against current project + master (if linked)
6. Shows Review Screen with preview diff
7. User approves changes (can uncheck individual items)
8. Client writes approved changes directly to Firestore:
   - Single store/master: update project.files[].extractedData
   - Outlet: update overrides + local-only items/categories
9. Client marks job as completed
```

**Key Change:** No backend approval endpoint needed. Client handles comparison + write.

### 6.3 Client Changes

**Current:** Client listens for job status changes via `useMenuProcessingJob` hook.

**New Flow:**

1. When client sees `status = "preview_ready"`:
   - Fetch raw extracted data from job doc
   - Run Comparison Engine on client
   - Show Review Screen with computed preview

2. User reviews and clicks "Save Changes":
   - Write approved changes directly to Firestore
   - Mark job as completed
   - Refresh project data in React state

**No server approval endpoint needed** — this simplifies the architecture significantly.

### 6.4 Save Handler (Client-Side)

```typescript
async function saveExtractionReview(applyPlan: ApplyPlan, session) {
  // 1. Apply based on mode
  if (applyPlan.mode === "SINGLE_STORE" || applyPlan.mode === "MASTER_PROJECT") {
    await applyToProject(applyPlan, session);
  } else if (applyPlan.mode === "OUTLET_LINKED") {
    await applyToOutletProject(applyPlan, session);
  }

  // 2. Mark job completed
  await updateDoc(jobRef, { status: "completed" });

  // 3. Log MOL event
  await logMolEvent({ type: "MENU_EXTRACTION_APPLIED", ... });

  // 4. Refresh project data in React state
  await mutateProject();
}
```

---

## Part 7: Zod Validation Requirements

### 7.1 ChatGPT Warning

> "Your 'skip Zod validation' logic is wrong for Multi-Outlet. I agree with skipping Zod for normal jobs. But for Multi-Outlet writes: overrides are authority-sensitive, one bad payload can corrupt a chain menu."

### 7.2 Where to Add Strict Validation

**Only for write gates (not everywhere):**

| Function                     | File                   | Requires Zod                            |
| ---------------------------- | ---------------------- | --------------------------------------- |
| `applyItemOverride`          | `multiOutlet/index.ts` | ✅ YES                                  |
| `addLocalItem`               | `multiOutlet/index.ts` | ✅ YES                                  |
| `linkStoreToMaster`          | `multiOutlet/index.ts` | ✅ YES                                  |
| `setProjectAsMaster`         | `multiOutlet/index.ts` | ✅ YES                                  |
| ~~`applyExtractionPreview`~~ | ~~NEW API route~~      | ~~NOT NEEDED~~ (client writes directly) |

### 7.3 Suggested Zod Schemas

```typescript
// Item Override Schema
const ItemOverrideSchema = z.object({
  active: z.boolean().optional(),
  available: z.boolean().optional(),
  price: z.string().optional(),
  orderIndex: z.number().optional(),
  isBestSeller: z.boolean().optional(),
  duration: z.number().optional(),
  ownerBoost: z.number().optional(),
});

// Apply Preview Schema
const ApplyPreviewSchema = z.object({
  jobId: z.string().min(1),
  approvedBy: z.string().min(1),
});
```

---

## Part 8: Multi-Outlet Test Cases Summary

**Reference:** `multi-outlet-consistency_test-cases.md`

### 8.1 Current Status Summary

| Status         | Count | Description                            |
| -------------- | ----- | -------------------------------------- |
| ✅ HANDLED     | 126   | Fully implemented in codebase          |
| ⚠️ PARTIAL     | 5     | Partially implemented, needs attention |
| 🔒 BY DESIGN   | 14    | Intentionally deferred/rejected        |

### 8.2 Current Gaps / Decisions

| Case #  | Issue                                                              | Status         | Action Required                                        |
| ------- | ------------------------------------------------------------------ | -------------- | ------------------------------------------------------ |
| Case 29 | No explicit "item not found" fallback in B2C                       | ⚠️ PARTIAL     | Verify B2C handles gracefully                          |
| Case 31 | Re-extraction could generate new IDs when matching fails           | ⚠️ PARTIAL     | Monitor production; add mapping only if evidence justifies the cost |
| Case 82 | No explicit ID mapping layer                                       | ⚠️ PARTIAL     | Same tracked risk as Case 31                           |
| T32/T33 | Outlet staleness markers are isolated but not propagated           | ⚠️ PARTIAL     | Add dedicated staleness integration only if owners need it |

Resolved May 19, 2026: linked project publish validation, outlet manager master protection, linked outlet lookup, override price/payload validation, AI API policy enforcement, and theme/brand/layout policy enforcement.

### 8.3 Case 31 — The #1 Silent Killer

**ChatGPT Warning:**

> "Risk: #1 silent killer — overrides become orphaned"

**Problem:** If master item IDs change during re-extraction, all outlet overrides referencing those IDs become orphans (ignored).

**Resolution Options:**

1. Add ID mapping layer during re-extraction
2. Block re-extract on master projects entirely
3. Implement ID stability guarantee in extraction

**Recommendation:** Block re-extract on master projects (simplest, safest)

---

## Part 9: QA Test Matrix Summary

**Reference:** `multi-outlet-consistency_test-cases.md` Part 2

### 9.1 Test Categories

| Category                                  | Tests   | Status                 |
| ----------------------------------------- | ------- | ---------------------- |
| A) Feature Flag & Backwards Compatibility | T1-T5   | ✅ All passing         |
| B) Master Project Rules                   | T6-T10  | ✅ All passing         |
| C) Linking & Chain Consistency            | T11-T15 | ✅ All passing         |
| D) Resolver Correctness                   | T16-T21 | ✅ All passing         |
| E) Overrides                              | T22-T27 | ✅ All passing         |
| F) Multi-Project Support                  | T28-T30 | ✅ All passing         |
| G) Pricing Integrity & Staleness          | T31-T35 | ⚠️ T32,T33 partial     |
| H) Security & Abuse                       | T36-T40 | ✅ All passing         |

---

## Part 10: Write Contract (Firestore SSOT)

### 10.1 Required Invariants

| #   | Invariant                               | Status         | Action                  |
| --- | --------------------------------------- | -------------- | ----------------------- |
| A   | Linked outlet projects always have master | ✅ HANDLED     | Outlet creation seeds links; publish validates master |
| B   | Master cannot link to another master    | ✅ HANDLED     | Implicit by design      |
| C   | Outlet override never edits master data | ✅ HANDLED     | Separate documents      |
| D   | IDs must never collide                  | ✅ HANDLED     | L*I*/L*C* prefixes      |
| E   | Re-extraction preserves IDs             | ⚠️ PARTIAL     | Matching preserves IDs when matched; explicit mapping layer deferred |

### 10.2 Write Operations Status

| Operation                | Status    | Evidence                                     |
| ------------------------ | --------- | -------------------------------------------- |
| Mark Project as Master   | ✅        | `setProjectAsMaster()`                       |
| Link Outlet to Master    | ✅        | `linkStoreToMaster()`                        |
| Unlink (internal only)   | ✅        | `unlinkStoreFromMaster()`                    |
| Apply Item Override      | ✅        | `applyItemOverride()`                        |
| Remove Item Override     | ✅        | `removeItemOverride()`                       |
| Add Local-Only Item      | ✅        | `addLocalOnlyItem()`                         |
| Apply Extraction Preview | ✅ CLIENT | Client writes directly (no backend endpoint) |

---

## Part 11: Implementation Checklist (With Codebase References)

> ⚠️ **UPDATED based on client-side comparison architecture**

### Phase 0: Core Types & Utilities (P0 - Required FIRST)

| #   | Task                                             | File                                             | Line     | Status      |
| --- | ------------------------------------------------ | ------------------------------------------------ | -------- | ----------- |
| 0.1 | Add `PREVIEW_READY` to `MENU_PROCESSING_STATUS`  | `functions/src/types/menuProcessingJob.types.ts` | 15-22    | ⬜ TODO     |
| 0.2 | Add `isFirstExtraction` field to job doc         | `functions/src/types/menuProcessingJob.types.ts` | 37-169   | ⬜ TODO     |
| 0.3 | ~~Add `menuVersion: Timestamp` to Project type~~ | ~~`src/types/project.types.ts`~~                 | ~~N/A~~  | ⏭️ DEFERRED |
| 0.4 | Create `normalizeName()` utility                 | `src/lib/extraction/normalize.ts`                | NEW FILE | ⬜ TODO     |
| 0.5 | Create `similarity()` function (Levenshtein)     | `src/lib/extraction/similarity.ts`               | NEW FILE | ⬜ TODO     |
| 0.6 | Create `isValidPrice()` validation               | `src/lib/extraction/validation.ts`               | NEW FILE | ⬜ TODO     |
| 0.7 | Port `redistributeExtractedData()` to client     | `src/lib/extraction/redistribute.ts`             | NEW FILE | ⬜ TODO     |
| 0.8 | Port `transformIdsForFile()` to client           | `src/lib/extraction/redistribute.ts`             | NEW FILE | ⬜ TODO     |

> **Note on 0.7-0.8:** These are ports of `functions/src/logic/redistributeUtils.ts` for client-side use during re-extraction. Server keeps existing code for first extraction.

### Phase 1: Comparison Engine (P0 - CLIENT-SIDE)

| #   | Task                                                 | File                                           | Line     | Status  |
| --- | ---------------------------------------------------- | ---------------------------------------------- | -------- | ------- |
| 1.1 | Create Comparison Engine types (see Part 4D)         | `src/lib/extraction/comparisonEngine.types.ts` | NEW FILE | ⬜ TODO |
| 1.2 | Create `runComparisonEngine()` main function         | `src/lib/extraction/comparisonEngine.ts`       | NEW FILE | ⬜ TODO |
| 1.3 | Implement category matching with 95% threshold       | `src/lib/extraction/comparisonEngine.ts`       | NEW      | ⬜ TODO |
| 1.4 | Implement item matching with category constraint     | `src/lib/extraction/comparisonEngine.ts`       | NEW      | ⬜ TODO |
| 1.5 | Implement deduplication for upload duplicates        | `src/lib/extraction/comparisonEngine.ts`       | NEW      | ⬜ TODO |
| 1.6 | Implement mode-specific logic (SINGLE/MASTER/OUTLET) | `src/lib/extraction/comparisonEngine.ts`       | NEW      | ⬜ TODO |
| 1.7 | Build `ApplyPlan` output structure                   | `src/lib/extraction/comparisonEngine.ts`       | NEW      | ⬜ TODO |

### Phase 2: Backend Changes (P0 - Required)

| #   | Task                                                               | File                                            | Line    | Status      |
| --- | ------------------------------------------------------------------ | ----------------------------------------------- | ------- | ----------- |
| 2.1 | Detect first extraction vs re-upload                               | `functions/src/logic/processMenuImagesJob.ts`   | 151-157 | ⬜ TODO     |
| 2.2 | IF first extraction: save directly (existing behavior)             | `functions/src/logic/processMenuImagesJob.ts`   | 183-194 | ⬜ TODO     |
| 2.3 | IF re-upload: write raw extracted data to job, set `preview_ready` | `functions/src/logic/processMenuImagesJob.ts`   | 183-194 | ⬜ TODO     |
| 2.4 | ~~Update menuVersion on every menu save~~                          | ~~`functions/src/logic/saveFilesToProject.ts`~~ | ~~N/A~~ | ⏭️ DEFERRED |

**Key Insertion Point (`processMenuImagesJob.ts:183-194`):**

```typescript
// CURRENT CODE - Line 183-194:
// Step 6: Save files to project
await saveFilesToProject(job.projectId, redistributedData, job.files, ...);

// INSERT BEFORE THIS:
const hasExistingMenu = existingProject?.files?.some(f => f.extractedData);
const isLinkedToMaster = !!existingProject?.masterProjectId;
const requiresReview = hasExistingMenu || isLinkedToMaster;

if (requiresReview) {
    // Write raw extracted data to job doc, set status = "preview_ready", RETURN
    // Client will handle comparison and preview locally
}
// else: continue with saveFilesToProject() as normal
```

### Phase 3: Client Review Screen (P0 - Required)

| #   | Task                                             | File                                                                                  | Line    | Status  |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------- | ------- | ------- |
| 3.1 | Add `isPreviewReady` derived state               | `src/hooks/useMenuProcessingJob.ts`                                                   | 104-112 | ✅ DONE |
| 3.2 | Handle `isPreviewReady` in job completion effect | `src/components/templates/main-app/projects/index.tsx`                                | 211-280 | ✅ DONE |
| 3.3 | Create `ExtractionReviewScreen` component        | `src/components/templates/main-app/projects/ExtractionReviewScreen.tsx`               | NEW     | ✅ DONE |
| 3.4 | Create `ExtractionJobReviewModal` wrapper        | `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewModal.tsx`  | NEW     | ✅ DONE |
| 3.5 | Create `ExtractionJobSuccessModal` component     | `src/components/templates/main-app/projects/jobScreens/ExtractionJobSuccessModal.tsx` | NEW     | ✅ DONE |
| 3.6 | Create `ExtractionJobFailureModal` component     | `src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal.tsx` | NEW     | ✅ DONE |
| 3.7 | Call `runComparisonEngine()` on client           | `index.tsx` (jobIsPreviewReady effect)                                                | 227-259 | ✅ DONE |
| 3.8 | Display preview sections (New/Updated/Overrides) | `ExtractionReviewScreen`                                                              | NEW     | ⬜ TODO |
| 3.9 | Implement item toggle (approve/reject per item)  | `ExtractionReviewScreen`                                                              | NEW     | ⬜ TODO |

#### Modal Components Architecture (Implemented)

The extraction flow uses three separate modal components for clean separation of concerns:

```
src/components/templates/main-app/projects/jobScreens/
├── index.ts                        # Barrel exports
├── ExtractionJobReviewModal.tsx    # Wrapper modal for review screen (re-extraction)
├── ExtractionJobReviewScreen.tsx   # Core review UI with preview sections
├── ExtractionJobSuccessModal.tsx   # Success feedback (both first & re-extraction)
└── ExtractionJobFailureModal.tsx   # Failure feedback with retry option
```

**ExtractionJobReviewModal** (`ExtractionJobReviewModal.tsx`)

- Wraps `ExtractionReviewScreen` in a modal dialog
- Props: `open`, `projectId`, `jobId`, `comparisonResult`, `primaryLang`, `onSaveComplete`, `onDiscard`
- Shown when: `jobIsPreviewReady && comparisonResult`

**ExtractionJobSuccessModal** (`ExtractionJobSuccessModal.tsx`)

- Shows success message after extraction completes (both flows)
- Props: `open`, `onClose`
- Message: "All menu files have been processed. The extracted data has been merged with your existing catalog."
- Action: "View in Editor" → navigates to editor view

**ExtractionJobFailureModal** (`ExtractionJobFailureModal.tsx`)

- Shows failure message with intuitive error
- Props: `open`, `message`, `onClose`
- Action: "Try Again" → closes modal, allows retry

**Key Client Modification (`index.tsx:196-222`):**

```typescript
// CURRENT CODE - Line 199-206:
if (jobIsCompleted) {
  mutateProject();
  setActiveProcessingJobId(null);
  setCurrentView(2); // Go to editor view
}

// ADD NEW CONDITION BEFORE jobIsCompleted:
if (isPreviewReady) {
  console.log("[JobQueue] Preview ready, showing review screen");
  setFileProcessingId(null);
  setCurrentView(3); // NEW view for review screen
}
```

### Phase 4: Client Save Handler (P0 - Required)

| #   | Task                                           | File                               | Line     | Status      |
| --- | ---------------------------------------------- | ---------------------------------- | -------- | ----------- |
| 4.1 | Create `saveExtractionReview()` function       | `src/lib/extraction/saveReview.ts` | NEW FILE | ⬜ TODO     |
| 4.2 | ~~Validate menuVersion before save~~           | ~~DEFERRED~~                       | ~~N/A~~  | ⏭️ DEFERRED |
| 4.3 | Implement `applyToProject()` for SINGLE/MASTER | `src/lib/extraction/saveReview.ts` | NEW      | ⬜ TODO     |
| 4.4 | Implement `applyToOutletProject()` for OUTLET  | `src/lib/extraction/saveReview.ts` | NEW      | ⬜ TODO     |
| 4.5 | ~~Update menuVersion after save~~              | ~~DEFERRED~~                       | ~~N/A~~  | ⏭️ DEFERRED |
| 4.6 | Mark job as completed                          | `src/lib/extraction/saveReview.ts` | NEW      | ⬜ TODO     |
| 4.7 | Log MOL event for extraction applied           | `src/lib/extraction/saveReview.ts` | NEW      | ⬜ TODO     |

### Phase 5: Zod Validation (P1 - Required for Multi-Outlet)

| #   | Task                                     | File                                | Line    | Status  |
| --- | ---------------------------------------- | ----------------------------------- | ------- | ------- |
| 5.1 | Create Zod schemas file                  | `src/lib/multiOutlet/validation.ts` | NEW     | ⬜ TODO |
| 5.2 | Add validation to `applyItemOverride`    | `src/database/multiOutlet/index.ts` | 305-365 | ⬜ TODO |
| 5.3 | Add validation to `linkStoreToMaster`    | `src/database/multiOutlet/index.ts` | 224-300 | ⬜ TODO |
| 5.4 | Add validation to `saveExtractionReview` | `src/lib/extraction/saveReview.ts`  | NEW     | ⬜ TODO |

### Phase 6: Safety & Edge Cases (P1 - Important)

| #   | Task                                   | File                                          | Line     | Status  |
| --- | -------------------------------------- | --------------------------------------------- | -------- | ------- |
| 5.1 | Block re-extraction on master projects | `functions/src/logic/processMenuImagesJob.ts` | 88-112   | ⬜ TODO |
| 5.2 | Detect first-time vs re-upload         | `functions/src/logic/processMenuImagesJob.ts` | 151-157  | ⬜ TODO |
| 5.3 | Add TTL check for `awaiting_review`    | `functions/src/scheduled/menuJobCleanup.ts`   | EXISTING | ⬜ TODO |

**First-time detection (`processMenuImagesJob.ts:151-157`):**

```typescript
// EXISTING CODE that fetches project:
const existingProject = await getProject(job.projectId);

// ADD THIS DETECTION:
const hasExistingMenu = existingProject?.files?.some((f) => f.extractedData);
const isFirstExtraction = !hasExistingMenu;
// If isFirstExtraction → auto-apply (no review)
// If !isFirstExtraction → requiresReview = true
```

### Phase 6: Testing & Documentation (P1 - Important)

| #   | Task                                     | File                                     | Status  |
| --- | ---------------------------------------- | ---------------------------------------- | ------- |
| 6.1 | Create unit tests for matching engine    | `functions/src/logic/__tests__/`         | ⬜ TODO |
| 6.2 | Test all 40 scenarios from test-cases.md | Manual testing                           | ⬜ TODO |
| 6.3 | Update validation doc                    | `multi-outlet-consistency_validation.md` | ⬜ TODO |

---

## Part 12: Decision Log

### Decisions Made (ChatGPT + Cascade Conversation)

| #   | Decision                                          | Rationale                                                                      | Source                     |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------- |
| D1  | First extraction = auto-apply, re-upload = review | "First time keep it fast. Re-upload is where ID stability matters"             | ChatGPT                    |
| D2  | Outlet override NEVER auto-removed                | "Destroys local autonomy and causes silent pricing damage"                     | ChatGPT                    |
| D3  | ~~90% similarity threshold~~ **95% threshold**    | More conservative for day one with 3+ year freeze                              | Cascade Jan 2026           |
| D4  | 24-hour TTL for unapproved jobs                   | Prevent stale preview data accumulation                                        | ChatGPT                    |
| D5  | Block re-extract on master projects               | Simplest solution to ID stability problem                                      | ChatGPT + Cascade          |
| D6  | Zod validation only on write gates                | "Not everywhere. Only the write gates"                                         | ChatGPT                    |
| D7  | ~~Server generates preview, client approves~~     | ~~DEPRECATED - replaced by D8~~                                                | ~~ChatGPT~~                |
| D8  | **Client-side comparison**                        | Merge happens on client, not server. Simpler architecture.                     | Cascade Jan 2026           |
| D9  | **ADD/UPDATE only, never delete**                 | Missing items ≠ delete. Reset is the only delete mechanism.                    | ChatGPT Jan 2026           |
| D10 | **Preview ALWAYS for re-extraction (ALL modes)**  | Even single-store SMB. Safety > Speed for re-uploads.                          | ChatGPT Jan 2026           |
| D11 | ~~menuVersion for optimistic locking~~            | **DEFERRED** - skip for now, add later if needed                               | Cascade Jan 2026           |
| D12 | **Category constraint for item matching**         | "Fries" in Starters ≠ "Fries" in Combos                                        | ChatGPT Jan 2026           |
| D13 | **Weak match threshold = 0.98**                   | Show warning for matches between 0.95-0.98                                     | Cascade Jan 2026           |
| D14 | **Exact match first, then similarity**            | Primary = exact match, fallback = 95% similarity                               | Cascade Jan 2026           |
| D15 | **Items merge into file where category exists**   | Items go to old file with matching category; new file only has new categories  | Cascade Jan 2026 (REVISED) |
| D16 | **First extraction detection via project data**   | `!existingProject?.files?.some(f => f.extractedData?.data?.items?.length > 0)` | Cascade Jan 2026           |
| D17 | **Two-pool matching for OUTLET_LINKED**           | Compare against master items AND local-only items                              | Cascade Jan 2026           |
| D18 | **Category matching: name only**                  | Match categories by name (exact, then 95% similarity)                          | Cascade Jan 2026           |
| D19 | **Item matching: name + category constraint**     | Match items by name within same category only                                  | Cascade Jan 2026           |

### Open Questions (RESOLVED)

| #   | Question                                                       | Resolution                            | Status      |
| --- | -------------------------------------------------------------- | ------------------------------------- | ----------- |
| Q1  | Should ambiguous items block entire approval or allow partial? | Allow partial (per-item toggle in UI) | ✅ RESOLVED |
| Q2  | What similarity algorithm for matching?                        | Levenshtein (exact first, then 95%)   | ✅ RESOLVED |
| Q3  | Should we create linked outlet index (T35)?                    | Defer - query when needed             | ⬜ DEFERRED |

---

## Appendix A: ChatGPT Conversation Transcript Summary

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
- New status: `preview_ready` (no `awaiting_review` needed - client handles from there)
- Job doc stores **raw extracted data** (not preview - preview is computed client-side)
- User approval triggers client to write directly to Firestore

### Thread 8: First Time vs Re-Upload Rule

- User asked: "So for the very first time we don't do this"
- ChatGPT: "Correct. For the very first extraction → DO NOT break the flow"
- New project → auto apply
- Existing project → preview + review + save

---

## Appendix B: File References

| File                                                   | Purpose                 | Status                          |
| ------------------------------------------------------ | ----------------------- | ------------------------------- |
| `functions/src/logic/processMenuImagesJob.ts`          | Cloud Function trigger  | ✅ Modified (isFirstExtraction) |
| `functions/src/logic/processMenuImages.ts`             | AI extraction logic     | No changes needed               |
| `functions/src/logic/saveFilesToProject.ts`            | Save to Firestore       | Needs modification              |
| `src/hooks/useMenuProcessingJob.ts`                    | Job status listener     | ✅ Modified (isPreviewReady)    |
| `src/lib/multiOutlet/resolveProject.ts`                | Read-time resolver      | No changes needed               |
| `src/database/multiOutlet/index.ts`                    | Multi-outlet DAL        | Needs Zod validation            |
| `src/components/templates/main-app/projects/index.tsx` | Upload UI               | ✅ Modified (modal integration) |
| `src/lib/extraction/comparisonEngine.ts`               | Client-side comparison  | ✅ Implemented                  |
| `src/lib/extraction/comparisonEngine.types.ts`         | Comparison engine types | ✅ Implemented                  |
| `src/lib/extraction/applyChanges.ts`                   | Write approved changes  | ✅ Implemented                  |

### Extraction Modal Components (NEW)

| File                                                                                     | Purpose                  | Status         |
| ---------------------------------------------------------------------------------------- | ------------------------ | -------------- |
| `src/components/templates/main-app/projects/jobScreens/index.ts`                         | Barrel exports           | ✅ Implemented |
| `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx`    | Review UI with preview   | ✅ Implemented |
| `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewModal.tsx`     | Modal wrapper for review | ✅ Implemented |
| `src/components/templates/main-app/projects/jobScreens/ExtractionJobSuccessModal.tsx`    | Success feedback modal   | ✅ Implemented |
| `src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal.tsx`    | Failure feedback modal   | ✅ Implemented |
| `src/components/templates/main-app/projects/jobScreens/ExtractionJobBlockingOverlay.tsx` | Hard-block overlay       | ✅ Implemented |

### Hooks

| File                                | Purpose                         | Status         |
| ----------------------------------- | ------------------------------- | -------------- |
| `src/hooks/useMenuProcessingJob.ts` | Local job real-time listener    | ✅ Existing    |
| `src/hooks/useMasterJobStatus.ts`   | Bounded server-validated master job polling for outlets | ✅ Implemented |

---

## Appendix C: Dry Run Simulation (All Scenarios)

### Scenario 1: SINGLE_STORE - First Extraction

```
User Action: Upload menu images to a new single-store project (no masterProjectId)
Expected Flow:
1. createMenuProcessingJob() → creates job with jobMode='SINGLE_STORE'
2. ExtractionJobBlockingOverlay shows with progress
3. Backend processMenuImagesJobLogic() runs:
   - isFirstExtraction=true (no existing items)
   - Auto-saves data to project
   - Sets status='completed'
4. Client detects jobIsCompleted → refetches project
5. ExtractionJobSuccessModal shows
6. User clicks "View Menu" → navigates to editor

Result: ✅ Menu saved directly, no review needed
```

### Scenario 2: SINGLE_STORE - Re-Extraction

```
User Action: Upload new images to existing single-store project
Expected Flow:
1. createMenuProcessingJob() → creates job with jobMode='SINGLE_STORE'
2. ExtractionJobBlockingOverlay shows with progress
3. Backend processMenuImagesJobLogic() runs:
   - isFirstExtraction=false (has existing items)
   - Sets status='preview_ready', saves raw data to job
4. Client detects jobIsPreviewReady:
   - Runs comparison engine with mode='SINGLE_STORE'
   - Opens ExtractionJobReviewModal
5. User reviews changes, toggles items, clicks Save
6. applyExtractionChanges() writes to Firestore (single atomic write)
7. ExtractionJobSuccessModal shows

Result: ✅ Review screen shown, user approves changes
```

### Scenario 3: MASTER_PROJECT - First Extraction

```
User Action: Upload to master project (no masterProjectId, is itself a master)
Expected Flow:
1. Same as SINGLE_STORE first extraction
2. Master project has no special handling for first extraction
3. Data saved directly

Result: ✅ Same as single-store
```

### Scenario 4: MASTER_PROJECT - Re-Extraction

```
User Action: Upload new images to master project with linked outlets
Expected Flow:
1. createMenuProcessingJob() → jobMode='MASTER_PROJECT'
2. Backend sets status='preview_ready' (always review for re-extraction)
3. Client runs comparison with mode='SINGLE_STORE' (master treats as single)
4. User reviews and approves
5. Changes saved to master project
6. Linked outlets inherit new items automatically (read-time resolution)

Additional: Outlets with useMasterJobStatus see isMasterJobActive=true
→ ExtractionJobBlockingOverlay shows "Master Menu Update in Progress"
→ Automatically unblocks when master job completes

Result: ✅ Master updates, outlets blocked during, auto-unblock after
```

### Scenario 5: OUTLET_LINKED - First Extraction

```
User Action: Upload to outlet project (has masterProjectId)
Expected Flow:
1. createMenuProcessingJob() → jobMode='OUTLET_LINKED'
2. Backend processMenuImagesJobLogic():
   - Detects outlet has masterProjectId
   - isFirstExtraction forced to false (always review for safety)
   - Sets status='preview_ready'
3. Client runs comparison with mode='OUTLET_LINKED':
   - Matches against master items + local items
   - Generates override suggestions for price differences
4. ExtractionJobReviewModal shows with:
   - Local-only items (new to this outlet)
   - Override suggestions (price differs from master)
5. User approves → writes local items + overrides

Result: ✅ Review always shown, handles master/local complexity
```

### Scenario 6: OUTLET_LINKED - Master Job Running

```
User Action: Outlet user tries to access project while master is extracting
Expected Flow:
1. `useMasterJobStatus(masterProjectId)` asks `/api/projects/master-job-status` for active master job state
2. isMasterJobActive=true
3. ExtractionJobBlockingOverlay shows:
   - "Master Menu Update in Progress"
   - No cancel button (not their job)
4. Master job completes → next bounded poll updates state → overlay hides automatically
5. Outlet can now use project normally

Result: ✅ Outlet blocked, auto-unblocks after the next poll, no manual refresh needed
```

---

**Document Version:** 3.7  
**Last Updated:** January 25, 2026  
**Major Changes in v3.7:**

- **Hard-Block UI**: Added `ExtractionJobBlockingOverlay` component
  - Full-screen overlay when local job is processing or master job is active
  - Shows progress for local jobs, blocking message for master jobs
  - Cancel button available for local jobs
- **Dynamic Comparison Mode**: Fixed hardcoded `SINGLE_STORE` mode
  - Now dynamically determines mode based on `masterProjectId`
  - Outlet projects use `OUTLET_LINKED` mode automatically
- **UI Integration Complete**: All components connected to workflow
  - `useMasterJobStatus` hook integrated into projects page
  - Blocking overlay renders when job is active
  - Review modal opens when preview is ready

**Major Changes in v3.6:**

- **REMOVED extractionLock System**: After analysis, replaced with bounded job-status polling
  - Server route validates the outlet user's access before reading master job status
  - UI is blocked when job is running anyway
  - Saves Firebase doc size and extra reads
- **Master Job Listening**: Added `useMasterJobStatus` hook for outlet projects
  - Polls the authenticated master job status route for active jobs
  - Automatically blocks outlet UI when master job is running
  - No extra Firestore fields needed on project documents
  - Unblocks automatically after the next poll when master job completes
- **Linked Outlet First Extraction**: Still requires review (safety for master/local/override complexity)
- **Similarity Threshold**: Lowered from 0.95 to **0.90** with warning band at 0.90-0.95 (low confidence)
- **Category Constraint**: Changed from hard gate to **tie-breaker** (+0.05 bonus for same-category matches)
- **Override Validation**: Added validation to prevent orphan overrides (empty masterItemId check)
- New files:
  - `src/hooks/useMasterJobStatus.ts` - Master job monitoring for outlet projects
  - `src/components/.../jobScreens/ExtractionJobBlockingOverlay.tsx` - Hard-block UI

**Major Changes in v3.4:**

- Extracted modal components to `jobScreens/` subfolder for better maintainability
- Renamed components with `Job` keyword for clarity (e.g., `ExtractionJobReviewModal`)
- Added `ExtractionJobReviewModal.tsx` - wrapper modal for review screen
- Added `ExtractionJobSuccessModal.tsx` - success feedback for both extraction flows
- Added `ExtractionJobFailureModal.tsx` - failure feedback with retry option
- Fixed TypeScript: Use `result.combinedData.items/categories` (not `result.extractedItems`)
- Updated Phase 3 implementation checklist with completed tasks
- Added Modal Components Architecture section
- Updated Appendix B file references with new components

**Major Changes in v3.3:**

- Removed `awaiting_review` status - only `preview_ready` needed (client handles from there)
- Fixed all remaining `awaiting_review` references throughout document
- Updated Part 10.2 to show "Apply Extraction Preview" is CLIENT-SIDE (no backend endpoint)
- Fixed code comments in Phase 2 to use `preview_ready` instead of `awaiting_review`

**Major Changes in v3.2:**

- **FIXED Part 2.3**: Separated job document fields (server) from client-side preview types
- Job doc uses existing `result.combinedData`, NOT `preview`/`PreviewSummary`/`PreviewDiff`
- Added new section 2.4 for client-side preview types
- Removed `applyExtractionPreview` API route (client writes directly)
- Fixed Thread 7 summary to reflect client-side comparison

**Major Changes in v3.1:**

- **REVISED D15**: Items now merge INTO old file where category exists (not stay in new file)
- Reason: Advanced View accordion UI requires category + items in same file
- Added detailed D15 explanation in Part 4.3
- Reference: `MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md` Section 8.12-8.13

**Major Changes in v3.0:**

- **FINALIZED** client-side comparison architecture (confirmed by user)
- Updated matching threshold from 90% to **95%** (more conservative)
- Added **exact match first, then similarity** as matching priority
- **DEFERRED** menuVersion optimistic locking (skip for now)
- Added decisions D14-D19 to Decision Log (Cascade decisions)
- Added reference to new `ai-extraction-workflow-explained.md` document
- Updated all threshold references throughout document
- Marked menuVersion-related tasks as DEFERRED in implementation checklist

**Major Changes in v2.0:**

- Added client-side comparison architecture (Part 4C)
- Added full Comparison Engine specification (Part 4D)
- Added ADD/UPDATE only rule (Part 4A)
- Updated Preview Screen rules for ALL modes (Part 5.1)
- Updated Implementation Checklist for client-side architecture
- Added new decisions D8-D13 to Decision Log

**Status:** ✅ READY FOR IMPLEMENTATION
