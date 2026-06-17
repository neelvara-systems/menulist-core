# CueLayers - Documentation Hub

**Status:** Safe upload spine implemented. Provider-driven decomposition remains gated.
**Product:** CampaignCue
**Feature:** CueLayers
**Owner-facing promise:** Convert an uploaded or generated flat image into an editable CampaignCue design where the system has enough confidence, while preserving safe fallbacks.

CueLayers is the CampaignCue feature for turning a static image into reusable editable layers inside the shared Creative Editor. It supports two source paths:

- Owner uploads an existing PNG, JPEG, or WebP from their device.
- CampaignCue generates or prepares a visual asset, then registers it as a source package for layer reconstruction.

Both paths must converge into one source-package pipeline. CueLayers must not create a separate upload editor, generated-design editor, or Canva-like product fork.

## Source Conversation

The feature is based on the attached ChatGPT conversation:

`/tmp/codex-remote-attachments/019eb2dc-9110-7c21-9a72-3ea752614eea/A6F67219-CEBA-4861-BDBE-649039877CE0/1-cuelayers-chatgpt-responses-2026-06-12.md`

Repo-aligned corrections are captured in [cue-layers_chatgpt-cross-check.md](./cue-layers_chatgpt-cross-check.md).

## Documents

| Document | Audience | Purpose |
| --- | --- | --- |
| [cue-layers_spec.md](./cue-layers_spec.md) | Product, founder, design | Product promise, flows, requirements, non-goals, acceptance. |
| [cue-layers_impl.md](./cue-layers_impl.md) | Engineering | Repo-aligned architecture, data contracts, APIs, worker model, implementation checklist. |
| [cue-layers_firebase.md](./cue-layers_firebase.md) | Engineering, cost owner | Firestore, Storage, worker, read/write, retention, cost controls. |
| [cue-layers_mobile-support.md](./cue-layers_mobile-support.md) | Product, mobile | Mobile admission decision and mobile-safe subset. |
| [cue-layers_test-cases.md](./cue-layers_test-cases.md) | QA, engineering | Deterministic fixture, security, cost, editor, export, and regression tests. |
| [cue-layers_validation.md](./cue-layers_validation.md) | Engineering, audit | Code-vs-doc validation report for the implemented safe upload spine. |
| [cue-layers_marketing.md](./cue-layers_marketing.md) | Internal GTM | Sales narrative, positioning, objections, approved language. |
| [cue-layers_website.md](./cue-layers_website.md) | Public website planning | Public content blocks, SEO, claims boundary. |
| [cue-layers_helpdoc.md](./cue-layers_helpdoc.md) | Owner support | Owner-facing guide for upload, review, edit, repair, and export. |
| [cue-layers_chatgpt-cross-check.md](./cue-layers_chatgpt-cross-check.md) | Engineering, audit | Full 0-27 conversation coverage map and accepted/rejected adjustments. |
| [cue-layers_research-addendum.md](./cue-layers_research-addendum.md) | Product, engineering | Fresh market/model research and the long-term accuracy/provider decisions applied after the ChatGPT plan. |

## Fresh Product Direction

The research-backed CueLayers direction is:

```text
Business-safe creative reuse, not maximum layer count.
```

The quality model is split into pixel fidelity, text fidelity, structural usefulness, and export fidelity. A result is not `ready` unless critical visual and protected-text checks pass. Useful-but-imperfect results should use `status=completed` with `outcome=needs_review`, or `outcome=flat_safe`, instead of pretending full editability.

Durable editor truth is `CreativeEditorDocumentSnapshot` with `cue-asset://assetId` references plus a `CueLayersLayerIndex` sidecar. Fabric runtime serialization and signed URLs are temporary adapter/render details only.

## Implemented Runtime Scope

The current implementation ships the conservative CueLayers spine:

- Owner upload of PNG/JPEG/WebP from CampaignCue Editor or Asset Library.
- CampaignCue-authenticated API routes for upload, design list, job read, boot, autosave, fallback repair record, and Storage-backed export registration.
- CampaignCue Asset Library download handoff for private Storage-backed exports. Download URLs are generated at request time and are not persisted.
- CampaignCue source package with inline business/protected-text/brand/rights snapshots, layer index, version snapshots, repair requests, and export records. Quality reports, reconstruction records, editor projection artifacts, job events, correction events, and cost ledgers are reserved for provider/decomposition mode.
- Immutable CampaignCue Storage paths under `campaigncue/cue-layers/{workspaceId}/{designId}/...`.
- `CreativeEditorDocumentSnapshot` persistence with `cue-asset://assetId` durable references and boot-time signed URL hydration.
- Autosave validates image references against the current CueLayers layer index so saved documents cannot point to unknown `cue-asset://` ids.
- Flat-safe editor projection that preserves the original image as a locked shared-editor image object. Owners can add text, shape, QR, and drawing layers, then export/download PNG. New image imports plus SVG/JSON browser exports are disabled while a CueLayers design is active so signed runtime URLs and unowned assets do not leave the product-owned pipeline.
- No direct posting, social account connection, provider upload, ad mutation, or external model spend.

The current implementation does not claim OCR/text recovery, segmentation, vector reconstruction, generated-source intake, semantic background repair, or high-confidence editable decomposition. Those adapters remain behind `ENABLE_CAMPAIGNCUE_CUE_LAYERS_*` gates and the capability-based model registry.

## Current Repo Anchors

| Area | Current anchor |
| --- | --- |
| Shared editor docs | `__docs__/shared-creative-editor/README.md` |
| Shared editor types | `src/modules/creative-editor/types.ts` |
| Shared Fabric adapter | `src/modules/creative-editor/fabricAdapter.ts` |
| Shared editor UI | `src/modules/creative-editor/CreativeEditor.tsx` |
| CampaignCue editor adapter | `src/modules/creative-editor/providers/campaigncue.ts` |
| CampaignCue workspace UI | `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx` |
| CampaignCue asset API | `src/app/api/campaigncue/assets/route.ts` |
| CampaignCue API guards | `src/lib/campaigncue/apiGuards.ts` |
| CampaignCue server boundary | `src/lib/campaigncue/server.ts` |
| CampaignCue constants | `src/constants/campaigncue/` |
| CampaignCue route constants | `src/constants/campaigncue/routes.ts` |
| CampaignCue Firestore rules | `firestore-campaigncue.rules` |
| CampaignCue Storage rules | `storage-campaigncue.rules` |
| AI system layer | `__docs__/ai-system-layer/README.md`, `src/lib/google/genAi/`, `functions/src/ai/` |
| Menu image generation pattern | `__docs__/projects/ai-image-generation/README.md`, `src/app/api/image-generation/` |
| Batch/worker pattern | `src/app/api/image-generation/batch-trigger/route.ts`, `src/app/api/image-generation/batch-generation/route.ts` |
| Image quality and optimization | `src/lib/imageQualityGuard.ts`, `src/lib/image/optimizeImage.ts` |
| Storage upload helpers | `src/database/storage/uploadBase64MediaImageAdmin.ts`, `src/database/storage/uploadPreparedMediaImage.ts`, `src/database/storage/uploadJSONToStorage.ts` |

## Product Boundaries

| Boundary | Decision |
| --- | --- |
| Shared editor | CueLayers must output a shared-editor-compatible document/runtime projection. It must not fork the editor. |
| CampaignCue | CueLayers is CampaignCue-scoped. Constants, routes, jobs, Storage paths, and docs stay under CampaignCue boundaries. |
| MenuList | MenuList business truth may seed CampaignCue facts, but CueLayers does not write MenuList data. |
| MenuList menu images | The same reconstruction core can be adopted by a MenuList adapter for generated menu item images, but that adapter must use MenuList project/store/item authority, MenuList Storage paths, MenuList AI accounting, and MenuList cache rules. |
| Answerlattice | No Answerlattice tenant shapes, support data, or Firebase project reuse. |
| Direct posting | Not active. CueLayers ends at export/download and asset reuse. |
| Public promise | No promise to recover original Canva, PSD, or design-tool source files. The promise is a safe editable approximation with fallbacks. |
| Text | Text is treated as business truth. Prices, dates, address, phone, offer, CTA, and business name must not be silently changed. |
| Storage | Large artifacts live in CampaignCue Storage/GCS. Firestore stores state, pointers, summaries, and bounded metadata only. |
| Signed URLs | Signed URLs are runtime transport only and must never be persisted in durable design JSON. |

## Internal Architecture Summary

```text
User upload or generated design
  -> CampaignCueCreativeSourcePackage
  -> product-neutral reconstruction core
  -> CueLayers observation bundle
  -> audited reconstruction document
  -> shared editor projection
  -> Creative Editor Fabric runtime
  -> autosave/version
  -> validation/repair
  -> export/download
```

## Doctrine Preservation Check

The conversation contains durable CueLayers-specific doctrine:

- Start from schema and deterministic fixtures before model calls.
- Preserve original image and first-render fidelity.
- Earn editability through confidence and validation.
- Measure pixel fidelity, text fidelity, structural usefulness, and export fidelity separately.
- Keep reconstruction truth, editor runtime state, and export output separate.
- Treat text as sacred business content.
- Use CampaignCue business facts and generated design intent as protected text truth.
- Reuse the repo AI Gateway, capacity checks, rate limits, Storage helpers, image quality guards, and batch worker patterns before adding any new infrastructure.
- Keep a product-neutral reconstruction core so MenuList menu item images can use the same engine through a MenuList adapter without writing CampaignCue data.
- Never persist signed URLs or base64 payloads as durable truth.
- Use one editor runtime for uploaded, generated, and template-derived designs.
- Expose uncertainty, fallback, and repair rather than pretending success.

This guidance is captured in this feature doc set instead of a global MenuList constitution document because it governs the CampaignCue CueLayers pipeline specifically, not all MenuList development.
