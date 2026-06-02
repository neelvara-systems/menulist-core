# Menu Extraction Pipeline — Test Cases

**Status:** Implemented
**Last Updated:** June 2, 2026

## Owner Upload

- Valid dashboard upload creates a job through `POST /api/menu-extraction/jobs`.
- Valid mobile upload creates a job through the same helper.
- Client helper does not call `addDoc()` or `setDoc()` for `menuImageProcessingJobs`.
- The protected route does not accept client-provided `source` or `sourceMetadata`.
- A project ID from another tenant/store returns 403.
- A missing project returns 404.
- A non-Firebase or wrong-prefix file URL returns 400.
- A `block` menu-intake decision returns 422 and no job.
- A `confirm` or `notice` decision without `identityOverrideConfirmed` returns 409 and no job.
- Existing active jobs are reused.

## Public Create-Menu

- Image upload creates a `publicMenuDrafts` document and a `menuImageProcessingJobs` document.
- Link upload creates a public draft and a durable extraction job.
- Supported public sources attach `sourceMetadata.identityCheck` to the job and completion fills detected business fields.
- Worker success updates `publicMenuDrafts.extractionStatus = "completed"`.
- Worker failure updates `publicMenuDrafts.extractionStatus = "failed"`.
- Claim still requires completed extraction data.
- Claim writes a standard project file entry with `active`, `deleted`, `index`, and `extractedData.message`.

## Retry

- Retrying a failed owner upload creates a new job through `POST /api/menu-extraction/jobs`.
- Retrying a failed menu-link import preserves `source: "menu_link_import"` and validates `menuLinkImports/{tId}/{sId}/{projectId}/` Storage paths.
- Non-retryable failed jobs cannot create replacement jobs.

## Contract Verification

- `npm run verify:menu-extraction-pipeline` passes.
- `npm run verify:menu-extraction-pipeline:dry-run` passes.
- `src/data/shared/menuExtractionJob.ts` and `functions/src/sharedData/menuExtractionJob.ts` are byte-for-byte identical.
- Every job producer uses a shared destination builder and emits `destinationType`.
- Messaging HEIC/HEIF files remain accepted by the worker MIME contract.
- Public create-menu image upload remains JPEG/PNG/WebP only; PDFs are still owner-upload/link-import capable but not public-image capable.
- Browser cancellation updates cannot mutate server-owned job fields while changing status.
- App job types and extraction monitor surfaces expose source and destination fields.
- Public draft completion normalizes extracted data to the project/editor shape: category `active`, item `category`, item `active`, item `available`, attribute activity, and language `isPrimary`.
- Review apply creates standard source file shells with `active`, `deleted`, `index`, and `extractedData.message`.
- Public draft claim creates project IDs in `{tenantId}-{timestamp}-{storeId}` format so `/client` can load the claimed project.
- Messaging extraction stores standard project file envelopes before approval.
- Messaging approval writes a renderer-ready project, platform summary entry, and public cache tags.
- `/client` loading and `MenuPageNew` rendering remain aligned with the normalized extracted-data shape.

## Worker

- Owner project saves fail when the project document is missing.
- Public draft files are accepted only under `publicMenuDrafts/{draftId}/`.
- Messaging files are accepted only under `messagingOnboarding/{sessionId}/`.
- Empty extracted item/category shape fails before project save or public draft completion.
- Public draft claim receives already-normalized extracted data and wraps it in a standard project file entry.
- Applied review changes revalidate the public client menu cache for the project.
- Public draft claim revalidates menu/store/client-store tags after creating the claimed project.
- Messaging publish revalidates menu/store/client-store tags after creating the live project.
