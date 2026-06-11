# Creative Studio - Implementation

## Runtime Contract

Creative Studio should be implemented as a CampaignCue-only module with product-scoped routes, flags, data constants, and Firebase paths. It must not reuse MenuList owner-menu state or Answerlattice support tenant shapes.

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

## Data Objects

| Object | Purpose |
| --- | --- |
| `creativeAssets` | Canonical record for generated static assets. |
| `creativeVariants` | Captions, headlines, images, crops, and channel-specific variants. |
| `assetTrustReports` | Trust result linked to asset version. |
| `assetExports` | Download, copy, or publish handoff history. |

## Provider Boundary

Generation provider calls must sit behind a CampaignCue provider adapter. The adapter must support SAFE_MODE, credit estimation, timeout handling, and partial success storage.

## Acceptance

- A failed visual generation does not delete completed copy variants.
- Exported files keep campaign, source, and trust metadata.
- Credits are recorded once per generation attempt and reconciled on failure.
- Assets can be traced from exported output back to the business facts used.

