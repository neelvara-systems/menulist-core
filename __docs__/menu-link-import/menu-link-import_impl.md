# Menu Link Import Implementation

## Implementation Summary

Menu Link Import reuses the existing extraction infrastructure instead of adding a separate crawler or AI path.

1. UI calls `POST /api/menu-link-imports`.
2. The API validates auth, tenant/store access, feature flag, rate limit, permission confirmation, and URL safety.
3. The API fetches the source directly with DNS/IP validation, pinned request lookup, redirect re-checks, size caps, and a bounded acquisition budget.
4. HTML/text/JSON sources are converted into a text artifact; PDF/image sources are stored as-is. Low-confidence HTML can fall back to a bounded same-origin linked PDF/image catalog asset.
5. The API stores one private source artifact and writes a `menuLinkImportArtifacts` document.
6. The API creates a `menuImageProcessingJobs` document with `source: "menu_link_import"` and `forceReview: true`.
7. Cloud Functions process the job with the existing Gemini file extraction pipeline.
8. `forceReview` makes the job land in `preview_ready`.
9. Existing review UI creates the apply plan.
10. Existing `applyExtractionChanges` writes approved source file and menu data, then revalidates public cache through the current path.

The pinned request lookup handles both Node lookup callback shapes. When Node asks for `all: true`, the importer returns the validated address array shape; when it asks for a single address, the importer returns the single validated address. Multi-address hosts are sorted with IPv4 first but all resolved addresses must still pass the unsafe-IP guard.

## Source Discovery Terms

Source scoring and same-origin candidate discovery are business-agnostic. They use shared business-category context from `src/data/shared/businessTypes.ts` / `functions/src/sharedData/businessTypes.ts`:

- Food & Beverage keeps food/menu terms as category-specific hints.
- Service, retail, professional, creative, health, and specialty businesses use offer catalog terms such as services, products, pricing, rate cards, packages, treatments, classes, collections, appointments, rentals, and repairs.
- If a project has no resolved business category, the importer uses the generic offering vocabulary plus bounded terms across supported categories.

The heuristic only chooses which same-origin page or linked PDF/image is most likely to contain the owner-provided catalog. It does not publish anything and it does not change the extraction schema; Gemini still receives a text/PDF/image artifact and the existing forced-review flow remains the authority.

## Files

### Added

- `src/app/api/menu-link-imports/route.ts`
- `src/lib/menu-link-import/sourceAcquisition.ts`
- `src/lib/menu-link-import/client.ts`
- `__docs__/menu-link-import/*`

### Modified

- `src/config/features.ts`
- `functions/src/constants/features.ts`
- `src/constants/database.ts`
- `functions/src/constants/database.ts`
- `src/lib/rateLimit/configs.ts`
- `src/lib/firebase/menuProcessing.ts`
- `functions/src/types/menuProcessingJob.types.ts`
- `functions/src/logic/processMenuImagesJob.ts`
- `functions/src/logic/parallelProcessingPrompt.ts`
- `src/lib/extraction/applyChanges.ts`
- `src/lib/extraction/comparisonEngine.ts`
- `src/components/templates/main-app/projects/index.tsx`
- `src/components/templates/main-app/projects/FileList.tsx`
- `src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx`
- `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewModal.tsx`
- `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx`
- `src/components/mobile/sheets/MenuUploadSheet.tsx`
- `firestore.rules`

## Why Not Gemini URL Context

Gemini URL Context remains an optional future diagnostic/fallback, not the canonical importer. It does not give MenuList enough control over fetched artifacts, redirects, retry behavior, source lineage, and future source comparison.

## Why Not Crawlee/Firecrawl/Apify in v1

The v1 requirement is a safe, owner-provided intake path. The existing extraction pipeline already handles image/PDF/text artifacts. Adding a crawler/vendor now would increase operational and policy surface before there is enough product evidence that dynamic crawling is needed.

## Review Behavior

Link import jobs force review:

```ts
source: "menu_link_import"
forceReview: true
```

This prevents blank-project auto-save from applying to link imports. Existing upload/photo/PDF jobs are unchanged and keep their current first-extraction behavior.

## Mixed Upload Behavior

- Link import creates an active processing job and disables the desktop Upload & Continue action until the job finishes or reaches review.
- If local photo/PDF files are selected but not uploaded yet, desktop link import is disabled until the owner uploads or clears those files.
- Existing processed menus expose link import next to the editor "Add Menu" file action, guarded by the same feature flag and the same active-job checks.
- Approved link imports seed a normal processed source-file entry with processing metadata, so the project file list can render imported text/PDF/image artifacts without assuming every processed source is an image.
- Later photo/PDF upload still filters only local base64 files for upload, so approved link source artifacts are ignored by future upload jobs.
- Later photo/PDF review jobs map source-local `file_0`, `file_1`, etc. targets back to the actual uploaded file UIDs for all single-store review jobs, not only link-import jobs. This keeps link-first then image/PDF upload in the same project from completing without writing the uploaded source file.
- Source-local extraction IDs are not trusted as stable cross-source item/category matches. Matching uses name/category similarity; new reviewed items receive source-scoped ids such as `0i1` so a later upload cannot update the wrong existing item just because Gemini reused `1`, `2`, `3`, etc.
- If a later upload adds items into a category already present from another source file, the apply path copies that category row into the new source file with the same category id. The editor can then render the uploaded file coherently while public output deduplicates categories by id.

## Review Resolution Rules

The review screen resolves link-import and re-extraction jobs client-side after owner approval. Firestore rules allow only the owning user to move `preview_ready` jobs to:

- `completed` with `currentStep: "Changes applied"`
- `cancelled` with `currentStep: "Changes discarded by user"`

The allowed job update fields are restricted to `status`, `completedAt`, `updatedAt`, and `currentStep`. Project data writes still go through the scoped `/projects/{tId}/{sId}/{projectId}` rules, and linked-outlet projects remain blocked from mutating `files`.

## Review UI Behavior

The review modal uses a viewport-bounded body and sticky action footer so Apply/Discard remain reachable on narrow desktop windows. Apply and discard failures render as an inline error alert in addition to the toast, which makes Firestore rule or data-contract failures visible during owner review.

The comparison layer resolves item category names from the extracted category list before building preview rows. This keeps link-import previews readable even when the extraction payload stores `categoryId` but omits the optional `categoryName` display field.

The editor source preview checks the source file MIME type before rendering the image zoom tool. Link-import text/PDF source files render as source-file panels with the original source link available, so the editor does not send `text/plain` or PDF artifact URLs through image rendering.

## Apply Safety

`applyExtractionChanges` sanitizes the final Firestore update payload before `updateDoc`. This removes nested `undefined` values from extracted categories/items while preserving Firestore `Timestamp` values. This is required because link/PDF extraction can omit optional fields such as `orderIndex`, and Firestore rejects arrays or objects containing `undefined`.

`applyExtractionChanges` now fails the owner approval action if a reviewed mutation targets a missing source file. This prevents the job from moving to `completed` while silently dropping approved categories/items.

Public Schema.org JSON-LD deduplicates categories by id before building `MenuSection` / `OfferCatalog` output. This preserves source-file editor coherence without duplicating public structured-data sections when multiple source files share the same category id.

## Failure Cleanup

If Storage artifact creation succeeds but Firestore job creation fails, the API deletes the newly created private Storage objects and artifact metadata before returning the owner-safe failure response. Once the job document exists, the extraction pipeline owns the job state.

## Storage Scope

V1 stores only the artifact used for extraction: text artifact, PDF, or image. Raw HTML is not stored separately to reduce Storage writes and avoid retaining page content that is not needed for the owner-review flow.
