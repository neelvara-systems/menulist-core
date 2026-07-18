# Menu Extraction Pipeline — Mobile Support

**Status:** Implemented
**Last Updated:** July 13, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated mobile upload and shared extraction-review parity only. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, provider smoke for the target extraction model and environment, authenticated desktop/mobile upload, identity-preflight, preview/review/apply QA, real-device mobile upload/review QA, public create-menu upload/link/preview/claim QA, owner review before publish, target Firebase deploy evidence where rules, Storage, indexes, or Functions change, target Vercel deploy evidence where app routes or browser clients change, and production-host smoke.

Mobile upload keeps the same owner flow:

1. Prepare selected files.
2. Upload files to Storage.
3. Run menu-intake identity preflight and show the same owner decision sheet.
4. Pass `identityOverrideConfirmed` to the shared job helper when the owner accepts a warning.
5. Track the returned job ID as before.

Mobile does not use a separate extraction DAL. `src/components/mobile/sheets/MenuUploadSheet.tsx` calls the same `createProcessingJob()` helper used by desktop.

The public `/create-menu` funnel remains a responsive website route outside MobileShell. Its signed-in source chooser intentionally does not force a rear-camera-only capture hint, allowing the device/browser to offer camera or saved photos, and it resets the file input so retrying the same photo fires a new change event. Public preview status reads run every 5 seconds for at most 36 attempts before an explicit retry state.

Mobile opens and executes upload/link intake only when the dedicated persisted client capability is `canUseMenuExtraction === true`. The sheet repeats that guard before file preparation, Storage upload, project creation for a link import, and route submission; the protected routes independently re-read current store permission. `canManageMenu` is not an additional extraction requirement. Saving detected business-detail suggestions remains separate and requires `canManageStore`.

If stale client authority allows an upload but the job route returns a definitive 4xx rejection, mobile removes the just-uploaded source objects and reports any unsuccessful deletion through the existing bounded cleanup diagnostic. It intentionally preserves files after network, 5xx, or malformed-success acknowledgement failures because the durable job may already exist.

Mobile upload enforces the same extraction file/page cap as desktop and the owner job API. The sheet imports `MAX_MENU_EXTRACTION_FILES`, rejects oversize multi-select batches, passes the remaining page slots into PDF conversion before canvas rendering, and checks the prepared file count before any Storage upload or processing-job creation. Owners can upload up to 15 menu photos or PDF pages at a time.

Mobile upload cleanup is best-effort but observable. When mobile intake is cancelled, preflight ignores uploaded files, no files remain for job creation, or an existing active job is reused, the sheet still attempts the same uploaded-file deletes and logs `mobile_menu_upload_uploaded_file_cleanup_failed` if any cleanup promise rejects. The diagnostic records bounded project presence/length, cleanup reason presence/length, attempted cleanup count, failed cleanup count, and source error metadata only. It must not log raw Storage URLs, filenames, file UIDs, project IDs, job IDs, or exception text.

Mobile and desktop review apply use the shared extraction apply path. When that path saves linked-outlet review changes through `/api/projects/outlet-save`, it uses the shared no-store, same-origin, manual-redirect request policy, caps the acknowledgement at 2MB, and requires `success: true` plus matching `projectId` and `masterProjectId` before treating the save as complete.
