# Creative Studio - Implementation

## Runtime Contract

Creative Studio should be implemented as a CampaignCue-only module with product-scoped routes, flags, data constants, and Firebase paths. It must not reuse MenuList owner-menu state or Answerlattice support tenant shapes.

Manual static asset editing now uses the shared product-neutral editor under `src/modules/creative-editor/`. CampaignCue owns only the adapter in `src/modules/creative-editor/providers/campaigncue.ts` and the workspace entry points in `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`. The editor shell itself includes the top toolbar, primary Download action, contextual property toolbar, left rail, searchable asset drawer, Styles shortcuts, My Stuff upload/recent assets, canvas, floating selected-layer toolbar, page controls, floating right properties drawer, drag-reorder Active Layers drawer, bottom controls, and dark/light mode described in `__docs__/shared-creative-editor/README.md`.

## Inputs

- `workspaceId`
- `campaignId`
- `campaignCueId`
- `businessFactRefs`
- `channelTargets`
- `brandStyleRef`
- `creditEstimate`
- `ownerApprovalState`

## Flow

1. Load campaign pack and approved source references.
2. Build an asset brief per channel.
3. Estimate credits before generation.
4. Generate copy and visual prompts or rendered assets according to provider capability.
5. Store outputs as draft variants.
6. Run Creative Trust Center checks.
7. Allow owner approval, export, or publish handoff.
8. When the owner needs a visual asset, open the shared editor from a campaign output or a blank Asset Library flow.
9. Selected editor layers use the shared contextual toolbar, floating toolbar, floating selected-item-first right properties drawer, and drag-reorder Active Layers drawer for canvas-local Design Cue entry, edit, text/image/QR/shape properties, text readability checks, CTA/contact insertion, color, image replacement, opacity, position, lock, duplicate, delete, group, distribute, stack management, and more controls without resizing the old full-canvas workspace.
10. Owners can use the shared Styles panel to apply browser-local project style presets or connected brand style, insert data-backed ready-made text combinations, and use My Stuff to upload local images, see recent session insertions, or reuse approved assets without remote stock search or provider upload.
11. CampaignCue passes Brand Kit metadata and editable text placeholders such as business name, locality, phone, website, booking link, menu link, campaign title, headline, body, CTA, and destination into the shared editor metadata.
12. Owners can add, switch, duplicate, and lock editor pages/artboards in browser-local state. Export/register uses the active page while JSON preserves the page list.
13. Register exported editor assets through CampaignCue Asset Library metadata; keep binary download manual/browser-local until a CampaignCue Storage upload path is explicitly added.
14. Expose the CampaignCue AI Tools drawer only through product-provided actions in `src/constants/campaigncue/creativeEditorAiTools.ts` and the deterministic handler in `src/lib/campaigncue/creativeEditorAiTools.ts`.
15. AI Tools must start with SMB owner outcomes such as "Check if ready to share" and "Add missing business details" before generic design actions. They may create editable copy suggestions, selected-text variants, business-fact findings, brand checks, CueLayers guidance, and export checklists. They must not call provider models, post/send content, mutate ad spend, write Firebase data, or persist a parallel editor document.
16. Planned CueLayers work must enter through the CampaignCue source-package and reconstruction pipeline documented in `__docs__/campaigncue/cue-layers/README.md`; it must not add a separate editor runtime or direct provider posting path.
17. Design Cue conversation/comment work follows `__docs__/campaigncue/design-cue/README.md`: deterministic commands and patch validation first, optional model assistance only for ambiguous intent/copy/critique, and no model-owned document persistence.

## Data Objects

| Object | Purpose |
| --- | --- |
| `creativeAssets` | Canonical record for generated static assets. |
| `creativeVariants` | Captions, headlines, images, crops, and channel-specific variants. |
| `assetTrustReports` | Trust result linked to asset version. |
| `assetExports` | Download, export, or publish handoff history. |

## Provider Boundary

Generation provider calls must sit behind a CampaignCue provider adapter. The adapter must support SAFE_MODE, credit estimation, timeout handling, and partial success storage.

The shared creative editor is not a provider-generation path. It uses browser SVG/canvas export and does not enable paid generation, direct social posting, provider account connection, ad spend mutation, or billing.

The editor AI Tools tab is also not a provider-generation path in the active runtime. CampaignCue passes a bounded action list and handler into the shared editor. The handler uses the already-loaded `CampaignCueOverview` in memory to produce owner-facing text suggestions and findings, then the shared editor lets the owner explicitly add/copy text. Results appear above the remaining tool catalog once ready so owners do not hunt for generated suggestions. Brand Kit quick picks, drawer search, ready-made text templates, text placeholders, contextual toolbar actions, and page controls also use local/static data or already-loaded overview/adapter data. The first AI actions are readiness and missing-detail checks; copy and image-reuse utilities remain secondary. This avoids extra Firestore reads, avoids provider spend, keeps `CreativeEditorDocument` as the durable editor truth, and preserves the export/download delivery boundary. CampaignCue uses the full editor chrome and export registration callback; it does not use the print-assets embedded chrome, MenuList template-save callback, or `storeAssetTemplates` registry path.

Design Cue is the implemented conversation/comment layer on top of this editor foundation. It does not replace the deterministic AI Tools path with a chat-first provider call. It converts known owner requests into validated `CreativeEditorDocument` patch sets locally, keeps the model route disabled until bounded candidate generation or ambiguous classification is explicitly enabled, and requires owner approval before applying changes through the existing editor history.

## Acceptance

- A failed visual generation does not delete completed copy variants.
- Exported files keep campaign, source, and trust metadata.
- Credits are recorded once per generation attempt and reconciled on failure.
- Assets can be traced from exported output back to the business facts used.
- Uploaded or generated flat-image reuse follows the CueLayers contract before opening in the shared editor.
- Canvas-local selected-layer quick actions come from the shared editor and do not add CampaignCue-specific editor state.
- Contextual toolbar, drawer search, ready-made text templates, Brand Kit quick picks, text placeholders, and page controls come from the shared editor and do not add CampaignCue-specific editor state.
- AI Tools actions remain editable/manual and do not create social/provider actions or hidden Firebase writes.
- Design Cue applies only validated document patches and does not persist model output, Fabric JSON, or direct provider actions as editor truth.
