# AI Image Generation — Verification Report

**Feature:** Menu Image Generation & Editing
**Verification Date:** July 16, 2026
**Auditor:** Codex
**Status:** Runtime/docs cross-check completed; verification commands and external release evidence are recorded below

---

## Current cross-check — July 15, 2026

The codebase was traced across single generation, reference-image input, image editing, batch job creation/trigger/worker/listener/review/retry, prompt cache, AI capacity/accounting, generated-media upload, owner acceptance, linked-outlet policy, desktop/mobile parity, project-cover generation, Official Business Page cover generation, public cache invalidation, and retention cleanup.

### Confirmed findings and fixes

| Finding | Resolution |
| --- | --- |
| `ENABLE_AI_IMAGE_GENERATION` existed but did not gate routes or UI | Enforced in single/edit/batch-trigger/authenticated-worker routes, central cover helpers, item modal/editing, and desktop/mobile project/business-cover entry points |
| Mobile **Generate image** opened upload instead of generation | Corrected to open the shared modal with `preferredInitialTab='generate'` |
| Batch UI could select more than the server maximum | Shared 50-item limit now applies to individual, category, visible-all, quick-select, initial mobile selection, modal admission, schema, and server projection |
| A batch item ID matches multiple project files | Transaction-current standalone, local and master projection rejects the selection as ambiguous before persistence |
| Selection metadata uses getters, Proxies or coercive size objects | Admission snapshots bounded arrays and own scalar fields, rejects hostile access, and does not execute conversion hooks |
| Batch UI showed an unsupported fixed duration | Removed; owner sees selected count and shared credit estimate |
| Batch settings used a second icon library and prohibited `Smart` copy | Replaced with `react-icons/lu` and **Recommended Defaults** |
| Batch review and retention inferred delete authority from browser/job plus one-project state | Browser review actions no longer delete generated media. Job retention prunes heavy metadata after seven days and deletes terminal job rows after 30 days, but keeps public media objects until global cross-project/outlet exclusive-reference proof exists. |
| Deterministic Admin uploads could overwrite bytes and rotate Firebase download tokens on retry | Batch-worker and prompt-cache destination copies now use generation-match create-only writes, verify an existing object's size/cache policy/content type/checksummed metadata on conflict, and reuse its existing download token. |
| Prepared-media Storage rules still admitted animated GIF writes through direct SDK access | `media/{profile}/...` now accepts static JPEG/PNG/WebP only; the Storage emulator proves GIF bypass rejection while legacy non-profile image rules remain compatible. |
| Mandatory mobile feature documentation was missing | Added `ai-image-generation_mobile-support.md` with shared-shell/persistence/failure truth |
| Active spec and verification language contained historical guarantees/contradictions | Rebuilt the active spec and marked the older audit material below as retained history, not current runtime truth |
| AI Menu Manager could recommend image work after the master feature was disabled | Image action definitions and photo-gap suggestions now require `ENABLE_AI_IMAGE_GENERATION` |
| Daily retention repeatedly scanned only the first 200 active stores | Added deterministic sorted UTC-day page rotation with no new state document or owner-flow change |
| Prompt-cache cleanup could remove only 25 expired rows per day | Kept the 25-row burst cap, changed cadence to hourly oldest-first cleanup, and exposed `hasMoreExpired` in scheduler task details |
| A transient prompt-cache source deletion failure could still remove its Firestore pointer | Cache rows now remain available for the next hourly retry when private-source deletion fails |
| Batch trigger created all task requests simultaneously | Reused `mapWithConcurrency()` with an eight-request cap while preserving the same task IDs and per-item failure projection |
| Implementation docs overstated batch request-body limits | Corrected the batch trigger and worker limits to the source-enforced 4MB and 256KB boundaries |
| Aggregate readiness assertions still expected pre-cross-check Gate 7 and Razorpay evidence | Aligned the verifier with the July 15 batch-worker/queue-policy blocker, scheduler-only deploy attempt, and July 14 Razorpay read-only evidence |

The July 16 media changes preserve generated-image selection, provider prompts/models, job schema, AI reservation/accounting, subscription balances, accepted-image persistence, public cache invalidation, and worker retry semantics. Owner review copy now truthfully says that discarding adds no images instead of promising immediate physical deletion. Hot job/subscription documents remain unchanged until measured contention justifies a migration.

### Current release boundary

Source verification does not equal target release certification. The July 15 scoped QA scheduler deploy passed predeploy lint/build and then stopped before upload at Cloud Resource Manager HTTP 403. The current workspace app env files also lack `BATCH_IMAGE_GENERATION_WORKER_SECRET`. Remaining owner/external evidence is target app deployment, Firebase scheduler permission/deployment, complete target Cloud Tasks configuration/secrets and queue-policy capture, live Gemini smoke, authenticated desktop/mobile owner flow QA, and public menu/Official Business Page render/cache smoke.

### Current command evidence

Passed:

- `npm run verify:ai-accounting`
- `npm run verify:ai-menu-manager`
- `npm run test:image-batch:rules`
- `npm run test:image-batch-item-concurrency:emulator`
- `npm run verify:storage-paths`
- `npm run test:admin-immutable-object-boundary`
- `npm run test:media-storage-boundary`
- `npm run verify:menu-project-editor-boundary`
- `npm run verify:public-business-truth`
- `npm run verify:dependency-freeze`
- `npx tsc --noEmit`
- scoped root ESLint
- `npm --prefix functions run build`
- `npm --prefix functions run lint`
- `npm run verify:functions-deploy-preflight`
- `git diff --check`

Blocked outside this feature slice:

- `npm run verify:auth-security-failure-matrix` stops on an existing `Math.random()` violation in `src/components/templates/main-app/reseller/resellerDiagnostics.ts`.
- `npm run verify:agent-readiness` now accepts the refreshed batch/Razorpay evidence and then stops on an unrelated historical production-audit documentation-health assertion while the concurrent video-doc changes keep the global link gate red.
- The latest global `npm run docs:check-links` sees no AI image-generation link failure, but stops on two unrelated missing video deliverables (`menulist-owner-ease-30s-v1.10.mp4` and `v1.11.mp4`) plus existing/new video naming warnings in the concurrently changing worktree.
- The scoped QA scheduler deploy stops before upload with Cloud Resource Manager HTTP 403.

### Historical material boundary

The remainder of this file preserves earlier verification history. Where it conflicts with the current section or current code, it is superseded. In particular, historical statements about a declaration-only flag being “fixed,” disabled transaction recording, no batch limit, an active older model, fixed timing/reliability, or future P2/P3 commitments are not current truth.

---

## Historical Executive Summary

Comprehensive verification of the AI Image Generation feature against:

- Codebase implementation (line-by-line review)
- Feature documentation (`__docs__/projects/ai-image-generation/`)
- Project doctrine (`IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`)
- Cascade chat session history
- Industry best practices (Google Gemini API docs)

**Overall Assessment:** Code-side hardening is complete for the reviewed scope, and the feature is controlled-owner-testing ready. This is not current MenuList launch certification: provider smoke, browser/device QA, app/Vercel deployment for Next API changes, Firebase scheduler deployment for retention cleanup, live Storage cleanup, and production-host evidence still follow the External Certification Runbook and the current production-readiness audit.

---

## 1. Deep Codebase Review Summary

### Files Reviewed

| File                           | LOC  | Status               | Issues Found              |
| ------------------------------ | ---- | -------------------- | ------------------------- |
| `EditImageModal.tsx`           | 940  | ✅ Fixed             | console output removed    |
| `index.tsx` (AiImageGenerator) | 1172 | ✅ Fixed             | console output removed    |
| `route.ts` (image-editing)     | 266  | ✅ Fixed             | bounded route diagnostics |
| `route.ts` (image-generation)  | 272  | ✅ Fixed             | no direct console output  |
| `batch-generation/route.ts`    | 469  | ✅ Fixed             | bounded worker diagnostics |
| `batch-trigger/route.ts`       | 339  | ✅ Fixed             | bounded trigger diagnostics |
| `BatchImageGenerationResultView.tsx` | 520 | ✅ Fixed | bounded owner result-action diagnostics |
| `promptsList/*.ts`            | n/a  | ✅ Fixed             | Prompt failures use bounded diagnostics and active prompt inputs are sanitized |
| `imageViewType.ts`             | 56   | ✅ Verified          | userPrompt fields present |
| `features.ts`                  | 669  | ✅ Fixed             | Feature flag added        |

### Critical Fixes Applied (P0)

| Issue                    | Location                        | Fix Applied                           |
| ------------------------ | ------------------------------- | ------------------------------------- |
| **debugger statement**   | `batch-generation/route.ts:164` | ✅ Removed                            |
| **Missing feature flag** | `src/config/features.ts`        | ✅ Added `ENABLE_AI_IMAGE_GENERATION` |
| **console.error in API** | `image-editing/route.ts:157`    | ✅ Replaced with `logger.error`       |
| **console.log in UI**    | `EditImageModal.tsx:171,179`    | ✅ Removed                            |
| **console.error in UI**  | `EditImageModal.tsx:201`        | ✅ Removed                            |
| **console.error in UI**  | `index.tsx:151`                 | ✅ Removed                            |
| **raw batch diagnostics** | `batch-trigger`, `batch-generation`, `cloudTask`, `BatchImageGenerationResultView` | ✅ Replaced with stable codes and bounded metadata |
| **nullable edit prompt** | `/api/image-editing` + `promptsList/index.ts` | ✅ Missing generated prompts rejected before Gemini; dynamic prompt text normalized |

### Console.log Cleanup (Feb 4, 2026) ✅

| File                        | Status       | Change                                      |
| --------------------------- | ------------ | ------------------------------------------- |
| `image-generation/route.ts` | ✅ **FIXED** | Replaced 4 console statements with logger   |
| `batch-generation/route.ts` | ✅ **FIXED** | Replaced 8 console statements with logger   |
| `prompt.ts`                 | ✅ **FIXED** | Replaced 6 console statements with comments |
| `image-editing/promptsList/*.ts` | ✅ **FIXED** | Replaced prompt-helper console errors with bounded diagnostics |
| `batch-trigger/route.ts` | ✅ **FIXED** | Raw enqueue/job-status diagnostics now use bounded runtime diagnostics |
| `batch-generation/route.ts` | ✅ **FIXED** | Worker failure logs and item summaries now use bounded diagnostics |
| `src/lib/google/cloudTask/index.ts` | ✅ **FIXED** | Cloud Tasks init/create failures use stable codes and lazy client init |
| `BatchImageGenerationResultView.tsx` | ✅ **FIXED** | Cancel/upload/discard/retry failures use stable codes, bounded runtime diagnostics, and job/status acknowledgement guards |

### Remaining Issues (P2 - Non-Critical)

| Issue                  | Location       | Recommendation                    |
| ---------------------- | -------------- | --------------------------------- |
| Typo: `referanceImage` | Multiple files | Consider rename only with a migration plan |

### June 28, 2026 Diagnostic Follow-up

- `npm run verify:ai-accounting` now guards batch trigger, worker, and Cloud Tasks helper diagnostics.
- Batch trigger failure diagnostics use `image_batch_*` stable codes with bounded project/job/item metadata.
- Worker failure diagnostics use `image_batch_worker_*` stable codes, fixed success/failure task copy, and bounded item summaries.
- Cloud Tasks helper initializes lazily and logs `cloud_tasks_client_initialization_failed` / `cloud_tasks_batch_image_task_create_failed` with configuration booleans and bounded task metadata.

### June 29, 2026 Diagnostic Follow-up

- `npm run verify:ai-accounting` now also guards `BatchImageGenerationResultView.tsx` against raw `logger.error(..., error)` calls.
- Owner result-action failures use `image_batch_result_cancel_failed`, `image_batch_result_upload_failed`, `image_batch_result_discard_failed`, and `image_batch_result_retry_failed` with bounded project/job/count/status metadata.
- Existing owner-visible failure copy, project image writes, batch job status updates, Storage cleanup, and retry behavior are unchanged.

### June 30, 2026 Acknowledgement Follow-up

- `npm run verify:ai-accounting` now guards `assertImageBatchJobCreateSucceeded()`, `assertImageBatchJobUpdateSucceeded()`, batch-start rejection codes, and owner result-action update rejection codes.
- Batch start requires a returned job ID before triggering `/api/image-generation/batch-trigger`.
- Cancel, upload/finish, discard, retry, and failed-start marking require matching job/status acknowledgements before owner success copy or completion callbacks advance.
- Existing valid batch job writes, Cloud Tasks trigger behavior, project image writes, Storage cleanup, and owner-visible failure copy are unchanged.

### Multi-Outlet Governance (Feb 4, 2026)

| Store Type     | Can Generate Images For                   |
| -------------- | ----------------------------------------- |
| **Standalone** | All items (whole menu)                    |
| **Master**     | All items (whole menu)                    |
| **Outlet**     | **ONLY local-only items** (`L_I_` prefix) |

**Files Modified:**

| File                                       | Change                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `ImageUploadModal.tsx:12,36-39,54,127-138` | Added `itemStates`, `isMasterLinked` props; filter items by `local-only` |
| `Editor.tsx:972-974`                       | Pass governance props to ImageUploadModal                                |

**Verification Checklist:**

- ✅ Items list filtered by governance for outlets
- ✅ Single image generation respects governance
- ✅ Batch image generation respects governance (uses filtered items list)
- ✅ TypeScript compiles without errors
- ✅ Documentation updated in `ai-image-generation_impl.md`

---

## 2. Cross-Check: Cascade Chat vs Codebase

### Verified Implementations ✅

| Chat Request                                         | Implementation Status          | Location                             |
| ---------------------------------------------------- | ------------------------------ | ------------------------------------ |
| Filter irrelevant platform features by business type | ✅ Implemented                 | `EditImageModal.tsx:74-90`           |
| Add userPrompt: "optional" to business features      | ✅ Implemented                 | `imageViewType.ts`                   |
| Replace console.log with logger in API               | ✅ **COMPLETED** (Feb 4, 2026) | All routes now use logger            |
| Use UUID for transaction ID                          | ✅ Implemented                 | `image-editing/route.ts:136`         |
| Safe promptImages length check                       | ✅ Implemented                 | `promptsList/index.ts:45,48`         |
| UI improvements (grouped features)                   | ✅ Implemented                 | `EditImageModal.tsx:475-493`         |
| Default to "Enhance Image" feature                   | ✅ Implemented                 | `EditImageModal.tsx:95,107`          |
| Inline upload selection                              | ✅ Implemented                 | `EditImageModal.tsx:224-228,341-406` |
| Clear visual indicator for editing                   | ✅ Implemented                 | `EditImageModal.tsx:461-472`         |

### No Missing Items from Chat History

All items discussed in the Cascade session have been implemented.

---

## 3. Cross-Check: Codebase → Documentation

### Code Features Documented ✅

| Codebase Feature                  | Documented In                      |
| --------------------------------- | ---------------------------------- |
| Single image generation           | `_impl.md` Section 3               |
| Batch generation with Cloud Tasks | `_impl.md` Section 3.2             |
| Image editing features            | `_impl.md` Section 3.3             |
| Business-specific features        | `_impl.md` Section 3.3             |
| Platform-wide features            | `_impl.md` Section 3.3             |
| Rate limiting                     | `_impl.md` Security Checklist      |
| Input validation (Zod)            | `_impl.md` Security Checklist      |
| Prompt injection prevention       | `_impl.md` Security Checklist      |
| Real-time progress tracking       | `_impl.md` Implementation Patterns |
| Feature flag                      | `_impl.md` (now documented)        |

### Code Features NOT Documented (Need Addition)

| Feature                                   | Location                   | Action                        |
| ----------------------------------------- | -------------------------- | ----------------------------- |
| Feature flag `ENABLE_AI_IMAGE_GENERATION` | `features.ts:526`          | ✅ Added to impl.md reference |
| Business type filtering for features      | `EditImageModal.tsx:74-90` | Document in impl.md           |

---

## 4. Cross-Check: Documentation → Codebase

### Documented Items Verified in Code ✅

| Documentation Claim       | Code Location                    | Verified |
| ------------------------- | -------------------------------- | -------- |
| Gemini 2.5 Flash Image model | `src/constants/AI/models.ts` and `src/app/api/image-generation/generators.ts` | ✅       |
| Deprecated Imagen branch removed | `src/app/api/image-generation/generators.ts` | ✅       |
| withAuth middleware       | `route.ts:68`                    | ✅       |
| Rate limiting (5 req/min) | `route.ts:75`                    | ✅       |
| Zod validation schemas    | `route.ts:80`                    | ✅       |
| Cloud Task integration    | `batch-trigger/route.ts`         | ✅       |
| Firestore batch job DAL   | `imageBatchProcessing/index.tsx` | ✅       |
| Real-time listener hook   | `useImageBatchJobListener.ts`    | ✅       |

### Documented Items NOT in Code (Gaps)

| Documentation Claim                  | Status            | Resolution                                |
| ------------------------------------ | ----------------- | ----------------------------------------- |
| `GenerationHistory.tsx` integration  | ❌ NOT integrated | Documented as "NOT INTEGRATED" in impl.md |
| `PromptEnhancer.tsx` integration     | ❌ NOT integrated | Documented as "NOT INTEGRATED" in impl.md |
| `imageQualityGuard.ts` for AI images | ❌ NOT integrated | P2 - add to generation flow               |

---

## 5. Compliance: MASTER RULES & WORKFLOW

### Law Compliance Status

| Law                               | Requirement               | Status   | Notes                                    |
| --------------------------------- | ------------------------- | -------- | ---------------------------------------- |
| **Law 1: 3-Year Freeze**          | Complete at launch        | ✅       | All features implemented                 |
| **Law 2: Codebase Truth**         | Code > ChatGPT            | ✅       | Verified against actual code             |
| **Law 3: Single Doc Rule**        | One doc set               | ✅       | `__docs__/projects/ai-image-generation/` |
| **Law 4: Feature Flags**          | Required for all features | ✅ Fixed | Master flag enforced across reviewed API/UI/assistant entries |
| **Law 5: Path Verification**      | Exact file:line refs      | ✅       | All docs have file references            |
| **Law 6: Cascade Primary**        | Cascade enhances          | ✅       | This verification demonstrates           |
| **Law 7: Continuous Improvement** | Update prompts            | ✅       | Will update if patterns found            |

### Anti-Patterns Check

| Anti-Pattern            | Found?   | Evidence                                               |
| ----------------------- | -------- | ------------------------------------------------------ |
| Multiple scattered docs | ❌ No    | Single `__docs__/projects/ai-image-generation/` folder |
| Missing feature admission | ✅ Fixed | Master flag is declared and enforced across reviewed entry points |
| Vague file references   | ❌ No    | All docs have exact paths                              |
| Future-phase mentions   | ❌ No    | Everything ships complete                              |

---

## 6. Project Consistency Check

### UI/UX Patterns

| Pattern         | AI Image Gen                 | Project Standard  | Match |
| --------------- | ---------------------------- | ----------------- | ----- |
| Modal component | Ant Design Modal             | Ant Design Modal  | ✅    |
| Loading states  | Redux startLoader/stopLoader | Same pattern      | ✅    |
| Error handling  | message.error()              | Same pattern      | ✅    |
| Card layouts    | Ant Design Card              | Ant Design Card   | ✅    |
| Icons           | react-icons/lu               | Project uses same | ✅    |
| Theme tokens    | theme.useToken()             | Same pattern      | ✅    |

### Code Patterns

| Pattern             | AI Image Gen         | Project Standard | Match |
| ------------------- | -------------------- | ---------------- | ----- |
| API route structure | withAuth + try/catch | Same pattern     | ✅    |
| Context providers   | useContext hooks     | Same pattern     | ✅    |
| TypeScript types    | Strongly typed       | Same pattern     | ✅    |
| File organization   | Feature folders      | Same pattern     | ✅    |

### Naming Conventions

| Convention               | Status | Notes                                              |
| ------------------------ | ------ | -------------------------------------------------- |
| PascalCase components    | ✅     | `EditImageModal`, `StyleSelector`                  |
| camelCase functions      | ✅     | `generateNewImageClick`, `handleUploadEditedImage` |
| SCREAMING_CASE constants | ✅     | `IMAGE_VIEW_TYPES`, `PLATFORM_EDITING_FEATURES`    |
| kebab-case files         | ✅     | `image-editing/route.ts`                           |

---

## 7. UI Component Honest Feedback

### EditImageModal.tsx (546 lines)

**What Works Well:**

- ✅ Clean separation of business-specific vs platform features
- ✅ Good visual hierarchy with grouped sections
- ✅ Inline upload selection (UX-18 improvement)
- ✅ Clear visual indicator for which image is being edited
- ✅ Auto-selection of newly generated images
- ✅ Success state feedback before modal close

**What Needs Improvement:**

- ✅ Modal is getting large (546 lines) - consider extracting sub-components
- ✅ Some inline styles could move to CSS classes for reusability
- ✅ `FEATURE_FRIENDLY_INFO` could be moved to a constants file

### index.tsx (AiImageGenerator - 558 lines)

**What Works Well:**

- ✅ Collapsible advanced options (reduces cognitive load)
- ✅ Clear loading states with skeleton previews
- ✅ Multi-image selection for upload
- ✅ Reference image selection with visual feedback
- ✅ Business-type aware options

**What Needs Improvement:**

- ✅ File is large (558 lines) - consider splitting
- ✅ Some repetitive Flex/Typography patterns could be extracted
- ✅ Multi-mode toggle could have clearer explanation

### StyleSelector.tsx (113 lines)

**What Works Well:**

- ✅ Clean modal interface
- ✅ Category tabs for organization
- ✅ Multi-select capability
- ✅ Business-type recommendations

**What Needs Improvement:**

- ✅ Could add visual style previews (thumbnails)
- ✅ Clear all button could be more prominent

### ChatWidgetUi.tsx (130 lines)

**What Works Well:**

- ✅ Sticky bottom position for accessibility
- ✅ Shows selected style as tag
- ✅ Rotating prompt examples
- ✅ Quick enhancer tags inline

**What Needs Improvement:**

- ⚠️ Could add "Quick Generate" button for zero-config generation

---

## 8. User-Friendliness Assessment

### First-Time User Experience (Non-Tech SMB Owner)

| Aspect                | Rating | Notes                                             |
| --------------------- | ------ | ------------------------------------------------- |
| **Discoverability**   | 8/10   | Clear "Generate with AI" entry point              |
| **Cognitive Load**    | 7/10   | Advanced options collapsed by default ✅          |
| **Error Recovery**    | 8/10   | Clear error messages, retry options               |
| **Progress Feedback** | 9/10   | Real-time progress, skeleton previews             |
| **Decision Support**  | 7/10   | Recommended styles, but could be more opinionated |
| **Completion Flow**   | 8/10   | Inline upload selection reduces friction          |

### Recommended UX Enhancements (P3)

1. **Quick Generate** - One-click with smart defaults
2. **Style Previews** - Thumbnail examples for each style
3. **Time Estimate** - "~30 seconds" estimate before generation
4. **Undo Option** - Allow reverting uploaded images

---

## 9. Web Research: Latest Best Practices

### Google Gemini API (Jan 2026)

| Current Implementation                      | Google Recommendation                                    | Gap                       |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------- |
| `gemini-2.5-flash-image` | `gemini-3.1-flash-image` only after output and billing regression checks | Current stable production default |
| Basic prompts                               | Be hyper-specific, provide context and intent            | Prompts are good          |
| No thinking process                         | Gemini 3 Pro has "Thinking Process"                      | Future consideration      |
| 1 reference image                           | Gemini 3 Pro supports up to 14 images                    | Good for current use case |

### Best Practices Alignment

| Practice                  | Implementation Status                     |
| ------------------------- | ----------------------------------------- |
| Hyper-specific prompts    | ✅ Business-specific prompts are detailed |
| Context and intent        | ✅ Item details passed to prompt          |
| Iterative refinement      | ⚠️ Not implemented (multi-turn editing)   |
| Step-by-step instructions | ✅ Prompts are structured                 |
| Semantic negative prompts | ✅ "Exclude from image" field available   |
| Camera control language   | ✅ Compositions include camera angles     |

---

## 10. Historical performance notes (not a runtime SLA)

### Current State

| Metric            | Current source truth | Release evidence |
| ----------------- | -------------------- | ---------------- |
| Single generation | Provider- and payload-dependent; no fixed duration is promised | Target Gemini smoke pending |
| Batch (1–50 items) | Queue dispatch, retries, provider behavior, and item count determine duration | Queue-policy capture and controlled worker smoke pending |
| Image upload      | Network, prepared media size, and Storage availability determine duration | Authenticated desktop/mobile smoke pending |
| Modal load        | Local UI path with shared desktop/mobile logic | Browser/device QA pending |

### Optimization Opportunities

| Optimization                           | Effort | Impact                     | Priority |
| -------------------------------------- | ------ | -------------------------- | -------- |
| Parallel prompt execution              | Already bounded in current source | Preserve the cap; measure before changing | Closed |
| Image preparation before upload        | Shared browser/Admin media profiles | Preserve current WebP/size boundary | Closed |
| Prompt caching                         | Eligible batch requests use the private-source cache | Measure hit rate and cleanup backlog before tuning | Observe |
| Batch Prediction API                   | Not used; current batch maximum is 50 | Do not migrate without measured provider/queue evidence | No action |

### Doctrine Alignment

Per MenuList Constitution:

- **Law 5: Public Surfaces Demand Perfection** - `imageQualityGuard.ts` exists but NOT applied to AI-generated images
- **Recommendation:** Integrate quality guard before upload

---

## 11. Scope for Improvement

### High Priority (P1) - Should Do

| Improvement                               | Benefit              | Effort |
| ----------------------------------------- | -------------------- | ------ |
| Replace remaining console.log with logger | Production security  | Low    |
| Enable transaction recording              | Token usage tracking | Low    |
| Add batch size limit (max 50)             | Cost protection      | Low    |

### Medium Priority (P2) - Could Do

| Improvement                               | Benefit                | Effort |
| ----------------------------------------- | ---------------------- | ------ |
| Integrate `imageQualityGuard.ts`          | Quality assurance      | Medium |
| Integrate `optimizeImage.ts`              | Storage cost reduction | Medium |
| Extract shared `generateImage()` function | Code deduplication     | Medium |
| Add partial batch retry                   | Better UX for failures | Medium |

### Low Priority (P3) - Nice to Have

| Improvement                       | Benefit         | Effort |
| --------------------------------- | --------------- | ------ |
| Integrate `GenerationHistory.tsx` | Reuse settings  | Medium |
| Add cost estimation before batch  | User confidence | Low    |
| Upgrade to Gemini 2.5 Flash Image | Better quality  | Medium |
| Add style preview thumbnails      | Better UX       | High   |

---

## 12. Historical Items for Discussion (Superseded)

### Decisions Required

| Topic                         | Options                                   | Recommendation                    |
| ----------------------------- | ----------------------------------------- | --------------------------------- |
| **Model Upgrade**             | Historical 2.0/2.5 decision               | Resolved: current source uses `gemini-2.5-flash-image` |
| **Transaction Recording**     | Historical disabled/enabled decision      | Resolved: shared reservation/accounting is active |
| **Batch Size Limit**          | Historical unlimited/50 decision          | Resolved: 50 is enforced across UI/client/server |
| **Quality Guard Integration** | Add vs skip                               | Add for Law 5 compliance          |

### Open Questions

1. Should we rename `referanceImage` to `referenceImage`? (Breaking change)
2. Should `GenerationHistory.tsx` be integrated in this release or deferred?
3. Is current default style selection optimal for each business type?

---

## 13. Historical Decision Rationale (Superseded)

### Why Feature Flag Was Missing

The feature was developed incrementally and the flag declaration was added later. Runtime/API/UI enforcement was completed in the July 14, 2026 cross-check.

### Why Transaction Recording Was Disabled Historically

An older test-era path disabled recording. Current source uses shared reservation, settlement, refund, and owner-history presentation; this historical rationale is not current behavior.

### Why Some Console Output Remained Historically

Earlier backend and frontend paths retained raw debugging. Current reviewed routes use bounded diagnostics and the active verifier rejects the retired raw-output patterns.

### Why There Was No Batch Size Limit Historically

The initial implementation did not cap every selection path. Current source enforces a shared 50-item ceiling before configuration/job creation and again at client/server projection boundaries.

---

## Verification Checklist

- [x] Deep codebase review (line by line)
- [x] Cross-check cascade chat with codebase
- [x] Cross-check codebase with docs (code → docs)
- [x] Cross-check docs with codebase (docs → code)
- [x] Verify compliance with MASTER RULES
- [x] Check feature consistency with project
- [x] Fix critical bugs found
- [x] Review each UI component
- [x] Cross-check user-friendliness
- [x] Search web for improvements
- [x] Check performance considerations
- [x] Document decision rationale
- [x] Log scope for improvement
- [x] Report discussion items

---

**Verification Complete.** Code-side verification for this report is complete; full production certification remains gated by External Certification Runbook evidence and the current production-readiness audit.

---

## 14. Post-Verification Updates (January 30, 2026 - Session 2)

### Changes Applied

| Change                         | Files Modified                                           | Description                                                                         |
| ------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Model Upgrade**              | `route.ts`, `batch-generation/route.ts`                  | Upgraded to stable `gemini-2.5-flash-image` and centralized through `GEMINI_MODELS.IMAGE_GEN` |
| **Constants Consolidation**    | `imageViewType.ts`, `constants.ts`, `EditImageModal.tsx` | Removed redundant `FEATURE_FRIENDLY_INFO` - fields now in `ImageEditingFeatureType` |
| **StyleSelector Improvements** | `StyleSelector.tsx`                                      | Added visual emoji previews, prominent danger-styled Clear all button               |
| **Quick Generate Button**      | `ChatWidgetUi.tsx`                                       | Added zero-config "Quick Generate" with smart defaults                              |
| **Multi-mode Toggle**          | `index.tsx`                                              | Enhanced with Card component, clear mode labels, and explanations                   |

### Type Extension: ImageEditingFeatureType

Extended with UX-friendly display fields (single source of truth):

```typescript
export type ImageEditingFeatureType = {
  featureName: string;
  description: string;
  prompt: string;
  userPrompt?: "required" | "optional" | "";
  promptImage?: "required" | "optional" | "";
  // NEW: UX-friendly display info
  icon?: string; // Lucide icon name (e.g., 'LuZap')
  friendlyName?: string; // User-friendly name
  whatItDoes?: string; // Short description
  example?: string; // Before/after example
};
```

### Constants File Cleanup (Session 2 Update)

**`constants.ts` DELETED** - All constants now consolidated in `imageViewType.ts`:

- `ImageEditingFeatureType` - Extended with UX fields (icon, friendlyName, whatItDoes, example)
- `PLATFORM_EDITING_FEATURES` - Now includes all UX-friendly display info
- `BUSINESS_FEATURE_MAP` - Business type to feature mapping (moved from constants.ts)
- `UNIVERSAL_FEATURES` - Features available to all business types (moved from constants.ts)

**Single Source of Truth:** All image editing feature-related constants now in one file.

### Verification Items Completed

| Item from Section 7                                         | Status                                  |
| ----------------------------------------------------------- | --------------------------------------- |
| ⚠️ `FEATURE_FRIENDLY_INFO` could be moved to constants file | ✅ **Better: Consolidated into type**   |
| ⚠️ Multi-mode toggle could have clearer explanation         | ✅ **Fixed: Card with mode labels**     |
| ⚠️ Could add visual style previews                          | ✅ **Fixed: Emoji previews added**      |
| ⚠️ Clear all button could be more prominent                 | ✅ **Fixed: Danger style + icon**       |
| ⚠️ Could add "Quick Generate" button                        | ✅ **Fixed: Added with smart defaults** |

### Model Upgrade Details

| Before                                      | After                            |
| ------------------------------------------- | -------------------------------- |
| Deprecated preview image model              | `gemini-2.5-flash-image` |
| Unverified free-tier assumption             | Current billing/quota must be checked in Google AI Studio |
| Lower quality                               | Better image quality             |

---

_Document follows `IDE_PROMPTS/6. DOCUMENTATION STRUCTURE PROMPT.md` verification template._
