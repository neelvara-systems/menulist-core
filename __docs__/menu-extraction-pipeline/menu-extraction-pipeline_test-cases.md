# Menu Extraction Pipeline — Test Cases

**Status:** Implemented
**Last Updated:** July 28, 2026

## Owner Upload

- Valid dashboard upload creates a job through `POST /api/menu-extraction/jobs`.
- Valid mobile upload creates a job through the same helper.
- Client helper does not call `addDoc()` or `setDoc()` for `menuImageProcessingJobs`.
- The protected route does not accept client-provided `source` or `sourceMetadata`.
- A project ID from another tenant/store returns 403.
- A missing project returns 404.
- A non-Firebase or wrong-prefix file URL returns 400.
- A zero-byte file declaration returns 400 before project/job/provider work.
- A retry whose persisted source file rows are empty, oversized, or duplicate-identity returns 400 before replacement-job/provider work.
- An action other than the fixed `image_processing` action returns 400.
- Unknown business type/category strings never enter the job, fingerprint, or worker prompt; persisted canonical project identity wins over request context.
- A normal small project with the full 15-file/page batch passes the bounded pre-AI headroom gate.
- A project without the required reserved headroom returns 413 before provider work, and a new owner upload is cleaned up.
- A `block` menu-intake decision returns 422 and no job.
- A `confirm` or `notice` decision without `identityOverrideConfirmed` returns 409 and no job.
- Existing active jobs are reused.
- Whitespace/path-shaped project IDs fail before the start route or active-job query.
- A malformed job ID in a successful start response fails before reuse, development triggering, or downstream state.
- Cancellation rejects malformed job IDs before a Firestore document ref, and active-job discovery drops malformed returned document IDs.

## Public Create-Menu

- Image upload atomically creates a deterministic `publicMenuDrafts` document and `menuImageProcessingJobs/public_{draftId}` document.
- Link upload uses acquired content identity and the same atomic draft/job boundary.
- Concurrent identical submissions return one owner/content-bound draft and cannot overwrite the winner with a different download token.
- Supported public sources attach `sourceMetadata.identityCheck` to the job and completion fills detected business fields.
- Worker success updates `publicMenuDrafts.extractionStatus = "completed"`.
- Worker failure updates `publicMenuDrafts.extractionStatus = "failed"`.
- A forged/mismatched public job fails before provider work and cannot update the referenced draft.
- Worker completion strips arbitrary provider, owner-boost, review, confidence, and unknown envelope fields; malformed/orphan DTOs fail.
- Owner listener rejects malformed persisted job IDs and malformed `preview_ready` result structures before comparison; a completed auto-save with malformed optional metrics stays completed but does not expose the bad result.
- Re-extraction comparison excludes orphan items and duplicate source-file/item IDs from every mutation plan and retains attributes, tags, dietary tags, spice level, duration, and active variant state for safe new items.
- Re-extraction rejects duplicate category IDs and a second category/item that maps to an already claimed persisted identity; dependent ambiguous items cannot enter a mutation plan.
- Invalid extracted prices remain warning-only, omitted category order does not delete the stored order, and weak category matches emit review warnings without renaming or reordering persisted truth.
- Primary-language item/category updates merge retained translations, configured weak thresholds control classification, and outlet-local updates contain only the explicitly changed fields.
- Standalone/master apply re-reads current project and `preview_ready` job inside one transaction and commits both; a concurrent edit or terminal job transition cannot be overwritten by a stale review snapshot.
- Linked-outlet review requires matching current local version and job ownership in the protected server transaction, then commits project and completion together and acknowledges the exact applied count.
- Firestore cloning preserves nested `Timestamp` values; patch-only local updates trigger a save and count as updates; the runtime save schema rejects mode/bucket mismatch and unknown patch fields.
- Client apply/discard and the Admin linked-outlet route reject a `preview_ready` job whose persisted owner is missing or does not match the current session.
- Replacing job A with job B at the same desktop/mobile review position renders job B's preview, bases the first approval interaction on job B, and ignores a late job-A apply acknowledgement instead of closing job B.
- Switching job/project while a linked-master read is pending cancels the retired desktop/mobile comparison before stats, result, review, or failure-state projection.
- A failed mobile job logs bounded structured context and shows fixed translated copy; persisted worker/provider error text is never rendered.
- Extracted visual-default patches contain only accent/background fields, preserve a concurrent owner value in standalone and linked transactions, persist linked image-background defaults, and return deep saved project state without erasing unrelated design/preferences.
- Claim still requires completed extraction data.
- Claim rejects malformed TTLs, incoherent DTOs, external/wrong-bucket/wrong-prefix URLs, disallowed MIME types, and oversized sources before project writes.
- Retrying a successfully claimed draft as the same owner returns the stored conversion receipt without duplicate project/store/tenant writes.
- One cache/screen/context invalidation failure does not prevent the remaining effects from running.
- Expired-draft cleanup preserves the draft when Storage deletion fails and rejects cross-draft Storage paths.
- Claim writes a standard project file entry with `active`, `deleted`, `index`, and `extractedData.message`.

## Retry

- Retrying a failed owner upload creates a new job through `POST /api/menu-extraction/jobs`.
- Retrying a failed menu-link import preserves `source: "menu_link_import"` and validates `menuLinkImports/{tId}/{sId}/{projectId}/` Storage paths.
- Non-retryable failed jobs cannot create replacement jobs.

## Contract Verification

- `npm run verify:menu-extraction-pipeline` passes.
- `npm run verify:menu-extraction-pipeline:dry-run` passes.
- `src/data/shared/menuExtractionJob.ts` and `functions/src/sharedData/menuExtractionJob.ts` are byte-for-byte identical.
- `src/data/shared/publicMenuDraftData.ts` and `functions/src/sharedData/publicMenuDraftData.ts` are byte-for-byte identical.
- Every job producer uses a shared destination builder and emits `destinationType`.
- The owner route's project-size projection caps reserved headroom at 200KB while the worker keeps the actual 900KB merged-document save guard.
- Messaging HEIC/HEIF files remain accepted by the worker MIME contract.
- Public create-menu image upload remains JPEG/PNG/WebP only; PDFs are still owner-upload/link-import capable but not public-image capable.
- Browser cancellation updates cannot mutate server-owned job fields while changing status.
- App job types and extraction monitor surfaces expose source and destination fields.
- Public draft completion allowlists and bounds the project/editor shape: category `active`, item `category`, item `active`, item `available`, attribute activity, and exactly one primary language.
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
