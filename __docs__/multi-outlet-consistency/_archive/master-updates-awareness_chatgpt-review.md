# Master Updates Awareness — ChatGPT Conversation Critical Review

**Feature:** #4.1 — Master Updates Awareness Layer  
**Date:** February 7, 2026  
**Reviewer:** Cascade (Codebase Authority — Full Access)  
**Context:** User shared `master-updates-awareness_verification.md` to ChatGPT for sign-off review. ChatGPT gave feedback + pivoted to infrastructure hardening discussion.  
**Document Policy:** Single review doc. All analysis consolidated here.  
**Implementation Status:** ✅ All HIGH priority action items IMPLEMENTED — verified Feb 7, 2026

---

## Executive Summary

**ChatGPT Accuracy:** ~70% vs MenuListAI Reality  
**Actionable Insights:** 8/19 suggestions  
**Architecture Risks Flagged:** 2 (one ChatGPT-introduced misconception about outlet creation)  
**Rejected Items:** 6 (over-engineering, already implemented, or contradicts codebase)

ChatGPT gave a broadly correct production sign-off of the awareness feature itself. The feature architecture is validated. However, when the conversation pivoted to "infrastructure hardening," ChatGPT made several assumptions about how the system works that **do not match codebase reality** — particularly around outlet creation, project lifecycle, and autosave behavior. The user also gave ChatGPT incomplete/inaccurate information about the link/unlink architecture, leading to flawed recommendations.

---

## Stage 1: Conversation Comprehensive Analysis

### ChatGPT Conversation Breakdown

| #   | Topic                                                  | ChatGPT Suggestion                                      | Confidence | Codebase Reality                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------ | ------------------------------------------------------- | :--------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Feature sign-off                                       | Architecture correct, production-grade                  |    High    | **AGREE** — Verified via line-by-line cross-check                                                                                                                                                                                         |
| 2   | Feature flag rollout                                   | Enable for test tenant first → 1 client → global        |    High    | **AGREE** — Sensible rollout, aligns with feature flag pattern                                                                                                                                                                            |
| 3   | Tab visibility listener detach                         | Implement now (~10 min)                                 |    Med     | **AGREE** — Not implemented yet, doc mentions it (§6.3), worth doing                                                                                                                                                                      |
| 4   | Auto-baseline for old outlets                          | Skip, keep system explicit                              |    High    | **AGREE** — Correct call, no legacy outlets exist (not live yet)                                                                                                                                                                          |
| 5   | MOL log on acknowledge                                 | Add `MASTER_UPDATE_ACKNOWLEDGED` event                  |    Med     | **PARTIAL** — Good idea, but must evaluate write cost vs value                                                                                                                                                                            |
| 6   | "Never add" list (notification bell, etc.)             | Reject complexity additions                             |    High    | **AGREE** — Aligns with MenuList constitution (calm infrastructure)                                                                                                                                                                       |
| 7   | Infrastructure hardening pivot                         | Focus on cost + performance before features             |    High    | **AGREE** — Correct strategic priority                                                                                                                                                                                                    |
| 8   | Write version guard (optimistic locking)               | Add `version: number` to project doc                    |    Med     | **DISAGREE** — Over-engineering for current scale. Editor already has `isSameObjects` guard                                                                                                                                               |
| 9   | Orphan override guard in resolver                      | Ignore override if itemId not in master                 |    Med     | **ALREADY DONE** — Resolver only iterates `masterItems`, ignoring orphan overrides by design                                                                                                                                              |
| 10  | Snapshot safety rules                                  | Never partial write, atomic only                        |    High    | **ALREADY DONE** — `createMasterSnapshot` is pure function, single `updateDoc`                                                                                                                                                            |
| 11  | Hard failure simulation                                | Test offline, master delete, rapid edits, large menu    |    High    | **AGREE** — Worth doing as manual QA before launch                                                                                                                                                                                        |
| 12  | Autosave is wasteful                                   | Too many writes from many change sources                |    Med     | **DISAGREE** — Already has 15s debounce + 30s min interval + `isSameObjects` guard                                                                                                                                                        |
| 13  | Implement write debounce                               | Central debounce in `updateProject()`                   |    Med     | **ALREADY DONE** — Editor has `AUTOSAVE_DEBOUNCE_MS=15000`, `AUTOSAVE_MIN_INTERVAL_MS=30000`                                                                                                                                              |
| 14  | Never write identical data                             | Compare old vs new before write                         |    Med     | **ALREADY DONE** — `syncChanges()` checks `isSameObjects(activeProject, updatedData)` before calling `updateProject()`                                                                                                                    |
| 15  | User claim: "no unlink exists"                         | ChatGPT accepted, simplified model                      |    High    | **WRONG** — `unlinkStoreFromMaster()` EXISTS, gated by `ENABLE_UNLINK_FROM_MASTER` flag (default: false). Spec FR-3.4 includes unlink. FR-11 constrains it.                                                                               |
| 16  | Snapshot at "outlet creation time"                     | Create snapshot when store created in business settings |    High    | **WRONG ASSUMPTION** — Store creation (`addStore`) and project creation (`addProject`) are SEPARATE flows. `linkStoreToMaster()` ALREADY creates snapshot. There is no single "outlet creation" moment that auto-assigns masterProjectId. |
| 17  | "Outlet project is created empty, link assigns master" | ChatGPT accepted user's model                           |    High    | **PARTIALLY CORRECT** — `addProject()` creates empty project. `linkStoreToMaster()` assigns masterProjectId + creates snapshot. These are separate DAL calls, not one atomic flow.                                                        |
| 18  | Firebase visibility logging                            | Add `logFirestoreRead/Write` utils                      |    Med     | **REJECT** — Over-engineering. Firebase Console already provides usage analytics. Temporary debug logs add noise.                                                                                                                         |
| 19  | Listener count audit                                   | Ensure one listener per purpose                         |    Med     | **AGREE** — Worth verifying, hook already uses single `onSnapshot` with cleanup                                                                                                                                                           |

### Key Themes Identified

1. **Feature sign-off is correct** — ChatGPT validated architecture, scaling, cost model. All confirmed by codebase.
2. **Infrastructure hardening is right priority** — But ChatGPT's specific recommendations were hit-or-miss because it lacks codebase access.
3. **User gave wrong info about link/unlink** — Led ChatGPT down a wrong path about "outlet creation = snapshot write point". The codebase has explicit link/unlink/switch functions, each already handling snapshots correctly.
4. **Autosave concern is overblown** — System already has disciplined autosave with debounce + min interval + change detection.
5. **Several suggestions are already implemented** — ChatGPT couldn't know this without codebase access.

---

## Stage 2: Line-by-Line Reality Check

### Point 1: Feature Architecture Sign-Off

> ChatGPT: "Signal doc approach correct. Snapshot baseline correct. Diff engine runtime correct. Version-based awareness correct. No polling correct."

**Codebase verification:**

- Signal doc: `src/database/projects/index.ts:439-456` — atomic `increment(1)` on operational change
- Snapshot: `src/lib/multiOutlet/masterUpdateDiff.ts:410-455` — pure function, single write
- Diff engine: `src/lib/multiOutlet/masterUpdateDiff.ts:47-392` — runtime, pure, 625 lines
- Version check: `src/hooks/useMasterUpdateAwareness.ts:294` — `incomingVersion <= acknowledgedVersionRef.current`
- No polling: `onSnapshot` on signal doc only, 5s debounce

**VERDICT: AGREE** — All verified. Architecture is production-grade.

---

### Point 2: Feature Flag Rollout Plan

> ChatGPT: "Week 1 → test tenant. Week 2 → 1 real client. Week 3 → global. Keep kill-switch forever."

**Codebase verification:**

- Flag at `src/config/features.ts:682-708`: `ENABLE_MASTER_UPDATE_AWARENESS: false`
- Kill-switch pattern: All entry points check flag before executing

**VERDICT: AGREE** — Sensible rollout. No code changes needed.

---

### Point 3: Tab Visibility Listener Detach ✅ IMPLEMENTED

> ChatGPT: "Implement now (~10 min). Detach when tab hidden, reattach when visible."

**Codebase verification (UPDATED Feb 7, 2026):**

- `src/hooks/useMasterUpdateAwareness.ts:354-377` — `handleVisibilityChange` listener implemented
- On `document.hidden`: calls `unsubscribe()` to detach listener
- On visible: re-attaches `onSnapshot` via `attachListener()` with immediate diff check
- Cleanup on unmount removes both `onSnapshot` and `visibilitychange` listeners

**VERDICT: ✅ IMPLEMENTED** — Gap filled. Tab visibility detach fully working.

---

### Point 4: Auto-Baseline for Old Outlets

> ChatGPT: "Skip. Keep system explicit."

**Codebase verification:**

- User confirmed: "Not live yet"
- No legacy outlets without snapshots exist
- Hook at `src/hooks/useMasterUpdateAwareness.ts:183-188`: returns early if no `masterSnapshot`

**VERDICT: AGREE** — Correct decision. No legacy data to handle.

---

### Point 5: MOL Log on Acknowledge ✅ IMPLEMENTED

> ChatGPT: "Add `MASTER_UPDATE_ACKNOWLEDGED` event with outletId, masterProjectId, version, changeCount."

**Codebase verification (UPDATED Feb 7, 2026):**

- `src/types/multiOutlet.types.ts:80` — `"MASTER_UPDATE_ACKNOWLEDGED"` added to `MultiStoreMOLEventType` union ✅
- `src/lib/multiOutlet/molEvents.ts:260` — `createAcknowledgeEvent()` builder function exists ✅
- `src/hooks/useMasterUpdateAwareness.ts:237-253` — Fire-and-forget `logMultiOutletEvent(createAcknowledgeEvent(...))` after snapshot write ✅

**VERDICT: ✅ IMPLEMENTED** — All 3 parts (type + builder + hook call) are in codebase.

---

### Point 6: "Never Add" List

> ChatGPT: "Never add notification bell, change history dashboard, sync button, comparison analytics, approval workflows."

**Codebase verification:**

- MenuList Constitution `__docs__/constitution/01-core-doctrine.md`:
  - Law 2: "Silence Is a Feature"
  - Law 6: "No Cognitive Load"
  - Law 8: "Trust > Engagement"
- Feature Rejection Gate: All 5 items would fail the 5-question gate

**VERDICT: AGREE** — Perfectly aligned with MenuList doctrine. No action needed.

---

### Point 7: Infrastructure Hardening Priority

> ChatGPT: "Focus on cost + performance before features."

**VERDICT: AGREE** — Strategic alignment. User confirmed priorities B (Firebase cost) and E (Performance).

---

### Point 8: Write Version Guard (Optimistic Locking)

> ChatGPT: "Add `version: number` to project doc. On save: read version, compare, refresh if mismatch."

**Codebase verification:**

- `src/components/templates/main-app/projects/editorView/Editor.tsx:335-369`:
  - `syncChanges()` calls `isSameObjects(activeProject, updatedData)` — skips if no change
  - `updateProject()` uses `setDoc(..., { merge: true })` — last-write-wins but partial merge
- Current architecture: Single user edits their outlet. Master edits don't collide with outlet edits (different docs).
- The "two managers editing same menu" scenario ChatGPT described is unlikely for current use case (single store owner per outlet)

**VERDICT: DISAGREE** — Over-engineering for current scale and use case.

- Single-store owners don't have concurrent editors
- Master project is edited by one HQ admin
- `merge: true` already prevents full overwrite
- Adding version field requires read-before-write pattern → doubles Firestore reads on every save
- **Decision: REJECT** — Revisit only if/when collaborative editing becomes a requirement

---

### Point 9: Orphan Override Guard in Resolver

> ChatGPT: "If outlet override refers to itemId not in master → ignore safely."

**Codebase verification:**

- `src/lib/multiOutlet/resolveProject.ts:243-259`:
  ```typescript
  const resolvedItems = masterItems.map((item) => {
    const override = overrides.items[item.id];
    if (!override) return item;
    return { ...item, ...override_fields };
  });
  ```
- Resolver iterates `masterItems` (not overrides). If master deletes item, override is simply never read.
- Local-only items filtered separately by ID prefix check

**VERDICT: ALREADY DONE** — Resolver handles orphan overrides by design. The iteration pattern (master-first, not override-first) means orphan overrides are silently ignored. No code change needed.

---

### Point 10: Snapshot Safety Rules

> ChatGPT: "Never partial write. Always atomic. Never write during polling/listener."

**Codebase verification:**

- `createMasterSnapshot()` at `src/lib/multiOutlet/masterUpdateDiff.ts:410-455` is pure function → returns complete object
- Written in single `updateDoc()` call at:
  - `src/database/multiOutlet/index.ts:322-328` (link)
  - `src/database/multiOutlet/index.ts:446-452` (switch)
  - `src/hooks/useMasterUpdateAwareness.ts:220-227` (acknowledge)
- Listener callback at `src/hooks/useMasterUpdateAwareness.ts:283-320` only triggers diff computation, NEVER writes snapshot

**VERDICT: ALREADY DONE** — All three rules already enforced by codebase design.

---

### Point 11: Hard Failure Simulation

> ChatGPT: "Test: Firestore write failure, master deletes category, rapid master edits, large menu."

**VERDICT: AGREE** — Valid manual QA. Should be done before enabling feature flag. No code changes needed — this is testing discipline.

**Recommended test scenarios:**
| # | Scenario | What to verify |
|---|----------|----------------|
| 1 | Disable internet → save menu | UI shows error, no data corruption, retry on reconnect |
| 2 | Master deletes category with outlet overrides | Awareness shows CATEGORY_REMOVED, resolver ignores orphan overrides |
| 3 | Master edits 5 times in 1 minute | Banner appears once (5s debounce), single stable diff |
| 4 | 200-item menu with 3 attrs each | Diff speed < 100ms, modal renders without lag, snapshot < 50KB |
| 5 | Outlet clicks "Got it" while master is editing | Snapshot writes correctly, next signal shows only post-acknowledge changes |

---

### Point 12: "Autosave is Wasteful"

> ChatGPT: "Project changes in many places → wasteful autosave."

**Codebase verification:**

- `src/components/templates/main-app/projects/constants.ts:54-57`:
  - `AUTOSAVE_DEBOUNCE_MS = 15000` (15 seconds)
  - `AUTOSAVE_MIN_INTERVAL_MS = 30000` (30 seconds)
- `src/components/templates/main-app/projects/editorView/Editor.tsx:429-459`:
  - Auto-save effect respects both debounce AND min interval
  - Uses `hasChangesRef.current` re-check before writing
- `syncChanges()` at Editor.tsx:335-369:
  - `isSameObjects(activeProject, updatedData)` guard — skips if nothing changed

**VERDICT: DISAGREE** — Autosave is NOT wasteful. Already has:

- 15s debounce (waits for typing to stop)
- 30s min interval between saves
- Deep equality check before write
- User editing 10 items in 20s → triggers AT MOST 1 write after 15s pause

ChatGPT suggested 3-5s debounce. Our 15s is actually MORE conservative. No change needed.

---

### Point 13-14: Write Debounce + Skip Identical Data

> ChatGPT: "Implement central debouncer" and "Compare old vs new before writing"

**VERDICT: ALREADY DONE** — See Point 12 analysis. Both patterns exist in codebase.

---

### Point 15: User Claim "No Unlink Exists"

> User told ChatGPT: "There is no way to link or unlink. Every outlet must be linked to master."
> ChatGPT accepted and simplified the model.

**Codebase REALITY:**

- `unlinkStoreFromMaster()` EXISTS at `src/database/multiOutlet/index.ts:480-527`
- Gated by `ENABLE_UNLINK_FROM_MASTER: false` at `src/config/features.ts:680`
- Spec FR-3.4: "HQ Admin can unlink store (becomes standalone)"
- Spec FR-11: Chain consistency constraint (unlink blocked when no other master)
- `switchStoreMaster()` EXISTS at `src/database/multiOutlet/index.ts:354-471`
- Gated by `ENABLE_CHANGE_MASTER_STORE: false` at `src/config/features.ts:669`

**VERDICT: USER INFO WAS INACCURATE** — The codebase HAS unlink and switch capabilities, just disabled by default via feature flags. This is correct 3-year-freeze architecture: capability exists Day 1, toggled off until needed.

**Impact:** ChatGPT's subsequent recommendations about "only 2 snapshot moments" and "remove unlink mental overhead" are WRONG. The codebase correctly handles all 3 scenarios (link, switch, unlink). No simplification should be done.

---

### Point 16: Snapshot at "Outlet Creation Time"

> ChatGPT: "When new outlet created in business settings → immediately create baseline snapshot."

**Codebase REALITY — this is the most critical misconception:**

1. **Store creation** (`addStore` at `src/database/stores/index.tsx:100-152`):
   - Creates store document only (name, logo, hours, etc.)
   - Does NOT create a project
   - Does NOT assign masterProjectId
   - Does NOT create snapshot

2. **Project creation** (`addProject` at `src/database/projects/index.ts:303-351`):
   - Creates empty project document (files: [], config, etc.)
   - Does NOT assign masterProjectId
   - Called separately from Projects page, NOT from business settings

3. **Link to master** (`linkStoreToMaster` at `src/database/multiOutlet/index.ts:222-346`):
   - Assigns masterProjectId to existing project
   - ALREADY creates initial snapshot (lines 273-319)
   - This is a SEPARATE action from store/project creation

**The actual lifecycle is:**

```
Business Settings → addStore() → Store doc created (no project)
Projects Page → addProject() → Empty project created (no master)
Multi-Outlet UI → linkStoreToMaster() → masterProjectId + snapshot + overrides
```

These are 3 separate flows, not one atomic "outlet creation."

**VERDICT: DISAGREE WITH CHATGPT** — The snapshot concern is already solved. `linkStoreToMaster()` ALREADY creates the initial snapshot. ChatGPT was solving a non-existent problem because user described the architecture inaccurately.

**However — Cascade independent analysis reveals a REAL gap:**
If the business onboarding flow for multi-outlet chains is designed such that stores are created with projects and linked to master in a single workflow (not yet implemented in UI), then the current separate-step architecture is correct and composable. The DAL functions are designed to be called in sequence by whatever UI flow orchestrates onboarding.

**Decision: NO CODE CHANGE NEEDED** — `linkStoreToMaster()` already handles snapshot creation. If a future onboarding wizard is built, it should call `addStore()` → `addProject()` → `linkStoreToMaster()` in sequence, and snapshots will be created correctly.

---

### Point 17: Outlet Project Architecture

> ChatGPT: "Every outlet has its own project doc because where we are storing the overrided data"

**VERDICT: CORRECT** — Each outlet has its own project doc storing `masterProjectId`, `overrides`, `masterSnapshot`. This is verified throughout the codebase.

---

### Point 18: Firebase Usage Logging

> ChatGPT: "Add `logFirestoreRead(source)` / `logFirestoreWrite(source)` utils."

**VERDICT: REJECT** — Over-engineering.

- Firebase Console already provides read/write/delete metrics with 24h granularity
- Adding console.log wrappers around every Firestore call adds noise and maintenance burden
- For targeted debugging, Chrome DevTools Network tab shows individual requests
- **Decision: Use Firebase Console analytics when needed.** Don't instrument every DAL function.

---

### Point 19: Listener Count Audit

> ChatGPT: "Ensure one listener per purpose. No duplicates."

**Codebase verification:**

- `useMasterUpdateAwareness.ts:257-330`: Single `onSnapshot` with `unsubscribe` returned on cleanup
- React strict mode may double-mount in dev → but cleanup handles it correctly
- No other awareness listeners found in codebase

**VERDICT: AGREE** — Already correct, but worth verifying during QA testing that no duplicate listeners fire.

---

## Stage 3: Market Validation

No market research needed for this review — it's infrastructure hardening, not customer-facing features. All recommendations are internal system quality improvements.

---

## Stage 4: Conflict Resolution & Decision Matrix

| #   | ChatGPT Idea                | Status    | Decision           | Justification                                                                   | Action                          |
| --- | --------------------------- | --------- | ------------------ | ------------------------------------------------------------------------------- | ------------------------------- |
| 1   | Feature sign-off            | VALID     | **AGREE**          | Matches codebase verification                                                   | No action                       |
| 2   | Feature flag rollout plan   | VALID     | **AGREE**          | Aligns with existing flag pattern                                               | No action (ops process)         |
| 3   | Tab visibility detach       | VALID     | ✅ **IMPLEMENTED** | Real gap, low effort, scaling benefit                                           | ✅ Done (hook lines 354-377)    |
| 4   | Skip auto-baseline          | VALID     | **AGREE**          | No legacy data exists                                                           | No action                       |
| 5   | MOL log on acknowledge      | PARTIAL   | ✅ **IMPLEMENTED** | Debugging value > tiny write cost                                               | ✅ Done (type + builder + hook) |
| 6   | "Never add" list            | VALID     | **AGREE**          | Aligns with constitution                                                        | No action                       |
| 7   | Infra hardening priority    | VALID     | **AGREE**          | Correct strategic call                                                          | No action                       |
| 8   | Write version guard         | CONFLICT  | **REJECT**         | Over-engineering. Editor has isSameObjects guard. Single-user per outlet.       | IGNORE                          |
| 9   | Orphan override guard       | REDUNDANT | **ALREADY DONE**   | Resolver iterates masterItems, orphan overrides silently ignored                | IGNORE                          |
| 10  | Snapshot safety rules       | REDUNDANT | **ALREADY DONE**   | Pure function + single atomic write                                             | IGNORE                          |
| 11  | Hard failure simulation     | VALID     | **AGREE**          | Pre-launch QA, not code change                                                  | Manual test scenarios           |
| 12  | Autosave wasteful           | WRONG     | **DISAGREE**       | 15s debounce + 30s min interval + isSameObjects guard already exist             | IGNORE                          |
| 13  | Write debounce              | REDUNDANT | **ALREADY DONE**   | AUTOSAVE_DEBOUNCE_MS=15000, AUTOSAVE_MIN_INTERVAL_MS=30000                      | IGNORE                          |
| 14  | Skip identical writes       | REDUNDANT | **ALREADY DONE**   | syncChanges() calls isSameObjects()                                             | IGNORE                          |
| 15  | "No unlink" simplification  | WRONG     | **REJECT**         | Unlink EXISTS, feature-flagged. 3-year freeze: capability Day 1.                | IGNORE                          |
| 16  | Snapshot at outlet creation | WRONG     | **REJECT**         | linkStoreToMaster() ALREADY creates snapshot. Wrong assumption about lifecycle. | IGNORE                          |
| 17  | Outlet project architecture | VALID     | **AGREE**          | Each outlet has own project doc                                                 | No action                       |
| 18  | Firebase usage logging      | OVER-ENG  | **REJECT**         | Firebase Console provides this. Don't instrument every DAL function.            | IGNORE                          |
| 19  | Listener count audit        | VALID     | **AGREE**          | Already correct, verify during QA                                               | Manual QA check                 |

### Explicit Disagreements

1. **Disagree with ChatGPT on "autosave is wasteful"** because `src/components/templates/main-app/projects/constants.ts:54-57` shows `AUTOSAVE_DEBOUNCE_MS=15000` and `AUTOSAVE_MIN_INTERVAL_MS=30000`, plus `syncChanges()` at `Editor.tsx:338` checks `isSameObjects()` before writing. The system is already conservative.

2. **Disagree with ChatGPT on "write version guard"** because the current architecture has single-user-per-outlet editing with `merge: true` semantics. Adding optimistic locking doubles Firestore reads per save with zero real-world benefit at current scale.

3. **Disagree with ChatGPT on "snapshot at outlet creation"** because the codebase has 3 separate flows (store creation → project creation → link to master), and `linkStoreToMaster()` at `src/database/multiOutlet/index.ts:273-319` ALREADY creates the initial snapshot. ChatGPT was solving a problem that doesn't exist.

4. **Disagree with ChatGPT accepting user's claim "no unlink exists"** because `unlinkStoreFromMaster()` at `src/database/multiOutlet/index.ts:480-527` EXISTS, gated by `ENABLE_UNLINK_FROM_MASTER: false`. Per 3-year-freeze law, capabilities exist Day 1.

---

## Stage 5: Prioritized Action Items

### HIGH Priority — ✅ ALL IMPLEMENTED

| #   | Task                           | File                                    | Status  | Evidence                                                                            |
| --- | ------------------------------ | --------------------------------------- | ------- | ----------------------------------------------------------------------------------- |
| 1   | Tab visibility listener detach | `src/hooks/useMasterUpdateAwareness.ts` | ✅ DONE | Lines 354-377: `handleVisibilityChange` with detach on hidden, re-attach on visible |
| 2   | MOL log on acknowledge (type)  | `src/types/multiOutlet.types.ts`        | ✅ DONE | Line 80: `"MASTER_UPDATE_ACKNOWLEDGED"` in union                                    |
| 2b  | MOL event builder              | `src/lib/multiOutlet/molEvents.ts`      | ✅ DONE | Line 260: `createAcknowledgeEvent()` builder                                        |
| 2c  | MOL log in hook                | `src/hooks/useMasterUpdateAwareness.ts` | ✅ DONE | Lines 237-253: Fire-and-forget `logMultiOutletEvent(createAcknowledgeEvent(...))`   |

### MEDIUM Priority (Pre-Launch QA)

| #   | Task                                                                       | Type                |
| --- | -------------------------------------------------------------------------- | ------------------- |
| 3   | Manual failure simulation tests (5 scenarios from Point 11)                | Manual QA           |
| 4   | Verify no duplicate listeners in dev mode (React strict mode double-mount) | Manual QA           |
| 5   | Measure real snapshot size for 200-item menu with attributes               | Manual verification |

### LOW Priority (Monitor)

| #   | Task                                    | Notes                                        |
| --- | --------------------------------------- | -------------------------------------------- |
| 6   | Firebase Console read/write monitoring  | Check after enabling flag for test tenant    |
| 7   | Bundle size check for awareness imports | Dynamic imports already used in 3 call sites |

### REJECTED (Documented)

| #   | Item                                     | Reason                                                   |
| --- | ---------------------------------------- | -------------------------------------------------------- |
| R1  | Write version guard / optimistic locking | Over-engineering. Single-user-per-outlet. Doubles reads. |
| R2  | Orphan override guard in resolver        | Already handled by iteration pattern                     |
| R3  | Central write debounce                   | Already exists: 15s debounce + 30s min interval          |
| R4  | Skip identical writes                    | Already exists: isSameObjects() guard                    |
| R5  | Firebase usage logging utils             | Firebase Console sufficient. Don't instrument DAL.       |
| R6  | Snapshot at outlet creation              | linkStoreToMaster() already creates it                   |

---

## Open Questions

1. **Multi-outlet onboarding workflow:** Currently store creation, project creation, and master linking are 3 separate DAL calls. Is there a planned single onboarding wizard that chains these? If so, the composition is correct — just call in sequence. But if stores can exist without projects or without master links for extended periods, we may want a "pending setup" state indicator.

2. **updateProject extra read cost:** Every `updateProject()` call now fetches `oldProject` (1 extra read) when MOL or awareness is enabled (`src/database/projects/index.ts:387-397`). At scale with frequent autosaves, this doubles project read cost. Worth monitoring after launch. Potential optimization: pass `oldProject` from Editor state instead of re-fetching.

3. **Master project cache sharing (RESOLVED Feb 7):** The awareness hook's master fetch now populates the resolver's cache via `populateMasterCache()`. When Editor re-resolves after acknowledge, it hits the populated cache — 0 extra Firestore reads. This partially addresses concern #2 for the awareness flow.

---

## Implementation Status Summary (Added Feb 7, 2026)

| Category                                | Total | Done | Not Done | Status                         |
| --------------------------------------- | ----- | ---- | -------- | ------------------------------ |
| HIGH Priority (Code Changes)            | 4     | 4    | 0        | ✅ 100%                        |
| MEDIUM Priority (Manual QA)             | 3     | 0    | 3        | ❌ 0% (pre-launch testing)     |
| LOW Priority (Monitor)                  | 2     | 0    | 2        | ❌ 0% (post-launch monitoring) |
| REJECTED                                | 6     | —    | —        | N/A (correctly rejected)       |
| Post-Review Optimizations (Feb 7, 2026) | 2     | 2    | 0        | ✅ 100%                        |

**Post-Review Optimizations:**
| # | Optimization | Files Changed | Impact |
|---|-------------|---------------|--------|
| 1 | **SWR cache invalidation fix** — Hook accepts `onProjectUpdate` callback, calls it after acknowledge to update local `activeProject` with new `masterSnapshot` | `useMasterUpdateAwareness.ts`, `MasterUpdateBanner/index.tsx` | "Last changes" link appears immediately, Editor re-resolves with fresh data |
| 2 | **Master project cache sharing** — Hook calls `populateMasterCache()` after fetching master, sharing with resolver cache | `resolveProject.ts`, `multiOutlet/index.ts`, `useMasterUpdateAwareness.ts` | 0 extra Firestore reads when Editor re-resolves after acknowledge |

**Bottom Line:** All code changes from this review are implemented, plus 2 post-review optimizations. Remaining items are manual QA and post-launch monitoring — no code work needed.

---

**REVIEW STATUS:** COMPLETE  
**REVIEWER:** Cascade (Codebase Authority — Full Access)  
**INITIAL TIMESTAMP:** February 7, 2026  
**LAST UPDATED:** February 7, 2026 — Added implementation status + post-review optimizations (SWR fix + cache sharing)  
**SIGNATURE:** All verdicts backed by exact file:line codebase references.
