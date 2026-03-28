# AI Extraction + Multi-Outlet: Complete Workflow Explanation

**Document Type:** Detailed Technical Explanation  
**Purpose:** Understand the complete extraction workflow before implementation  
**Date:** January 24, 2026  
**Version:** 1.1

> ⚠️ **IMPORTANT CONTEXT:** This document describes PROPOSED changes to add a "preview" path for re-extractions. First extraction continues to use the existing server-side flow documented in `MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md`. See that document for the current implementation details.

---

## Table of Contents

1. [Overview & Architecture](#1-overview--architecture)
2. [The 5-Step Flow](#2-the-5-step-flow)
3. [Data Structures](#3-data-structures)
4. [Comparison Engine Deep Dive](#4-comparison-engine-deep-dive)
5. [Mode-Specific Behavior](#5-mode-specific-behavior)
6. [Matching Algorithm](#6-matching-algorithm)
7. [Final Decisions Reference](#7-final-decisions-reference)

---

## 1. Overview & Architecture

### 1.1 The Problem We're Solving

When a user uploads a menu image for AI extraction, we need to handle three scenarios:

| Scenario                                    | Challenge                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| **First extraction**                        | No existing data - just save directly                                       |
| **Re-extraction (single store)**            | Must match to existing items to preserve IDs                                |
| **Re-extraction (outlet linked to master)** | Must distinguish: master items (override only) vs local items (full update) |

### 1.2 Architecture Decision: Client-Side Comparison

After analysis, we chose **client-side comparison** over server-side for these reasons:

| Factor            | Server-Side                     | Client-Side ✅                          |
| ----------------- | ------------------------------- | --------------------------------------- |
| Data availability | Needs extra Firestore reads     | Already has project data in React state |
| Iteration speed   | Redeploy Cloud Functions        | Frontend-only changes                   |
| Timeout risk      | Cloud Functions have 540s limit | No timeout constraints                  |
| Complexity        | More complex function           | Simple function, complex client         |
| User experience   | Wait for server comparison      | Instant local comparison                |

### 1.3 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ Upload UI   │───►│ Job Listener│───►│ Comparison  │              │
│  │             │    │             │    │ Engine      │              │
│  └─────────────┘    └─────────────┘    └──────┬──────┘              │
│                                               │                      │
│                                               ▼                      │
│                     ┌─────────────┐    ┌─────────────┐              │
│                     │ Review      │◄───│ Build       │              │
│                     │ Screen      │    │ Preview     │              │
│                     └──────┬──────┘    └─────────────┘              │
│                            │                                         │
│                            ▼                                         │
│                     ┌─────────────┐                                  │
│                     │ Save to     │                                  │
│                     │ Firestore   │                                  │
│                     └─────────────┘                                  │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            │ Creates job doc
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FIREBASE                                      │
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐              │
│  │ Job Doc     │───►│ Cloud       │───►│ AI          │              │
│  │ (pending)   │    │ Function    │    │ Extraction  │              │
│  └─────────────┘    └─────────────┘    └──────┬──────┘              │
│                                               │                      │
│                                               ▼                      │
│                     ┌─────────────────────────────────┐              │
│                     │ First extraction?               │              │
│                     │ YES → Save directly, completed  │              │
│                     │ NO  → Write raw data,           │              │
│                     │       status = preview_ready    │              │
│                     └─────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 5-Step Flow

### Step 1: UPLOADING

**What happens:**

- User selects menu image(s) in the project UI
- Client creates a job document in `menuImageProcessingJobs/{jobId}`
- Job has `status: "pending"`

**Files involved:**

- `src/components/templates/main-app/projects/index.tsx` - Upload UI
- `src/lib/firebase/menuProcessing.ts` - `createMenuProcessingJob()`

**Job document created:**

```typescript
{
  projectId: "14-abc123-15",
  sId: "15",
  tId: "14",
  uId: "user123",
  files: [{ uid, name, size, type, url }],
  targetLanguages: [{ code: "en", name: "English" }],
  status: "pending",
  createdAt: Timestamp.now()
}
```

---

### Step 2: EXTRACTION (Server)

**What happens:**

- Cloud Function triggers on job creation
- Uploads images to Gemini AI
- AI extracts categories and items with `sourceFileIndex`
- Function checks if this is first extraction or re-extraction

**Files involved:**

- `functions/src/logic/processMenuImagesJob.ts` - Main job processor
- `functions/src/logic/processMenuImages.ts` - AI extraction logic
- `functions/src/logic/parallelProcessingPrompt.ts` - AI prompt

**Key logic:**

```typescript
// Fetch existing project
const existingProject = await getProject(job.projectId);

// Detect first extraction
const isFirstExtraction = !existingProject?.files?.some(
  f => f.extractedData?.data?.items?.length > 0
);

if (isFirstExtraction) {
  // Save directly to project (existing behavior)
  await saveFilesToProject(...);
  await jobRef.update({ status: "completed", isFirstExtraction: true });
} else {
  // Write raw data to job, let client handle comparison
  await jobRef.update({
    status: "preview_ready",
    isFirstExtraction: false,
    result: { combinedData, qualityScore, ... }
  });
}
```

**AI output structure:**

```typescript
{
  data: {
    languages: [{ code: "en", name: "English", isPrimary: true }],
    categories: [
      { id: 1, sourceFileIndex: 0, name: { en: "Starters" } }
    ],
    items: [
      {
        id: 1,
        sourceFileIndex: 0,
        name: { en: "Spring Rolls" },
        category: 1,
        price: "5.99"
      }
    ]
  }
}
```

---

### Step 3: COMPARISON ENGINE (Client)

**When triggered:**

- Client's `useMenuProcessingJob` hook detects `status: "preview_ready"`
- Client already has `existingProject` in React state
- For linked outlets, client already has `masterProject` from resolver

**What happens:**

1. Fetch `result.combinedData` from job document (contains `sourceFileIndex`)
2. Determine mode: `SINGLE_STORE` | `MASTER_PROJECT` | `OUTLET_LINKED`
3. Redistribute data by `sourceFileIndex` (ported from server's `redistributeUtils.ts`)
4. Run comparison engine locally
5. Build `ReviewPayload` for display

**Files involved (NEW):**

- `src/lib/extraction/comparisonEngine.ts` - Core comparison logic
- `src/lib/extraction/comparisonEngine.types.ts` - Type definitions
- `src/lib/extraction/similarity.ts` - Name matching utility
- `src/lib/extraction/normalize.ts` - Name normalization
- `src/lib/extraction/redistribute.ts` - Port of server's `redistributeUtils.ts` for client use

**Comparison engine input:**

```typescript
{
  mode: "OUTLET_LINKED",

  extracted: {
    categories: [...],  // From AI
    items: [...]        // From AI
  },

  storeProject: {
    categories: [...],  // Current outlet categories
    items: [...],       // Current outlet items (local-only)
    overrides: {...}    // Current overrides
  },

  masterProject: {      // Only for OUTLET_LINKED
    categories: [...],
    items: [...]
  }
}
```

**Comparison engine output (ReviewPayload):**

```typescript
{
  mode: "OUTLET_LINKED",

  // Categories
  newCategories: [{ category, sourceFileIndex, isLocalOnly: true }],
  updatedCategories: [{ categoryId, category, changes: ["name"] }],

  // Items - all modes
  newItems: [{ item, sourceFileIndex, targetCategoryId, isLocalOnly }],
  updatedItems: [{ itemId, item, changes: ["price", "description"] }],

  // Overrides - OUTLET_LINKED only
  overridesToApply: [{
    masterItemId: "abc123",
    masterItemName: "Chicken Biryani",
    masterPrice: "12.99",
    newPrice: "14.99",
    overrideType: "price"
  }],

  // Metadata
  summary: {
    newCategoriesCount: 1,
    updatedCategoriesCount: 0,
    newItemsCount: 3,
    updatedItemsCount: 2,
    overridesCount: 4,
    unchangedCount: 15,
    totalExtractedCount: 24
  },

  warnings: [
    { type: "weak_match", message: "...", confidence: 0.96 }  // 0.95-0.98 range = weak match warning
  ]
}
```

---

### Step 4: REVIEW SCREEN (Client)

**What happens:**

- Display the computed preview to user
- Show sections: New Items, Updated Items, Overrides, Warnings
- Allow user to toggle individual items (approve/reject)
- User clicks "Save Changes"

**UI sections:**

| Section           | Description                           | Example                     |
| ----------------- | ------------------------------------- | --------------------------- |
| **New Items**     | Items not matching any existing       | "3 new items will be added" |
| **Updated Items** | Items matching existing, with changes | "2 items will be updated"   |
| **Overrides**     | OUTLET_LINKED only - price overrides  | "4 price overrides"         |
| **Warnings**      | Weak matches, validation issues       | "1 item needs review"       |
| **Unchanged**     | Items with no changes                 | "15 items unchanged"        |

**Files involved (NEW):**

- `src/components/templates/main-app/projects/ExtractionReviewScreen.tsx`
- `src/components/templates/main-app/projects/ExtractionReviewScreen.styles.scss`

---

### Step 5: MERGING (Client via DAL)

**What happens:**

1. User clicks "Save Changes"
2. Client validates current project hasn't changed (if using menuVersion)
3. Client applies approved changes to Firestore
4. Client marks job as `completed`

**Mode-specific writes:**

| Mode             | What gets written                                                   |
| ---------------- | ------------------------------------------------------------------- |
| `SINGLE_STORE`   | Update `project.files[].extractedData` with merged items/categories |
| `MASTER_PROJECT` | Same as SINGLE_STORE (items become SSOT for outlets)                |
| `OUTLET_LINKED`  | Write to `project.overrides` + add local-only items/categories      |

**Files involved (NEW):**

- `src/lib/extraction/mergeExtractedData.ts` - Apply changes to project
- `src/database/extraction/index.ts` - DAL for extraction writes

**For OUTLET_LINKED, the writes are:**

```typescript
// 1. Add local-only items (L_I_ prefix)
await updateDoc(projectRef, {
  "files.0.extractedData.data.items": arrayUnion(...localOnlyItems),
});

// 2. Add local-only categories (L_C_ prefix)
await updateDoc(projectRef, {
  "files.0.extractedData.data.categories": arrayUnion(...localOnlyCategories),
});

// 3. Apply price overrides
for (const override of overridesToApply) {
  await updateDoc(projectRef, {
    [`overrides.items.${override.masterItemId}.price`]: override.newPrice,
  });
}
```

---

## 3. Data Structures

### 3.1 Actual Project Structure (From Codebase)

```typescript
// projects/{tId}/{sId}/{projectId}
interface Project {
  id: string;
  name: string;

  // Multi-outlet
  masterProjectId?: string; // If linked to master
  // NOTE: isMaster is NOT stored on project level.
  // Master store is identified via storesSummary.stores[sId].isMaster
  // All projects in master store are considered master projects.

  // Files array - each upload creates a new file entry
  files: ProjectFileType[];

  // Overrides - for outlets linked to master
  overrides?: ProjectOverrides;

  // Languages
  languages: string[];
}

interface ProjectFileType {
  uid: string;
  name: string;
  url: string;
  extractedData?: ExtractedData;
}

interface ExtractedData {
  data: {
    languages: Language[];
    categories: ExtractedDataCategory[];
    items: ExtractedDataItem[];
  };
  qualityScore?: number;
}

interface ExtractedDataItem {
  id: string; // e.g., "file123i1" or "L_I_abc123"
  name: Record<string, string>; // { en: "Spring Rolls" }
  category: string; // categoryId
  price?: string;
  description?: Record<string, string>;
  active?: boolean;
  available?: boolean;
  attributes?: ExtractedDataAttribute[];
}

interface ProjectOverrides {
  items: Record<string, ItemOverride>;
  categories: Record<string, CategoryOverride>;
  attributeOverrides: Record<string, AttributeOverride>;
}
```

### 3.2 Key Insight: Files Array Structure

**Important:** Items are nested inside `files[].extractedData.data.items[]`

Each upload creates a NEW file entry. The file structure directly maps to Advanced View UI panels.

**D15 Decision (REVISED):** When re-extraction finds items matching existing category:

| Item Type                       | Storage Location                              | Reason                                                      |
| ------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Item matches existing category  | **Merge INTO old file** where category exists | Advanced View accordion needs category + items in same file |
| Item has new category           | **Stay in new file**                          | New categories belong with their source image               |
| New file with no new categories | Contains only image URL                       | Minimal file entry, no orphaned items                       |

**Why this matters for Advanced View:**

- Each panel shows: Image (left) → Categories accordion with items (right)
- Categories come from `file.extractedData.data.categories[]`
- Items filtered by `item.category === category.id`
- If items reference categories from OTHER files, they have no accordion to display in!

---

## 4. Comparison Engine Deep Dive

### 4.1 Algorithm Overview

```
FOR each extracted category:
  1. Normalize name (lowercase, trim, remove punctuation)
  2. Try exact match against existing categories
  3. If no exact match, try similarity match (≥95%)
  4. If match found → mark as UPDATE
  5. If no match → mark as NEW

FOR each extracted item:
  1. Normalize name
  2. Find which category it belongs to (from step above)
  3. Within that category, try exact match against existing items
  4. If no exact match, try similarity match (≥95%)
  5. If match found:
     - For SINGLE_STORE/MASTER: mark as UPDATE
     - For OUTLET_LINKED: check if master item → mark as OVERRIDE
  6. If no match → mark as NEW (local-only for OUTLET_LINKED)
```

### 4.2 Two-Pool Matching for OUTLET_LINKED

For outlets linked to master, we compare against TWO pools:

**Pool 1: Master Project Items**

- If extracted item matches master item → it's an OVERRIDE
- Only price override allowed from extraction
- Item keeps master's ID

**Pool 2: Outlet's Local-Only Items**

- Items with `L_I_` prefix
- If extracted item matches local-only → it's an UPDATE
- Full update allowed (price, description, name, etc.)

**Pool 3: No Match**

- Create new local-only item with `L_I_` prefix

### 4.3 Matching Priority

```typescript
function matchItem(extractedItem, mode, storeProject, masterProject) {
  // 1. Try exact match first
  const exactMatch = findExactMatch(extractedItem, ...);
  if (exactMatch) return exactMatch;

  // 2. Try similarity match (≥95%)
  const similarityMatch = findSimilarityMatch(extractedItem, ..., 0.95);
  if (similarityMatch) {
    // Add warning if < 98%
    if (similarityMatch.score < 0.98) {
      addWarning("weak_match", similarityMatch);
    }
    return similarityMatch;
  }

  // 3. No match
  return null;
}
```

---

## 5. Mode-Specific Behavior

### 5.1 SINGLE_STORE Mode

**Scenario:** Normal project, no chain linkage.

**Comparison:**

- Compare extracted data against `storeProject` only
- No master project involved

**Allowed changes:**

- ✅ Add new categories
- ✅ Update existing categories (name)
- ✅ Add new items
- ✅ Update existing items (name, price, description, image)
- ❌ Never delete anything

**Write target:** `project.files[].extractedData`

### 5.2 MASTER_PROJECT Mode

**Scenario:** This project IS the chain master (HQ menu).

**Comparison:**

- Same as SINGLE_STORE
- Extra importance: ID stability (outlets reference these IDs)

**Allowed changes:**

- Same as SINGLE_STORE
- ⚠️ Matched items MUST keep existing IDs (critical for outlet overrides)

**Write target:** `project.files[].extractedData`

### 5.3 OUTLET_LINKED Mode

**Scenario:** Outlet project linked to a master.

**Comparison:**

- Compare against MASTER items (for override detection)
- Compare against LOCAL-ONLY items (for local update detection)

**Allowed changes:**

| Extracted item matches... | Action                      |
| ------------------------- | --------------------------- |
| Master item               | Only price OVERRIDE allowed |
| Local-only item (L*I*)    | Full UPDATE allowed         |
| Nothing                   | Create NEW local-only item  |

**What outlets CANNOT do:**

- ❌ Update master item name/description/image
- ❌ Create items in master
- ❌ Delete anything

**Write targets:**

- `project.overrides.items` - For price overrides
- `project.files[].extractedData` - For local-only items

---

## 6. Matching Algorithm

### 6.1 Normalization Function

```typescript
function normalizeName(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .replace(/[^\p{L}\p{N}\s]/gu, "") // Remove punctuation/symbols
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, ""); // Remove emojis
}

// Examples:
// "Chicken Biryani" → "chicken biryani"
// "  French Fries  " → "french fries"
// "Spring Rolls 🥢" → "spring rolls"
```

### 6.2 Similarity Function

```typescript
// Levenshtein distance-based similarity
function similarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);

  if (normA === normB) return 1.0;

  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);

  if (maxLen === 0) return 1.0;
  return 1 - distance / maxLen;
}

// Examples:
// similarity("Chicken Biryani", "Chicken Biriyani") → 0.94  // Would NOT match (< 0.95)
// similarity("Chicken Biryani", "Chicken Biryani ") → 0.97  // Would match (≥ 0.95, weak warning)
// similarity("Sandwich", "Sandwiches") → 0.89               // Would NOT match (< 0.95)
// similarity("Fries", "French Fries") → 0.45                // Would NOT match (< 0.95)
```

### 6.3 Thresholds (FINALIZED)

| Threshold                | Value     | Purpose                       |
| ------------------------ | --------- | ----------------------------- |
| **Exact match**          | 1.0       | Primary matching method       |
| **Similarity threshold** | 0.95      | Match allowed if ≥0.95        |
| **Weak match warning**   | 0.95-0.98 | Show warning in review screen |

**Why 95% instead of 90%?**

- More conservative = fewer false positives
- Day one with 3+ year freeze = prefer safety
- Can be adjusted via constant if needed

### 6.4 Category Constraint for Items

Items MUST match within the SAME category:

```
Extracted: "Fries" in "Starters"
Existing:  "Fries" in "Combos"
Result:    NO MATCH (different categories)
```

This prevents wrong merges when same item name exists in multiple categories.

---

## 7. Review Screen UI Specification

### 7.1 UI Layout

```
┌──────────────────────────────────────────────────────────────────┐
│ ← Back                    Review Changes                    [X]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📊 Summary                                                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 3 new items • 2 updates • 4 price overrides • 15 unchanged  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ─────────────────────────────────────────────────────────────── │
│                                                                   │
│  📦 NEW ITEMS (3)                                      [Collapse] │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [✓] Mango Lassi              ₹120    → Beverages            │ │
│  │ [✓] Gulab Jamun              ₹80     → Desserts             │ │
│  │ [✓] Paneer Tikka             ₹250    → Starters             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ✏️ UPDATED ITEMS (2)                                  [Collapse] │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [✓] Chicken Biryani                                         │ │
│  │     Price: ₹299 → ₹349                                      │ │
│  │ [✓] Butter Naan                                             │ │
│  │     Description: Updated                                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  💰 PRICE OVERRIDES (4) — OUTLET_LINKED only           [Collapse] │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [✓] Veg Biryani                                             │ │
│  │     Master: ₹199 → Your price: ₹249                         │ │
│  │ [✓] Dal Makhani                                             │ │
│  │     Master: ₹179 → Your price: ₹199                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ⚠️ WARNINGS (1)                                       [Collapse] │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [?] "Spring Roll" matched to "Spring Rolls" (96% match)     │ │
│  │     [ ] Keep as separate item    [●] Merge with existing    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ────────────────────────────────────────────────────────────────│
│                                                                   │
│           [ Cancel ]                    [ Save Changes ]          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 7.2 UI Sections Explained

| Section             | When Shown                     | What User Can Do                    |
| ------------------- | ------------------------------ | ----------------------------------- |
| **Summary Bar**     | Always                         | Read-only summary counts            |
| **New Items**       | When `newItems.length > 0`     | Toggle checkbox to include/exclude  |
| **Updated Items**   | When `updatedItems.length > 0` | Toggle checkbox, see before/after   |
| **Price Overrides** | OUTLET_LINKED mode only        | Toggle checkbox, see master vs new  |
| **Warnings**        | When weak matches exist        | Choose: merge vs keep separate      |
| **Unchanged**       | Collapsed by default           | Expand to see items with no changes |

### 7.3 User Interactions

| Action                                  | Result                                    |
| --------------------------------------- | ----------------------------------------- |
| Uncheck a new item                      | Item will NOT be added                    |
| Uncheck an update                       | Item will keep old values                 |
| Uncheck an override                     | Price override will NOT be applied        |
| Choose "Keep separate" on warning       | Creates new local-only item               |
| Choose "Merge with existing" on warning | Uses existing item ID                     |
| Click "Cancel"                          | Discard all changes, stay on current menu |
| Click "Save Changes"                    | Apply all checked changes                 |

---

## 8. After Save: Complete Merge Flow

### 8.1 What Happens When User Clicks "Save Changes"

```
User clicks "Save Changes"
        │
        ▼
┌───────────────────────────────────────┐
│ 1. BUILD FINAL APPLY PLAN             │
│    - Filter out unchecked items       │
│    - Resolve warning choices          │
│    - Generate final item/category IDs │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 2. VALIDATE (optional)                │
│    - Re-fetch project (if paranoid)   │
│    - Check nothing changed            │
│    - If changed → show error, refresh │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 3. WRITE TO FIRESTORE                 │
│    - Mode determines WHAT to write    │
│    - See section 8.2 below            │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 4. MARK JOB COMPLETED                 │
│    - Update job doc: status=completed │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│ 5. REFRESH & NAVIGATE                 │
│    - mutateProject() to refetch       │
│    - Navigate to editor view          │
│    - Show success toast               │
└───────────────────────────────────────┘
```

### 8.2 Mode-Specific Firestore Writes

#### SINGLE_STORE / MASTER_PROJECT Mode

```typescript
// What gets written to: projects/{tId}/{sId}/{projectId}

// For NEW items/categories → add to appropriate file's extractedData
await updateDoc(projectRef, {
  // New categories go to the new file
  [`files.${newFileIndex}.extractedData.data.categories`]: arrayUnion(
    ...newCategories,
  ),

  // New items:
  // - If category exists in old file → merge INTO that file
  // - If category is new → stay in new file
  [`files.${targetFileIndex}.extractedData.data.items`]: arrayUnion(
    ...newItems,
  ),
});

// For UPDATED items → update in place
for (const update of updatedItems) {
  await updateDoc(projectRef, {
    [`files.${fileIndex}.extractedData.data.items`]: arrayRemove(oldItem),
  });
  await updateDoc(projectRef, {
    [`files.${fileIndex}.extractedData.data.items`]: arrayUnion(updatedItem),
  });
}
```

#### OUTLET_LINKED Mode

```typescript
// What gets written to: projects/{tId}/{sId}/{projectId}

// 1. LOCAL-ONLY items (new items not matching master)
await updateDoc(projectRef, {
  [`files.${fileIndex}.extractedData.data.items`]: arrayUnion(
    ...localOnlyItems,
  ),
  [`files.${fileIndex}.extractedData.data.categories`]: arrayUnion(
    ...localOnlyCategories,
  ),
});

// 2. PRICE OVERRIDES (extracted price differs from master)
for (const override of priceOverrides) {
  await updateDoc(projectRef, {
    [`overrides.items.${override.masterItemId}`]: {
      price: override.newPrice,
      // Keep existing override fields if any
    },
  });
}

// NOTE: Outlets NEVER write to master project
// NOTE: Outlets NEVER update master item fields (name, description, etc.)
```

### 8.3 ID Generation for New Items

```typescript
// For SINGLE_STORE / MASTER_PROJECT:
// Use file UID prefix (same as server does)
const newItemId = `${fileUid}i${itemIndex}`; // e.g., "abc123i1"
const newCategoryId = `${fileUid}c${catIndex}`; // e.g., "abc123c1"
const newAttributeId = `${itemId}a${attrIndex}`; // e.g., "abc123i1a1"

// For OUTLET_LINKED local-only items:
// Use L_I_ and L_C_ prefixes
const localItemId = `L_I_${generateUid()}`; // e.g., "L_I_xyz789"
const localCategoryId = `L_C_${generateUid()}`; // e.g., "L_C_xyz789"
```

---

## 9. Client-Side Functions to Create

### 9.1 Why Client-Side Code is Needed

**Server code (Firebase Functions) uses:**

- `firebase-admin` SDK
- `functions.logger` for logging
- Node.js environment

**Client code (Next.js) uses:**

- `firebase/firestore` SDK
- `console.log` for logging
- Browser environment

**Cannot share directly** - different SDKs, different APIs. Must PORT the logic.

### 9.2 Functions to Port from Server

| Server Function               | Server File                                | Client File (NEW)                    | What It Does                                    |
| ----------------------------- | ------------------------------------------ | ------------------------------------ | ----------------------------------------------- |
| `redistributeExtractedData()` | `functions/src/logic/redistributeUtils.ts` | `src/lib/extraction/redistribute.ts` | Split combined AI response by `sourceFileIndex` |
| `transformIdsForFile()`       | `functions/src/logic/redistributeUtils.ts` | `src/lib/extraction/redistribute.ts` | Add file UID prefix to IDs                      |
| Sanitization helpers          | `functions/src/logic/redistributeUtils.ts` | `src/lib/extraction/sanitize.ts`     | Strip HTML, normalize tags                      |

### 9.3 New Client-Only Functions

| Function                   | File                                     | Purpose                                                   |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `runComparisonEngine()`    | `src/lib/extraction/comparisonEngine.ts` | Compare extracted vs existing data                        |
| `normalizeName()`          | `src/lib/extraction/normalize.ts`        | Normalize names for matching                              |
| `similarity()`             | `src/lib/extraction/similarity.ts`       | Levenshtein-based similarity score                        |
| `buildApplyPlan()`         | `src/lib/extraction/comparisonEngine.ts` | Build plan of what to write                               |
| `applyExtractionChanges()` | `src/lib/extraction/applyChanges.ts`     | Write approved changes to Firestore (single atomic write) |
| `isValidPrice()`           | `src/lib/extraction/validation.ts`       | Validate price format                                     |

### 9.4 Porting Guide: redistributeExtractedData

**Server version (simplified):**

```typescript
// functions/src/logic/redistributeUtils.ts
import * as functions from "firebase-functions";

export function redistributeExtractedData(
  combinedResponse: CombinedAIResponse,
  fileMappings: FileMapping[],
): Map<string, ExtractedData> {
  const logger = functions.logger;
  // ... logic using logger.info()
}
```

**Client version (NEW):**

```typescript
// src/lib/extraction/redistribute.ts
// NO firebase-functions import - browser environment

export function redistributeExtractedData(
  combinedResponse: CombinedAIResponse,
  fileMappings: FileMapping[],
): Map<string, ExtractedData> {
  // Same logic, but use console.log instead of functions.logger
  console.log("[redistribute] Processing...", {
    /* data */
  });

  // REST OF LOGIC IS IDENTICAL - pure JavaScript
  // Filter categories by sourceFileIndex
  // Filter items by sourceFileIndex
  // Build per-file extractedData
}
```

### 9.5 Key Insight: Most Logic is Pure JavaScript

The server functions in `redistributeUtils.ts` are ~90% pure JavaScript:

- Array filtering: `categories.filter(c => c.sourceFileIndex === index)`
- Object mapping: `items.map(item => ({ ...item, id: newId }))`
- String manipulation: `stripHtml()`, `normalizeTags()`

**Only difference:**

- Server uses `functions.logger` → Client uses `console.log`
- Server uses `firebase-admin` for writes → Client uses `firebase/firestore`

The comparison engine is 100% new client-side code.

---

## 10. Final Decisions Reference

### From Our 4-Chat Conversation

| Decision                       | Choice                                                                         | Rationale                                                   |
| ------------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| **Comparison location**        | Client-side                                                                    | Data already available, faster iteration, no timeout risk   |
| **Items in existing category** | **Merge INTO old file** where category exists (D15 REVISED)                    | Advanced View accordion needs category + items in same file |
| **First extraction detection** | `!existingProject?.files?.some(f => f.extractedData?.data?.items?.length > 0)` | Use data we already fetch                                   |
| **Matching algorithm**         | Exact match first, then 95% similarity                                         | Conservative for day one, but fuzzy-capable                 |
| **Category matching**          | Name only (exact, then 95%)                                                    | Simple, effective                                           |
| **Item matching**              | Name + category constraint                                                     | Prevents cross-category wrong merges                        |
| **menuVersion for locking**    | Skip for now                                                                   | User decision, can add later if needed                      |
| **Outlet extraction behavior** | Price overrides only from master items                                         | Outlets cannot update master fields                         |
| **Local-only items**           | L*I* and L*C* prefixes                                                         | Already implemented                                         |
| **Delete behavior**            | NEVER delete from extraction                                                   | Only Reset Menu can delete                                  |

### Files to Create

| File                                                                    | Purpose                             |
| ----------------------------------------------------------------------- | ----------------------------------- |
| `src/lib/extraction/comparisonEngine.ts`                                | Core comparison logic               |
| `src/lib/extraction/comparisonEngine.types.ts`                          | Type definitions                    |
| `src/lib/extraction/similarity.ts`                                      | Levenshtein-based matching          |
| `src/lib/extraction/normalize.ts`                                       | Name normalization                  |
| `src/lib/extraction/redistribute.ts`                                    | Port of server redistribution utils |
| `src/lib/extraction/mergeExtractedData.ts`                              | Apply changes to project            |
| `src/components/templates/main-app/projects/ExtractionReviewScreen.tsx` | Review UI                           |

### Files to Modify

| File                                                   | Change                       |
| ------------------------------------------------------ | ---------------------------- |
| `functions/src/types/menuProcessingJob.types.ts`       | Add `preview_ready` status   |
| `functions/src/logic/processMenuImagesJob.ts`          | First vs re-extraction logic |
| `src/hooks/useMenuProcessingJob.ts`                    | Add `isPreviewReady` state   |
| `src/components/templates/main-app/projects/index.tsx` | Handle preview_ready status  |

---

## Summary

The extraction workflow now has 5 clear steps:

1. **UPLOADING** - Client creates job doc
2. **EXTRACTION** - Server runs AI, decides first vs re-extraction
3. **COMPARISON** - Client runs comparison engine locally
4. **REVIEW** - Client shows preview, user approves
5. **MERGING** - Client writes approved changes to Firestore

Key principles:

- First extraction = auto-save (fast onboarding)
- Re-extraction = always preview (safety)
- ADD/UPDATE only, never delete
- Outlet can only override prices, not update master items

> ⚠️ **IMPORTANT CONTEXT:** This document describes PROPOSED changes to add a "preview" path for re-extractions. First extraction continues to use the existing server-side flow documented in `MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md`.

**Document Version:** 1.2  
**Created:** January 24, 2026  
**Last Updated:** January 24, 2026  
**Related:** `ai-extraction-integration.md` (implementation checklist)

**Changes in v1.2:**

- Added Section 7: Review Screen UI Specification with wireframe
- Added Section 8: After Save Complete Merge Flow with Firestore write examples
- Added Section 9: Client-Side Functions to Create (port guide from server)
- Fixed `isMasterProject` field documentation (not stored on project level)

**Changes in v1.1:**

- **REVISED D15**: Items now merge INTO old file where category exists (not stay in new file)
- Reason: Advanced View accordion UI requires category + items in same file
