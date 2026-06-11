# Menu Extraction Pipeline — Firebase

**Status:** Implemented
**Last Updated:** June 11, 2026

## Collections

| Collection | Change |
| --- | --- |
| `menuImageProcessingJobs` | Central queue for all extraction entry points. |
| `publicMenuDrafts` | Public drafts now receive extraction completion/failure from the central worker. |
| `menuLinkImportArtifacts` | Unchanged; authenticated link imports still store private artifacts before job creation. |
| `projects/{tId}/{sId}` | Project writes now require the project document to exist. |
| `messagingOnboardingSessions` | Unchanged watcher flow; destination metadata only. |
| `MENULIST_AI_OPERATIONS` | Platform extraction audit rows for real provider cost, token usage, and job context. |

## Rules

`menuImageProcessingJobs` client create is now denied. Owner surfaces create jobs through `POST /api/menu-extraction/jobs`; public and messaging jobs use Admin SDK.

Client reads, cancellation, and preview-review updates remain available through the existing owner job rules. Cancellation updates are field-restricted to status/timestamp fields so browser clients cannot mutate server-owned job payloads while cancelling.

The browser review helper also fails closed before any project write: it rejects missing jobs, non-`preview_ready` jobs, project mismatches, tenant/store mismatches, and user mismatches. Discard uses the same validation before marking a preview job cancelled.

## Storage Prefixes

The worker accepts only expected Storage prefixes:

- Owner upload: `projects/files/{tId}/{sId}/`
- Authenticated link import: `menuLinkImports/{tId}/{sId}/{projectId}/`
- Public draft: `publicMenuDrafts/{draftId}/`
- Messaging onboarding: `messagingOnboarding/{sessionId}/`

The worker also validates MIME type by source/destination before AI work. Public image drafts cannot use PDFs, while authenticated owner upload and link-import paths can still process PDF artifacts where those entry points allow them.

## Cost

Owner uploads now add one protected API path before the same job write. Normal new extractions still create one `menuImageProcessingJobs` document. Repeat uploads can now short-circuit before the AI-expensive rate limit, menu-intake identity check, and job write when the route finds a recent completed first-extraction project job with the same server-computed `sourceFingerprint`.

The owner-upload fingerprint uses Firebase Storage object metadata (`md5Hash` or `crc32c`) plus target languages, action, business type, and business category. It adds bounded Storage metadata reads for normal owner uploads and scans at most 50 completed jobs for the same project/user, but avoids a full provider extraction when the same owner re-uploads the same files to the same unchanged project within 24 hours. Duplicate newly-uploaded Storage objects are deleted when active/completed job reuse succeeds. No client-provided hash is trusted.

Public create-menu no longer runs extraction inside the API request. It adds one `menuImageProcessingJobs` write and normal worker status writes, while removing request-lifecycle AI work from the public route.

Public create-menu preview polling can use `statusOnly=1`. It still costs one owner-bound `publicMenuDrafts` read per poll, but the response omits heavy `extractedData` until the draft is completed; the preview client then performs a single full read to load the final data for claim/review.

The legacy direct `processMenuImages` callable is intentionally disabled in code and returns `failed-precondition` instead of invoking Gemini. The production job queue remains the only supported AI extraction path, which keeps upload allowlists, tenant checks, identity checks, retry metadata, cleanup, and cache invalidation centralized. Deployment of this callable hardening was attempted on June 11, 2026 with `firebase deploy --only functions:processMenuImages --project ecomsai`, but Firebase Secret Manager validation was blocked by the existing billing-disabled 403 on the `ecomsai` project.

Linked-outlet review applies add one authenticated `POST /api/projects/outlet-save` call instead of direct browser `updateDoc`. That route uses existing Admin SDK validation for tenant/store access, local-only ID prefixes, outlet policy, and cache tag revalidation, avoiding a broad Firestore rules exception for linked-project `files` writes.

Initial extraction remains a zero-unit owner operation. The worker still records platform-only provider telemetry in `MENULIST_AI_OPERATIONS`, including `jobId`, `tId`, `sId`, `uId`, `jobSource`, `destinationType`, `destinationId`, `jobMode`, token counts, paise-denominated `totalCharge`, and a real Firestore timestamp in `createdAt`.

Extraction job updates now include root `timings`, optional `sourceFingerprint`, and `result.summary` on existing status writes. This adds small scalar fields only; no new collection, index, or separate write path is introduced.

Failed provider attempts also write `MENULIST_AI_OPERATIONS` rows with `status: failed`, `success: false`, `errorCode`, `retryable`, optional `retryAfterSeconds`, `promptVersion`, and zero `totalTokenCount`, `totalCharge`, and `unitsConsumed`. These rows are platform telemetry only; owners are not charged for failed extraction attempts.

Prompt version `parallel_v5` explicitly normalizes visible food labels before persistence: `VEG`/green-dot markers to `vegetarian`, `NON-VEG`/`NV`/red-dot markers to `non-vegetarian`, `GF` to `gluten-free`, `DF` to `dairy-free`, and `KETO` to `keto`. Food dietary labels are returned through structured `dietaryTags`, while legacy `tags` remains limited to explicit non-food audience labels such as `For Men`/`For Women`. Description strings are still normalized into multilingual description objects, extracted item attributes remain structured variant rows, and owner desktop/mobile item editors expose the same canonical food `dietaryTags` values through the shared metadata config.

The existing consolidated `menu_old_cleanup` maintenance task now prunes `result.combinedData` from completed first-extraction project jobs older than two hours after `result.summary` exists. It scans the existing `status + completedAt` index with a 500-doc cap, then deliberately skips `skipProjectSave` jobs, non-project destinations, and non-first-extraction review jobs so public create-menu, messaging onboarding, and owner review flows keep their required payloads. No new collection, index, scheduled function, or Storage bucket was added.

Deployment of the June 11, 2026 Functions changes was attempted with `firebase deploy --only functions:processMenuImagesJob,functions:menulistMaintenanceScheduler --project ecomsai`. The predeploy lint/build completed, but Firebase Secret Manager validation was blocked by the existing billing-disabled 403 on the `ecomsai` project for Gemini, WhatsApp, and Upstash secrets. Retry the same scoped deploy after billing/project access is restored.
