# Menu Extraction Pipeline — Implementation

**Status:** Implemented
**Last Updated:** June 2, 2026

## Files

| File | Role |
| --- | --- |
| `src/data/shared/menuExtractionJob.ts` | App-side shared extraction job contract: destinations, sources, limits, MIME types, and routing builders. |
| `functions/src/sharedData/menuExtractionJob.ts` | Cloud Functions mirror of the same shared contract; must stay byte-for-byte identical. |
| `src/app/api/menu-extraction/jobs/route.ts` | Protected owner extraction job creation. |
| `src/lib/menu-extraction/menuIntakeIdentityServer.ts` | Shared server helper for menu-intake identity preflight. |
| `src/app/api/menu-intake-identity/route.ts` | Existing preflight API, now delegates to the shared helper. |
| `src/lib/firebase/menuProcessing.ts` | Client helper; creates jobs through the protected API and keeps dev trigger support. |
| `functions/src/types/menuProcessingJob.types.ts` | Adds `destination` to the job contract. |
| `functions/src/logic/processMenuImagesJob.ts` | Central worker with destination handling and source validation. |
| `functions/src/logic/saveFilesToProject.ts` | Project save now fails if the project document does not exist. |
| `src/app/api/public/create-menu/route.ts` | Public drafts now queue durable extraction jobs. |
| `src/app/api/menu-link-imports/route.ts` | Adds explicit project destination metadata. |
| `functions/src/messagingOnboarding/intakeProcessor.ts` | Adds messaging destination metadata. |
| `firestore.rules` | Blocks direct browser job creation. |

## Owner Job Creation

The browser uploads files to Firebase Storage as before, then calls `createMenuProcessingJob()`. That helper now posts to `POST /api/menu-extraction/jobs`.

The route:

1. Requires `withAuth()`.
2. Checks SAFE_MODE.
3. Validates request shape with Zod.
4. Verifies tenant/store access.
5. Confirms `projectId` belongs to the session tenant/store.
6. Allows only configured Firebase Storage URLs under `projects/files/{tId}/{sId}/`.
7. Applies `AI_EXPENSIVE` rate limiting.
8. Requires the target project document to exist.
9. Reuses an existing active job if present.
10. Runs menu-intake identity when enabled.
11. Creates the job with shared routing fields: `destination.type = "project"` and `destinationType = "project"`.

The protected owner route treats source lineage as server-owned. It does not accept client-provided `source` or `sourceMetadata`; retry jobs load those fields from the original failed job after verifying owner, tenant, store, and project ownership.

## Public Draft Job Creation

`POST /api/public/create-menu` still creates `publicMenuDrafts/{draftId}` first. It then writes a `menuImageProcessingJobs/{jobId}` document with:

- `skipProjectSave: true`
- `destination.type = "public_menu_draft"`
- `destinationType = "public_menu_draft"`
- platform tenant/store/user IDs
- `projectId = 0-public-{draftId}-0`

When the public source is readable by the shared identity helper, the route also attaches `sourceMetadata.identityCheck` to the job. The worker uses that metadata to fill `publicMenuDrafts.detectedBusinessName` and `detectedBusinessType` on completion.

The worker marks the draft as `processing`, then writes `completed` or `failed`.

Before the draft is marked completed, the worker normalizes public draft extracted data to the same project/editor payload shape used by owner extraction: categories have `active`, items have `category`, `active`, `available`, normalized attribute activity, and languages are normalized objects with `isPrimary`. Claiming a completed public draft then creates a normal project file entry with `active: true`, `deleted: false`, `index: 0`, and `extractedData.message`. This keeps public `/create-menu` output aligned with owner extraction and messaging publish file shapes.

Claimed projects use the normal parseable project ID format `{tenantId}-{timestamp}-{storeId}`. This is required because the public client renderer and several backend helpers derive the nested project path from the project ID before loading `projects/{tenantId}/{storeId}/{projectId}`.

## Retry Handling

Failed-job retry still starts from the extraction monitor DAL, but the new retry job is created through `POST /api/menu-extraction/jobs`. The server route loads the failed source job, verifies owner/tenant/project ownership, preserves `source` and `sourceMetadata`, and validates the original Storage path before creating a replacement job. This keeps failed menu-link imports on the `menu_link_import` path instead of treating them as normal owner uploads.

When a review apply needs to create a source file shell for imported/re-extracted content, `applyExtractionChanges` writes the standard project file envelope (`active`, `deleted`, `index`, and `extractedData.message`) before saving categories/items. The same apply path revalidates the public client cache for the project, so the customer menu can render the applied data.

## Messaging Job Creation

Messaging onboarding still writes jobs from Cloud Functions and still uses `extractionWatcher.ts` to update the session. The job now includes `destination.type = "messaging_onboarding"` and `sessionId`, allowing the worker to validate `messagingOnboarding/{sessionId}/...` Storage paths.

Messaging upload MIME support is defined in the shared extraction contract through `MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES`. It includes the dashboard upload types plus HEIC/HEIF so WhatsApp/iPhone menu photos accepted by messaging intake remain accepted by the centralized worker.

After extraction, the watcher stores `extractedProjectFiles` on the messaging session using the same project file envelope as owner extraction: `active`, `deleted`, `index`, and wrapped `extractedData.message/data`. The active approval route calls `executeMessagingOnboardingPublish()` from `src/lib/messaging-onboarding/publish.ts`; that publisher writes `projects/{tenantId}/{storeId}/{tenantId}-default-{storeId}`, updates `platformSummary/projects_{storeId}`, and revalidates `menu-store`, `store`, and `client-stores` tags before returning the public URL. The older Cloud Functions publish helper is reference-only and is not the active publish path.

The worker enforces MIME by source/destination before AI work:

- Owner upload: PDF/JPEG/PNG/WebP.
- Public create-menu image upload: JPEG/PNG/WebP.
- Link import: acquired text/image/PDF artifacts.
- Messaging onboarding: PDF/JPEG/PNG/WebP/HEIC/HEIF.

## Verification

`npm run verify:menu-extraction-pipeline` checks:

- app and Functions shared contract files are byte-for-byte identical
- owner upload uses the protected API and does not accept client-owned source metadata
- public create-menu no longer contains inline extraction
- link import and messaging onboarding use shared routing builders
- worker uses shared limits, validates source files, updates public drafts, and keeps cache revalidation
- Firestore rules keep browser job creation blocked
- app-side job types and the extraction monitor expose source/destination fields
- public draft completion and claim write the standard extracted-data and project file shapes
- public draft claim creates renderer-parseable project IDs and revalidates menu/store cache tags
- review apply creates standard source file shells and revalidates the public render cache
- messaging extraction stores standard project file envelopes and messaging publish writes a renderer-ready project, summary entry, and public cache tags
- public `/client` loading and `MenuPageNew` rendering stay aligned with the parseable project ID and normalized extracted-data contracts

`npm run verify:menu-extraction-pipeline:dry-run` builds representative job objects for owner upload, failed link-import retry, public image, public menu link, authenticated link import, and messaging onboarding. It validates destination labels, source markers, skip-project-save behavior, expected Storage prefixes, source-specific MIME rules, HEIC/HEIF messaging compatibility, and restricted Firestore cancellation updates without calling live Firebase or Gemini.

## Compatibility

The existing review flow is preserved for re-extraction and link import. Public claim continues to read `draft.extractedData` and convert it to the first project file.
