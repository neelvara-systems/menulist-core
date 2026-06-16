# CueLayers - Spec

## Executive Summary

CueLayers lets a CampaignCue owner reuse an existing static image instead of starting a new asset from scratch. The owner can upload a PNG, JPEG, or WebP, or use a CampaignCue-generated visual source. CueLayers reconstructs the image into editable objects where confidence is high, keeps the original image as a locked reference, and opens the result in the existing shared Creative Editor.

The product promise is conservative:

```text
Turn flat images or generated designs into a safe editable approximation with fallbacks.
```

The product must not promise:

```text
Recover original Canva, Figma, Photoshop, or PSD source layers.
```

Flattened pixels do not contain enough information to recover the original design file with certainty. CueLayers is valuable because it gives the owner a practical reusable design, not because it claims perfect source-file recovery.

## Current Implementation Status

The active runtime implements Flow 1 in conservative form:

- Upload PNG/JPEG/WebP.
- Preserve the original as the first-render editor image.
- Store source packages, truth snapshots, reconstruction/quality/version artifacts, and export records.
- Open the shared Creative Editor with a locked image reference and normal editor tools for owner edits.
- Autosave immutable editor snapshots and register exported assets for manual download/reuse.

Flow 2 and Flow 3 are product goals but are not enabled in the current runtime. OCR/text extraction, generated-source intake, segmentation, vectorization, background repair, provider workers, and high-confidence editable decomposition remain behind feature flags and model capability registry gates.

## Target Users

| User | Need |
| --- | --- |
| Restaurant owner | Reuse a festival poster, menu offer image, old social post, or generated CampaignCue visual without rebuilding it manually. |
| Salon owner | Reuse offer graphics, service posters, bridal packages, seasonal visuals, or staff-created assets from phone gallery. |
| Agency operator | Convert client-provided static creatives into editable CampaignCue assets for minor changes and export. |
| Multi-location manager | Reuse one base visual while changing location text, phone number, date, or offer details safely. |

## Product Goals

| Goal | Requirement |
| --- | --- |
| Reuse existing assets | Owners can upload a flat image and get an editable CampaignCue design where safe. |
| Reuse generated assets | CampaignCue-generated visual sources enter the same CueLayers pipeline through source adapters. |
| Preserve original | The source image remains stored and recoverable as a locked reference/fallback. |
| Keep text safe | Editable text is created only when validation proves the text content is safe. |
| Keep first render faithful | The generated editor view must visually match the original before asking the owner to edit. |
| Keep business text accurate | Business name, location, phone, offer, price, date, CTA, and destination text must be validated against CampaignCue source facts or kept as fallback. |
| Show confidence | Layers expose confidence, fallback, warning, and review state. |
| Support repair | The owner can restore fallback, keep text as image, replace layer asset, or request targeted repair. |
| Export only | Day-one delivery remains export/download/manual handoff, not direct posting. |
| Share one editor | CueLayers uses the existing shared Creative Editor and CampaignCue adapter. |
| Reuse repo infrastructure | CueLayers must use existing AI gateway, rate limit, capacity check, worker, Storage, image quality, and export patterns before adding new infrastructure. |
| Keep cross-product portability | The reconstruction core must be product-neutral enough for MenuList menu item images to use through a MenuList adapter without writing CampaignCue data. |

## Non-Goals

- No direct posting to WhatsApp, Google, Meta, Instagram, Facebook, or ad platforms.
- No claim that original design-tool layers can be recovered perfectly.
- No generic design-suite replacement.
- No arbitrary SVG trust path from model or user input.
- No persistent signed URLs in durable design files.
- No large JSON, image bytes, base64 data, or model reports in Firestore.
- No second editor runtime for generated designs.
- No automatic text rewrite when OCR/model output differs from the source truth.
- No advanced PSD export as the system driver.

## Primary User Flows

### Flow 1 - Upload Existing Image

1. Owner opens CampaignCue Asset Library or Creative Studio.
2. Owner selects **Reuse old image**.
3. Owner uploads a PNG, JPEG, or WebP.
4. CampaignCue verifies type, size, ownership, and workspace scope.
5. CueLayers creates a source package and job.
6. Owner sees progress and can leave the screen.
7. When ready, owner opens the result in the shared Creative Editor.
8. Owner edits safe layers, keeps fallback layers where needed, and exports PNG/manual handoff files. Durable editor snapshots remain product-owned instead of browser JSON handoff while CueLayers runtime assets are hydrated with private URLs.

### Flow 2 - Reuse CampaignCue Generated Asset

1. CampaignCue creates or prepares a visual source for a campaign.
2. The generated visual is registered as a source package with generation provenance and intended text where available.
3. CueLayers runs the same pipeline used for uploaded images.
4. If the generated source includes intended business text, that intended text is treated as the truth before OCR.
5. The owner opens one shared editor runtime and exports/downloads the result.

### Flow 3 - Design-First Generated Asset

1. CampaignCue compiles business facts, offer text, brand color, CTA, date, address, and destination into a design intent.
2. Visual/background elements may be generated, but critical business text is created as native editor text layers.
3. CueLayers seeds observations from that design intent and bypasses risky OCR dependence where possible.
4. The same editor, autosave, repair, and export stack is used.

### Flow 4 - Unsupported Or Low-Confidence Input

1. Owner uploads a difficult image such as dense document text, low-resolution poster, heavy compression, complex collage, unsafe content, or watermarked image.
2. CueLayers refuses unsafe reconstruction or falls back to flat-safe mode.
3. The editor opens the image as a locked/reference background with only safe overlays where possible.
4. The owner can crop, add text, export, or try a different source.

## Source Model

CueLayers uses one source-package abstraction for all input paths.

| Source kind | Pixel source | Text truth | Pipeline behavior |
| --- | --- | --- | --- |
| `user_upload` | Owner-uploaded image | OCR/source pixels | Full reconstruction. |
| `generated_flat_image` | Generated image candidate | Intended text if provided, otherwise OCR | Full reconstruction plus generation priors. |
| `generated_design` | Generated background/visual and structured intent | Design intent text | Seeded reconstruction; critical text becomes native editor text. |

Internal name: `CampaignCueCreativeSourcePackage`.

Every source package must snapshot the source truth used at job creation time. Runtime validation, replay, support review, and export must not silently switch to newer business facts after the job started.

| Snapshot field | Purpose |
| --- | --- |
| `businessTruthSnapshotAssetId` | CampaignCue business facts, offer facts, CTA, destination, location, and contact values used for protected-text validation. |
| `protectedTextTruthAssetId` | Normalized text that may not be silently changed, including generated-design intended text. |
| `brandSnapshotAssetId` | Brand colors, logo refs, approved words, and font/catalog constraints used for the design. |
| `rightsSnapshotAssetId` | Source-rights status, generated/uploaded provenance, person/logo/watermark flags, and owner attestations. |

## Cross-Product Extension Contract

CueLayers is CampaignCue-facing, but the reconstruction engine should not be CampaignCue-only. The stable split is:

| Layer | CampaignCue use | MenuList menu-image use |
| --- | --- | --- |
| Shared reconstruction core | Normalize, observe, resolve, validate, and project into the shared editor. | Reuse the same core for generated menu item images and editable menu image assets. |
| Product source adapter | CampaignCue upload, generated flat image, generated design, campaign facts. | MenuList generated item image, uploaded item image, project/item facts, store/outlet policy. |
| Product truth | Business Brain, campaign brief, offer, CTA, brand inputs. | Project, item name, description, price, category, diet tags, store/menu authority. |
| Product persistence | CampaignCue Firebase, CampaignCue Storage, CampaignCue Asset Library. | MenuList Firestore/Storage paths, project DAL, menu item image media profiles, public cache invalidation. |
| Product UI | CampaignCue Asset Library and Creative Studio. | MenuList editor/image modal surface through a MenuList shared-editor adapter. |

Rules:

- The shared reconstruction core must not import CampaignCue or MenuList modules.
- Product adapters own auth, tenant scope, source truth, cost accounting, rights metadata, and Storage paths.
- MenuList adoption must reuse existing image generation governance: master/outlet item authority, AI capacity checks, SAFE_MODE, task-secret worker calls, bounded batch work, and media image quality profiles.
- No product writes another product's Firestore or Storage documents.

## Layer Output Contract

| Output | Meaning |
| --- | --- |
| `locked_reference` | Original source image preserved for comparison and fallback. |
| `background` | Original or normalized base background layer when no clean background is trusted. |
| `clean_background` | Conservative repaired background if safe. |
| `raster_masked` | Photo/object/person/product cutout with alpha. |
| `raster_fallback` | Original pixels used when editability is unsafe. |
| `text_editable` | Editable text that passed text safety validation. |
| `vector_editable` | Simple shape/path that passed vector safety and render-diff gates. |
| `group_metadata` | Logical group shown in layer panel without forcing Fabric groups. |
| `unknown_confidence` | Layer is useful but needs owner review. |

## Supported Layer Taxonomy

The conversation listed a broader day-one layer vocabulary. CueLayers should preserve that vocabulary internally even when several classes map to the same shared-editor object type.

| Layer class | Owner meaning | Default editability |
| --- | --- | --- |
| `locked_reference` | Original image for comparison and restore. | Locked. |
| `background` | Base source/background image. | Usually locked or raster. |
| `clean_background` | Background after safe object/text removal. | Raster clean background. |
| `photo_subject` | Main photographic subject. | Raster masked. |
| `person` | Person/creator/staff/customer subject. | Raster masked with consent/right checks. |
| `product` | Food item, salon service visual, packaged product. | Raster masked. |
| `logo` | Logo or brand mark. | Raster or vector only if safe and licensed/owned. |
| `icon` | Simple icon-like artwork. | Vector if validated, otherwise raster. |
| `text` | Text region from source or intent. | Editable only after text safety. |
| `shape` | Rect, circle, line, path, polygon, badge. | Vector if simple and validated. |
| `decoration` | Confetti, accent, pattern, frame, flourish. | Vector or raster fallback. |
| `image_block` | Embedded photo/image rectangle in the design. | Raster. |
| `shadow` | Shadow or depth layer. | Raster or derived style metadata. |
| `overlay` | Tint, gradient, transparent overlay. | Shape/style if simple, otherwise raster. |
| `group` | Logical collection such as badge + text. | Metadata-first, not default Fabric group. |
| `unknown` | Useful but uncertain object. | Raster fallback or needs review. |

## State Model

The owner should not see "ready" just because generation finished.

Machine state must be split into job status, outcome, processing step, and design status. Do not encode outcome into a single compound status value.

### Job Status

| Status | Meaning |
| --- | --- |
| `created` | Request exists. |
| `uploaded` | Source file is received. |
| `processing` | Worker is running a bounded step. |
| `completed` | Processing finished and an outcome is available. |
| `failed` | No safe usable result was produced. |
| `cancelled` | Owner or system stopped the job. |

### Job Outcome

| Outcome | Owner meaning |
| --- | --- |
| `ready` | Visual and text gates passed without critical warning. |
| `needs_review` | A usable result exists, but warnings must be reviewed. |
| `flat_safe` | Original/source image is preserved as the safe editable baseline. |
| `unsupported` | The input cannot be safely reconstructed. |
| `failed` | The job failed and no owner-usable output is available. |

### Processing Step

| Step | Meaning |
| --- | --- |
| `normalizing` | File is being checked and prepared. |
| `observing` | The system is reading layout, text, and visual evidence. |
| `decomposing` | Candidate layers are being created. |
| `recovering_text` | Text candidates are being checked. |
| `elementizing` | Candidate objects are being converted into design objects. |
| `vectorizing` | Simple vector candidates are being tested. |
| `repairing_background` | Background fallback is being prepared. |
| `resolving_scene` | Final layer decisions are being made. |
| `generating_editor_projection` | Shared editor projection is being created. |
| `validating` | Visual and text safety checks are running. |
| `exporting` | Saved editor state is being rendered to a downloadable asset. |

### Design Status

| Status | Meaning |
| --- | --- |
| `draft` | Design exists but has no completed reconstruction. |
| `processing` | Active job is processing. |
| `ready` | Current saved editor state is ready for owner edit/export. |
| `needs_review` | Current saved editor state is usable but needs owner review. |
| `failed` | Current job/design cannot be opened safely except through fallback/retry. |
| `cancelled` | The active job was cancelled. |

Owner-facing labels should stay plain: "Ready", "Needs review", "Kept as image for safety", "Text kept as image because it could not be verified", "Original preserved", and "Export ready".

## Accuracy Gates

CueLayers must not use one vague "AI confidence" score as the readiness source. It needs four independent gates.

| Gate | What it protects | Owner-facing impact |
| --- | --- | --- |
| Pixel fidelity | The first render visually matches the source image. | If this fails, use `outcome=flat_safe` or `outcome=needs_review`. |
| Text fidelity | Protected business text is not silently altered. | Editable text is blocked or downgraded to raster if it conflicts. |
| Structural usefulness | Layers are practical for owner edits without over-fragmentation. | Too many tiny/uncertain objects are merged, grouped, or kept as image. |
| Export fidelity | Server export matches the saved editor preview. | Export is blocked/retried if render validation fails. |

Protected text includes business name, branch/location, phone, address, booking/public-menu URL, offer title, price/discount, date, event/festival name, CTA, and destination. For generated designs, intended CampaignCue text is the primary truth. For uploads, OCR and pixels are evidence, but known CampaignCue facts must be used to flag conflicts.

## Functional Requirements

| Requirement | Detail |
| --- | --- |
| Upload intake | Accept PNG/JPEG/WebP only, with size, pixel, and MIME verification. |
| Source preservation | Store original bytes and normalized image separately. |
| Normalization | Apply EXIF orientation, sRGB conversion, dimension caps, and canonical PNG/reference outputs. |
| Routing | Classify input before expensive processing: graphic poster, photo-heavy, text-heavy, flat illustration, generated design, unsupported. |
| Observations | Store model/OCR/mask/layout/vector candidates as observations, not final layers. |
| Scene resolver | Convert observations into an audited reconstruction document with confidence, provenance, fallback, and decisions. |
| Editor projection | Generate a shared-editor projection that the current Fabric adapter can load. |
| Visual validation | Render reconstruction and compare against original before ready state. |
| Text validation | OCR original and reconstructed crops; downgrade or block semantic mismatch. |
| Business truth validation | Compare protected text against CampaignCue source facts and generated design intent where available. |
| Quality report | Save compact quality summaries in Firestore and detailed reports in Storage/GCS. |
| Layer panel | Show type, confidence, warning, fallback, source, lock, visibility, reorder, duplicate, delete, and repair actions. |
| Autosave | Save runtime edits with debounce, local draft recovery, and version snapshots. |
| Export | Export from saved editor state, not stale unsaved browser state. PNG is the owner handoff. Durable JSON snapshots stay product-owned while CueLayers assets depend on private runtime hydration. |
| Repair | Restore fallback, replace layer asset, keep text as raster, remask/regenerate selected region, downgrade vector to raster. |
| Feedback | Store structured correction signals for threshold and pipeline improvement. |
| Unsupported handling | Dense documents, tiny UI screenshots, complex collages, watermarked images, low-resolution posters, unsafe content, and overcompressed images must get flat-safe or unsupported states instead of bad editable layers. |

## Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Security | Protected APIs use `withAuth`, CampaignCue scope checks, Zod validation, rate limits, App Check where available, and safe logs. |
| Tenant isolation | No client-provided `workspaceId`, `tId`, `sId`, or `ownerId` is trusted without session-derived validation. |
| Cost | Firestore stores metadata/pointers only. Storage holds large artifacts. No broad realtime listeners. |
| Cost preflight | Dedupe, local heuristics, image quality checks, route budgets, rate limits, SAFE_MODE, and AI capacity checks must run before provider calls. |
| Performance | Use editor-resolution assets in browser and generate export-resolution assets only when needed. |
| Reliability | Every worker step is idempotent and replayable from stored artifacts. |
| Privacy | EXIF/private metadata is stripped from normalized/editor assets. |
| Accessibility | Layer warnings and status must be readable without relying only on color. |
| Mobile | Mobile supports upload/status/preview/download, not full precision layer editing. |

## Requirements From The 0-27 Plan

| Step | Product requirement |
| --- | --- |
| S0-S5 | Add source-package adapters for upload, generated flat image, generated design, and seeded observations. |
| 0 | Lock promise: faithful first render, safe editability, visible fallback. |
| 1 | Build canonical reconstruction schema independent of Fabric and model vendors. |
| 2 | Build editor projection contract without making Fabric the source of truth. |
| 3 | Store large artifacts immutably in Storage/GCS, not Firestore. |
| 4 | Add job/design/version/export metadata collections under CampaignCue workspace. |
| 5 | Use protected Next.js APIs for auth/status and Cloud Run-style workers for heavy processing. |
| 6 | Normalize uploads and generated sources before analysis. |
| 7 | Route input type and choose processing budgets before expensive calls. |
| 8 | Generate raw observations only. |
| 9 | Put model/segmentation engines behind adapter interfaces. |
| 10 | Recover text independently with OCR/style/fallback evidence. |
| 11 | Convert observations into design objects. |
| 12 | Vectorize only eligible flat/simple shapes. |
| 13 | Generate raster layers for photos/products/persons/complex artwork. |
| 14 | Repair background conservatively. |
| 15 | Resolve z-order with manual reorder available. |
| 16 | Use group metadata before real Fabric groups. |
| 17 | Resolve final scene and layer decisions. |
| 18 | Generate shared editor/Fabric projection with AI metadata preserved. |
| 19 | Validate visual recomposition. |
| 20 | Validate text safety as a hard gate. |
| 21 | Add confidence-aware layer panel UX. |
| 22 | Preserve AI metadata during edits and duplication. |
| 23 | Save versions, runtime state, corrections, and local recovery safely. |
| 24 | Boot existing designs from local draft, saved editor document snapshot, or generated editor projection in priority order. |
| 25 | Support fallback restoration and targeted repair. |
| 26 | Export from saved runtime state with server validation. |
| 27 | Add monitoring, cost ledger, QA fixtures, replay harness, kill switches, and deletion paths. |

## ChatGPT Disagreements And Adjustments

| ChatGPT suggestion | Repo decision |
| --- | --- |
| Use a generic `/magic-layers` API name. | Use CampaignCue-scoped `/api/campaigncue/cue-layers/...` routes and constants. |
| Let Fabric JSON be the central output. | Keep canonical reconstruction separate; durable editor truth is `CreativeEditorDocumentSnapshot`; Fabric JSON is adapter/runtime serialization only. |
| Store current projection document in Firestore. | Store only pointers and compact state in Firestore; large JSON lives in Storage. |
| Use signed URLs inside projection documents. | Durable editor/projection documents store `cue-asset://assetId` references; signed URLs are runtime only. |
| Treat PSD/SVG as key outputs early. | PNG/export download is the owner handoff. Shared-editor snapshots are product-owned durable state; browser SVG/JSON exports are disabled for active CueLayers documents until a safe product-owned hydration/export contract exists. PSD is not a driver. |
| Fully editable everything. | Raster-first fidelity, editable text/vector only when validated. |
| Direct image generation from browser. | Server-orchestrated generation with rate limits, provenance, and cost ledger. |
| Two pipelines for upload and generated images. | One source-package pipeline with different source adapters. |

## Acceptance Criteria

- Owner can create a CueLayers job from uploaded image or generated CampaignCue source.
- The original image is preserved and recoverable.
- Generated result opens in the existing shared Creative Editor, not a separate editor.
- Low-confidence layers show warnings/fallback state.
- Text mismatch cannot silently become editable text.
- No direct posting or provider account connection is added.
- Firestore never stores large images, base64, model reports, or large editor document snapshots.
- Signed URLs are not persisted in durable documents.
- Worker steps are idempotent and replayable.
- Export uses saved runtime state and returns downloadable assets.

## Implementation Entry Decisions

No product-scope question remains open before implementation. The following defaults should be used unless code evidence forces a safer adjustment.

| Area | Implementation default |
| --- | --- |
| Model providers | Use provider adapters and deterministic fixtures first. Model capability registry rules are defined in the implementation/research docs; no provider writes final Fabric JSON. |
| Worker target | Implement a dispatcher abstraction and keep heavy processing outside normal Next.js handlers. CampaignCue environment config chooses Cloud Run/Firebase Functions/queue target. |
| OCR languages | English-first with explicit unsupported or `needs_review` outcome for other scripts until validated fixtures exist. |
| Fonts | Controlled font catalog for browser and renderer; uncertain matches remain raster fallback. |
| Storage rules | Require scoped upload landing zone plus server verification/copy into immutable CueLayers paths before processing. |
| Market positioning | Use Canva as expectation benchmark, ImageToLayers/RunDiffusion for raster-first practicality, Codia for structure, Adobe for non-destructive edit posture, and Qwen/OmniPSD/Canva MRT only as research direction. |
