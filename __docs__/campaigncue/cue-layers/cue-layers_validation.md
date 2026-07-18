# CueLayers - Implementation Validation

**Date:** July 13, 2026
**Product:** CampaignCue
**Feature:** CueLayers
**Verdict:** Safe upload spine is implementation-ready after verification. Provider-driven editable decomposition is not active and remains gated.

## Implemented Feature Scope

CueLayers currently supports the conservative production path:

1. Owner opens CampaignCue Editor or Asset Library.
2. Owner uploads a PNG, JPEG, or WebP image under the current 3 MB direct-upload cap.
3. Server validates CampaignCue runtime, session scope, rate limit, canonical base64, byte-derived MIME/dimensions, maximum pixels, and container boundaries.
4. Server creates a CampaignCue source package artifact with inline business truth, protected text truth, brand truth, and rights snapshots.
5. Server creates only the active v1 immutable artifacts needed for reuse: original image, source package JSON, layer index JSON, and initial editor snapshot JSON.
6. Server creates compact design/job/version records under the CampaignCue workspace.
7. Server projects the original image into `CreativeEditorDocumentSnapshot` as a locked image object using `cue-asset://assetId`.
8. Editor boot validates the persisted design, editor snapshot, and layer index, then signs only image assets referenced by the document.
9. Autosave validates root/page editor state and layer-owned assets, writes an immutable editor snapshot, and atomically rechecks/updates the design revision and version pointer.
10. Export requires the saved source revision and exact saved-document fingerprint, verifies rendered dimensions and image bytes, then atomically registers the output, export record, and audit event after a final revision check.
11. Asset Library download uses a scoped API route that returns a short-lived URL at request time; signed URLs are not persisted.

## Files Reviewed

| Area | Files |
| --- | --- |
| Constants | `src/constants/campaigncue/cueLayers.ts`, `src/constants/campaigncue/database.ts`, `src/constants/campaigncue/routes.ts`, `src/config/features.ts` |
| Types/schemas | `src/types/campaigncueCueLayers.ts`, `src/lib/validation/campaigncueCueLayersSchemas.ts` |
| Server | `src/lib/campaigncue/cue-layers/server.ts`, `documentBoundary.ts`, `recordBoundary.ts`, `layerIndexBoundary.ts`, `idempotency.ts`, `imageMetadata.ts`, `storagePaths.ts`, `editorProjection.ts`, `modelRegistry.ts` |
| API routes | `src/app/api/campaigncue/cue-layers/**/route.ts`, `src/app/api/campaigncue/assets/[assetId]/download/route.ts` |
| Owner UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| Firebase | `firestore-campaigncue.rules`, `storage-campaigncue.rules`, `firestore-campaigncue.indexes.json` |
| Verification | `scripts/verification/verify-campaigncue-runtime.js`, `scripts/verification/test-campaigncue-cue-layers-*.ts` |
| Docs | `__docs__/campaigncue/cue-layers/*`, `__docs__/changelog.md` |

## Issues Found And Fixed

| Issue | Fix |
| --- | --- |
| CueLayers docs still said not implemented. | README, implementation, Firebase, validation, and changelog docs now state the implemented safe upload spine and gated provider paths. |
| Advanced provider flags were enabled without runtime adapters. | Generated-source, text-editable, vector-editable, and repair-worker flags are disabled until adapters exist. |
| Initial projection added a visible helper overlay, which changed first-render fidelity. | Projection now preserves the uploaded image as the only initial visible layer. |
| UI only mounted upload input on the editor tab. | Hidden upload input now mounts at workspace root, so Editor and Asset Library entry points share one upload flow. |
| Dynamic route error status narrowed against success payload `status` strings. | API routes now coerce error status to a number before `NextResponse.json`. |
| Design list read a nonexistent top-level `sourceKind`. | UI now reads `design.source.kind`. |
| Storage-backed exports had Asset Library records but no owner download handoff. | Added authenticated asset download API and Asset Library Download action that generates short-lived URLs at request time. |
| Autosave accepted URL-shaped `cue-asset://` references without proving they belonged to the current design. | Autosave now validates image asset ids against the current CueLayers layer index before writing a new version. |
| Active v1 wrote too many provider-grade artifacts for a flat-safe upload path. | Source truth snapshots are now inlined into the source package, catalog snapshots are compacted to fact fields, protected text includes item/service price labels, projection/reconstruction/quality JSON persistence is dormant, upload no longer writes quality/event documents, autosave reuses the unchanged layer index, repair writes only a repair request, and export no longer writes duplicate report/event records. |
| Persisted editor validation dropped pages, gradients, print metadata, QR fields, and editor-only flags. | The allowlisted document schema and hydrate/dehydrate boundary now preserve root and page state while stripping unknown metadata and external durable URLs. |
| Persisted design/job/layer-index records relied on shallow casts, and the direct job reader compared `designId` with itself. | Pure record boundaries now validate tenant/design identity, enums, revisions, pointers, asset scope/path/hash/size, duplicate ids, and fallback references. |
| Autosave and export checked revisions before Storage work but did not recheck at final registration. | Both paths now use final Firestore transactions; stale uploaded artifacts are removed best-effort and stale idempotency outcomes replay consistently. |
| Export accepted a current revision with a different submitted document or canvas size. | Export now reads the saved snapshot, compares a canonical durable fingerprint, and rejects rendered dimensions that do not match the saved canvas. |
| Image probes accepted trailing bytes and export pixel count was not bounded. | PNG/JPEG/WebP container endings and all WebP dimension encodings are checked; upload and export enforce long-edge and pixel-count limits. |
| A transient failure after creating an idempotency row left the key permanently `in_progress`; completion had no worker ownership token. | Claims now use a five-minute transaction lease. Live work conflicts, completed work replays, abandoned legacy/malformed/expired rows recover, and every upload/autosave/repair/export completion proves exact claim ownership. |
| The public feature page showed automatic text, offer, and photo layer candidates even though active v1 produces one locked flat-safe image. | Public code and website docs now show the implemented upload, locked source, owner-added editor elements, saved revision, and export flow. Automatic decomposition remains a gated expansion. |

## Security Result

| Check | Result |
| --- | --- |
| Auth/session | Every CueLayers API route uses `withAuth`, `requireCampaignCueRuntime`, and `requireCampaignCueSessionScope`. |
| Tenant isolation | Server derives workspace from session scope and does not trust client-provided `workspaceId` or owner ids. |
| Validation | Upload, design id, editor document, repair, and export inputs use Zod validation. |
| Storage write boundary | Client writes are denied; server/Admin writes immutable artifacts. |
| Durable asset references | Saved editor snapshots persist `cue-asset://assetId`, not signed URLs or base64 payloads. |
| Image asset ownership | Autosave rejects image references that are not in the current design layer index. |
| Export safety | CueLayers export is revision- and saved-document-pinned; stale/different editor state and mismatched canvas dimensions are rejected. SVG export is blocked in the owner UI, and output/asset/export/audit registration is atomic after immutable bytes exist. |
| Download safety | Asset Library download uses workspace-scoped asset lookup and runtime-only signed URLs. |

## Firebase Cost Result

| Path | Cost posture |
| --- | --- |
| Design list | One bounded query ordered by `updatedAt`, limited by `CAMPAIGNCUE_PAGE_SIZE`. |
| Upload | Client blocks images over 3 MB before base64 conversion. Server uses one workspace bootstrap/read path, one optional one-document idempotency lease transaction, one original-image Storage object, three JSON artifacts, and a claim-owned design/job/version/idempotency transaction. No quality/event/cost collection writes and no provider calls. |
| Boot | One design read, two bounded Storage JSON reads, and signed URL generation only for document-referenced assets. No Firestore broad scans. |
| Autosave | Debounced client save; initial design read, one layer-index Storage read, one editor-snapshot Storage write, then a transaction re-read and batched design/version/idempotency writes. The layer index is not rewritten. |
| Repair | Initial design read; optional layer-index Storage read; final transaction re-read; one compact restore-fallback request. No patch artifact, correction event, model call, or worker cost. |
| Export | Initial design read, one saved-snapshot Storage read, one immutable output write, then a transaction re-read and atomic Asset Library/export/audit/idempotency writes. No export report artifact, job event, direct provider posting, or social integration cost. |

## UX Result

| Owner flow | Result |
| --- | --- |
| Entry point | Owner can start CueLayers from Editor or Asset Library with "Reuse old image". |
| First render | The original image opens unchanged as a locked reference. |
| Editing | Owner can use the existing shared editor to add text, shapes, QR, and drawing layers. New image imports and browser SVG/JSON exports are disabled while a CueLayers design is active because added images and hydrated runtime URLs do not yet have a product-owned handoff contract. |
| Recent work | Recent CueLayers designs appear in the editor tab with status and revision. |
| Recovery | Restore original records a fallback repair request without pretending provider repair ran. |
| Mobile | The workspace primitives already use 44px touch targets and responsive layout; no separate dense mobile editor route was added. |

## Docs Result

Docs now separate current runtime from long-term architecture:

- Current: safe upload, immutable source package, flat-safe editor projection, autosave, Storage-backed PNG export/download.
- Gated: generated-source intake, OCR/text recovery, segmentation, vectorization, semantic background repair, worker dispatch, provider model calls, and high-confidence editable decomposition.

## Test And Build Result

| Check | Status |
| --- | --- |
| TypeScript | Passed: `npx tsc --noEmit --incremental false` |
| Focused CueLayers boundaries | Passed: document, idempotency, image metadata, layer-index, and persisted-record suites. |
| CampaignCue verifier | Passed locally before the Moda website-truth correction: `npm run verify:campaigncue`, including 1,723 runtime checks, the Asset Library and CueLayers boundary suites, pack-template/PWA/operating-loop/Pattern Cue checks, and CampaignCue Firestore and Storage rules emulator suites. Rerun required after the public-copy correction. |
| Lint | Passed for the touched CueLayers source and verification files. |
| Production build | Not rerun in this cost-optimization pass because production builds are opt-in. |
| Diff whitespace | Passed: `git diff --check` |
| Firebase deploy | Not required in this pass; no Firestore rules, Storage rules, indexes, or Cloud Function logic changed. |

## Remaining Gated Work

These are not active runtime claims:

- Generated CampaignCue source adapter.
- OCR/text extraction and protected text matching.
- Segmentation/mask/vector decomposition.
- Visual diff and text safety validator workers.
- Cloud Tasks/Firebase Functions/Cloud Run worker dispatcher.
- Provider cost estimator and cost ledger writes for expensive model paths.
- Server-rendered high-resolution export worker.
- Full pixel decoding, EXIF orientation normalization, and metadata stripping; active v1 structurally validates supported image containers and preserves the original bytes.
- Automated orphan cleanup for a process crash or ambiguous infrastructure failure between immutable Storage upload and Firestore registration.
- MenuList adapter adoption for menu item image editing.

## Production Readiness Verdict

The implemented safe upload spine is code/build ready. It is blocked from live production use until the CampaignCue Firebase project is provisioned or access is granted and the updated Firestore rules, Storage rules, and Firestore indexes are deployed.

The broader CueLayers "Magic Layer" class decomposition is not production-ready because provider and worker adapters are intentionally disabled. Public and owner-facing copy must continue to promise safe editable reuse with fallback, not perfect layer recovery.
