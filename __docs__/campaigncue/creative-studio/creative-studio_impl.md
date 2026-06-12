# Creative Studio - Implementation

## Runtime Contract

Creative Studio should be implemented as a CampaignCue-only module with product-scoped routes, flags, data constants, and Firebase paths. It must not reuse MenuList owner-menu state or Answerlattice support tenant shapes.

Manual static asset editing now uses the shared product-neutral editor under `src/modules/creative-editor/`. CampaignCue owns only the adapter in `src/modules/creative-editor/providers/campaigncue.ts` and the workspace entry points in `src/components/templates/campaigncue/CampaignCueWorkspaceApp.tsx`. The editor shell itself includes the toolbar, left rail, asset drawer, canvas, right inspector, bottom controls, and dark/light mode described in `__docs__/shared-creative-editor/README.md`.

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
9. Register exported editor assets through CampaignCue Asset Library metadata; keep binary download manual/browser-local until a CampaignCue Storage upload path is explicitly added.
10. Keep AI Tools and Templates disabled in the shared shell until CampaignCue has a governed provider/template contract.
11. Planned CueLayers work must enter through the CampaignCue source-package and reconstruction pipeline documented in `__docs__/campaigncue/cue-layers/README.md`; it must not add a separate editor runtime or direct provider posting path.

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

## Acceptance

- A failed visual generation does not delete completed copy variants.
- Exported files keep campaign, source, and trust metadata.
- Credits are recorded once per generation attempt and reconciled on failure.
- Assets can be traced from exported output back to the business facts used.
- Uploaded or generated flat-image reuse follows the CueLayers contract before opening in the shared editor.
