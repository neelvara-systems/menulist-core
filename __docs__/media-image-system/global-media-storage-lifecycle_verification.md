# Global Media And Storage Lifecycle — End-To-End Verification

**Strict-order item:** 5 of 14
**Date:** July 16, 2026
**Status:** Local source complete after the commands below pass on the final current-worktree rerun; target deployment and hosted/device evidence remain owner/release tasks.
**Authority:** Current code, Firebase rules, runtime boundaries, focused emulators/tests, and maintained docs. Historical deletion claims are superseded where they conflict with this report.

## Scope

This pass traced MenuList media and file objects from admission through preparation, upload, persistence, replacement, public use, cleanup, retention, and failure recovery. It covers shared MenuList Storage behavior used by project/menu files, item/project/background images, business logo, Official Business Page cover/gallery, Customer App icon override, Digital Screen slides, generated images and prompt-cache copies, authenticated/public menu intake artifacts, and messaging-onboarding upload cleanup boundaries.

Answerlattice- and CampaignCue-owned buckets, rules, and product workflows remain separate. Shared root helpers were reviewed where MenuList uses them, but later strict-order items still own their feature behavior: messaging onboarding is item 6 and Digital Screens is item 10.

## End-To-End Flow Matrix

| Flow | Admission and preparation | Storage and persistence | Replacement, cleanup, and public result | Verdict |
| --- | --- | --- | --- | --- |
| Prepared owner images | Known profiles, magic-byte/source validation, static canvas output, size/compression and local variants in `src/lib/media/prepareMediaImage.ts:703` | Browser uploader creates or reuses one immutable selected tenant/store object in `src/database/storage/uploadPreparedMediaImage.ts:59` and `src/database/storage/uploadBlobToStorage.ts:56`; the existing URL field remains the Firestore contract | Unused sibling variants are not uploaded; failed/ambiguous persistence does not delete shared deterministic media; normal public URLs remain cache-safe | Optimized after cross-check |
| Batch/generated images | Server profile preparation in `src/lib/media/prepareMediaImageAdmin.ts:132` | Admin uploads are create-only and token-preserving through `src/lib/storage/adminImmutableObject.ts:89` and `src/database/storage/uploadBase64MediaImageAdmin.ts:27` | Browser review never infers delete authority; metadata retention is bounded and public bytes remain until global exclusive-reference proof exists at `functions/src/schedulers/imageBatchRetentionBoundary.ts:20` | Fixed |
| Prompt-cache hit copy | Private cache bytes are revalidated before copying | Destination object uses the same Admin immutable create-or-reuse boundary with a SHA-256 byte checksum in `src/lib/ai/imageGenerationPromptCache.ts:180` | A deterministic retry keeps the original token; private versioned cache sources retain their exact source-row cleanup contract | Fixed |
| Raw project/menu intake | Data URL MIME, decoded size and signature are validated; every attempt receives a unique scoped object identity | Active writes use `projects/{fileType}/{tId}/{sId}/...` via `src/database/projects/index.ts:1050` and `src/database/projects/index.ts:2768`; legacy paths are read-only | Definite pre-persistence/partial failures delete only attempt-owned uploads; ambiguous or committed outcomes retain objects | Correct |
| Business logo | `businessLogo` profile creates static prepared PNG variants | Store DAL uploads before the existing store/summary mutation at `src/database/stores/index.tsx:295` | No unsafe immediate deletion; old URLs remain valid across summary/public consumers | Correct, bounded retention cost documented |
| OBP cover/gallery | `businessCover` and `galleryImage` profiles; direct unprepared upload fallback removed | Immediate prepared upload in `src/database/stores/uploadOBPPhoto.ts:25`, followed by existing `publicPresence` save | Deletion runs only after successful save and subtracts committed cover/gallery references through `src/lib/media/obpMediaReferences.ts:8` | Correct |
| Customer App icon override | Prepared icon boundary plus tenant/store ownership | Unique immutable `stores/pwa-icons/...` upload at `src/database/pwa/index.ts:235`; read-back handles ambiguous persistence at `src/database/pwa/index.ts:319` | New object is removed only when proven uncommitted; old object is deleted only after server read-back proves it is no longer current | Correct |
| Digital Screen slide media | `digitalScreenSlide` profile and max-three admission | Prepared upload plus transactional screen/public-mirror save at `src/database/campaigns/index.ts:990` | Removing a slide removes the reference immediately; physical object deletion is deferred without global reference authority. Item 10 will re-audit the complete screen behavior. | Media lifecycle safe |
| Authenticated/public menu intake artifacts | Bounded upload/link acquisition, MIME/signature/size validation, deterministic collision identity | Public draft image create is `src/app/api/public/create-menu/route.ts:385`; private artifact pointers are committed with jobs | Draft cleanup deletes its exact path before deleting the durable pointer at `functions/src/schedulers/menulistMaintenanceScheduler.ts:632`; menu-link artifacts follow `functions/src/schedulers/menuJobCleanup.ts:284` | Correct |
| Messaging onboarding uploads | Provider and upload path validation live in the messaging module | Session upload objects remain session-scoped | Pending/replaced/expired upload cleanup uses durable session cleanup evidence; item 6 owns the full provider/owner flow | Storage boundary reviewed; feature pending item 6 |
| Generic base64/resumable helpers | Explicit MIME map, data-URL shape, size, signature and safe-SVG checks in `src/lib/storage/base64UploadBoundary.ts:170` | Scoped path generator fails closed; resumable attempt-unique callers can opt into completed-upload URL-failure cleanup in `src/lib/firebase/storage.ts:20` | Shared deterministic paths remain opt-out; delete results are summarized rather than assumed successful | Correct |
| Storage rules | Auth/store membership, path namespace, MIME/size admission and default deny | Prepared media is create-only at `storage.rules:225` | Static media rule at `storage.rules:79` rejects GIF bypass; public read remains limited to intended public namespaces | Fixed and emulator-covered |

## Findings Closed

1. Admin SDK batch uploads and prompt-cache destination copies could overwrite a deterministic path and rotate its Firebase download token. A retry can now only create generation zero; an existing object must match size, cache policy, content type, and identity metadata, including a prepared or copied-byte checksum, then its current token is reused.
2. Batch review actions deleted generated objects after separate project/job writes. An acknowledgement failure followed by discard/retry could delete a URL already committed to a project. Browser deletion was removed and owner copy no longer promises physical deletion.
3. Scheduled batch cleanup treated one job plus one current project as global reference proof. Duplicated projects and outlet projections can preserve the same URL, so public-media deletion is disabled and retention is metadata-only.
4. Prepared-media Storage rules accepted GIF through direct SDK writes even though every supported public profile is static. The prepared namespace now admits JPEG, PNG, or WebP only; generic legacy image namespaces retain their compatibility contract.
5. The Storage-rules Customer App comment still described a retired future legacy path. It now points to the active scoped `stores/pwa-icons/...` path.
6. Prepared images exposed 2-4 named variants, but current DAL/public contracts persisted only one selected URL. Uploading every sibling spent extra Storage writes and bytes without a consumer. The uploader now creates or reuses only the selected persisted variant; preparation and owner preview behavior stay unchanged.

## Long-Term And Scale Decision

No new media collection, reference ledger, scheduler, owner toggle, or CDN dependency was added. Existing single-URL fields now cause one selected Storage object write rather than speculative sibling writes. The safe retention trade-off remains bounded metadata cleanup plus retained public objects when exclusive ownership is unknown. This costs more Storage than destructive guessing, but prevents broken menu, duplicate, outlet, PWA, and cached URLs.

Revisit physical orphan cleanup only when measured bucket inventory proves material growth and one global contract can prove every live reference across project copies, outlet projections, store public presence, PWA overrides, screens, and in-flight/ambiguous mutations. That is an evidence-triggered migration, not a current launch requirement.

## Verification Commands

The final item-5 rerun must pass:

```bash
npm run test:media-storage-boundary
npm run verify:storage-lifecycle
npm run verify:storage-paths
npm run test:firebase-storage-upload-lifecycle
npm run test:pwa-icon-storage-boundary
npm run test:pwa-icon-commit-boundary
npm run test:image-batch-retention-boundary
npm run test:image-batch-client-boundary
npm run test:image-batch-server-boundary
npm run verify:ai-accounting
npx tsc --noEmit --incremental false
npm --prefix functions run build
npm --prefix functions run lint
npx eslint <scoped touched source and verifier files>
git diff --check
```

The Storage emulator suite specifically proves public read, same-store create/delete, cross-store denial, immutable overwrite denial, original-byte preservation, unknown-profile/MIME denial, GIF denial, raw project image/PDF limits, platform blog authorization, and template boundaries.

## External And Owner-Pending Evidence

- Include the app/server changes in an approved QA Vercel release; no Vercel build or deploy is authorized by this audit.
- Deploy the validated root Storage rules to `menulist-qa`, then repeat in production only after QA evidence and explicit production approval.
- Deploy the affected `menulistMaintenanceScheduler` Function after isolating the intended shared Functions release; current source makes image-batch retention metadata-only.
- Run authenticated desktop/MobileShell upload, replace, remove, retry, offline/interrupted, and public-render smoke for item/project/background/logo/OBP/PWA/screen/generated images.
- Capture bucket lifecycle configuration, orphan inventory, Storage quota/alerting, cache/CDN behavior, and production-host low-bandwidth/device evidence through the External Certification Runbook.
