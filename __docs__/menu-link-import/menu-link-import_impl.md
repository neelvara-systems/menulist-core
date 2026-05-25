# Menu Link Import Implementation

## Implementation Summary

Menu Link Import reuses the existing extraction infrastructure instead of adding a separate crawler or AI path.

1. UI calls `POST /api/menu-link-imports`.
2. The API validates auth, tenant/store access, feature flag, rate limit, permission confirmation, and URL safety.
3. The API fetches the source directly with DNS/IP validation, pinned request lookup, redirect re-checks, size caps, and a bounded acquisition budget.
4. HTML/text/JSON sources are converted into a text artifact; PDF/image sources are stored as-is. Low-confidence HTML can fall back to a bounded same-origin linked PDF/image menu asset.
5. The API stores one private source artifact and writes a `menuLinkImportArtifacts` document.
6. The API creates a `menuImageProcessingJobs` document with `source: "menu_link_import"` and `forceReview: true`.
7. Cloud Functions process the job with the existing Gemini file extraction pipeline.
8. `forceReview` makes the job land in `preview_ready`.
9. Existing review UI creates the apply plan.
10. Existing `applyExtractionChanges` writes approved source file and menu data, then revalidates public cache through the current path.

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
- `src/components/templates/main-app/projects/index.tsx`
- `src/components/templates/main-app/projects/FileList.tsx`
- `src/components/mobile/sheets/MenuUploadSheet.tsx`

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
- Approved link imports seed a normal processed source-file entry with processing metadata, so the project file list can render imported text/PDF/image artifacts without assuming every processed source is an image.
- Later photo/PDF upload still filters only local base64 files for upload, so approved link source artifacts are ignored by future upload jobs.

## Failure Cleanup

If Storage artifact creation succeeds but Firestore job creation fails, the API deletes the newly created private Storage objects and artifact metadata before returning the owner-safe failure response. Once the job document exists, the extraction pipeline owns the job state.

## Storage Scope

V1 stores only the artifact used for extraction: text artifact, PDF, or image. Raw HTML is not stored separately to reduce Storage writes and avoid retaining page content that is not needed for the owner-review flow.
