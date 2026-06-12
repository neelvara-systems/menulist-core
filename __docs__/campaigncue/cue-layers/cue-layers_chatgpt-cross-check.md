# CueLayers - ChatGPT Conversation Cross-Check

## Source

Conversation file reviewed:

`/tmp/codex-remote-attachments/019eb2dc-9110-7c21-9a72-3ea752614eea/A6F67219-CEBA-4861-BDBE-649039877CE0/1-cuelayers-chatgpt-responses-2026-06-12.md`

The file contains 41 captured assistant response groups and 83,689 lines. User messages are not included in the extraction.

## High-Level Verdict

The conversation's mature plan is directionally strong, but generic. It must be adapted to the current repo.

Accepted:

- Treat this as a reconstruction pipeline, not a Fabric-only feature.
- Start with schema, source package, fixtures, storage, and validation before model adapters.
- Preserve original image and first-render fidelity.
- Use one editor runtime for uploaded and generated sources.
- Keep text safety as a hard gate.
- Store large artifacts in Storage/GCS and Firestore pointers only.
- Keep correction data and replay harness from day one.

Modified:

- Rename product concept from generic Magic Layers to CampaignCue CueLayers.
- Use CampaignCue-scoped routes, constants, docs, and Firebase project.
- Generate a shared Creative Editor projection instead of making raw Fabric JSON the product truth.
- Use export/download only; no direct posting or provider mutation.
- Use server/Admin APIs and CampaignCue guards instead of trusting direct client writes.

Rejected:

- Claiming perfect source-file recovery.
- Persisting signed URLs in editor projections or snapshots.
- Storing large Fabric JSON/model reports in Firestore.
- Sending model output directly into Fabric objects.
- Treating SVG/PSD as canonical outputs.
- Building separate upload and generated-design editor stacks.

## Response-By-Response Coverage

| Response | Main content | Coverage |
| --- | --- | --- |
| 001 | Basic Fabric/server decomposition, masked raster/vector modes, cost notes. | Spec, impl, Firebase; adjusted away from generic API naming. |
| 002 | Seven-pipeline accuracy model, Firebase/Next.js architecture, Google AI role. | Spec, impl, Firebase; Fabric kept as runtime only. |
| 003 | Competitor/research scan: Canva, Codia, ImageToLayers, RunDiffusion, Adobe, Qwen, OmniPSD, Canva MRT. | Marketing positioning and this cross-check; no copied public claims. |
| 004 | Early phase-style master plan through repair/cost/feedback. | Converted into no-phase 0-27 mapping and repo-specific implementation spine. |
| 005 | Product boundary, supported layer classes, editability levels, invariants. | Spec layer taxonomy and readiness model. |
| 006 | Internal schema: enums, geometry, assets, confidence, fallback, observations, Zod, Gemini/OCR schemas. | Impl data contracts and test cases; detailed code comes during implementation. |
| 007 | Fabric runtime format, custom properties, CORS, metadata survival. | Impl Fabric loading constraints and Firebase CORS policy. |
| 008 | Storage/GCS architecture, buckets, paths, metadata, cache, public access, App Check, lifecycle. | Firebase storage operational policy. |
| 009 | Research correction, reject LayerD backbone/SVG-PSD real output/fully editable promise, new 0-27 index. | Cross-check accepted/rejected table and spec non-goals. |
| 010 | Step 0 product contract, public promise, input/output contract, UX constants. | Spec product promise, non-goals, acceptance. |
| 011 | Step 1 canonical reconstruction schema and capability resolver. | Impl reconstruction layer contract and planned types. |
| 012 | Step 2 Fabric constraints, abort stale loads, CORS-safe URLs, metadata, groups. | Impl Fabric loading constraints. |
| 013 | Step 3 asset identity, bucket model, region, paths, cache, lifecycle. | Firebase storage operational policy and paths. |
| 014 | Step 4 Firestore job/design/version/asset/export model, security, indexes. | Firebase collections, document shapes, indexes. |
| 015 | Step 5 orchestration, endpoints, Cloud Tasks, dispatcher, worker, retries, cancellation, IAM. | Impl worker status/retry/cancellation contract. |
| 016 | Step 6 upload normalization, magic bytes, EXIF, sRGB, hash, metadata strip. | Spec/impl upload normalization and Firebase source preservation. |
| 017 | Step 7 routing taxonomy, metrics, route policies. | Impl routing taxonomy. |
| 018 | Step 8 observation bundle, coordinate rules, Gemini/OCR/segmentation observations, limits. | Impl model/engine boundaries and tests. |
| 019 | Step 9 decomposition adapters: LayerD, Gemini segmentation, SAM, BiRefNet, dedupe. | Impl model/engine adapter table. |
| 020 | Step 10 text recovery, OCR/style/font candidates, safety separation. | Spec text safety, impl, tests. |
| 021 | Step 11 elementization, connected components, object candidates. | Spec/impl 0-27 mapping and tests. |
| 022 | Step 12 vector recovery, eligibility, Potrace/VTracer, path limits. | Spec, impl engine table, Firebase limits, tests. |
| 023 | Step 13 raster layer generation, masks, crops, editor/export resolution. | Spec/Firebase storage paths and lazy high-res. |
| 024 | Step 14 clean background reconstruction, conservative repair. | Spec/impl non-goals and background repair flag. |
| 025 | Step 15 z-order resolver, ordering evidence, manual reorder. | Spec/impl mapping and tests. |
| 026 | Step 16 group resolver, metadata-first groups. | Spec layer taxonomy, impl Fabric group constraint. |
| 027 | Step 17 scene resolver, final decisions from observations. | Impl scene resolver contract. |
| 028 | Step 18 Fabric generator, durable projection vs runtime serialization, object mapping. | Impl shared-editor projection and Fabric constraints. |
| 029 | Step 19 visual recomposition validator, renderer, metrics, decisions. | Spec/test validation gates. |
| 030 | Step 20 text safety validator, expected text resolver, semantic gate. | Spec source model and tests. |
| 031 | Step 21 user-facing layer panel, actions, dirty state, diagnostics. | Spec/impl editor UX and tests. |
| 032 | Step 22 editing behavior and AI metadata preservation. | Impl shared editor integration and tests. |
| 033 | Step 25 repair loop initial version. | Spec/impl/test repair coverage. |
| 034 | Step 24 runtime loading/recovery/editor boot sequence. | Impl/Firebase boot and runtime hydration coverage. |
| 035 | Step 25 final repair loop version. | Spec/impl/test repair coverage. |
| 036 | Step 26 export pipeline, formats, renderer, download URLs, security/cost. | Impl export contract, Firebase export costs, tests. |
| 037 | Step 27 operations, monitoring, cost ledger, QA, SLOs, review, cleanup. | Firebase operations/alerts and test regression gates. |
| 038 | Pre-implementation cautions: schema first, no signed URLs, raster-first, replay, idempotency. | README/spec/impl/Firebase/test coverage. |
| 039 | Prompt-to-design generation layer, Imagen warning, candidate validation, SynthID/provenance. | Spec source model, impl generated source adapters, open provider registry decision. |
| 040 | Unified source package for upload/generated image/generated design. | README/spec/impl source-package coverage. |
| 041 | Final cautions: unsupported path, text sacred, fonts, renderer security, SVG, human review, policy layer. | Spec/impl/Firebase/test/marketing additions. |

## Coverage Of ChatGPT 0-27 Plan

| Step | ChatGPT point | Covered in docs | Repo adjustment |
| --- | --- | --- | --- |
| S0 | Source package abstraction before Step 0 | README, spec, impl | Use `CampaignCueCreativeSourcePackage` for upload and generated sources. |
| S1 | User upload source adapter | Spec, impl, Firebase | Upload landing-zone object is verified and normalized by server before processing. |
| S2 | Generation job schema | Spec, impl, Firebase | Generated sources link to CampaignCue generation/design provenance instead of bypassing CueLayers. |
| S3 | Generated flat image source adapter | Spec, impl | Generated flat image follows the full reconstruction path with generation priors. |
| S4 | Generated design source adapter | Spec, impl | Design-first sources seed intended text and layout observations. |
| S5 | Seed observations from generation intent | Spec, impl, tests | Intended text outranks OCR/model guesses for critical business text. |
| 0 | Product contract and non-negotiable rules | Spec, README | CueLayers promises safe approximation, not original layer recovery. |
| 1 | Canonical reconstruction schema | Spec, impl | Use `CueLayersReconstructionDocument`, separate from shared editor schema. |
| 2 | Fabric runtime contract | Spec, impl | Projection targets the existing shared Creative Editor/Fabric adapter. |
| 3 | Firebase/GCS asset model | Firebase | CampaignCue Storage/GCS artifacts, Firestore pointers only. |
| 4 | Firestore job/design state | Firebase, impl | Add CampaignCue workspace subcollections; client writes remain denied. |
| 5 | Job orchestration | Impl, Firebase | Protected Next.js APIs plus Cloud Run-style heavy worker. |
| 6 | Upload and normalization | Spec, impl, Firebase | Upload landing zone then server verification/copy/normalize. |
| 7 | Routing and design diagnosis | Spec, impl | Internal route only; no owner mode complexity. |
| 8 | Observation generation | Spec, impl | Models create observations, not final layers. |
| 9 | Decomposition engine adapter | Impl | Engines sit behind adapters; provider choices are replaceable. |
| 10 | Text recovery system | Spec, impl, tests | Text safety is sacred and independent. |
| 11 | Elementization | Spec, impl | Convert observations to design candidates before scene decision. |
| 12 | Vector recovery | Spec, impl, tests | Vector only when validated and within path limits. |
| 13 | Raster layer generation | Spec, Firebase | Raster-first fidelity for complex objects. |
| 14 | Clean background reconstruction | Spec, impl | Conservative only; flag risky semantic repair. |
| 15 | Z-order resolver | Spec, tests | Manual reorder remains mandatory. |
| 16 | Group resolver | Spec, impl | Logical groups first; avoid default Fabric groups. |
| 17 | Scene resolver | Impl | Central decision engine outputs reconstruction document. |
| 18 | Fabric generator | Impl | Generate shared editor projection with allowlisted metadata. |
| 19 | Visual recomposition validator | Spec, tests | Ready state requires visual validation or `outcome=needs_review`. |
| 20 | Text safety validator | Spec, tests | Semantic mismatch downgrades or blocks editable text. |
| 21 | User-facing layer panel | Spec, impl | Add confidence/fallback/warning UX inside current editor. |
| 22 | Editing behavior and metadata preservation | Impl, tests | Runtime edits preserve layer identity without mutating reconstruction truth. |
| 23 | Autosave/versioning | Impl, Firebase | Debounced Storage runtime snapshots; Firestore pointer update. |
| 24 | Runtime loading/recovery | Impl | Boot from local draft, saved editor document snapshot, or generated projection. |
| 25 | Repair loop | Spec, impl, tests | Restore fallback and targeted repair are first-class. |
| 26 | Exports | Spec, Firebase, tests | Export/download from saved runtime state; no direct posting. |
| 27 | Ops/cost/QA/hardening | Firebase, tests | Cost ledger, replay, fixtures, kill switches, deletion paths. |

## Coverage Of Source Adapter Correction

| Conversation point | Docs coverage |
| --- | --- |
| Do not build separate upload and generated pipelines | README, spec, impl |
| Add a unified source package before Step 0 | README, spec, impl |
| Source kinds: upload, generated flat image, generated design | Spec, impl |
| Design-first generation should create native text layers | Spec, impl, helpdoc |
| Intended text outranks OCR for generated designs | Spec, impl, tests |
| Generated flat image can still use full reconstruction with generation priors | Spec, impl |
| Track generated vs uploaded sources separately in QA/cost | Firebase, tests |

## Coverage Of Final Cautions

| Caution | Docs coverage |
| --- | --- |
| Product promise must be careful | Spec, website |
| Unsupported-result path | Spec, helpdoc, tests |
| Treat text as sacred | Spec, impl, tests |
| Font licensing | Spec open questions, impl, tests |
| Renderer is security boundary | Impl, tests |
| SVG risk | Spec, impl, tests |
| Design-first generated default | Spec, marketing |
| Brand assets as canonical inputs | Spec, marketing |
| Correction data is compounding asset | Spec, Firebase, tests |
| Flat-safe mode | Spec, helpdoc |
| Browser memory budgets | Firebase, tests |
| Deterministic harness first | Impl, tests |
| One editor runtime | README, spec, impl |
| Kill switches | Impl, Firebase |
| Completed vs ready | Spec, impl |
| Avoid generic design tool | Spec, marketing |
| Human review | Firebase, tests |
| Policy layer before generation | Impl, tests |
| Prompt ambiguity | Spec, impl |
| Business creative source package | README, spec, impl |

## ChatGPT Plan Items Not Adopted As Written

| Item | Decision |
| --- | --- |
| Generic `magic-layers` naming | Use CueLayers/CampaignCue-specific naming. |
| Direct Fabric JSON persistence as main state | Keep reconstruction, editor runtime, and export output separate. |
| `fabric.Group` as normal output | Use logical group metadata first. |
| PSD as a central output | PNG/download and editor runtime are primary. PSD is not an architecture driver. |
| Arbitrary SVG vectors | SVG must be parsed/sanitized and never canonical. |
| Client-side provider generation | Server-orchestrated only with rate limits and cost ledger. |
| Large job work in Next.js API | Heavy processing belongs in Cloud Run-style worker. |
| Broad realtime status | One-doc visible listener or polling only. |

## Implementation Entry Decisions

No major product-scope gap remains before implementation, but the implementation contracts below are frozen before code starts. These are the first implementation decisions and defaults.

| Area | Implementation default |
| --- | --- |
| Worker platform | Implement a worker dispatcher abstraction. Mirror MenuList Cloud Tasks/task-secret posture first, with Cloud Run/Firebase Functions target selected by CampaignCue environment config. Heavy processing never runs in normal Next.js request handlers. |
| Model providers | Implement capability-registry interfaces first. Model ids are server config examples only; choose by capability, release stage, cost tier, and rollout policy through the repo AI Gateway or equivalent wrapper. |
| Font catalog | Start with a controlled renderer/browser font catalog and raster fallback for uncertain font matches. |
| Storage rules | Add CampaignCue-owned server processing paths plus scoped upload landing zone rules before any owner upload is accepted. |
| Shared editor metadata | Add minimal product-neutral metadata for stable layer ids, warnings, fallback refs, and reconstruction ids; keep full CueLayers metadata in Storage sidecar artifacts. |
| Review tooling | Add an internal/admin-only quality report surface that can view source, reconstruction, diff, text safety, cost, and repair history without cross-workspace exposure. |

## ChatGPT Feedback Validation - 2026-06-12

This section validates the follow-up ChatGPT review of the six CueLayers docs. The feedback was mostly valid, but model-id advice needed live-doc correction.

| Feedback item | Verdict | Adopted doc change |
| --- | --- | --- |
| Split job status, job outcome, processing step, and design status. | Agree. | Spec, implementation, and Firebase docs now use `status`, `outcome`, and `step` separately. |
| Remove compound readiness states. | Agree. | Compound machine states were removed; useful-but-imperfect output is `status=completed` with `outcome=needs_review`. |
| Make `CreativeEditorDocumentSnapshot` the durable editor truth. | Agree. | Implementation/Firebase docs now make Fabric JSON runtime-only and persist editor snapshots plus `CueLayersLayerIndex`. |
| Add durable business/protected text/brand/rights snapshots. | Agree. | Source-package contracts now include snapshot asset ids and rights metadata. |
| Fix immutable Storage paths for reruns/repairs. | Agree. | Firebase paths are scoped by `sourcePackageId`, `jobId`, `reconstructionId`, `versionId`, `repairId`, and `exportId`. |
| Add asset ref metadata such as generation/metageneration and hashes. | Agree. | Firebase docs now require `retentionClass`, scoped asset metadata, `storageGeneration`, `storageMetageneration`, `sha256`, and optional perceptual hash. |
| Define renderer/export allowlist as a real contract. | Agree with repo adaptation. | Implementation docs use the shared editor element types and block external/data/javascript URLs, arbitrary SVG, remote fonts, unknown Fabric classes, and unallowlisted filters/properties. |
| Replace model-name defaults with a capability registry. | Agree, with live-doc correction. | Docs now use `ModelCapability` and `ModelRegistryEntry`; exact Gemini IDs are examples only because Firebase and Gemini API availability/naming can differ. |
| Split worker runtimes by job class. | Agree. | Firebase limits now separate reconstruction, validation, export, and repair timeouts. |
| Add generated-design preflight. | Agree. | Implementation docs now require policy check, truth snapshots, cost estimate, model selection, and candidate validation before source registration. |
| Add correction-event schema. | Agree. | Firebase docs now include `cueLayerCorrectionEvents`. |
| Add export revision pinning. | Agree. | Export requests require `sourceRevision === cueLayerDesigns.current.revision`. |
| Add migration/versioning contract. | Agree. | Implementation docs now require `schemaVersion` and backward-compatible readers for durable artifacts. |
| Add owner-facing copy constraints. | Agree. | Spec includes plain labels such as "Ready", "Needs review", "Kept as image for safety", and "Export ready". |
| Make MenuList adapter tests non-blocking for CampaignCue v1. | Agree. | Test docs now require MenuList adapter tests before MenuList adoption, not before CampaignCue CueLayers v1. |
| Treat Firebase's preview image model IDs as final defaults. | Partial. | Rejected as durable logic. Current docs show model naming/release-stage churn, so the adopted rule is capability-based registry selection with examples only. |

## Fresh Research Upgrade

After reviewing current market and technical sources, the plan is strengthened in these areas:

| Research signal | Plan update |
| --- | --- |
| Canva Magic Layers sets owner expectation for flat-to-layer editing, but public beta reporting shows this is still an uncertain reconstruction problem. | CueLayers keeps the promise conservative: safe editable approximation with fallback. |
| A reported Magic Layers text-alteration incident shows text can change during layer conversion. | CueLayers now treats protected business text as a first-class hard gate. |
| Codia-style tools emphasize structured element output with boxes, hierarchy, text, and confidence. | CueLayers observation bundles and quality reports now explicitly track structure and confidence separately from final layers. |
| ImageToLayers-style tools emphasize semantic raster layers and background completion. | CueLayers keeps raster-first fallback and avoids owner-facing threshold controls. |
| Firebase Imagen availability changes in 2026. | CueLayers requires a server-side provider registry and does not hardcode an Imagen-era model plan. |
| Gemini image models, SynthID, SAM-family segmentation, Qwen layered output, and OmniPSD-style research are moving targets. | All model output remains observations/candidates; the scene resolver and validation gates own product truth. |
| Cloud Run job and Firebase Storage guidance fits long-running image work and upload safety. | Heavy work stays in workers; Firestore stores compact summaries and Storage/GCS stores artifacts/reports. |
| Fabric custom metadata requires explicit typing/serialization. | CueLayers metadata must be allowlisted and serialized deliberately through the shared Fabric adapter. |

## Repo Architecture Hardening

The docs were further updated to make repo-native architecture reuse mandatory.

| Repo pattern | CueLayers decision |
| --- | --- |
| AI Gateway and `@google/genai` entrypoints | Google model calls must use the existing gateway/key-rotation/retry posture or a CampaignCue equivalent wrapper. |
| MenuList image generation | Reuse preflight capacity checks, SAFE_MODE, rate limits, Cloud Tasks/worker posture, task-secret validation, bounded concurrency, and transactional progress writes. |
| Firebase Storage | Large images, masks, reports, editor projections, editor document snapshots, and exports stay in Storage/GCS; Firestore keeps compact pointers only. |
| Google model selection | Use a task-specific capability registry. Current Gemini image model ids can be examples, but durable logic selects by `image_generation`, `layout_reasoning`, `segmentation_masks`, `ocr`, release stage, cost tier, and rollout policy. |
| MenuList menu item images | Share the product-neutral reconstruction core and shared editor runtime through a MenuList adapter that uses MenuList project/store/item authority, media image paths, AI accounting, outlet policy, and cache invalidation. |

## Final Cross-Check Result

The new docs cover the 0-27 plan, source-adapter correction, generated-design notes, final cautions, repo-specific CampaignCue boundaries, and fresh research-driven accuracy/provider upgrades. The docs intentionally do not copy ChatGPT's generic route names, Firestore examples, SVG/PSD emphasis, model-first implementation order, or overbroad "fully editable everything" promise.
