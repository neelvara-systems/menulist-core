# Write Discipline Audit — Project Document

**Date:** February 7, 2026  
**Trigger:** ChatGPT deep analysis identified write architecture discipline as the primary infra risk  
**Scope:** All write paths to `projects/{tId}/{sId}/{projectId}` Firestore documents  
**Status:** ✅ Audit Complete + Critical Fixes Applied

---

## Table of Contents

1. [All Places Writing to Project Doc](#1-all-places-writing-to-project-doc)
2. [Which Bypass Autosave? (Instant Writes)](#2-which-bypass-autosave-instant-writes)
3. [Average Project Doc Size](#3-average-project-doc-size)
4. [Estimated Writes During 10-Min Editing Session](#4-estimated-writes-during-10-min-editing-session)
5. [Critical Fixes Applied](#5-critical-fixes-applied)
6. [Write Discipline Rule (Codified)](#6-write-discipline-rule-codified)
7. [Cascade's Analysis vs ChatGPT Recommendations](#7-cascades-analysis-vs-chatgpt-recommendations)

---

## 1. All Places Writing to Project Doc

### Total: ~25 distinct write call sites across 4 categories

---

### Category A: DAL Functions (`src/database/projects/index.ts`)

These are the **canonical project write functions** — wrapped in `apiCallComposer` with error handling, logging, and `requestBodyComposer` timestamps.

| # | Function | Write Method | What It Writes | When Called |
|---|----------|-------------|----------------|------------|
| 1 | `addProject()` | `setDoc()` | Full new project doc (files:[], config, active, deleted flags) | Project creation |
| 2 | `updateProject()` | `setDoc(merge:true)` | Partial project data (whatever caller passes) | **Primary write path** — autosave, translations, descriptions, image ops |
| 3 | `publishProject()` | `setDoc(merge:true)` | Project data + converts base64 → Storage URLs | Theme publishing |
| 4 | `setProjectActive()` | `setDoc(merge:true)` | `{ active: bool }` | Toggle project active/inactive |
| 5 | `deleteProject()` | `setDoc(merge:true)` | `{ deleted: true, deletedAt, active: false }` | Soft delete |
| 6 | `restoreProject()` | `setDoc(merge:true)` | `{ deleted: false, deletedAt: null, active: true }` | Restore from recycle bin |
| 7 | `removePresetFromAllCategories()` | `setDoc(merge:true)` per project | Removes time slot preset refs from all categories | Admin deletes a time slot preset |

**Note:** Functions 1–6 also sync to `platformSummary/projects_{sId}` summary document (separate write).

---

### Category B: Editor Call Sites (all go through `updateProject()` DAL)

These are **call sites in UI components** that invoke `updateProject()`. They are NOT separate write mechanisms — they all funnel through the DAL.

| # | Call Site | File | Trigger | Timing |
|---|-----------|------|---------|--------|
| 8 | `Editor.syncChanges()` | `Editor.tsx:335-361` | **Autosave** — 15s debounce + 30s min interval + equality guard | Debounced (only autosave path) |
| 9 | `Editor.handleLanguageToggle()` | `Editor.tsx:461-573` | User adds/removes language (triggers AI translation per file) | Immediate after translation completes |
| 10 | `Editor.onRetryTranslations()` | `Editor.tsx:579-629` | User retries failed translations for a file | Immediate after retry completes |
| 11 | `Editor.onImageUpload()` | `Editor.tsx:645-696` | User uploads image to an item | Immediate after upload |
| 12 | `UploadedImagesList.onImageDelete()` | `uploadedImagesList.tsx:20-77` | User deletes an item image | Immediate after Storage delete |
| 13 | `DescriptionGenerationModal.handleDescriptionRequest()` | `DescriptionGenerationModal.tsx:120-173` | User generates AI descriptions | Immediate after generation |
| 14 | `BatchImageGenerationResultView.uploadImages()` | `BatchImageGenerationResultView.tsx:85-114` | User saves selected batch-generated images | Immediate after selection |
| 15 | `handleProjectEdit()` (via `updateProjectMetadata`) | `projects/index.tsx:353-397` | User edits project name/description | Immediate (summary doc only) |

---

### Category C: Multi-Outlet Admin (`src/database/multiOutlet/index.ts`)

These are **direct `updateDoc` calls** to project documents, bypassing the DAL's `updateProject()`. Justified because they write specific structural fields — not full project data.

| # | Function | Fields Written | When Called |
|---|----------|---------------|------------|
| 16 | `setProjectAsMaster()` | `isMaster: true`, `deleteField(masterProjectId)`, `deleteField(overrides)` | Admin designates a project as chain master |
| 17 | `unsetProjectAsMaster()` | `deleteField(isMaster)` | Admin removes master designation |
| 18 | `linkStoreToMaster()` | `masterProjectId`, `overrides: empty`, `masterSnapshot?` | Admin links outlet to master |
| 19 | `switchStoreMaster()` | `masterProjectId`, `overrides: empty`, `masterSnapshot?` | Admin switches outlet to different master |
| 20 | `unlinkStoreFromMaster()` | `masterProjectId: null`, `masterSnapshot: null` | Admin unlinks outlet from master |
| 21 | `applyItemOverride()` | `overrides.items.{itemId}: { price?, available?, active? }` | User applies item override on outlet |
| 22 | `applyCategoryOverride()` | `overrides.categories.{catId}: { orderIndex?, active? }` | User applies category override on outlet |
| 23 | `removeItemOverride()` | `overrides.items.{itemId}: deleteField()` | User removes item override |
| 24 | `removeCategoryOverride()` | `overrides.categories.{catId}: deleteField()` | User removes category override |
| 25 | `resetAllOverrides()` | `overrides: emptyOverrides()` | User resets all outlet overrides |

---

### Category D: Awareness Hook (`src/hooks/useMasterUpdateAwareness.ts`)

| # | Function | Fields Written | When Called |
|---|----------|---------------|------------|
| 26 | `acknowledge()` | `masterSnapshot: { ... }` | User dismisses master change banner |

**Why direct write:** Not an operational change. Must bypass DAL change detection to avoid infinite loop (DAL reads `oldProject` to detect changes → would trigger awareness → would write → would trigger detection again).

---

### Category E: AI Extraction Apply (`src/lib/extraction/applyChanges.ts`)

| # | Function | Fields Written | When Called |
|---|----------|---------------|------------|
| 27 | `applyExtractionChanges()` | `files[]` (full array) + `overrides.items.*` + `overrides.categories.*` | User clicks "Save" on extraction review screen |

**Write pattern (AFTER fix):** Single atomic `updateDoc` — reads project once, applies ALL mutations in-memory, writes everything in one call.

**Write pattern (BEFORE fix):** 2–8 sequential `updateDoc` calls using `arrayUnion` and dot-notation patches. This was the **worst offender** — risked partially-applied menu states.

---

### Category F: Cloud Functions (`functions/src/logic/saveFilesToProject.ts`)

| # | Function | Write Method | When Called |
|---|----------|-------------|------------|
| 28 | `saveFilesToProject()` | `projectRef.set(merge:true)` | **First extraction only** — server saves directly after AI processing |

**Note:** For re-extractions, server writes raw data to the **job document** (not project), and the client handles comparison + apply (see #27).

---

## 2. Which Bypass Autosave? (Instant Writes)

### Autosave Mechanism (Editor Only)

```
File: src/components/templates/main-app/projects/constants.ts

AUTOSAVE_DEBOUNCE_MS  = 15,000ms (15 seconds after last change)
AUTOSAVE_MIN_INTERVAL_MS = 30,000ms (minimum 30 seconds between saves)
Guard: isSameObjects(activeProject, updatedData) — skips if no real changes
```

**Only ONE write path uses autosave:** `Editor.syncChanges()` (#8)

### Instant Writes (Bypass Autosave)

Everything else is an **instant write** — triggered by user action completion, not debounced.

| Type | Write Paths | Frequency | Risk Level |
|------|-------------|-----------|------------|
| **AI Operations** | #9 Language toggle, #10 Retry translations, #13 Descriptions, #14 Batch images | Rare (user-initiated, 1-3 per session) | ✅ Low — user explicitly triggered, saves immediately after expensive AI work |
| **Image Ops** | #11 Upload image, #12 Delete image | Occasional (1-5 per session) | ✅ Low — single item mutation, goes through DAL |
| **Multi-Outlet Admin** | #16–25 | Very rare (setup/config only) | ✅ Low — structural ops, not editing |
| **Awareness** | #26 Acknowledge | Very rare (only on master change) | ✅ Low — single field write |
| **Extraction Apply** | #27 | Rare (after re-upload) | ✅ Low (now atomic) / ~~🔴 Was HIGH (multi-write)~~ |
| **Cloud Function** | #28 | Once per first extraction | ✅ Low — server-side, single write |
| **Lifecycle** | #4–6 Active/Delete/Restore | Very rare | ✅ Low — minimal field writes |
| **Maintenance** | #7 Remove preset | Extremely rare | ✅ Low — admin only |

### Assessment

> **No instant write is problematic.** All instant writes are either:
> - Rare admin/structural operations (multi-outlet, lifecycle)
> - Explicit user actions that follow expensive AI processing (translations, descriptions)
> - Single-field updates (awareness, active toggle)
>
> The only write that WAS problematic — extraction apply (#27) — has been fixed to single atomic write.

---

## 3. Average Project Doc Size

### Sample Measurement

```
File: projectSampleData_oldway.json
Size: 9,353 bytes (~9.1 KB)
```

This sample represents a **small project** with basic menu data.

### Size Breakdown by Content

| Component | Typical Size | Notes |
|-----------|-------------|-------|
| **Base structure** (config, metadata, flags) | ~1–2 KB | Fixed overhead |
| **Per file** (extractedData with categories + items) | ~3–15 KB | Depends on menu complexity |
| **Per language** (i18n translations) | +30–50% per language | Adds `name_i18n`, `description_i18n` to every item/category |
| **Per item image** (URL references) | ~200 bytes each | Only URLs stored, actual images in Storage |
| **Overrides** (multi-outlet) | ~100–500 bytes | Map of item/category overrides |
| **masterSnapshot** (awareness) | ~2–5 KB | Snapshot of master items/categories for diff detection |

### Estimated Sizes by Restaurant Type

| Restaurant Type | Items | Files | Languages | Estimated Doc Size |
|----------------|-------|-------|-----------|-------------------|
| Small café (10 items, 3 categories) | 10 | 1 | 1 | ~5–10 KB |
| Medium restaurant (30 items, 8 categories) | 30 | 1–2 | 1 | ~15–30 KB |
| Medium + translations (30 items, 3 languages) | 30 | 1–2 | 3 | ~30–60 KB |
| Large restaurant (80 items, 15 categories) | 80 | 2–4 | 1 | ~50–100 KB |
| Large + translations + images (80 items, 4 languages) | 80 | 2–4 | 4 | ~100–200 KB |

### Firestore Limits Context

| Metric | Limit | Typical Project | Headroom |
|--------|-------|----------------|----------|
| Max document size | 1 MB (1,048,576 bytes) | 10–200 KB | 5–100x |
| Max fields per doc | 20,000 | ~500–2,000 | 10–40x |
| Max write rate per doc | 1 write/second sustained | ~1 write/30s (autosave) | 30x |

> **Conclusion:** Project documents are well within Firestore limits. Even the largest restaurants with full translations stay under 200 KB — 5x below the 1 MB limit. No size optimization needed.

---

## 4. Estimated Writes During 10-Min Editing Session

### Scenario A: Light Editing (typical daily use)

```
User opens editor → edits a few item names/prices → closes
```

| Write Source | Count | Explanation |
|-------------|-------|-------------|
| Autosave | 2–4 | 15s debounce + 30s min interval → ~1 save per 30s of active editing |
| Image operations | 0 | No image changes |
| AI operations | 0 | No translations/descriptions |
| Multi-outlet | 0 | Not configuring chain |
| **Total** | **2–4 writes** | |

### Scenario B: Heavy Editing Session

```
User edits items → adds language → generates descriptions → uploads images → saves
```

| Write Source | Count | Explanation |
|-------------|-------|-------------|
| Autosave | 4–6 | More active editing → more autosave cycles |
| Language toggle | 1 | Triggers translation, then single save |
| Description generation | 1 | Generates for all files, then single save |
| Image upload | 1–3 | Per image uploaded to items |
| **Total** | **7–11 writes** | |

### Scenario C: Maximum Load Session (worst case, unlikely)

```
User edits + adds 3 languages + generates descriptions + uploads 5 images + re-extracts menu
```

| Write Source | Count | Explanation |
|-------------|-------|-------------|
| Autosave | 6–8 | Constant editing between AI operations |
| Language toggles | 3 | One per language added |
| Description generation | 1 | Single batch save |
| Image uploads | 5 | One per image |
| Extraction apply | 1 | Single atomic write (post-fix) |
| **Total** | **16–18 writes** | |

### Cost Analysis

| Metric | Value |
|--------|-------|
| Firestore write cost | $0.18 per 100K writes |
| Average session writes | ~5–10 |
| Cost per session | ~$0.000009–$0.000018 |
| 200 restaurants × 4 sessions/week | ~$0.07–$0.14/month |
| 1,000 restaurants × 4 sessions/week | ~$0.36–$0.72/month |

> **Conclusion:** Write cost is negligible. Even at 1,000 restaurants with heavy editing, total write cost is under $1/month. **Do not optimize for write count.** The real risk was write *integrity* (atomicity), not write *volume*.

---

## 5. Critical Fixes Applied

### FIX #1: Atomic Extraction Apply ✅ DONE

**File:** `src/lib/extraction/applyChanges.ts`  
**Priority:** 🔴 MANDATORY (infra integrity)

**Problem:**
```
BEFORE: 2–8 sequential updateDoc() calls per extraction apply

updateDoc(categories via arrayUnion)     ← write 1
updateDoc(items via arrayUnion)          ← write 2
updateDoc(category patch via dot-path)   ← write 3
updateDoc(item patch via dot-path)       ← write 4
updateDoc(override 1)                    ← write 5
updateDoc(override 2)                    ← write 6
...
```

If write #3 fails but #1–2 succeed → **partially applied menu**. Categories added but items missing. Unacceptable for production.

**Additional latent bug found:** `files.${fileUid}` was used as a Firestore field path where `fileUid` is a string like `"file_0"`. On a `files` array, this doesn't index the array — it creates a map field called `"file_0"` as a sibling. The `arrayUnion` calls were writing to phantom paths.

**Solution:**
```
AFTER: Single atomic updateDoc() call

1. getDoc(projectRef)                    ← read once
2. structuredClone(files)                ← deep clone for safe mutation
3. Apply ALL mutations in-memory:
   - Push new categories to correct files[index]
   - Push new items to correct files[index]
   - Merge category patches
   - Merge item patches
   - Build overrides map (OUTLET_LINKED mode)
4. updateDoc(projectRef, {               ← ONE write
     files: mutatedFiles,
     'overrides.items.X': {...},
     'overrides.categories.Y': {...},
   })
```

Menu state jumps from A → B atomically. Never A → half → B.

**Changes made:**
- Removed `arrayUnion` import — all array mutations now in-memory
- Removed `buildFilePath()` helper — no longer building Firestore dot-paths for arrays
- Added `cloneFiles()` using `structuredClone` for safe deep copy
- Added optional `molContext` param for MOL audit logging
- Added `EXTRACTION_APPLIED` to `MOLEventType` in `src/types/mol.types.ts`
- Added `EXTRACTION` to `MOLEntityType` in `src/types/mol.types.ts`

---

### FIX #2: Write Discipline Rule ✅ DOCUMENTED

**File:** `__docs__/projects/11-database-layer.md` (new section added)

Codified the rule: every project write must be justified and categorized. See [Section 6](#6-write-discipline-rule-codified) below.

---

### FIX #3: Stop Sending Full Project on Autosave ⏭️ DEFERRED (correct)

**Recommendation from ChatGPT:** Use field-level patch writes instead of sending full project on every autosave.

**Decision:** Ignore for now. At current scale (< 200 restaurants), full project writes are:
- Well under Firestore's 1 MB limit
- Cost-negligible (< $1/month at 1,000 restaurants)
- Already guarded by equality check (`isSameObjects`)

This becomes relevant only at 1,000+ restaurants with large menus. Not a launch blocker.

---

## 6. Write Discipline Rule (Codified)

> **Rule:** Every project document write MUST be justified and categorized.

### Allowed Write Paths

| Category | Writer | Pattern | Justification |
|----------|--------|---------|---------------|
| **DAL (primary)** | `updateProject()` | `setDoc(merge:true)` via `apiCallComposer` | Standard path — timestamps, error logging, MOL change detection, master cache invalidation |
| **DAL (publish)** | `publishProject()` | `setDoc(merge:true)` + Storage uploads | Theme publishing — base64 → Storage URL conversion |
| **DAL (lifecycle)** | `setProjectActive()`, `deleteProject()`, `restoreProject()` | `setDoc(merge:true)` | Lifecycle toggles — minimal field writes |
| **Multi-outlet admin** | `multiOutlet/index.ts` functions | Direct `updateDoc` | Structural ops — field-level writes, no DAL overhead needed |
| **Awareness** | `useMasterUpdateAwareness.acknowledge()` | Direct `updateDoc` | Snapshot write — must bypass change detection |
| **Extraction apply** | `applyExtractionChanges()` | Single atomic `updateDoc` | AI results — read once, mutate in-memory, write once |
| **Cloud Function** | `saveFilesToProject()` | `projectRef.set(merge:true)` | Server-side first extraction auto-save |
| **Maintenance** | `removePresetFromAllCategories()` | `setDoc(merge:true)` per project | Settings cascade — rare admin operation |

### Rules for Adding New Write Paths

1. **Default:** Use `updateProject()` DAL — gets timestamps, error handling, MOL detection for free
2. **Direct `updateDoc` allowed ONLY if:** writing specific fields AND full DAL overhead is unjustified
3. **Never scatter new `updateDoc` calls** without documenting them in `11-database-layer.md`
4. **Extraction apply MUST remain single atomic write** — never regress to multi-write loop

---

## 7. Cascade's Analysis vs ChatGPT Recommendations

### Where ChatGPT Was RIGHT ✅

| Point | ChatGPT Said | Cascade Agrees | Action Taken |
|-------|-------------|----------------|--------------|
| Extraction apply is worst offender | "2–8 writes per apply. Partially applied menu = unacceptable." | ✅ Fully agree. This was the only structurally dangerous pattern. | Refactored to single atomic write |
| Need write discipline rule | "Define one rule: every project write must go through DAL only except allowed direct writers." | ✅ Agree on the principle. Codified the rule. | Added to `11-database-layer.md` |
| Don't optimize write count | "10–15 writes per heavy session is NOTHING. Don't optimize prematurely." | ✅ Fully agree. Cost is negligible even at scale. | No write-count optimization done |
| Don't add write queues/batching/locking | "All premature. You're not at scale yet." | ✅ Fully agree. Would be over-engineering. | Nothing added |
| Fix structural integrity before scale | "You don't have a write-count problem. You have a write architecture discipline problem." | ✅ Agree on the extraction fix. The atomic write was genuinely needed. | Fixed |

### Where ChatGPT Was PARTIALLY WRONG ⚠️

| Point | ChatGPT Said | Cascade's View | Why |
|-------|-------------|---------------|-----|
| "25 different write paths = biggest long-term infra risk" | Sounds alarming. Implies fragmentation. | **Overstated.** The 25 count includes 10+ multi-outlet admin functions that are rare structural operations (setup/config only, not editing). The real offender was only `applyExtractionChanges()`. The autosave path is well-disciplined (15s debounce + 30s min + equality guard). The system is NOT fragmented in practice — it has clear categories with different write needs. | Counting write paths isn't the right metric. What matters is: are the writes *controlled and intentional*? Answer: yes, except extraction (now fixed). |
| "Every project write must go through DAL only" | Implies multi-outlet direct writes are bad. | **Disagree on multi-outlet.** Direct `updateDoc` calls in `multiOutlet/index.ts` are **correct as-is**. They write specific fields (`isMaster`, `masterProjectId`, `overrides`) without reading/writing the entire project. Routing them through `updateProject()` would be WORSE because: (1) `updateProject()` sends the full project object every time, (2) it triggers MOL change detection (reads `oldProject` — extra Firestore read), (3) multi-outlet ops are structural admin actions, not menu content changes. | The awareness `masterSnapshot` write also correctly bypasses DAL — it's not an operational change and must avoid triggering the change detection loop. |

### Where ChatGPT Was COMPLETELY RIGHT but Not Urgent ⏭️

| Point | ChatGPT Said | Status |
|-------|-------------|--------|
| "Stop sending full project on autosave" | Use field-level patch writes at scale. | ⏭️ Deferred — correct observation, not urgent at < 200 restaurants. Revisit at 1,000+. |

---

## Summary

| Question | Answer |
|----------|--------|
| **Total write paths** | 28 call sites across 6 categories (DAL, Editor, Multi-Outlet, Awareness, Extraction, Cloud Function) |
| **Bypass autosave?** | All except `Editor.syncChanges()` are instant writes. None are problematic — all are rare, intentional, or user-triggered. |
| **Average doc size** | 9–200 KB depending on restaurant size and languages. Well within 1 MB Firestore limit. |
| **Writes per 10-min session** | Light: 2–4, Heavy: 7–11, Worst case: 16–18. Cost: < $1/month at 1,000 restaurants. |
| **Critical fix applied** | `applyExtractionChanges()` refactored from 2–8 writes → 1 atomic write. Latent bug with `files.${fileUid}` Firestore path also fixed. |
| **Write discipline rule** | Codified in `11-database-layer.md`. All write paths categorized and justified. |

---

**Document Version:** 1.0  
**Created:** February 7, 2026  
**Author:** Cascade AI  
**Related Docs:**
- `__docs__/projects/11-database-layer.md` → Write Discipline Rule section
- `__docs__/multi-outlet-consistency/_archive/ai-extraction-integration_validation.md` → Limitations #3, #4 marked FIXED
- `src/lib/extraction/applyChanges.ts` → Refactored atomic write implementation
- `src/types/mol.types.ts` → Added EXTRACTION_APPLIED event type
