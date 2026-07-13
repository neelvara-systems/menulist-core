# Menu Extraction Pipeline — Implementation

**Status:** Implemented
**Last Updated:** July 2, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This implementation document records source-gated extraction queue, worker, intake, review, and destination behavior only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, provider smoke for the target extraction model and environment, authenticated desktop/mobile upload, identity-preflight, preview/review/apply QA, real-device mobile upload/review QA, public create-menu upload/link/preview/claim QA, owner review before publish, target Firebase deploy evidence where rules, Storage, indexes, or Functions change, target Vercel deploy evidence where app routes or browser clients change, and production-host smoke.

## Files

| File | Role |
| --- | --- |
| `src/data/shared/menuExtractionJob.ts` | App-side shared extraction job contract: destinations, sources, limits, MIME types, and routing builders. |
| `functions/src/sharedData/menuExtractionJob.ts` | Cloud Functions mirror of the same shared contract; must stay byte-for-byte identical. |
| `src/app/api/menu-extraction/jobs/route.ts` | Protected owner extraction job creation. |
| `src/lib/menu-extraction/jobIdBoundary.ts` | Shared retry job ID admission boundary for owner extraction retries. |
| `src/lib/menu-extraction/projectIdBoundary.ts` | Shared project ID admission boundary for menu-extraction owner project reads and review apply. |
| `src/lib/extraction/schemas.ts` | Shared extraction review schema validation for apply/review payloads. |
| `src/lib/extraction/applyChanges.ts` | Client review apply/discard helper; validates preview ownership and applies approved changes. |
| `src/lib/menu-extraction/menuIntakeIdentityServer.ts` | Shared server helper for menu-intake identity preflight. |
| `src/app/api/menu-intake-identity/route.ts` | Existing preflight API, now delegates to the shared helper. |
| `src/lib/firebase/menuProcessing.ts` | Client helper; creates jobs through the protected API and keeps dev trigger support. |
| `src/lib/firebase/menuProcessingDiagnostics.ts` | Shared bounded diagnostics for job helper and status hook failures. |
| `src/hooks/useMenuProcessingJob.ts` | Realtime job status hook; listens for job progress and uses bounded diagnostics for listener/cancel failures. |
| `src/components/templates/main-app/projects/index.tsx` | Desktop owner upload caller; prepares files, creates jobs, and uses bounded diagnostics for upload/PDF/job failures. |
| `src/components/mobile/sheets/MenuUploadSheet.tsx` | Mobile owner upload caller; prepares files, creates jobs, and uses bounded diagnostics for mobile upload failures. |
| `src/components/mobile/screens/MobileMenuScreen.tsx` | Mobile owner menu workflow; restores active jobs, opens comparison review, uploads item images, and uses bounded diagnostics for job restore/comparison/upload failures. |
| `src/components/mobile/utils/mobileMenuDiagnostics.ts` | Mobile Menu bounded diagnostics for screen-level owner-menu failures outside the shared upload sheet. |
| `src/components/templates/main-app/projects/utils/pdfUtils.ts` | Shared browser PDF conversion utility; uses bounded diagnostics for conversion/canvas failures. |
| `functions/src/types/menuProcessingJob.types.ts` | Adds `destination` to the job contract. |
| `functions/src/triggers/production.ts` | Production Firestore trigger wrapper for `processMenuImagesJob`; logs bounded job context before calling the worker. |
| `functions/src/dev-triggers.ts` | Dev-only callable wrapper for emulator processing; logs bounded request context and returns fixed success text. |
| `functions/src/logic/processMenuImagesJob.ts` | Central worker with destination handling, source validation, SAFE_MODE worker guard, and bounded worker diagnostics. |
| `functions/src/logic/processMenuImages.ts` | Lower-level Gemini extraction helper used by the worker; records bounded AI operation failure telemetry. |
| `functions/src/logic/saveFilesToProject.ts` | Project save now fails if the project document does not exist and logs bounded save diagnostics only. |
| `functions/src/triggers/shared.ts` | Legacy direct `processMenuImages` callable stays exported for compatibility but fails closed; production extraction must use the job queue. |
| `src/app/api/public/create-menu/route.ts` | Public drafts now queue durable extraction jobs. |
| `src/app/api/menu-link-imports/route.ts` | Adds explicit project destination metadata. |
| `functions/src/messagingOnboarding/intakeProcessor.ts` | Adds messaging destination metadata. |
| `firestore.rules` | Blocks direct browser job creation. |

## Owner Job Creation

The browser uploads files to Firebase Storage as before, then calls `createMenuProcessingJob()`. That helper now posts to `POST /api/menu-extraction/jobs`.

The route:

1. Requires `withAuth()`.
2. Checks SAFE_MODE.
3. Verifies tenant/store access from the authenticated session.
4. Applies a `FILE_UPLOAD` request gate and rejects bodies above 128KB before JSON parsing.
5. Validates request shape with Zod.
6. Confirms `projectId` belongs to the session tenant/store.
7. Allows only configured Firebase Storage URLs under `projects/files/{tId}/{sId}/`.
8. Requires the target project document to exist.
9. Reuses an existing active job if present.
10. Computes a server-trusted owner-upload `sourceFingerprint` from Firebase Storage metadata when the request is a normal owner upload. If metadata lookup fails, the route logs `menu_extraction_owner_upload_metadata_lookup_failed` with bounded tenant/store, file UID/type, Storage-path presence/length, file-size, and normalized source error metadata only, then continues without a fingerprint for that request.
11. Reuses a recent completed first-extraction project job for the same project/user/fingerprint before running new AI work.
12. Applies `AI_EXPENSIVE` rate limiting only when a new extraction job is still needed.
13. Runs menu-intake identity when enabled.
14. Creates the job with shared routing fields: `destination.type = "project"` and `destinationType = "project"`.

June 29 follow-up: the protected owner upload route and menu-intake identity preflight hash owner, tenant, and store limiter key material before calling the shared limiter. The `FILE_UPLOAD`, `AI_EXPENSIVE`, and `AI_OPERATION` limits, SAFE_MODE checks, bounded body caps, tenant access checks, project ownership validation, Storage URL allowlists, identity analysis, completed-job reuse, and job creation behavior are unchanged; raw user IDs, tenant IDs, and store IDs must not be stored in these limiter key names.

The protected owner route treats source lineage as server-owned. It does not accept client-provided `source` or `sourceMetadata`; retry jobs load those fields from the original failed job after verifying owner, tenant, store, and project ownership.

Menu Extraction retry job ID boundary: retry requests use `src/lib/menu-extraction/jobIdBoundary.ts` before the original failed job read. The route accepts only Firestore auto-ID shaped job IDs for `retriedFromJobId`, rejects whitespace-mutated, path-shaped, or reserved document IDs through the shared Firestore document-ID guard, and `loadRetryContext()` re-normalizes the retry job ID before the original `menuImageProcessingJobs/{jobId}` document ref. The loader then verifies project, tenant, store, user, failed status, retryability, source, and Storage URL ownership before creating a replacement job.

Menu Extraction project ID boundary: owner upload job creation, authenticated menu-link import, and menu-intake identity preflight use `src/lib/menu-extraction/projectIdBoundary.ts` before project document reads, menu-link Storage path construction, or identity preflight context loading. `loadMenuIntakeContext()` and `runMenuIntakeIdentityCheck()` also re-normalize the project ID before the scoped project document ref is built, so future helper callers cannot bypass the route schemas. Valid existing project IDs keep the `{tenantId}-{timestamp/default/public-token}-{storeId}` document-ID shape; malformed, whitespace-mutated, path-shaped, or reserved Firestore document IDs fail during request/helper admission before `projects/{tId}/{sId}/{projectId}` reads or `menuLinkImports/{tId}/{sId}/{projectId}/...` paths are built.

Menu Intake Identity scope document-ID boundary: `src/app/api/menu-intake-identity/route.ts` and `src/lib/menu-extraction/menuIntakeIdentityServer.ts` validate authenticated tenant/store scope with `normalizeMenuIntakeScopeDocumentId()` before tenant access checks, limiter key hashing, `projects/{tId}/{sId}/{projectId}` context reads, `stores/{sId}` context reads, Storage prefix checks, operation metadata, or provider work. Tenant/store scope requires exact positive safe-integer MenuList document IDs; malformed, whitespace-mutated, path-shaped, reserved, decimal, zero, negative, unsafe, or nonnumeric scope values fail with the existing `Invalid menu.` boundary before those downstream reads or analysis steps.

Owner-upload completed-job reuse is intentionally narrow. The route uses server-read Storage `md5Hash`/`crc32c` metadata, target languages, action, business type, and business category to build the fingerprint. It only scans the latest bounded completed jobs for the same project/user, reuses completed `owner_upload` project jobs within 24 hours, skips forced-review and retry jobs, skips non-project destinations, skips reuse when the project was updated after the previous extraction, and deletes the duplicate newly-uploaded Storage objects when reuse succeeds. Metadata lookup failures remain non-blocking so owner uploads do not fail only because the dedupe optimization cannot fingerprint the file.

Menu-intake identity preflight file-read failures remain non-blocking so owner uploads can continue when full extraction may still succeed. If a file URL passes the Storage bucket/prefix and app-server network-target checks but fetch, redirect handling, or bounded response reading throws, `src/lib/menu-extraction/menuIntakeIdentityServer.ts` logs `menu_intake_identity_preflight_file_unreadable` with bounded project/tenant/store/user/source/billing/file-type presence-length metadata, file index, file size, fixed `skip_file` fallback policy, and normalized source error metadata only. It does not log raw filenames, URLs, Storage paths, project IDs, tenant IDs, store IDs, user IDs, file content, provider payloads, or exception text.

Menu-intake identity provider response parsing remains non-blocking. If Gemini returns malformed fenced JSON, malformed object-fragment JSON, or no parseable object for the identity preflight response, `src/lib/menu-extraction/menuIntakeIdentityServer.ts` logs `menu_intake_identity_provider_response_parse_failed` with bounded operation metadata, response length, trimmed length, candidate length, parse-stage, fence/object-fragment booleans, and fixed `use_low_confidence_identity_fallback` policy only. The helper then continues through the existing low-confidence fallback analysis. It does not log raw provider response text, extracted menu text, file content, project IDs, tenant IDs, store IDs, user IDs, or exception text.

## Client Job Diagnostics

`src/lib/firebase/menuProcessingDiagnostics.ts` is the only shared diagnostic layer for client-side extraction job helper and status-hook failures.

The diagnostics contract:

- logs normalized failure codes through `secureError()`
- records job, project, and status presence/length metadata instead of raw values
- records active-job counts instead of job ID lists
- keeps successful job creation, reuse, cancellation, development trigger success, and status updates quiet
- keeps cancel-missing and invalid-status caller errors generic

`src/lib/firebase/menuProcessing.ts` still creates jobs through `POST /api/menu-extraction/jobs`, keeps development callable trigger support, cancels pending/processing jobs through the existing Firestore status fields, and returns the latest active job from `checkExistingActiveJob()`. `src/hooks/useMenuProcessingJob.ts` still subscribes to the job document and exposes the same derived states, but listener and cancel failures now use the bounded diagnostic helper instead of direct console logging.

July 5 follow-up: `src/components/templates/main-app/projects/getProcessedFile.ts` no longer writes client debug breadcrumbs for normal desktop job start, active-job reuse, or job-created paths. The helper keeps the same `checkExistingActiveJob()` and `createMenuProcessingJob()` flow, returns the same job ID shape, and keeps failed job creation on `desktop_menu_upload_job_create_failed` with bounded project/action/file/language metadata. `npm run verify:menu-extraction-pipeline` rejects raw `logger.debug()` breadcrumbs in this helper so project IDs, job IDs, existing job IDs, filenames, uploaded URLs, and file payloads stay out of browser diagnostics.

June 29 follow-up: `src/lib/firebase/menuProcessing.ts` now parses `POST /api/menu-extraction/jobs` responses through `readJsonResponseWithLimit()` with a 32KB cap. Malformed or oversized route responses log `menu_processing_job_start_response_parse_failed` with bounded project/action/job-mode/count/status metadata only. Successful HTTP responses must include `success: true` and a non-empty `jobId`; invalid shapes log `menu_processing_job_start_response_invalid` before the helper throws the same fixed `Could not start menu extraction.` failure. Completed/active job reuse, local/emulator dev trigger support, owner-visible copy, and job creation route behavior are unchanged.

`src/lib/menu-intake-identity/client.ts` also parses `POST /api/menu-intake-identity` responses through the same bounded JSON reader with a 32KB cap. Malformed or oversized preflight responses log `menu_intake_identity_response_parse_failed` with bounded project/file/status metadata only. Successful HTTP responses must either be the existing `{ skipped: true }` feature-disabled response or the full identity-analysis payload; invalid shapes log `menu_intake_identity_response_invalid`. Desktop and mobile upload callers still treat preflight failure as a non-blocking skip and continue through the existing upload path.

June 30 follow-up: both browser helpers now pin request behavior before the same bounded response parsing. `src/lib/firebase/menuProcessing.ts` uses `MENU_PROCESSING_JOB_START_REQUEST_POLICY` for `POST /api/menu-extraction/jobs`; `src/lib/menu-intake-identity/client.ts` uses `MENU_INTAKE_IDENTITY_REQUEST_POLICY` for `POST /api/menu-intake-identity`. Both policies use no-store cache, same-origin credentials, and manual redirect handling. Valid job creation/reuse, preflight skip behavior, route auth, SAFE_MODE, rate limits, and owner fallback copy are unchanged.

`src/lib/menu-extraction/menuIntakeIdentityServer.ts`, `src/app/api/menu-extraction/jobs/route.ts`, and `src/app/api/menu-link-imports/route.ts` also use the same bounded diagnostic helper. Menu-intake operation-log failures, unreadable preflight files, preflight completion/failure breadcrumbs, duplicate-upload cleanup failures, completed-job reuse breadcrumbs, owner job creation breadcrumbs, route-level job creation failures, and owner menu-link import cleanup failures log stable `menu_intake_identity_*`, `menu_extraction_*`, or `menu_link_import_*` codes with job/project/tenant/store/user presence-length metadata, file/language counts, severity/reason counts, cleanup reason labels, and source error name/code/status only. They do not log raw project IDs, job IDs, tenant IDs, store IDs, user IDs, decision reason arrays, Storage paths, artifact IDs, or thrown route exceptions.

Extraction Monitor `JobInspector` copy actions are browser-local and do not affect job state. They wait for Clipboard API success or acknowledged textarea fallback success before showing copied feedback, and failed copy diagnostics include clipboard/fallback support booleans plus copied-text length only. Raw extracted payloads, provider responses, job IDs, project IDs, tenant IDs, and store IDs are not logged.

Menu-intake identity source fetches fail closed after target validation. The helper validates the configured Firebase Storage bucket, expected owner/public draft prefix, and app-server public DNS target, then fetches the normalized URL with manual redirect handling before the bounded response reader. A Storage 3xx response is skipped through the existing unreadable-file preflight fallback instead of reading bytes from a redirected target.

Owner menu-link import cleanup is best-effort but observable before a durable extraction job exists. The route writes the private Storage artifact first, then creates the `menuImageProcessingJobs/{jobId}` document and `menuLinkImportArtifacts/{artifactId}` metadata document atomically through the shared active-job transaction. If route failure happens after Storage creation but before that transaction commits, no artifact metadata document exists to delete; failed Storage cleanup logs `menu_link_import_storage_cleanup_failed` with bounded project/storage metadata only.

Menu-link render fallback is optional and observable. When the Chrome render fallback itself fails after the target URL has passed SSRF validation, `src/lib/menu-link-import/sourceAcquisition.ts` logs `menu_link_import_render_fallback_failed` with fixed `skip_rendered_html` fallback policy plus render host, timeout, temporary-directory-created, business category, and business type metadata only. The acquisition helper still returns `null` for the rendered fallback and continues through the existing source-rejection path if no fetched source is usable.

Menu-link render fallback cleanup is also best-effort but observable. When the Chrome render fallback creates a temporary user-data directory and cleanup fails, `src/lib/menu-link-import/sourceAcquisition.ts` logs `menu_link_import_render_tmp_cleanup_failed` with fixed cleanup target plus render host, business category, and business type presence/length metadata only. These render fallback failures and cleanup failures do not log the temporary path, source URL, page text, rendered HTML, or Chrome exception text, and they do not change render fallback acceptance.

Before menu-intake identity reads a preflight file, `src/lib/menu-extraction/menuIntakeIdentityServer.ts` revalidates the download URL against the configured Firebase Storage bucket, the expected owner/public Storage prefix, and the shared app-server public DNS target guard. Owner preflight files must stay under `projects/files/{tId}/{sId}/`; public create-menu identity files must stay under `publicMenuDrafts/{draftToken}/`; localhost remains development-only. The helper reads the validated response through `src/lib/security/boundedResponseBody.ts` so oversized headers or streams are rejected before Gemini preflight parts are built.

Desktop and mobile upload callers use the same bounded diagnostic layer. They must not direct-console raw filenames, job IDs, project IDs, PDF page counts, active job IDs, image dimensions tied to file names, uploaded URL failures, or provider/browser exception objects. Owner-facing failed upload/job text stays generic (`Processing could not be completed. Please try again.` or the existing mobile retry copy), while intentional validation messages for corrupted/oversized PDFs can still name the selected file because that is direct owner feedback, not diagnostics.

Desktop and mobile upload callers both enforce the shared `MENU_EXTRACTION_JOB_LIMITS.MAX_FILES` extraction cap before Storage upload. Desktop blocks pending image/PDF page batches in the Projects upload flow. The mobile upload sheet counts existing pending project files plus newly selected files, passes remaining page slots into shared PDF conversion, and checks the prepared-file count again before calling `uploadFile()`.

Project replacement is explicit and owner-controlled. Extraction appends to `project.files[]` because `files[].extractedData` is the live editor data, so the worker does not automatically strip older processed files. When the pre-AI project-size gate blocks an oversized append, the owner route returns the fixed reset/create-new message and deletes newly uploaded owner source files. The desktop reset flow is the cleanup path for replacement uploads: `handleReset()` writes `files: []`, clears linked-outlet overrides when relevant, and the confirmation modal states that uploaded files and extracted data are cleared.

When the desktop Projects upload flow or mobile upload sheet offers extracted business-detail suggestions and the owner accepts fields, the store write must require `assertStoreUpdateSucceeded()` before local business identity state changes. Rejected acknowledgements use `projects_page_upload_business_details_store_update_rejected` on desktop and `mobile_menu_upload_business_details_store_update_rejected` on mobile, routing through the existing bounded business-details failure paths.

When extracted profile visual defaults fill a missing project accent color or image background color, the desktop Projects upload flow must require `assertProjectUpdateSucceeded()` before mutating SWR/local project state. Rejected acknowledgements use `menu_upload_extracted_profile_defaults_project_update_rejected` and route through the existing `menu_upload_extracted_profile_defaults_apply_failed` bounded failure path.

When desktop or mobile upload flows create a new project/menu for an upload, the `addProject()` result must require `assertProjectUpdateSucceeded()` before selection, job creation, or local upload flow state advances. Rejected acknowledgements use `projects_page_upload_create_project_update_rejected` on desktop and `mobile_menu_upload_create_project_update_rejected` on mobile.

Desktop and mobile uploaded-file cleanup remains best-effort but observable. When an owner cancels intake, the intake preflight ignores files, no files remain for job creation, or an existing active job is reused, both upload callers still attempt to delete the same uploaded Storage URLs. Failed cleanup now logs `menu_upload_uploaded_file_cleanup_failed` on desktop and `mobile_menu_upload_uploaded_file_cleanup_failed` on mobile with bounded project, cleanup-reason, attempted-count, failed-count, and source error metadata only. These diagnostics must not log raw Storage URLs, filenames, project IDs, job IDs, file UIDs, or thrown cleanup exception text.

`MobileMenuScreen` uses `src/components/mobile/utils/mobileMenuDiagnostics.ts` for screen-level failures around active job restore, comparison-engine setup, item-image upload handoff, background project persistence, project image auto-generation, extracted profile defaults, and menu-derived business defaults. Menu-derived `businessAttributes` defaults require `assertStoreUpdateSucceeded()` before local store state changes; rejected writes use `mobile_menu_business_attributes_default_store_update_rejected` and route through `mobile_menu_business_attributes_default_apply_failed`. Extracted profile visual defaults require `assertProjectUpdateSucceeded()` before `syncSavedMenuProject()` updates mobile project state; rejected writes use `mobile_menu_project_profile_defaults_project_update_rejected` and route through `mobile_menu_project_profile_defaults_apply_failed`. Debounced mobile background project persistence also requires `assertProjectUpdateSucceeded()` before clearing pending snapshots or updating persisted project refs; rejected writes use `mobile_menu_project_persist_project_update_rejected` and route through `mobile_menu_project_persist_failed` with the existing retry timer. Mobile item-image modal saves require `assertProjectUpdateSucceeded()` before updating menu/project image state or showing image-save success copy; rejected writes use `mobile_menu_item_image_project_update_rejected` and route through `mobile_menu_item_image_project_update_failed`. That helper records normalized failure codes plus bounded presence/length/count metadata only; it does not direct-console raw project/store/job/item IDs, image data, owner payloads, or provider/browser exceptions.

## Cloud Function Trigger Diagnostics

The production `processMenuImagesJob` Firestore wrapper logs only trigger name and job ID length before handing work to `processMenuImagesJobLogic()`. Missing snapshot diagnostics use the stable `FUNCTIONS_PRODUCTION_TRIGGER_DATA_MISSING` code and do not log raw job IDs.

The emulator-only `dev_triggerProcessMenuImages` callable keeps the same manual processing behavior but logs only bounded request context: job ID presence/length, job-data presence, and job-data key count. It no longer logs raw request payloads, raw job IDs, or caught error objects, and its success response uses fixed text.

July 2 follow-up: after the worker wins the pending-job transaction, it checks `isSafeModeActive()` before marking public drafts as actively processing, running deterministic link parsing, or calling Gemini extraction. Active SAFE_MODE marks the job failed with retryable `SAFE_MODE_ACTIVE`, `retryAfterSeconds: 60`, fixed owner-safe pause copy, and bounded `PROCESS_MENU_IMAGES_JOB_SAFE_MODE_ACTIVE` diagnostics. This avoids provider work and avoids leaving the job stuck in `processing`; owners can retry after SAFE_MODE is disabled.

## Public Draft Job Creation

`POST /api/public/create-menu` stores the source first, then atomically creates `publicMenuDrafts/{draftId}` and deterministic `menuImageProcessingJobs/public_{draftId}` with create-only batch operations. The draft ID and download token derive from owner plus validated/acquired content hash, so concurrent identical requests converge on one draft/job without invalidating the winning Storage metadata. The job contains:

- `skipProjectSave: true`
- `destination.type = "public_menu_draft"`
- `destinationType = "public_menu_draft"`
- platform tenant/store/user IDs
- `projectId = 0-public-{draftId}-0`

When the public source is readable by the shared identity helper, the route also attaches `sourceMetadata.identityCheck` to the job. The worker uses that metadata to fill `publicMenuDrafts.detectedBusinessName`, `detectedBusinessType`, and `detectedBusinessCategory` on completion. If the specific type is not identifiable, the claim flow stores canonical `Other` while preserving the best known category.

Before provider work, the worker verifies deterministic job ID, destination and denormalized destination type, requested owner metadata, platform project identity, source path/URL/type/size, draft token/owner/status/expiry, and the draft's `extractionJobId`. A failed binding may fail the job but is not allowed to update the referenced draft. Completion uses the byte-for-byte mirrored `publicMenuDraftData.ts` allowlist contract; preview and claim normalize the stored DTO again. Claim also validates the configured Storage bucket and exact draft source envelope, stores a complete conversion receipt, and supports exact-owner idempotent retry after a lost response.

The worker marks the draft as `processing`, then writes `completed` or `failed`.

`GET /api/public/create-menu` supports `statusOnly=1`. The public preview client polls with that flag until the draft is completed, then performs one full fetch to retrieve `extractedData`. Default GET behavior remains backward-compatible and still returns `extractedData` when `statusOnly` is omitted.

`src/app/(website)/create-menu/CreateMenuClient.tsx` now sends upload and link POSTs with same-origin credentials, no-store cache policy, and manual redirect handling, then reads responses through `readJsonResponseWithLimit()` with an 8KB cap before redirecting to preview. Malformed or oversized acknowledgement responses log `public_create_menu_response_parse_failed`; successful HTTP responses must include a non-empty `draftId`, otherwise `public_create_menu_response_invalid` is logged and the page shows the existing localized fixed upload/link failure copy. Valid draft creation, link source acquisition, extraction queueing, polling, and claim flow are unchanged.

`src/app/(website)/create-menu/PreviewClient.tsx` now sends status/full preview polling and claim POST requests with same-origin credentials, no-store cache policy, and manual redirect handling. Preview responses are read through `readJsonResponseWithLimit()` with a 4MB cap and require a valid draft status before updating preview state. The claim acknowledgement uses a 32KB cap and requires `success: true`, `menuUrl`, `officialPageUrl`, and `subdomain` before redirecting to the starter success page. Malformed, oversized, or invalid shapes log `public_create_menu_preview_*` diagnostics with bounded draft/status metadata only.

July 5 follow-up: Public create-menu preview stored-error display boundary. Failed preview rendering no longer prints stored `publicMenuDrafts.error` / `draft.error` text. `PreviewClient` always uses the fixed localized `CreateMenu.previewFailedFallback` copy for failed drafts, so legacy or unexpected raw stored draft-error strings cannot become visible on the public preview page while polling, claim, route, and worker behavior remain unchanged.

July 5 follow-up: Public create-menu success business-name query display boundary. `/create-menu/success` no longer renders the `name` query parameter directly. `CreateMenuSuccessClient` now normalizes that value before display, removes control characters, bounds the rendered business-name text, falls back to the localized default when no safe display text remains, and logs only invalid-reason plus length metadata. Success-page URL normalization, copy/share handoffs, starter signal recording, QR hint copy, and dashboard navigation remain unchanged.

July 6 follow-up: Public create-menu claim target document-ID boundary. `POST /api/public/create-menu/claim` now validates existing-account and newly-created tenant/store IDs with the shared Firestore document-ID guard and exact positive numeric MenuList ID guard before building store, tenant, project-summary, or project document refs. Valid claim/publish behavior, draft ownership checks, default-project demotion, public cache invalidation, Digital Screens invalidation, Owner Business Assistant cache invalidation, and bounded diagnostics remain unchanged.

June 29 follow-up: public create-menu now hashes authenticated owner limiter key material before calling the `PUBLIC_MENU_ENTRY_AUTH`, status polling, and claim publish limiters. The limiter limits/windows, SAFE_MODE checks, bounded body caps, source acquisition, Storage writes, queued extraction job behavior, draft reads/writes, and claim conversion behavior are unchanged; raw owner ids and draft tokens must not be stored in these limiter key names.

Before the draft is marked completed, the worker normalizes public draft extracted data to the same project/editor payload shape used by owner extraction: categories have `active`, items have `category`, `active`, `available`, normalized attribute activity, and languages are normalized objects with `isPrimary`. Claiming a completed public draft then creates a normal project file entry with `active: true`, `deleted: false`, `index: 0`, and `extractedData.message`. This keeps public `/create-menu` output aligned with owner extraction and messaging publish file shapes.

Claimed projects use the normal parseable project ID format `{tenantId}-{timestamp}-{storeId}`. This is required because the public client renderer and several backend helpers derive the nested project path from the project ID before loading `projects/{tenantId}/{storeId}/{projectId}`. The claim route also stores the resolved `businessType` and `businessCategory` on the project document and `projectsSummary` entry so future project-scoped defaults stay aligned with the store created from the same claim.

## Retry Handling

Failed-job retry still starts from the extraction monitor DAL, but the new retry job is created through `POST /api/menu-extraction/jobs`. The server route loads the failed source job, verifies owner/tenant/project ownership, preserves `source` and `sourceMetadata`, and validates the original Storage path before creating a replacement job. This keeps failed menu-link imports on the `menu_link_import` path instead of treating them as normal owner uploads.

When a review apply needs to create a source file shell for imported/re-extracted content, `applyExtractionChanges` first verifies that the review job exists, is `preview_ready`, belongs to the current tenant/store/user, and matches the target project. It then writes the standard project file envelope (`active`, `deleted`, `index`, and `extractedData.message`) before saving categories/items. The same apply path revalidates the public client cache for the project, so the customer menu can render the applied data.

Extraction review apply ID boundary: `src/lib/extraction/schemas.ts` validates review `projectId` and `jobId` through the existing Menu Extraction document-ID normalizers. `src/lib/extraction/applyChanges.ts` repeats the same normalization before client Firestore project or job refs are built for apply and before the discard helper can build a `menuImageProcessingJobs` ref. Valid preview-ready review jobs keep the same ownership, status, linked-outlet save, project update, job completion, cache revalidation, and generic error behavior.

Linked-outlet review applies do not write project files directly from the browser. They build the outlet-local project payload and call `POST /api/projects/outlet-save`, which enforces tenant membership, store permissions, outlet policy, and local-only ID prefixes before using Admin SDK to persist the outlet-local file/override state.

Linked-outlet review apply requests to `/api/projects/outlet-save` use the shared no-store, same-origin, manual-redirect request policy before the shared 2MB `readLinkedOutletSaveResponseJson()` guard. The review apply still requires `success: true` plus matching `projectId` and `masterProjectId` before treating the outlet-local save as complete.

Review apply diagnostics now use `src/lib/firebase/menuProcessingDiagnostics.ts`. `applyExtractionChanges`, `runComparisonEngine`, and the client redistribution helper no longer direct-console project IDs, job IDs, file UIDs, category/item counts, stats, or raw exception objects. Desktop and mobile review screens also show generic apply/discard errors while logging only bounded job/project metadata internally. The old duplicate Projects-level redistribution helper was removed; `src/lib/extraction/redistribute.ts` is the maintained client redistribution path.

## Messaging Job Creation

Messaging onboarding still writes jobs from Cloud Functions and still uses `extractionWatcher.ts` to update the session. The job now includes `destination.type = "messaging_onboarding"` and `sessionId`, allowing the worker to validate `messagingOnboarding/{sessionId}/...` Storage paths.

Messaging upload MIME support is defined in the shared extraction contract through `MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES`. It includes the dashboard upload types plus HEIC/HEIF so WhatsApp/iPhone menu photos accepted by messaging intake remain accepted by the centralized worker.

After extraction, the watcher stores `extractedProjectFiles` on the messaging session using the same project file envelope as owner extraction: `active`, `deleted`, `index`, and wrapped `extractedData.message/data`. The active approval route calls `executeMessagingOnboardingPublish()` from `src/lib/messaging-onboarding/publish.ts`; that publisher writes `projects/{tenantId}/{storeId}/{tenantId}-default-{storeId}`, updates `platformSummary/projects_{storeId}`, and revalidates `menu-store`, `store`, and `client-stores` tags before returning the public URL. The older Cloud Functions publish helper is reference-only and is not the active publish path.

The worker enforces MIME and Storage path by source/destination before AI work:

- Owner upload: PDF/JPEG/PNG/WebP.
- Public create-menu image upload: JPEG/PNG/WebP.
- Link import: acquired text/image/PDF artifacts.
- Messaging onboarding: PDF/JPEG/PNG/WebP/HEIC/HEIF.

`functions/src/logic/processMenuImages.ts` repeats the file URL safety check immediately before fetching the file for Gemini upload. The helper accepts only configured Firebase Storage download URLs under the expected source/destination prefixes, validates the target through the shared Functions public HTTPS/DNS guard, fetches only the normalized validated URL, and reads the response through `readResponseUint8ArrayWithLimit()` so oversize headers or streams are rejected before the temp file is written. Localhost stays allowed only inside the Functions emulator.

The worker also writes timing telemetry on the job root. `timings.queueWaitMs`, `timings.aiProcessingMs`, `timings.postProcessingMs`, `timings.saveMs`, and `timings.workerTotalMs` are derived from existing worker stages; `timings.provider` carries the lower-level upload/batch timing returned by `processMenuImagesLogic()`. These fields are telemetry only and do not affect billing or owner-visible extraction output.

Completed first-extraction project jobs include `result.summary` with category/item/language/file-message counts and confidence summary. New project auto-save completions no longer write heavy `result.combinedData`; they stamp `result.dataPrunedReason = project_auto_saved_immediate` because the project document is the source of truth for rendered menu data after save. The daily `menu_old_cleanup` maintenance task still prunes heavy `result.combinedData` and `result.redistributedFiles` from older completed project auto-save jobs, preserving `result.summary`, raw provider provenance, cost transaction data, public drafts, messaging onboarding jobs, and `preview_ready` review jobs.

When extracted profile defaults replace a generic project name or description during save, `functions/src/logic/saveFilesToProject.ts` mirrors those same fields into the existing `platformSummary/projects_{storeId}` entry in the same transaction. Public menu route selection and OBP project summaries read that summary document, so the project document and public summary stay aligned after the worker-level public cache refresh.

## Function Diagnostics

`functions/src/logic/processMenuImages.ts` does not log, persist, or return raw extraction exception messages. Upload, retry, batch, AI operation write, failure transaction, and request failure paths use stable `MENU_IMAGE_*` failure codes with source error name/code/status metadata only.

Failed AI operation rows still keep `status: "failed"`, `success: false`, `errorCode`, retry metadata, zero token/cost/unit fields, prompt version, and job audit context. Their `errorMessage` is the fixed `Menu extraction failed` text, and the stored `geminiResponse` failure payload carries stable codes instead of provider/runtime messages.

`functions/src/logic/processMenuImagesJob.ts` now uses the same bounded diagnostic posture for worker lifecycle logs. Job, project, tenant, store, and master-project values are represented as presence/length metadata; target languages are logged as counts; non-blocking hardening/default failures record source error name/code/status only. The worker does not log raw job/project/store/tenant IDs, raw target-language arrays, raw master project IDs, full redistributed extraction payloads, project document paths, project language arrays, or raw exception messages.

June 29 follow-up: public draft processing/failed status updates remain non-blocking side effects of the authoritative menu extraction job, but rejected draft status writes now log `PROCESS_MENU_IMAGES_JOB_PUBLIC_DRAFT_STATUS_UPDATE_FAILED` with bounded job/draft metadata, target status, and source error name/code/status only. This keeps public create-menu draft polling issues observable without changing the job lifecycle.

Worker failure classification also uses structured source error code/name/status only. Failed job rows keep the fixed `Menu extraction failed` owner-facing text, a stable local error code, retryability derived from that code, and optional `retryAfterSeconds` only when a structured retry field is present; the worker does not parse full exception text to derive these values.

`functions/src/logic/saveFilesToProject.ts` logs project ID presence/length, file/language counts, estimated byte size, merge counts, and source error name/code/status only. It no longer logs full project update payloads, raw project IDs, or raw missing-project error text.

## Verification

`npm run verify:menu-extraction-pipeline` checks:

- app and Functions shared contract files are byte-for-byte identical
- owner upload uses the protected API and does not accept client-owned source metadata
- owner upload uses trusted Storage metadata to reuse recent completed jobs without spending another AI call
- the client job helper, status hook, and diagnostics helper avoid direct console logging and raw job diagnostics
- menu-intake identity preflight validates Storage prefixes, public DNS targets, manual redirect handling, and bounded response reads before file fetches
- the production and dev Cloud Function trigger wrappers avoid raw job IDs, raw request payloads, and raw caught error objects
- the desktop upload caller, mobile upload sheet, and PDF conversion utility avoid raw upload/PDF/job diagnostics and use bounded failure codes
- the desktop and mobile upload callers keep post-upload Storage cleanup best-effort while logging failed cleanup counts and reason labels
- the owner-controlled reset/create-new policy is the DS-1 replacement cleanup path, while oversized append attempts fail before AI work with reset/create-new copy
- review apply, comparison, redistribution, desktop review, and mobile review avoid raw project/job/file diagnostics and use generic owner-facing errors
- the dead duplicate Projects-level redistribution utility remains removed
- public create-menu no longer contains inline extraction
- link import and messaging onboarding use shared routing builders
- worker uses shared limits, validates source files, repeats Storage/DNS source-fetch checks, enforces response-size caps before Gemini upload, updates public drafts, and keeps cache revalidation
- worker writes timing telemetry and result summaries before any delayed project-job payload pruning
- worker and project-save diagnostics avoid raw IDs, extracted payloads, project write payloads, project paths, language arrays, and raw exception text
- the direct extraction helper records bounded failure telemetry and avoids raw provider/runtime exception text
- Firestore rules keep browser job creation blocked
- app-side job types and the extraction monitor expose source/destination fields
- public draft completion and claim write the standard extracted-data and project file shapes
- public draft claim creates renderer-parseable project IDs and revalidates menu/store cache tags
- review apply validates `preview_ready` job ownership/status, creates standard source file shells, routes linked outlets through `outlet-save`, and revalidates the public render cache
- the legacy direct `processMenuImages` callable fails closed and does not invoke AI processing
- messaging extraction stores standard project file envelopes and messaging publish writes a renderer-ready project, summary entry, and public cache tags
- public `/client` loading and `MenuPageNew` rendering stay aligned with the parseable project ID and normalized extracted-data contracts

`npm run verify:menu-extraction-pipeline:dry-run` builds representative job objects for owner upload, failed link-import retry, public image, public menu link, authenticated link import, and messaging onboarding. It validates destination labels, source markers, skip-project-save behavior, expected Storage prefixes, source-specific MIME rules, HEIC/HEIF messaging compatibility, and restricted Firestore cancellation updates without calling live Firebase or Gemini.

## Compatibility

The existing review flow is preserved for re-extraction and link import. Public claim continues to read `draft.extractedData` and convert it to the first project file.
