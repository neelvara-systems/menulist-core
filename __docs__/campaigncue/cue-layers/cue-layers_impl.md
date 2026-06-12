# CueLayers - Implementation Plan

## Implementation Status

This document is both the implementation plan and current implementation map.

Implemented now:

- CampaignCue owner upload entry from Editor and Asset Library.
- Source package, design, job, version, quality report, repair request, correction event, and export metadata contracts.
- CampaignCue-authenticated API routes for upload, list, job read, boot, autosave, repair record, Storage-backed export registration, and scoped Asset Library download handoff.
- CampaignCue Storage-first artifacts with immutable source/package/version/reconstruction/quality/repair/export paths.
- `CreativeEditorDocumentSnapshot` as durable editor truth with `cue-asset://assetId` references.
- Boot-time signed URL hydration and autosave-time URL dehydration.
- Flat-safe projection into the shared Creative Editor that preserves the original image as the first render.

Not implemented as active runtime yet:

- OCR/text recovery, segmentation masks, vectorization, semantic background repair, generated-source intake, worker dispatch, provider model calls, visual diff rendering, and high-confidence editable decomposition.
- These paths are intentionally gated behind feature flags and server-side capability registry entries until deterministic fixtures and provider adapters are implemented.

## Current Codebase Truth

| Existing system | Current path | CueLayers implication |
| --- | --- | --- |
| Shared editor docs | `__docs__/shared-creative-editor/README.md` | CueLayers must project into this editor instead of creating a new one. |
| Neutral editor schema | `src/modules/creative-editor/types.ts` | Add product-neutral reconstruction metadata only if needed by all adapters. |
| Fabric adapter | `src/modules/creative-editor/fabricAdapter.ts` | Use Fabric for runtime editing, not as canonical AI truth. |
| CampaignCue adapter | `src/modules/creative-editor/providers/campaigncue.ts` | Add CueLayers entry points through CampaignCue provider code, not shared base editor imports. |
| CampaignCue workspace | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | Add owner upload/status/open-editor flow inside CampaignCue workspace. |
| CampaignCue asset API | `src/app/api/campaigncue/assets/route.ts` | Reuse asset metadata registration after export. |
| CampaignCue guards | `src/lib/campaigncue/apiGuards.ts` | All CueLayers APIs must reuse CampaignCue auth, scope, and rate limiting. |
| CampaignCue server | `src/lib/campaigncue/server.ts` | Add server functions behind CampaignCue Admin boundary only. |
| CampaignCue constants | `src/constants/campaigncue/` | Add CueLayers flags/routes/database constants here, not flat/shared constants. |
| AI system layer | `src/lib/google/genAi/`, `functions/src/ai/`, `__docs__/ai-system-layer/` | Reuse key rotation, retry, Google Gen AI SDK entrypoints, and provider failure behavior. |
| Menu image generation | `src/app/api/image-generation/`, `__docs__/projects/ai-image-generation/` | Reuse cost gates, prompt quantity estimation, Cloud Tasks fan-out, task-secret worker validation, bounded concurrency, and Storage upload posture. |
| Image quality guard | `src/lib/imageQualityGuard.ts` | Reuse minimum dimension/corruption checks before reconstruction. |
| Image optimizer | `src/lib/image/optimizeImage.ts` | Reuse dimension/quality budget ideas for editor-resolution assets and upload cost control. |
| Storage helpers | `src/database/storage/uploadBase64MediaImageAdmin.ts`, `src/database/storage/uploadPreparedMediaImage.ts`, `src/database/storage/uploadJSONToStorage.ts` | Prefer existing upload/profile patterns before adding CueLayers-specific helpers. |

## Repo Architecture Reuse Requirements

CueLayers must extend existing repo patterns instead of creating a parallel AI/media architecture.

| Existing pattern | CueLayers requirement |
| --- | --- |
| AI Gateway and key rotation | All Google model calls go through the repo `genAIClient` gateway or the CampaignCue equivalent wrapper. No raw SDK clients in feature routes/workers. |
| SAFE_MODE | Expensive source-package jobs, repair, export rendering, and generated-source handoff must stop when the global/product safe-mode check is active. |
| Rate limiting | Upload sessions, job creation, repair, generated-source handoff, and export use existing rate-limit helpers or CampaignCue equivalents before any provider/worker dispatch. |
| AI capacity/accounting | Estimate provider quantity before dispatch. Block when credits/budget are unavailable. Record actual usage after the provider call. |
| Batch worker pattern | Use Cloud Tasks/Firebase Functions/Cloud Run-style dispatch with task secret/IAM validation for expensive steps, matching the image batch worker posture. |
| Bounded concurrency | Use existing bounded-concurrency patterns for prompt/model work, Storage uploads, mask generation, and export assets. |
| Transactional progress | Update job/design state in coarse, idempotent transactions. Do not write one Firestore update per mask, OCR word, or layer. |
| Storage-first artifacts | Store source images, normalized images, masks, observations, reports, runtime snapshots, and exports in Storage/GCS. Firestore keeps pointers and compact summaries only. |
| Image quality/optimization | Reject corrupt/tiny inputs early and create editor-resolution assets before export-resolution assets. |
| Safe logging | Use sanitized summaries for provider responses, prompts, source images, owner contact fields, and generated media. |

## Shared Core And Product Adapters

The implementation should split product-neutral reconstruction from product-specific ownership.

| Layer | Suggested path | Rule |
| --- | --- | --- |
| Shared reconstruction schema | `src/lib/creative-layering/schema/` | No CampaignCue/MenuList imports. |
| Shared observation/scene resolver | `src/lib/creative-layering/resolver/` | Consumes provider-neutral observations and emits audited reconstruction documents. |
| Shared validation | `src/lib/creative-layering/validation/` | Pixel, text, structure, and export gates are product-neutral with product-provided truth inputs. |
| Shared editor projection | `src/lib/creative-layering/projection/` | Outputs `CreativeEditorDocument` plus product-neutral layer metadata. |
| CampaignCue adapter | `src/lib/campaigncue/cue-layers/` | Owns CampaignCue auth, workspace scope, source package, facts, Storage, and Asset Library registration. |
| MenuList adapter | `src/lib/menulist/creative-layering/` | Owns MenuList project/store/item scope, outlet policy, menu item image media profiles, AI accounting, and public cache invalidation. |

The shared core can be implemented in this repo only when it stays product-neutral. Product constants still remain under product-specific constants folders.

## Naming

| Layer | Name |
| --- | --- |
| Owner-facing feature | CueLayers |
| Docs folder | `__docs__/campaigncue/cue-layers/` |
| Internal prefix | `CampaignCueCueLayers` |
| Source abstraction | `CampaignCueCreativeSourcePackage` |
| API namespace | `/api/campaigncue/cue-layers/...` |
| Storage prefix | `campaigncue/cue-layers/{workspaceId}/...` |

## Feature Flags

Add flags in `src/config/features.ts`.

| Flag | Default | Purpose |
| --- | --- | --- |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS` | `true` after implementation | Top-level CueLayers capability. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD` | `true` | Owner upload source adapter. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_GENERATED_SOURCE` | `false` | Generated source adapter. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_TEXT_EDITABLE` | `false` | Allows text conversion only after safety gate. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_VECTOR_EDITABLE` | `false` | Allows vector candidates only after validation. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_BACKGROUND_REPAIR` | `false` until validated | Controls semantic/background repair risk. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_SVG_EXPORT` | `false` until sanitized | Controls risky SVG output. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_REPAIR_WORKER` | `false` | Targeted repair loop. Current route records restore-fallback intent only. |
| `ENABLE_CAMPAIGNCUE_CUE_LAYERS_LARGE_CANVAS_EXPORT` | `false` until cost-tested | Large export guard. |

## Proposed File Map

### Constants And Types

| Path | Purpose |
| --- | --- |
| `src/constants/campaigncue/cueLayers.ts` | Feature limits, status values, source kinds, asset kinds, route labels, kill-switch constants. |
| `src/constants/campaigncue/routes.ts` | Add CueLayers API route constants. |
| `src/constants/campaigncue/database.ts` | Add CueLayers collection names and id prefixes. |
| `src/types/campaigncueCueLayers.ts` | Product-specific source package, job, design, reconstruction, observation, and export types. |
| `src/lib/validation/campaigncueCueLayersSchemas.ts` | Zod schemas for upload request, job create, status, repair, autosave, export. |

### Server/API

| Path | Purpose |
| --- | --- |
| `src/app/api/campaigncue/cue-layers/uploads/route.ts` | Implemented. Creates a server-owned source package from owner upload and returns editor boot package. |
| `src/app/api/campaigncue/cue-layers/jobs/route.ts` | Not implemented. Upload route currently creates the deterministic flat-safe job. |
| `src/app/api/campaigncue/cue-layers/jobs/[jobId]/route.ts` | Read one job/design status. |
| `src/app/api/campaigncue/cue-layers/jobs/[jobId]/cancel/route.ts` | Not implemented. Required only when asynchronous workers are active. |
| `src/app/api/campaigncue/cue-layers/designs/[designId]/boot/route.ts` | Return editor boot package with runtime-hydrated asset URLs. |
| `src/app/api/campaigncue/cue-layers/designs/[designId]/autosave/route.ts` | Save debounced runtime snapshot pointer. |
| `src/app/api/campaigncue/cue-layers/designs/[designId]/versions/route.ts` | Not implemented as a separate route. Autosave creates immutable version snapshots. |
| `src/app/api/campaigncue/cue-layers/designs/[designId]/repair/route.ts` | Implemented for restore-fallback/correction-event records. Worker repair remains gated. |
| `src/app/api/campaigncue/cue-layers/designs/[designId]/exports/route.ts` | Implemented. Revision-pins, stores rendered export bytes, and registers exported assets for manual download/reuse. |
| `src/lib/campaigncue/cue-layers/server.ts` | CampaignCue Admin reads/writes, idempotency, state transitions. |
| `src/lib/campaigncue/cue-layers/storagePaths.ts` | Canonical Storage paths and asset ref helpers. |
| `src/lib/campaigncue/cue-layers/runtimeAssetUrls.ts` | Folded into `server.ts` for current implementation. Extract only if reuse grows. |
| `src/lib/campaigncue/cue-layers/modelRegistry.ts` | CampaignCue model/provider selection using server-side config, feature flags, and cost gates. |
| `src/lib/campaigncue/cue-layers/costEstimator.ts` | Not implemented. No provider dispatch runs in the current safe upload spine. |
| `src/lib/campaigncue/cue-layers/workerDispatcher.ts` | Not implemented. Required before async provider decomposition is enabled. |

### Pipeline

| Path | Purpose |
| --- | --- |
| `src/lib/campaigncue/cue-layers/source/createSourcePackage.ts` | Shared source package creator. |
| `src/lib/campaigncue/cue-layers/source/userUploadSourceAdapter.ts` | User upload source path. |
| `src/lib/campaigncue/cue-layers/source/generatedFlatImageSourceAdapter.ts` | Generated flat-image path. |
| `src/lib/campaigncue/cue-layers/source/generatedDesignSourceAdapter.ts` | Design-first generated path. |
| `src/lib/campaigncue/cue-layers/schema/reconstruction.ts` | Canonical reconstruction document helpers. |
| `src/lib/campaigncue/cue-layers/observations/` | Gemini/OCR/layout/mask/vector observation adapters. |
| `src/lib/campaigncue/cue-layers/resolver/sceneResolver.ts` | Observation to reconstruction decisions. |
| `src/lib/campaigncue/cue-layers/generator/editorProjectionGenerator.ts` | Reconstruction to shared editor document/projection. |
| `src/lib/campaigncue/cue-layers/validation/visualValidator.ts` | Recomposition render/diff gate. |
| `src/lib/campaigncue/cue-layers/validation/textSafetyValidator.ts` | Text semantic safety gate. |
| `src/lib/campaigncue/cue-layers/repair/` | Fallback restoration and targeted repair patches. |
| `src/lib/campaigncue/cue-layers/export/` | Saved-runtime export, download URL, postprocess. |
| `src/lib/campaigncue/cue-layers/ops/` | Cost ledger, structured logs, replay, regression harness. |

Shared core candidates for the same engine across CampaignCue and MenuList:

| Path | Purpose |
| --- | --- |
| `src/lib/creative-layering/schema/` | Product-neutral reconstruction, observation, validation, and projection types. |
| `src/lib/creative-layering/resolver/sceneResolver.ts` | Shared observation-to-layer decisions. |
| `src/lib/creative-layering/validation/` | Shared pixel/text/structure/export gates. |
| `src/lib/creative-layering/projection/editorProjectionGenerator.ts` | Shared projection into `CreativeEditorDocument`. |
| `src/lib/menulist/creative-layering/` | MenuList adapter for generated/uploaded menu item image editing. |

### UI

| Path | Purpose |
| --- | --- |
| `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` | Add entry buttons and status cards. |
| `src/components/templates/campaigncue/CueLayersUploadPanel.tsx` | Upload/generate-source owner flow. |
| `src/components/templates/campaigncue/CueLayersJobStatus.tsx` | Progress, needs review, failed, ready states. |
| `src/modules/creative-editor/` | Existing editor runtime. Add product-neutral metadata support only if required. |

## Core Data Contracts

### Durable Truth Split

| Truth | Durable owner | Purpose |
| --- | --- | --- |
| `CampaignCueCreativeSourcePackage` | Storage JSON + Firestore pointer | Source kind, original/normalized/editor asset ids, provenance, seed observations. |
| `CueLayersObservationBundle` | Storage JSON | Raw model/OCR/mask/layout/vector evidence. |
| `CueLayersReconstructionDocument` | Storage JSON | Audited layer decisions, confidence, fallback, provenance. |
| `CueLayersEditorProjection` | Storage JSON | Projection package that maps reconstruction decisions into shared editor state. |
| `CreativeEditorDocumentSnapshot` | Storage JSON | Durable current user-edited design state. |
| `CueLayersLayerIndex` | Storage JSON | Sidecar layer metadata, provenance, fallbacks, warnings, and asset refs. |
| `CueLayersExportOutput` | Storage file + Firestore pointer | Final downloadable output. |

Firestore stores status, ids, counters, summaries, current pointers, and small warnings.

Fabric JSON is not durable product truth. It is adapter/runtime serialization used by the browser editor and server renderer after validation. Durable documents must store `cue-asset://assetId` references, never signed URLs.

### Source Package

Required fields:

- `sourcePackageId`
- `sourceKind`: `user_upload`, `generated_flat_image`, `generated_design`
- `workspaceId`, `designId`, `createdByUserId`
- `originalAssetId`, `normalizedAssetId`, `editorReferenceAssetId`
- `width`, `height`, `mimeType`, `sha256`, `perceptualHash`
- `provenance`
- `seedObservationAssetId`
- `designIntentManifestAssetId`
- `businessTruthSnapshotAssetId`
- `protectedTextTruthAssetId`
- `brandSnapshotAssetId`
- `rightsSnapshotAssetId`
- `rights`: `sourceRightsStatus`, optional `containsPerson`, `containsLogo`, `watermarkDetected`
- `createdAt`

### Reconstruction Layer

Required fields:

- `layerId`
- `type`: text, shape, raster, background, logo, product, person, decoration, group metadata, unknown
- `editableLevel`: locked reference, text editable, vector editable, raster masked, raster fallback, clean background, unknown confidence
- `geometry`
- `zIndex`
- `confidence`
- `assetRefs`
- `fallback`
- `provenance`
- `warnings`
- `sourceObservationIds`
- `validation`

## API Rules

Every protected API route must:

- Use `withAuth`.
- Use CampaignCue session scope from server-side session, not client-provided ownership.
- Validate request body with Zod before database access.
- Apply CampaignCue rate limits before expensive operations.
- Use idempotency keys for job creation, autosave commit, repair, and export.
- Return safe errors only.
- Log security-relevant failures without raw images, prompts, tokens, or contact data.

## Worker Boundary

Do not run image decomposition, OCR, vectorization, render validation, or high-resolution export inside a normal Next.js route.

Recommended execution:

```text
Next.js API
  -> auth, scope, request validation, job doc, upload session, status, boot, signed URL hydration

Cloud Run worker
  -> normalization, routing, observations, decomposition, text recovery, elementization, vector/raster/background, scene resolution, validation, export, repair

CampaignCue Storage/GCS
  -> large artifacts, immutable JSON, images, previews, exports, reports

Firestore
  -> status, current pointers, events, counters, cost summaries
```

Firebase Functions may be used only for lightweight dispatch if it fits current deployment rules. Heavy processing belongs in Cloud Run-style workers.

For repo alignment, the first implementation should mirror the MenuList image batch pattern:

```text
Protected product API
  -> SAFE_MODE, rate limit, scope, input validation
  -> source hash/dedupe and quality preflight
  -> cost estimate and AI capacity check
  -> job doc and task dispatch
  -> worker validates task secret/IAM and current job state
  -> bounded provider/storage work
  -> transactional coarse progress update
```

If CampaignCue gets a dedicated Firebase Functions target, Functions should own lightweight dispatch, cleanup, and scheduled maintenance. Long-running image decomposition/rendering should still run in a worker target that supports the required timeout, memory, and retry envelope.

## Worker Status, Retry, And Cancellation Contract

The conversation was explicit that worker orchestration is part of product quality. CueLayers should use coarse, auditable state transitions and avoid per-layer progress writes.

| Area | Requirement |
| --- | --- |
| Status transitions | Only allow forward movement through job `created`, `uploaded`, `processing`, `completed`, `failed`, and `cancelled`. Use `outcome` for `ready`, `needs_review`, `flat_safe`, `unsupported`, or `failed`. |
| Internal steps | Track current step separately from owner status: `normalizing`, `observing`, `decomposing`, `recovering_text`, `elementizing`, `vectorizing`, `repairing_background`, `resolving_scene`, `generating_editor_projection`, `validating`, `exporting`. |
| Retry policy | Retried steps detect existing artifacts by stable ids and continue idempotently. |
| Soft cancel | API marks job cancelled; workers check before expensive steps and before pointer updates. |
| Hard cancel | Worker stops processing when safe; already-written immutable artifacts remain for cleanup. |
| Stuck recovery | A lease/heartbeat marks stalled jobs for retry or failed-safe state. |
| Progress writes | Write one progress update per coarse step, not per mask/layer/object. |
| Failure classes | Separate permanent input failure, retryable infrastructure failure, retryable model failure, validation failure, and policy failure. |
| IAM | Dispatcher/worker must authenticate internal calls and must not trust public job bodies. |

## Routing And Engine Taxonomy

Routing is an internal budget and safety decision, not an owner-facing mode.

| Route | Meaning | Default policy |
| --- | --- | --- |
| `graphic_design_layer_decomposition` | Poster/social/banner with clear layout. | Run layout, OCR, masks, vector candidates, scene resolver. |
| `photo_conservative` | Photo-heavy food/salon/product visual. | Prefer raster masks and conservative background; fewer vectors. |
| `text_recovery_priority` | Menu, offer, flyer, or dense text region. | OCR/text safety first; downgrade risky text to raster. |
| `vectorization_priority` | Flat logo/icon/illustration. | Run vector eligibility and path simplification within limits. |
| `design_first_seeded` | Generated design with structured intent. | Promote intended text and generated structure before OCR. |
| `fallback_only` | Low-quality, unsafe, too dense, or unsupported. | Locked image plus safe overlays only. |

Local metrics before model calls should include image dimensions, aspect ratio, estimated text density, connected-component count, color count/palette, texture entropy, compression/noise signal, edge density, and approximate blank/background regions.

## Research-Backed Provider Strategy

CueLayers must be model-registry driven. Current market and provider research shows that image generation, segmentation, layered decomposition, and OCR capabilities are changing quickly. The implementation should therefore treat provider/model names as server-side configuration and keep durable artifacts provider-neutral.

Provider decisions:

- Do not hardcode an Imagen-era architecture. Imagen availability changes in 2026, so generated-source support must sit behind a CampaignCue model registry.
- Gemini image models can be image-generation adapters, but generated pixels are still source artifacts that must pass CueLayers validation.
- OCR must sit behind one text-observation adapter that returns words, lines, boxes, confidence, and language.
- Segmentation should be named as a SAM-family adapter, so SAM2, SAM3, SAM3.1, or newer equivalents can be swapped without changing reconstruction schema.
- Qwen-Image-Layered, OmniPSD-style, and native layered/RGBA models can provide observation bundles, but they do not own final layer decisions.
- Provenance signals such as source hash, generation provider family, prompt/version id, and generated-media watermark evidence should be captured where available.

## Model Capability Registry

There is no single best model for CueLayers, and model names change faster than durable editor documents. The implementation must select by capability, release stage, cost tier, and rollout policy. Exact model ids are server configuration examples only, not architecture truth.

```ts
type ModelCapability =
  | "image_generation"
  | "image_editing"
  | "layout_reasoning"
  | "ocr"
  | "segmentation_masks"
  | "text_safety"
  | "background_repair";

type ModelRegistryEntry = {
  provider: "google" | "internal" | "open_source";
  modelId: string;
  releaseStage: "stable" | "preview" | "deprecated";
  capabilities: ModelCapability[];
  costTier: "low" | "medium" | "premium";
  enabled: boolean;
  rolloutPercent: number;
};
```

Registry selection rules:

- Default image generation chooses the cheapest enabled model with `image_generation`.
- Premium generation chooses an enabled `premium` model with `image_generation` only after route and cost approval.
- Segmentation chooses an enabled adapter with `segmentation_masks`; do not assume every Gemini image model supports pixel-level masks.
- OCR/text truth chooses a provider that returns word/line boxes, confidence, and language; CampaignCue/MenuList facts remain protected truth.
- Repair/inpaint stays conservative, selected-region only, flagged, and cost-estimated before dispatch.
- Store model family, model id, prompt/version id, release stage, cost tier, and gate result in quality/cost reports.
- Allow model changes through server-side config or Remote Config-style switches, not durable design JSON.
- Never use Imagen as a required path because Firebase documents Imagen shutdown on June 24, 2026.
- Do not call premium models when deterministic routing says `fallback_only`, `text_recovery_priority`, or source quality is below minimum.
- Cache/dedupe by source hash, perceptual hash, design intent hash, and prompt version before model dispatch.

Current Google examples to keep behind the registry:

| Need | Example posture |
| --- | --- |
| High-volume generated visual/background source | Cheapest enabled Gemini image-generation model available through the selected Google provider. Current examples include `gemini-3.1-flash-image`, Firebase preview variants, or `gemini-2.5-flash-image` where configured. |
| Premium complex design/text-sensitive generation | Enabled premium Gemini image model, for example `gemini-3-pro-image` or provider-equivalent, only after explicit route and cost approval. |
| Native segmentation masks | SAM-family adapter, dedicated segmentation/matting model, or a Gemini model only when the registry marks `segmentation_masks=true`. |
| Layout/bounding box observations | Gemini image-understanding adapter through the repo AI Gateway; output is stored as observations only. |
| Protected text truth | OCR plus CampaignCue/MenuList facts; never use generated pixels alone as final truth. |

## Model And Engine Adapter Boundaries

No single engine owns the final scene. Every provider emits observations or candidates.

| Engine family | Allowed role | Notes |
| --- | --- | --- |
| Gemini visual/layout reasoning | Layout, semantic naming, object boxes, route hints, generation intent reasoning. | Must not output final Fabric JSON. |
| Gemini image-generation family | Generated image/background source candidates. | Output becomes a source package or observation; it still needs validation. |
| OCR provider | Text words/lines/boxes/confidence. | Google Cloud Vision, PaddleOCR, Tesseract, or equivalent can sit behind one adapter. |
| LayerD-style decomposition | Candidate RGBA layers and masks. | Useful, but not product backbone or source of truth. |
| SAM-family segmentation | Candidate masks for objects/regions. | SAM2/SAM3/SAM3.1-style outputs need merge/split/filter and validation. |
| Native layered/RGBA model | Candidate layered outputs. | Qwen/OmniPSD-style outputs are observations only, not trusted design truth. |
| BiRefNet/matting | Edge refinement and alpha matte candidates. | Output remains candidate/fallback evidence. |
| Connected components | Deterministic local fallback evidence. | Useful for flat shapes and diagnostics. |
| Potrace/VTracer/vector tools | Vector candidates for simple flat artwork. | Must pass path complexity, render diff, and SVG sanitization gates. |
| Background repair/inpaint | Conservative fill only inside masks. | Semantic/generative repair stays behind a flag. |

Do not build around deprecated or unstable provider-specific defaults. Provider/model names belong in a server-side registry so CampaignCue can switch without changing editor state.

## Accuracy Architecture

CueLayers readiness must be computed from separate gate results, not one model score.

| Gate | Inputs | Output |
| --- | --- | --- |
| Pixel fidelity | Source image, reconstructed render, diff heatmap, mask drift metrics. | `pass`, `needs_review`, `flat_safe`, or `failed`. |
| Text fidelity | OCR, intended text, CampaignCue business facts, crop-level render comparison. | Editable text allowed, downgraded, or blocked. |
| Structural usefulness | Layer count, group stability, z-order confidence, object area, object fragmentation. | Ready, merge/downgrade, or needs review. |
| Export fidelity | Saved runtime state, server render output, preview render, asset hydration report. | Export allowed, retried, or failed-safe. |

Each job should produce:

- a compact Firestore quality summary for owner/admin status,
- a full Storage/GCS quality report for replay and support,
- an optional visual diff artifact for internal review.

## Business Truth Layer

The text safety validator must be able to compare OCR/model text to CampaignCue business truth when available.

Protected text candidates:

- business name,
- branch/location,
- phone number,
- address,
- public menu, booking, or destination URL,
- offer title,
- price, discount, or package amount,
- date, event, or festival,
- CTA.

For `generated_design`, intended text from the design intent is higher authority than OCR. For `generated_flat_image`, generation intent is a strong prior but still requires pixel/OCR validation. For `user_upload`, OCR is evidence, but conflicts with known business facts must produce a warning or raster fallback instead of silent editable text.

## Generated-Design Preflight

Design-first generation must not enter reconstruction until preflight has produced a stable source package and truth snapshots.

Required preflight:

1. Prompt policy check and safe-owner error if blocked.
2. Business truth extraction from CampaignCue workspace, campaign brief, offer, CTA, destination, brand, and location.
3. Protected text normalization into `protectedTextTruthAssetId`.
4. Brand and rights snapshot creation.
5. Cost estimate and capacity check before image generation.
6. Capability-registry model selection.
7. Candidate validation before registering the generated source package.

Critical business text from generated designs should become native `CreativeEditorDocumentSnapshot` text layers where possible. Generated pixels are supporting visual assets, not protected text truth.

## Fabric Loading Constraints

The mature conversation had several Fabric-specific constraints that must be preserved:

- `fabricJson` must be Fabric-compatible runtime data only.
- Canvas width/height must be controlled by the CueLayers/editor projection, not inferred from arbitrary Fabric payload.
- Use promise-based projection loading and abort stale loads when the owner switches design/job.
- Browser image URLs must be CORS-safe, but durable JSON must store asset ids, not URLs.
- Product logic must not depend on Fabric object's `type` alone; use allowlisted CueLayers metadata.
- AI custom properties must be explicitly registered/serialized and stripped/validated before server render.
- Object order is part of the projection contract and cannot be sorted casually by the UI.
- Logical groups should stay as layer-panel metadata until real group editing is fully safe.

## Renderer And Export Allowlist

The renderer is a security boundary. Saved editor state must be validated before browser boot, server render, repair, or export.

Allowed durable element types must match the shared editor contract:

```text
image
text
pathText
rect
ellipse
triangle
polygon
path
line
qr
```

Blocked before render/export:

- external URLs,
- data URLs or base64 blobs,
- `javascript:` URLs,
- arbitrary user/model SVG,
- remote fonts outside the controlled catalog,
- unknown Fabric classes,
- Fabric filters or custom properties not in the allowlist,
- any `cue-asset://assetId` that does not belong to the same workspace and design.

Renderer input must be `CreativeEditorDocumentSnapshot` plus a hydrated, scoped asset map. It must not trust raw Fabric JSON from the client.

## Implementation Spine

This is dependency order, not a product phase split.

| Order | Work item | Why first |
| --- | --- | --- |
| 1 | Constants, flags, types, schemas, storage paths | Locks contract before models. |
| 2 | Firestore/Storage state model and rules | Prevents unsafe client trust and cost drift. |
| 3 | Deterministic fixture harness | Proves schema/editor/export without model uncertainty. |
| 4 | Source package adapters | Unifies upload and generated assets. |
| 5 | Job creation/status/cancel APIs | Creates secure product flow. |
| 6 | Worker step runner with idempotency | Enables retries and replay. |
| 7 | Reconstruction document and scene resolver | Makes observations useful. |
| 8 | Shared editor projection generator | Lands output in current editor runtime. |
| 9 | Editor layer metadata and panel UX | Makes confidence and fallback visible. |
| 10 | Autosave/versioning/boot | Preserves edits safely. |
| 11 | Visual validator and text safety validator | Prevents false ready state. |
| 12 | Fallback restoration/repair | Makes imperfect output usable. |
| 13 | Export worker | Ensures production downloads are consistent. |
| 14 | Real model adapters | Plug in OCR/vision/mask engines after deterministic path passes. |
| 15 | Cost ledger, replay, QA, monitoring | Production operating layer. |

## MenuList Menu Item Image Adoption

MenuList generated menu item images should use the same shared reconstruction core and shared editor runtime through a MenuList adapter.

| Area | MenuList rule |
| --- | --- |
| Source package | Use MenuList project/store/item ids, generated image asset metadata, item facts, and store/menu authority. |
| Auth and scope | Use MenuList session, tenant/store/project validation, and master/outlet image governance. |
| AI cost | Use existing AI capacity/accounting and image-generation quantity estimation before any reconstruction or repair call. |
| Storage | Use MenuList media image profiles and project/store/item Storage paths, not CampaignCue paths. |
| Editor | Use a MenuList shared-editor adapter; the base editor must not import MenuList project state directly. |
| Public cache | Any accepted image that changes public menu output must invalidate the public menu/OBP cache through MenuList's existing cache invalidation path. |
| Firebase writes | MenuList adapter writes MenuList-owned project/item/media records only. No CampaignCue workspace writes. |

## Export Contract

CueLayers must export from saved runtime state, not unsaved browser-only canvas state.

Export invariant:

```text
exportRequest.sourceRevision === cueLayerDesigns.current.revision
```

If the browser has unsaved changes, the UI must autosave/refresh before export. If the saved revision changed after the export request was created, the worker rejects the export or asks for an explicit conflict flow.

| Format | Decision |
| --- | --- |
| `png` | Primary owner download format. |
| `jpeg` | Supported for smaller social/download output when transparent background is not needed. |
| `webp` | Optional optimized download format if renderer and browser support are stable. |
| `pdf_flattened` | Flattened output only; not a layered PDF promise. |
| `svg_best_effort` | Disabled until sanitizer and renderer allowlist are proven. Never canonical. |
| `fabric_runtime_json` | Internal/debug serialization only after URL stripping and validation; not durable product truth. |
| `zip_layers` | Useful for designer handoff, but not required to open editor. |
| `psd` | Not an architecture driver and not a day-one promise. |

## 0-27 Step Mapping

| Step | Implementation target |
| --- | --- |
| S0 | Define `CampaignCueCreativeSourcePackage`. |
| S1 | User upload adapter with server verification and normalization. |
| S2 | Generation job schema linked to CampaignCue campaigns/assets. |
| S3 | Generated flat image adapter. |
| S4 | Generated design adapter with intended text observations. |
| S5 | Seed observations from generation intent and business facts. |
| 0 | Product contract constants, unsupported-result path, public claim boundary. |
| 1 | `CueLayersReconstructionDocument`, Zod validation, invariants. |
| 2 | `CueLayersEditorProjection` projection to `CreativeEditorDocumentSnapshot` and Fabric runtime metadata. |
| 3 | Immutable Storage paths and asset ref resolver. |
| 4 | Firestore job/design/version/export/cost/event docs. |
| 5 | API job orchestration, Cloud Tasks/Run dispatch, state transitions. |
| 6 | Upload normalization and metadata strip. |
| 7 | Route diagnosis and budget selection. |
| 8 | Observation bundle writers. |
| 9 | Decomposition engine adapter boundary. |
| 10 | OCR/text recovery and font confidence. |
| 11 | Elementization and component-to-object conversion. |
| 12 | Vector candidate recovery with path complexity limits. |
| 13 | Raster masked layer generation. |
| 14 | Conservative clean background generation. |
| 15 | Z-order resolver and manual reorder fallback. |
| 16 | Logical group resolver without default Fabric groups. |
| 17 | Scene resolver and final layer decisions. |
| 18 | Shared editor/Fabric projection generator with AI metadata. |
| 19 | Visual recomposition validator. |
| 20 | Text safety validator. |
| 21 | Layer panel confidence/fallback UX. |
| 22 | Metadata preservation during runtime edits. |
| 23 | Autosave, local draft, version snapshots. |
| 24 | Editor boot and asset URL hydration. |
| 25 | Targeted repair and fallback restoration. |
| 26 | Server-side export/download pipeline. |
| 27 | Ops, cost ledger, QA datasets, replay, cleanup, kill switches. |

## Shared Editor Integration

The current shared editor persists a neutral `CreativeEditorDocument`. CueLayers should persist a versioned `CreativeEditorDocumentSnapshot` and must not replace it with raw Fabric JSON as the product truth.

Required extension options:

1. Prefer adding optional product-neutral metadata to `CreativeEditorElementBase`, for example `reconstruction?: CreativeEditorReconstructionMetadata`.
2. Keep full CueLayers metadata in a side `layerIndex` asset and only put stable ids/warnings into the editor document.
3. Preserve unknown AI properties during Fabric serialization through the Fabric adapter only after they are typed and allowlisted.

Never add CampaignCue imports to `src/modules/creative-editor/CreativeEditor.tsx`.

Every durable artifact must carry a `schemaVersion` and be readable through backward-compatible migrations:

- `CampaignCueCreativeSourcePackage`
- `CueLayersObservationBundle`
- `CueLayersReconstructionDocument`
- `CueLayersEditorProjection`
- `CreativeEditorDocumentSnapshot`
- `CueLayersLayerIndex`
- `CueLayersQualityReport`
- `CueLayersRepairPatch`
- `CueLayersExportReport`

## Editor UX Requirements

| Area | Required behavior |
| --- | --- |
| Entry | "Turn image into layers" from Asset Library/Creative Studio. |
| Progress | Owner sees queued, processing, needs review, ready, failed, cancelled. |
| Ready state | Only after visual and text gates pass or mark needs review. |
| Layer row | Shows type, confidence, fallback, warning, lock, visibility, reorder, duplicate, delete. |
| Low confidence | Plain copy: "Kept as image for safety" or "Needs review". |
| Text mismatch | Owner cannot edit altered semantic text until repaired/accepted. |
| Flat-safe mode | Opens original as locked image with safe overlays only. |
| Repair | Restore original, keep text as image, replace image, rerun selected area, downgrade vector. |
| Export | Save/download from saved runtime state; rendered PNG bytes must be stored before Asset Library registration; no social posting. |

## Security Requirements

- Treat uploaded files, model observations, SVG, Fabric runtime serialization, editor document snapshots, and export requests as untrusted.
- Allowlist Fabric object types/properties before server render/export.
- Do not load arbitrary external URLs, JavaScript URLs, raw user SVG, remote fonts, or base64 blobs in the renderer.
- Hydrate only workspace-owned asset ids into short-lived signed URLs.
- Strip signed URLs before autosave/version persistence.
- Validate persisted image references against the current CueLayers layer index before writing a version.
- Generate Asset Library download URLs only at request time; never persist signed URLs.
- Enforce max image bytes, pixels, object count, layer count, vector path count, total editor document snapshot bytes, and export dimensions.
- Add deletion paths for user-requested removal and failed temporary artifacts.

## Firebase Cost Requirements

- Firestore is pointer/state only.
- No large JSON in Firestore.
- No base64 in Firestore.
- No broad realtime listeners.
- Job progress uses one job/design listener while the status UI is open, or bounded polling with backoff.
- Store immutable artifacts in Storage/GCS with lifecycle rules.
- Use checksums/perceptual hashes to avoid duplicate expensive processing.
- Generate editor-resolution assets first and export-resolution assets lazily.

## Documentation And Verification Tasks

Before implementation is complete:

- Add/update Firebase rules and indexes docs.
- Add `npm run verify:campaigncue` checks for CueLayers flags, routes, docs, storage paths, no signed URL persistence, no product-boundary drift.
- Add deterministic fixture tests before model adapters.
- Add browser smoke for upload result, layer panel, repair, autosave, and export.
- Update shared editor docs only for product-neutral editor metadata changes.
- Update CampaignCue docs for owner workflow and cost posture.

## Operations And Review Surface

CueLayers needs an internal support/debug surface before broad usage:

- original/source image,
- rendered reconstruction,
- visual diff heatmap,
- text safety report,
- observation bundle summary,
- layer decisions and rejected candidates,
- repair history,
- export result,
- cost record,
- worker timing,
- human labels for QA samples.

This surface should be admin/internal and must not expose cross-workspace data.
