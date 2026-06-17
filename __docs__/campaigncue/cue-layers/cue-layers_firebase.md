# CueLayers - Firebase And Cost Notes

## Status

Safe upload spine implemented. The active v1 runtime keeps CueLayers lightweight: one source package artifact with inline compact business/protected-text/brand/rights snapshots, one layer index artifact, one current editor snapshot, compact design/job/version/export/repair documents, and Storage-backed owner exports. Long-running worker targets, provider decomposition, diagnostic quality reports, job events, correction-event learning streams, and cost ledgers remain dormant contracts until those providers are enabled.

Current implementation notes:

- Firestore rules expose scoped read-only access for CueLayers design/job/version/export/repair/correction/quality documents and keep cost/review samples admin-only.
- Storage rules allow scoped workspace-member reads under `campaigncue/cue-layers/{workspaceId}/{designId}/...` and deny client writes/deletes.
- Server/Admin code writes active CueLayers artifacts and metadata through CampaignCue workspace scope.
- The active path is upload -> flat-safe editor projection -> autosave/version -> Storage-backed PNG export registration. Provider calls are not active, so provider cost is zero in the current runtime.
- Asset Library downloads for private Storage-backed exports use runtime signed URLs. Signed URLs are not stored in Firestore or durable editor JSON.
- Active v1 avoids duplicate diagnostic writes: no separate truth-snapshot JSON files, no projection/reconstruction JSON persistence, no quality-report collection writes, no job-event writes, no correction-event writes, and no export-report JSON artifact.
- Active v1 business snapshots store catalog fact summaries only, not catalog image URLs or source-reference arrays. Item/service names and price labels remain in protected text truth.

## Cost Principles

| Principle | Rule |
| --- | --- |
| Firestore pointer/state only | Store status, ids, counters, small summaries, and current pointers. |
| Storage for heavy artifacts | Store images, layer indexes, editor document snapshots, and exports in Storage/GCS. Provider-mode masks, reports, projections, diffs, and diagnostics stay Storage-backed when those routes are enabled. |
| Immutable artifacts | Never overwrite generated assets or reports; write new versions and update pointers. |
| Runtime signed URLs only | Persist asset ids or `cue-asset://assetId`, not signed URLs. |
| Bounded reads | Read one workspace/design/job/status path, never whole libraries during processing. |
| No broad listeners | Use a one-document status listener only while visible, or bounded polling with backoff. |
| Debounced autosave | Save editor document snapshots after idle delay and size validation. |
| Lazy high-res | Use editor-resolution assets in browser and create export-resolution assets only for export. |
| Idempotent writes | Every worker step can safely retry without duplicating assets or status side effects. |
| Provider calls last | Run local quality checks, hash dedupe, route budgeting, SAFE_MODE, rate limits, and AI capacity checks before model calls. |
| Reuse existing patterns | Mirror MenuList image generation: preflight capacity, task-secret worker calls, bounded concurrency, transactional progress, Storage-first artifacts. |

## Proposed Firestore Collections

All collections are nested under:

`campaigncueWorkspaces/{workspaceId}`

| Collection | Purpose | Client access |
| --- | --- | --- |
| `cueLayerDesigns/{designId}` | Design state, source pointer, current editor snapshot pointer, readiness, summary warnings. | Read only through rules; writes through API/Admin. |
| `cueLayerJobs/{jobId}` | Reconstruction job state, progress, source package pointer, error code, retry metadata. | Read single job through `cueLayerDesigns.current.jobId` where available; writes through API/Admin. |
| `cueLayerJobEvents/{eventId}` | Dormant provider/ops contract for bounded operational events when worker decomposition is enabled. Active v1 does not write this collection. | Admin/server read by default. |
| `cueLayerVersions/{versionId}` | Version pointer records, not the large editor document snapshot itself. | Read list with limit. |
| `cueLayerExports/{exportId}` | Export request/result state and download asset pointer. | Read own workspace exports. |
| `cueLayerRepairRequests/{repairId}` | Targeted repair request/result state. | Read own request; writes through API/Admin. |
| `cueLayerCorrectionEvents/{eventId}` | Dormant learning/support stream for provider repair and owner corrections. Active v1 restore-fallback repair writes only a repair request. | Server write; scoped/admin read by default. |
| `cueLayerQualityReports/{qualityReportId}` | Dormant provider-mode quality gate summary and Storage report pointer. Active v1 keeps the compact warning/quality summary on `cueLayerDesigns`. | Read own design summary; writes through API/Admin. |
| `cueLayerCostRecords/{recordId}` | Dormant estimated provider/worker/render costs. Active v1 has no provider spend and does not write cost records. | Admin/server only or summary only. |
| `cueLayerReviewSamples/{sampleId}` | Dormant QA sample pointers and human-review labels for model/provider rollout. | Admin/internal only. |

## Firestore Document Shapes

### `cueLayerDesigns/{designId}`

Small state only:

- `id`
- `workspaceId`
- `createdByUserId`
- `title`
- `source.kind`
- `source.currentSourcePackageAssetId`
- `source.originalAssetId`
- `current.creativeEditorDocumentSnapshotAssetId`
- `current.layerIndexAssetId`
- `current.layerIndexVersionId`
- `current.jobId`
- `current.previewAssetId`
- `current.revision`
- `status`: `draft`, `processing`, `ready`, `needs_review`, `failed`, `cancelled`
- `quality.visualMatchScore`
- `quality.textSafetyStatus`
- `quality.warningCount`
- `cost.estimate`
- `updatedAt`

Do not store full observation bundles, Fabric runtime serialization, base64 images, OCR reports, masks, or signed URLs here.

### `cueLayerJobs/{jobId}`

- `id`
- `workspaceId`
- `designId`
- `createdByUserId`
- `sourcePackageAssetId`
- `sourceKind`
- `status`
- `outcome`
- `step`
- `progress`
- `attempt`
- `idempotencyKey`
- `workerLease`
- `error.code`
- `error.safeMessage`
- `currentArtifactIds`
- `createdAt`
- `updatedAt`
- `completedAt`

Valid job statuses are `created`, `uploaded`, `processing`, `completed`, `failed`, and `cancelled`. Valid outcomes are `ready`, `needs_review`, `flat_safe`, `unsupported`, and `failed`. Valid steps are `normalizing`, `observing`, `decomposing`, `recovering_text`, `elementizing`, `vectorizing`, `repairing_background`, `resolving_scene`, `generating_editor_projection`, `validating`, and `exporting`.

### `cueLayerQualityReports/{qualityReportId}` - dormant provider path

Compact summary only. Active v1 does not write this collection; it keeps first-pass visual/text/readiness summary fields on `cueLayerDesigns.quality`. Use this collection only when provider decomposition, visual diffing, or OCR/text validation workers need a reviewable report pointer.

- `id`
- `workspaceId`
- `designId`
- `jobId`
- `sourceKind`
- `gate.pixelFidelity`: `pass`, `needs_review`, `flat_safe`, `failed`
- `gate.textFidelity`: `pass`, `blocked`, `downgraded`, `needs_review`
- `gate.structuralUsefulness`: `pass`, `needs_review`, `downgraded`
- `gate.exportFidelity`: `pass`, `not_run`, `failed`
- `visualMatchScore`
- `protectedTextMismatchCount`
- `layerUsefulnessScore`
- `warningCount`
- `reviewRequired`
- `reportAssetId`
- `diffAssetId`
- `createdAt`

The full quality report, text comparison details, rejected candidates, model versions, and render diff assets stay in Storage/GCS.

### `cueLayerExports/{exportId}`

- `id`
- `workspaceId`
- `designId`
- `versionId`
- `sourceRevision`
- `format`: `png`, `jpeg`, `webp`, `pdf_flattened`, `json`
- `status`
- `sourceCreativeEditorDocumentSnapshotAssetId`
- `outputAssetId`
- `sizeBytes`
- `createdByUserId`
- `createdAt`

Export requests must satisfy `sourceRevision === cueLayerDesigns.current.revision`. A stale export request is rejected or routed to an explicit conflict flow.

### `cueLayerCorrectionEvents/{eventId}` - dormant provider path

Active v1 restore-fallback repair writes `cueLayerRepairRequests/{repairId}` only. Use correction events when provider repair, owner corrections, or training/replay streams are enabled.

- `id`
- `workspaceId`
- `designId`
- `jobId`
- `correctionType`: `restore_fallback`, `text_downgraded`, `mask_repaired`, `vector_rejected`, `background_repaired`, `z_order_changed`, `layer_deleted`, `image_replaced`
- `layerId`
- `sourceObservationIds`
- `beforeRuntimeAssetId`
- `afterRuntimeAssetId`
- `userId`
- `createdAt`

## Storage Paths

Active v1 server-owned durable paths:

```text
campaigncue/cue-layers/{workspaceId}/{designId}/sources/{sourcePackageId}/package.json
campaigncue/cue-layers/{workspaceId}/{designId}/sources/{sourcePackageId}/original.{ext}
campaigncue/cue-layers/{workspaceId}/{designId}/versions/{versionId}/creative-editor-document.json
campaigncue/cue-layers/{workspaceId}/{designId}/versions/{versionId}/layer-index.json
campaigncue/cue-layers/{workspaceId}/{designId}/exports/{exportId}/output.{ext}
```

Provider/decomposition-mode paths remain reserved but dormant until the relevant workers and gates are enabled:

```text
campaigncue/cue-layers/{workspaceId}/{designId}/sources/{sourcePackageId}/normalized.png
campaigncue/cue-layers/{workspaceId}/{designId}/sources/{sourcePackageId}/editor-reference.png
campaigncue/cue-layers/{workspaceId}/{designId}/jobs/{jobId}/observations/{observationBundleId}.json
campaigncue/cue-layers/{workspaceId}/{designId}/reconstructions/{reconstructionId}/reconstruction.json
campaigncue/cue-layers/{workspaceId}/{designId}/reconstructions/{reconstructionId}/layers/{layerId}/editor.png
campaigncue/cue-layers/{workspaceId}/{designId}/reconstructions/{reconstructionId}/layers/{layerId}/export.png
campaigncue/cue-layers/{workspaceId}/{designId}/reconstructions/{reconstructionId}/layers/{layerId}/mask.png
campaigncue/cue-layers/{workspaceId}/{designId}/reconstructions/{reconstructionId}/projection/{projectionId}.json
campaigncue/cue-layers/{workspaceId}/{designId}/validation/{validationId}/render.png
campaigncue/cue-layers/{workspaceId}/{designId}/validation/{validationId}/diff.png
campaigncue/cue-layers/{workspaceId}/{designId}/quality/{qualityReportId}.json
campaigncue/cue-layers/{workspaceId}/{designId}/repairs/{repairId}.json
campaigncue/cue-layers/{workspaceId}/{designId}/repairs/{repairId}/layers/{layerId}/editor.png
campaigncue/cue-layers/{workspaceId}/{designId}/exports/{exportId}/report.json
```

Every persisted asset reference must include:

- `assetId`
- `assetUri`: `cue-asset://assetId`
- `retentionClass`: `source_durable`, `runtime_durable`, `diagnostic_temporary`, `export_durable`, or `repair_durable`
- `assetScope`: `workspaceId`, `designId`, and the relevant `sourcePackageId`, `jobId`, `reconstructionId`, `versionId`, `repairId`, or `exportId`
- `storageGeneration`
- `storageMetageneration`
- `sha256`
- `perceptualHash` where meaningful

Client upload landing zone:

```text
campaigncue/assets/{workspaceId}/cue-layers/uploads/{uploadId}/source.{ext}
```

The server must verify and copy a landing-zone upload into the immutable CueLayers source path before processing.

## Storage Operational Policy

| Area | Requirement |
| --- | --- |
| Region | Use the CampaignCue Firebase/GCS region selected for the dedicated CampaignCue project; do not mix MenuList or Answerlattice buckets. |
| Bucket posture | Separate logical prefixes for source, generated assets, diagnostics, editor document snapshots, repairs, and exports. Physical bucket split can come from Firebase project provisioning. |
| Object naming | Use stable ids: `{workspaceId}/{designId}/{jobId-or-versionId}/{purpose}`. Never use owner filenames as path authority. |
| Metadata | Store content type, sha256, perceptual hash, source kind, design id, job id, workspace id, and retention class where useful. |
| Cache | Immutable generated artifacts can use long cache headers. Runtime/signed URL responses stay short-lived. |
| CORS | Browser-loadable editor assets require explicit CORS for the CampaignCue app domains. CORS does not make assets public. |
| Public access | Public bucket access stays disabled unless a separate public-export feature is explicitly built. |
| App Check | Use App Check for client upload/status routes when CampaignCue app setup supports it; server workers still verify ownership. |
| Lifecycle | Durable source/editor snapshot/export records follow design deletion policy; diagnostics and failed temporary artifacts expire earlier. |

## Security Rules Direction

Firestore:

- Default deny remains.
- Workspace members can read their own design/job/export summaries.
- All writes are server/Admin only.
- Internal cost/review/event records should stay server/admin only unless a specific owner-facing view exists.

Storage:

- Upload landing zone can allow workspace-member writes with type/size limits.
- Server-owned CueLayers processing paths should be read-limited to workspace members and write-denied to clients.
- Render/report/repair artifacts should be server-owned.
- Delete should be server/Admin unless explicit user deletion API is implemented.

## Read/Write Cost Estimate

### Cost Priority Order

CueLayers should spend the least expensive resource first.

| Order | Check | Cost impact |
| --- | --- | --- |
| 1 | MIME, size, dimension, corruption, EXIF, local route heuristics. | Browser/server CPU; blocks bad inputs before any Firebase/model cost. |
| 2 | Source hash and perceptual hash dedupe. | One bounded lookup or indexed direct record; avoids duplicate worker/model runs. |
| 3 | Workspace/session/rate limit/SAFE_MODE/capacity check. | Small bounded reads; prevents provider spend. |
| 4 | Create job and upload source image. | Small Firestore writes plus source/package/layer-index/editor-snapshot Storage artifacts in the current flat-safe path. |
| 5 | Worker observations and validation. | Provider calls only after budgets and source quality pass. |
| 6 | Export-resolution assets. | Lazy; created only when the owner exports/downloads. |

Provider cost dominates Firebase cost, so the implementation should optimize for avoided provider calls first, then Storage size, then Firestore read/write count.

### Upload And Create Job

| Operation | Count | Notes |
| --- | ---: | --- |
| Workspace guard read | 1 | Via CampaignCue API scope guard. |
| Hash/dedupe lookup | 0-1 | Direct/indexed lookup by source hash or design-intent hash before creating a new expensive job. |
| SAFE_MODE/rate/capacity checks | 1-3 bounded reads | Must run before worker/provider dispatch. Reuse existing helpers where product scope allows. |
| Idempotency claim | 0-1 write | Only when the caller supplies an idempotency key; creates the in-progress guard before Storage writes. |
| Create/upload session write | 0 in active v1 | Add only when a signed/resumable landing-zone flow is introduced. |
| Upload to Storage | 1 image + 3 JSON artifacts | Original image, source package with inline truth snapshots, layer index, and initial editor snapshot. |
| Create design doc | 1 write | Small pointer/state doc. |
| Create job doc | 1 write | Small state doc. |
| Create version doc | 1 write | Pointer metadata for the initial editor snapshot. |
| Event/quality/cost initial record | 0 in active v1 | Job events, quality reports, and cost records stay dormant until provider/worker decomposition is enabled. |
| Idempotency completion | 0-1 write | Only when the caller supplies an idempotency key; batched with design/job/version writes. |

The active flat-safe upload stores `cueLayerDesigns.current.jobId` as the current job pointer. Idempotent upload replay uses that pointer for a direct job document read and falls back to an indexed `designId` query only for legacy design records that do not have the pointer.

### Worker Processing

| Operation | Count | Notes |
| --- | ---: | --- |
| Job read per step | 1 per step | Can be cached in worker state. |
| Status writes | Bounded, max one per coarse step | Avoid per-layer progress writes. |
| Artifact writes | Many Storage writes | Images/reports go to Storage, not Firestore. |
| Design pointer update | 1 write per major completed stage | Do not update for every layer. |
| Cost ledger write | 1 per expensive provider/worker segment | Summary-friendly. |
| Provider call | 0 until preflight passes | Model calls happen only after source quality, dedupe, route budget, and AI capacity succeed. |

### Editor Boot

| Operation | Count | Notes |
| --- | ---: | --- |
| Workspace/design guard read | 1-2 reads | Server-side. |
| Current pointer read | included in design read | No broad collection scan. |
| Storage signed URL generation | per referenced asset | Not a Firestore read. |
| Asset download signed URL | 1 per owner download | Generated on demand from an authenticated API route; not persisted. |
| Editor document snapshot Storage read | 1 | Server reads and hydrates scoped asset URLs. |
| Layer index Storage read | 1 | Sidecar is loaded from `current.layerIndexVersionId`, falling back to the current version for legacy records. |

### Autosave

| Operation | Count | Notes |
| --- | ---: | --- |
| Local IndexedDB write | free | Browser-local draft. |
| Editor document snapshot Storage write | 1 per debounced save | Validate size first. |
| Layer index Storage write | 0 per normal save | Autosave reuses the existing layer index unless a future decomposition/asset-change flow explicitly changes it. |
| Design pointer update | 1 write | Update current revision; batched with the version pointer write. |
| Version doc write | 1 debounced checkpoint | Batched with the design pointer update. |

### Export

| Operation | Count | Notes |
| --- | ---: | --- |
| Export request doc write | 1 final export record | Written after output bytes and Asset Library metadata are ready. |
| Editor document snapshot Storage read | Browser/editor-owned before request | Active v1 receives rendered bytes from the saved editor revision; future server export workers should read the snapshot directly. |
| Asset reads | Browser/editor-owned before request | Future server export workers use server bucket access. |
| Output Storage write | 1 | Final downloadable file; export registration is not created unless this write succeeds. |
| Export report artifact | 0 in active v1 | Avoid duplicate report JSON unless a future server renderer needs it. |
| CampaignCue asset record write | 1 | Export is registered into Asset Library for manual download/reuse; asset metadata and its audit event are owned by the shared CampaignCue asset path. |

### Repair

| Operation | Count | Notes |
| --- | ---: | --- |
| Repair patch Storage write | 0 in active v1 | Restore-fallback repair has no large patch body. |
| Repair request write | 1 | Compact restore-fallback intent and source revision. |
| Correction event write | 0 in active v1 | Provider repair and learning streams remain dormant. |

## Job Event And Status Cost Policy

Active v1 does not write job-event documents; `cueLayerJobs` and `cueLayerDesigns` contain the visible status and owner warning summary. When provider/worker decomposition is enabled, do not write progress for every layer, mask, or OCR word. Use coarse step events only:

- `job_created`
- `upload_verified`
- `normalized`
- `routing_completed`
- `observations_completed`
- `decomposition_completed`
- `text_recovery_completed`
- `scene_resolved`
- `editor_projection_created`
- `visual_validation_completed`
- `text_safety_completed`
- `ready`
- `needs_review`
- `failed`
- `cancelled`

Detailed model reports belong in Storage artifacts, with Firestore holding only pointers and summary counters.

## Hard Limits

Initial constants should include:

| Limit | Default |
| --- | ---: |
| Max upload bytes | 3 MB for current direct JSON source intake. Raise only after moving upload to a signed/resumable landing zone or client-side compression path. |
| Max source long edge | 4096 px |
| Max editor long edge | 2048 px |
| Max canvas pixels | 8 million |
| Max final layers | 30 |
| Max OCR regions | 120 |
| Max segmentation candidates | 80 |
| Max vector paths | 50 |
| Max vector path commands per object | 1500 |
| Max editor document snapshot bytes | 2 MB before compression/storage |
| Max export long edge | 4096 px unless large export flag is on |
| Reconstruction job max runtime | 10 minutes before timeout |
| Visual/text validation max runtime | 3 minutes before timeout |
| Export job max runtime | 3-10 minutes depending on output size and enabled export flags |
| Repair job max runtime | 2-5 minutes depending on selected region size |
| Max repair attempts per design | 10 per day |
| Max premium model calls | 1 per job unless platform/admin override allows more |
| Max provider retries | Bounded by AI Gateway/backoff policy; no unbounded model retry loops |

## Existing Repo Pattern Reuse

| Pattern | CueLayers requirement |
| --- | --- |
| AI Gateway | Use gateway/key rotation/retry wrapper for Google calls. |
| `checkAICapacity` style preflight | Estimate reconstruction, repair, and export provider quantity before dispatch. |
| SAFE_MODE | Block expensive work when global/product safe mode is active. |
| Cloud Tasks worker posture | Dispatch item/job work through authenticated tasks or equivalent worker calls, not direct browser model calls. |
| Task secret/IAM | Worker endpoints reject public job bodies and require internal authentication. |
| Bounded concurrency | Cap model prompts, mask work, Storage uploads, and exports. |
| Transactional progress | Merge coarse job progress from the latest job doc, avoiding lost progress and per-layer writes. |
| Admin Storage upload | Worker writes generated artifacts through Admin/server paths after ownership validation. |
| Quality guard/optimizer | Reject tiny/corrupt sources and create normalized/editor-resolution derivatives before provider calls. |
| Sanitized logs | Log provider summaries, not base64, raw prompts, raw source images, contact data, or signed URLs. |

## Retention

| Artifact | Retention |
| --- | --- |
| Original source | Durable until asset/design deletion request. |
| Normalized/editor reference | Durable while design exists. |
| Observation bundles | Dormant provider path. Durable for replay when enabled, but compactable after retention window. |
| Diagnostic renders/diffs | Dormant provider path. Short retention, for example 14-30 days. |
| Full quality reports | Dormant provider path. Durable while the design exists, with heavy provider details compactable after review window. |
| Failed temporary artifacts | Short retention, for example 7 days. |
| Exports | Durable if registered as asset; otherwise expiring download. |
| Cost records | Durable summary; raw step detail can compact. |

## Indexes

Planned query patterns:

- `cueLayerDesigns` by `updatedAt desc` with bounded page size.
- `cueLayerJobs` by `designId`, `createdAt desc`.
- `cueLayerExports` by `designId`, `createdAt desc`.
- `cueLayerRepairRequests` by `designId`, `createdAt desc`.
- Dormant provider indexes: `cueLayerQualityReports` by `designId`, `createdAt desc`; `cueLayerReviewSamples` by `status`, `createdAt desc` for internal review. These do not add active read/write cost until those collections contain documents.

Avoid cross-workspace collection group queries unless an internal admin/reporting use case is explicitly built.

## Abuse And Cost Protection

- Rate-limit upload sessions, job creation, repair, export, and generated-source handoff.
- Deduplicate by source checksum/perceptual hash where practical.
- Deduplicate generated-design sources by source hash plus design-intent hash plus prompt/model version.
- Require owner confirmation before expensive repair/export.
- Disable risky subfeatures through flags without disabling the whole editor.
- Keep provider/model selection in a server-side registry.
- Record cost estimates before dispatch and actual usage after completion.
- Use the lowest-cost acceptable model for the route; reserve premium image models for explicit high-value jobs.
- Stop after deterministic/flat-safe output when source quality is too low instead of spending on premium decomposition.
- Add dead-letter/stuck-job handling for repeated worker failure.
- Add orphan cleanup for abandoned upload sessions, partial artifacts, stale signed URL sessions, and expired exports.
- Segment cost metrics by source kind, route, model/provider family, prompt version, accuracy gate result, and repair/export type.

## Operations, Alerts, And SLOs

Planned operating metrics:

| Metric | Use |
| --- | --- |
| Job queue wait p50/p95 | Detect dispatch or worker capacity issues. |
| Step duration p50/p95 | Locate slow OCR, segmentation, validation, or export steps. |
| Failure rate by step | Separate input failures from provider or renderer failures. |
| Needs-review rate | Tune thresholds without pretending all jobs are ready. |
| Text safety fail rate | Detect risky OCR/model/provider changes. |
| Protected text mismatch rate | Catch regressions where business text changes during decomposition. |
| Pixel/export fidelity fail rate | Catch renderer or asset-hydration drift. |
| Export failure rate | Protect owner download reliability. |
| Cost per job and per export | Keep Firebase/provider cost visible. |
| Storage bytes by retention class | Prevent diagnostic artifact creep. |

Alerts should cover stuck jobs, repeated worker failures, high text safety failure, high export failure, Storage growth beyond threshold, and provider cost spikes.

## Firebase Deploy Note

When this feature is implemented, changes to `firestore-campaigncue.rules`, `firestore-campaigncue.indexes.json`, `storage-campaigncue.rules`, or CampaignCue Firebase worker/function logic must be validated and deployed to the CampaignCue Firebase target according to the repo's Firebase auto-deploy rule. This docs-only pass does not modify deployable Firebase infrastructure.
